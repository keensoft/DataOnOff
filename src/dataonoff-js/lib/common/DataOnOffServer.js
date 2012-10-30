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

var JSONP = require("dataonoff/JSONP");

var DataOnOffServer = function (dataOnOffConfig, event, state) {
    var serverIsOnLine = undefined;
    var remoteUrlServer = dataOnOffConfig.serverUrl;
    var deviceId = JSON.stringify(dataOnOffConfig.deviceId);
    var getVersionNumber = dataOnOffConfig.getVersionNumber;
    var storeVersionNumber = dataOnOffConfig.storeVersionNumber;
    var onLineNetwork = undefined;

    event.onLineNetwork.addEventListener(function() {
        onLineNetwork = true;
    });
    event.offLineNetwork.addEventListener(function() {
        onLineNetwork = false;
        setOffLine();
    });

    this.deliverOperationToServer = function(operation, onDeliveredOperation, onUnavailableServer) {
        // console.debug('deliverOperationToServer sending operation: ' + JSON.stringify(operation));
        var url = remoteUrlServer + '/processOperation';
        var params = {
            operation : JSON.stringify(operation),
            deviceId : deviceId
        };
        if (onLineNetwork === false) {
            jsonpComunicationsFailure();
        } else {
            JSONP.get(url, params, function(response) {
                setOnLine();
                //console.info('operation: ' + JSON.stringify(operation) + ' procesed. response: ' +
                //        JSON.stringify(response));
                onDeliveredOperation(operation, response);
            }, function() {
                jsonpComunicationsFailure();
            });
        }

        function jsonpComunicationsFailure() {
            console.warn('DataOnOffServer unavailable. deliverOperationToServer:' + serverIsOnLine +
                    ', ' + JSON.stringify(params));
            setOffLine();
            onUnavailableServer();
        }
    };

    this.reciveChangesFromServer = function(reciveChangesCallback, onUnavailableServer) {
        state.receiving();
        var url = remoteUrlServer + '/getDataForMobileDevice';
        var params = {
            deviceId : deviceId,
            version : getVersionNumber()
        };
        JSONP.get(url, params, function(changes) {
            setOnLine();
            if (typeof changes !== 'undefined') {
                //console.info('DataOnOff.reciveChangesFromServer: ' + JSON.stringify(changes));
                reciveChangesCallback(changes);
                storeVersionNumber(changes.versionNumber);
            } else {
                // console.debug('DataOnOff.reciveChangesFromServer: no changes needed');
            }
            state.idle();
        }, function() {
            console.warn('DataOnOffServer unavailable. reciveChangesFromServer:' +
                    JSON.stringify(params) + ". Forcing synchronization");
            setOffLine();
            state.idle();
            onUnavailableServer();
        });
    };

    function setOnLine() {
        if ((typeof serverIsOnLine === 'undefined') || (!serverIsOnLine)) {
            serverIsOnLine = true;
            event.onLineServer.fireEvent();
        }
    }

    function setOffLine() {
        if ((typeof serverIsOnLine === 'undefined') || serverIsOnLine) {
            serverIsOnLine = false;
            event.offLineServer.fireEvent();
        }
    }
};

module.exports = DataOnOffServer;
