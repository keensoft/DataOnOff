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

var DataOnOffServer = require('dataonoff/DataOnOffServer');

var OperationsConsumer = function (dataOnOffConfig, event, state, dataOnOff) {
    var server = new DataOnOffServer(dataOnOffConfig, event, state);
    var onChangesCallback = dataOnOffConfig.onChangesCallback;

    event.onLineNetwork.addEventListener(function() {
        event.consumerReady.fireEvent();
    });

    this.consume = function(item, onProcessOperation, onTimeout) {
        // console.debug('Consuming operation: ' + item);
        var operation = JSON.parse(item);
        server.deliverOperationToServer(operation, function(operation, response) {
            onProcessOperation(operation, response);
            event.processedOperation.fireEvent(operation, response);
        }, onTimeout);
    };

    this.onEmptyQueue = function() {
        if (typeof onChangesCallback === 'function') {
            // console.debug('Receiving changes from server ...');
            server.reciveChangesFromServer(function onSuccess(serverChanges) {
                if (serverChanges) {
                    var currentVersion = dataOnOffConfig.getVersionNumber();
                    if (serverChanges.mobileVersionNumber === currentVersion) {
                        var changes = serverChanges.changes;
                        if (changes) {
                            onChangesCallback(changes);
                            event.serverSync.fireEvent();
                        }
                    } else {
                        console.warn("Changes version received from the server (" +
                                     serverChanges.mobileVersionNumber +
                                     ") doesn't match current version: " + currentVersion);
                        // Request a new sync
                        dataOnOff.manualServerSynchronization();
                    }
                }
            }, function onFailure() {
                dataOnOff.manualServerSynchronization();
            });
            // console.debug('... received changes from server');
        } else {
            console.warn('onChangesCallback: ' + typeof onChangesCallback);
        }
    };
};

module.exports = OperationsConsumer;