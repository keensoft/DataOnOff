//   Copyright 2012 keensoft
//
//   Licensed under the Apache License, Version 2.0 (the "License");
//   you may not use this file except in compliance with the License.
//   You may obtain a copy of the License at
//
//       http://www.apache.org/licenses/LICENSE-2.0
//
//   Unless required by applicable law or agreed to in writing, software
//   distributed under the License is distributed on an "AS IS" BASIS,
//   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//   See the License for the specific language governing permissions and
//   limitations under the License.

var DataOnOffState = require("dataonoff/DataOnOffState"),
    DBQueue = require("dataonoff/DBQueue"),
    OperationsConsumer = require("dataonoff/OperationsConsumer"),
    EventHandler = require("dataonoff/EventHandler");

/**

 * Send operations and receive changes from a DataOnOff server.
 *
 * @constructor
 * @param {string}
 *            serverUrl Where the DataOnOff server is located.
 * @param {function}
 *            changesCallback Callback to be called when changes are recived from the server.
 * @param {function|null}
 *            errorCallback Callback to be called when anything goes wrong.
 * @returns a new DataOnOff instance
 */
var DataOnOff = function(dataOnOffConfig) {
	var self = this;
    console.info('Starting DataOnOff ...');

    this.sendOperationToServer = function(operation) {
        console.info('DataOnOff.sendOperationToServer: ' + JSON.stringify(operation));
        this.operationsQueue.enqueue(operation);
    };

    this.manualServerSynchronization = function() {
        this.sendOperationToServer(JSON.stringify({
            "operation" : "__MANUAL_SYNC__"
        }));
    };

    if (validDataOnOffConfig(dataOnOffConfig)) {
        var retries = obtainRetriesSequence();
        var event = declareEventHandlers();
        var state = new DataOnOffState(event);
        console.info('DeviceId: ' + JSON.stringify(dataOnOffConfig.deviceId));
        this.operationsQueue = new DBQueue(dataOnOffConfig, event, state, retries);
        var consumer = new OperationsConsumer(dataOnOffConfig, event, state, this);
        this.operationsQueue.setConsumer(consumer);
        // Start DataOnOff server sync
        this.manualServerSynchronization();

        // Schedule server synchronization
        if (typeof dataOnOffConfig.scheduleServerSyncPeriod === 'number') {
            var period = dataOnOffConfig.scheduleServerSyncPeriod;
            console.info('Scheduling server synchoronization every ' + period / 1000 + ' seconds');
            scheduleServerSync(period, event, state);
        }
    }

    function declareEventHandlers() {
        var event = {};
        event.onLineServer = new EventHandler('onLineServer');
        event.offLineServer = new EventHandler('offLineServer');
        event.onLineNetwork = new EventHandler('onLineNetwork');
        event.offLineNetwork = new EventHandler('offLineNetwork');
        event.consumerReady = new EventHandler('consumerReady');
        event.idle = new EventHandler('idle');
        event.sending = new EventHandler('sending');
        event.receiving = new EventHandler('sending');
        event.retrying = new EventHandler('retrying');
        event.serverSync = new EventHandler('serverSync');
        event.processedOperation = new EventHandler('processedOperation');

        event.onLineServer.addEventListener(dataOnOffConfig.onOnLineCallback);
        event.offLineServer.addEventListener(dataOnOffConfig.onOffLineCallback);
        event.idle.addEventListener(dataOnOffConfig.onIdleStatusCallback);
        event.sending.addEventListener(dataOnOffConfig.onSendingOperationCallback);
        event.receiving.addEventListener(dataOnOffConfig.onReceivingChangesCallback);
        event.retrying.addEventListener(dataOnOffConfig.onRetryingChangesCallback);
        event.processedOperation.addEventListener(dataOnOffConfig.onProcessedOperation);

        // Event translator from Cordova events to ours one
        if (window.cordova) {
            document.addEventListener("online", function() {
                event.onLineNetwork.fireEvent();
            }, false);
            document.addEventListener("offline", function() {
                event.offLineNetwork.fireEvent();
            }, false);
        } else {
            // console.debug('Cordova events not avilable');
        }

        return event;
    }

    function obtainRetriesSequence() {
        var var1 = 0;
        var var2 = 500;
        var var3;

        var retries = [];
        do {
            var3 = var1 + var2;
            var1 = var2;
            var2 = var3;
            if (var3 < dataOnOffConfig.retryFaliledJSONPRequests) {
                retries.push(var3);
            }
        } while (var3 < dataOnOffConfig.retryFaliledJSONPRequests);
        retries.push(dataOnOffConfig.retryFaliledJSONPRequests);
        // console.debug("Retries at " + retries);
        return retries;
    }

    function validDataOnOffConfig(dataOnOffConfig) {
        if (typeof dataOnOffConfig !== 'object') {
            console.error("DataOnOff configuration must be provided");
            return false;
        }
        if (typeof dataOnOffConfig.serverUrl !== 'string') {
            console.error("DataOnOff server url must be provided");
            return false;
        }

        if (typeof dataOnOffConfig.deviceId !== 'object') {
            if (typeof window.device === 'object') {
                if ((typeof window.device.uuid === 'string') && (window.device.uuid !== '')) {
                    dataOnOffConfig.deviceId = {
                        deviceId : window.device.uuid
                    };
                }
            }
            if (typeof dataOnOffConfig.deviceId !== 'object') {
                console.error("DataOnOff deviceId must be provided");
                return false;
            }
        }
        if (typeof dataOnOffConfig.onChangesCallback !== 'function') {
            console.error("ChangesCallback should be declared");
            return false;
        }
        if (typeof dataOnOffConfig.storeVersionNumber !== 'function') {
            console.error("storeVersionNumber should be declared");
            return false;
        }
        if (typeof dataOnOffConfig.getVersionNumber !== 'function') {
            console.error("getVersionNumber should be declared");
            return false;
        }
        if (typeof dataOnOffConfig.retryFaliledJSONPRequests !== 'number') {
            console.info("Assuming 5 minutes for retrying JSONP requests.");
            dataOnOffConfig.retryFaliledJSONPRequests = 60 * 60 * 1000;
        }
        if (typeof dataOnOffConfig.onFatalError !== 'function') {
            dataOnOffConfig.onFatalError = function(msg) {
                console.error(msg);
            };
        }
        // Schedule server synchronization
        if ( (typeof dataOnOffConfig.scheduleServerSyncPeriod !== 'number') || (dataOnOffConfig.scheduleServerSyncPeriod <= 0)) {
            console.warn("dataOnOffConfig.scheduleServerSyncPeriod should be an integer value greater than zero.  "+
            		     "Disabling periodical server syncs.");
            dataOnOffConfig.scheduleServerSyncPeriod = undefined;
        }

        return true;
    }

    function scheduleServerSync(period, event, state) {
        var timeoutId = undefined;
        function periodicSync() {
            timeoutId = window.setTimeout(function() {
                if (!state.isIdle()) {
                    // console.debug('Already doing other things. Skipping server sync');
                } else {
                    // console.debug('Executing scheduled sync');
                    self.manualServerSynchronization();
                }
                periodicSync();
            }, period);
        }

        // When we receive changes from the server, schedule a newer synchronization
        event.serverSync.addEventListener(function() {
            window.clearTimeout(timeoutId);
            periodicSync();
        });
    }
};

module.exports = DataOnOff;