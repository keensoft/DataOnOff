// commit ead9fa260cc075ac568f2e1c49c28541520be5af

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


;(function() {

// file: lib/scripts/require.js
var require = undefined,
    define = undefined;

(function () {
    var modules = {};

    function build(module) {
        var factory = module.factory;
        module.exports = {};
        delete module.factory;
        factory(require, module.exports, module);
        return module.exports;
    }

    require = function (id) {
        if (!modules[id]) {
            throw "module " + id + " not found";
        }
        return modules[id].factory ? build(modules[id]) : modules[id].exports;
    };

    define = function (id, factory) {
        if (modules[id]) {
            throw "module " + id + " already defined";
        }

        modules[id] = {
            id: id,
            factory: factory
        };
    };

    define.remove = function (id) {
        delete modules[id];
    };

})();

//Export for use in node
if (typeof module === "object" && typeof require === "function") {
    module.exports.require = require;
    module.exports.define = define;
}
// file: lib/DataOnOff.js
define("dataonoff", function(require, exports, module) {
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
});

// file: lib/common/DBQueue.js
define("dataonoff/DBQueue", function(require, exports, module) {
/**
 * DBQueue.js A function to represent a persistent queue
 */
var DBQueue = function (dataOnOffConfig, event, state, retries) {

    // Database storage
    var db = undefined;
    // Queue items consumer
    var consumer = undefined;
    // Timeout retry consume queue items
    var timeoutId = undefined;
    // Retry count
    var retryCnt = 0;

    initQueue(dataOnOffConfig);

    function initQueue(dataOnOffConfig) {
        if (typeof dataOnOffConfig.db === 'object') {
            db = dataOnOffConfig.db;
            console.info("DataOnOff is using provided database");
        } else {
            db = window.openDatabase('dataonoff', '1.0', "DataOnOff operations", 1024 * 1024);
        }
        populateDatabase(db);

        if (db === null) {
            console.error('Cannot open DBQueue database');
        } else {
            // console.debug('DBQueue database version \'' + db.version + '\' opened');
        }

        console.info('DBQueue initialized.');
    }

    function populateDatabase(db) {
        db.transaction(function(tx) {
            tx.executeSql('SELECT COUNT(*) FROM OPERATIONS', [], undefined, function(tx, e) {
                createTables(tx);
            });
        });
    }

    function createTables(tx) {
        // console.debug('DBQueue creating table OPERATIONS ...');
        var sql = 'CREATE TABLE IF NOT EXISTS OPERATIONS ' +
                  '(id INTEGER PRIMARY KEY AUTOINCREMENT, data TEXT)';
        tx.executeSql(sql, [], function(tx, rs) {
            // console.debug('DBQueue ... created table OPERATIONS');
        }, function(e) {
            console.error('DBQueue error creating table OPERATIONS: ' + e.code + ' ' + e.message);
        });
    }

    /**
     * Sets queue items consumer
     */
    this.setConsumer = function(_consumer) {
        consumer = _consumer;
        event.consumerReady.addEventListener(this.consumeQueueItems);
    };

    /**
     * Enqueues the specified item. The parameter is: item - the item to enqueue
     */
    this.enqueue = function(item) {
        // console.debug("DBQueue.enqueue: " + item);

        var self = this;
        db.transaction(function insert(tx) {
            tx.executeSql('INSERT INTO OPERATIONS(data) VALUES(?)', [ item ], function(tx, r) {
                // After storing the item, try to consume it immediately
                self.consumeQueueItems();
            }, function(tx, e) {
                console.error('DBQueue.enqueue error: ' + e.code + ' ' + e.message);
            });
        });
    };
    /**
     * Consume all queue items.
     */
    this.consumeQueueItems = function() {
        if (state.isRetrying()) {
            clearConsumeQueueItemsRetry();
        }
        if (!state.isSending()) {
            state.sending();
            _consumeQueueItems();
        } else {
            // console.debug("Already consuming queue items");
        }
    };

    function clearConsumeQueueItemsRetry() {
        // console.debug('Canceling retry: ' + timeoutId);
        window.clearTimeout(timeoutId);
        state.idle();
    }

    function _consumeQueueItems() {
        db.transaction(function(tx) {
            // Read head queue item
            var sql = 'SELECT id, data FROM OPERATIONS ORDER BY ID LIMIT 1';
            tx.executeSql(sql, [], function(tx, results) {
                if (results.rows.length === 0) {
                    state.idle();
                    fireOnEmptyQueue();
                } else {
                    var id = results.rows.item(0).id;
                    var data = results.rows.item(0).data;
                    consumeQueueItem(id, data);
                }
            }, function(tx, e) {
                state.error();
                dataOnOffConfig.onFatalError("DBQueue consumeQueueItems error: " + e.code + ' ' +
                          e.message);
            });
        });
        function consumeQueueItem(id, data) {
            consumer.consume(data, function(operation, response) {
                onItemConsumed();
                // console.debug('Item consumed ' + JSON.stringify(response) + ' ,response: '
                // + JSON.stringify(response));
            }, function() {
                state.retrying();
                timeoutId = window.setTimeout(function() {
                    // console.debug('Retry: ' + retryCnt);
                    _consumeQueueItems();
                }, retryTimeout(retryCnt++));
            });

            function retryTimeout(retryCnt) {
                if (retryCnt < retries.length) {
                    return retries[retryCnt];
                } else {
                    return retries[retries.length - 1];
                }
            }

            function onItemConsumed() {
                retryCnt = 0;
                removeItem(id, function() {
                    // Consume next queue item
                    _consumeQueueItems();
                }, function(msg) {
                    state.error();
                    dataOnOffConfig.onFatalError(msg);
                });
            }
        }

        function removeItem(id, onSuccess, onFailure) {
            db.transaction(function(tx) {
                // console.debug('DBQueue removing item #' + id);
                var sql = 'DELETE FROM OPERATIONS WHERE id = ?';
                tx.executeSql(sql, [ id ], onSuccess, function(tx, e) {
                    onFailure("DBQueue removeItem error: " + e.code + ' ' + e.message);
                });
            });
        }

        function fireOnEmptyQueue() {
            // console.debug('DBQueue - consumed all items');
            consumer.onEmptyQueue();
        }
    }
};

module.exports = DBQueue;
});

// file: lib/common/DataOnOffServer.js
define("dataonoff/DataOnOffServer", function(require, exports, module) {
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

});

// file: lib/common/DataOnOffState.js
define("dataonoff/DataOnOffState", function(require, exports, module) {
var DataOnOffState = function (event) {
    var IDLE = 0, SENDING = 1, RECEIVING = 2, RETRYING = 3, ERROR = -1;

    var currentstate = undefined;

    this.error = function() {
        if (currentstate !== ERROR) {
            currentstate = ERROR;
        }
    };
    this.isError = function() {
        return currentstate === ERROR;
    };
    this.idle = function() {
        if (currentstate !== IDLE) {
            currentstate = IDLE;
            // console.debug("currentstate: IDLE");
            event.idle.fireEvent();
        }
    };
    this.isIdle = function() {
        return currentstate === IDLE;
    };
    this.sending = function() {
        if (currentstate !== SENDING) {
            currentstate = SENDING;
            // console.debug("currentstate: SENDING");
            event.sending.fireEvent();
        }
    };
    this.isSending = function() {
        return currentstate === SENDING;
    };
    this.receiving = function() {
        if (currentstate !== RECEIVING) {
            currentstate = RECEIVING;
            // console.debug("currentstate: RECEIVING");
            event.receiving.fireEvent();
        }
    };
    this.isReceiving = function() {
        return currentstate === RECEIVING;
    };
    this.retrying = function() {
        if (currentstate !== RETRYING) {
            currentstate = RETRYING;
            // console.debug("currentstate: RETRYING");
            event.retrying.fireEvent();
        }
    };
    this.isRetrying = function() {
        return currentstate === RETRYING;
    };
};

module.exports = DataOnOffState;

});

// file: lib/common/EventHandler.js
define("dataonoff/EventHandler", function(require, exports, module) {
var EventHandler = function (event) {
    var handlers = [];

    this.addEventListener = function(handler) {
        if (typeof handler === 'function') {
            // console.debug('Registered new handler for events of type ' + event);
            handlers.push(handler);
        }
    };
    this.fireEvent = function(params) {
        var handlerParams = [];
        for ( var i = 0; i < arguments.length; i++) {
            handlerParams.push(arguments[i]);
        }

        // console.debug('Firing event of type ' + event
        // + (typeof params !== 'undefined' ? ' params:' + JSON.stringify(handlerParams) : ''));

        for ( var j = 0; j < handlers.length; j++) {
            handlers[j].apply(this, handlerParams);
        }
    };
};

module.exports = EventHandler;

});

// file: lib/common/JSONP.js
define("dataonoff/JSONP", function(require, exports, module) {
/**
 * Usage example: <code>
 *  var url = 'http://blog.eood.cn/api';
 *  var error = function() {
 *      alert('error');
 *  };
 *  var success = function(data) {
 *    // process the data
 *  };
 *  JSONP.get( url, {'parm1': 'parm1_value', 'parm2': 'parm2_value'}, success, error);
 </code>
 */
var JSONP = (function(global) {
    var counter = 0, head = false, window = global;

    function load(url, error) {
        // console.debug("JSONP.load " + url);
        var script = document.createElement('script');
        var done = false;
        script.src = url;
        script.async = true;

        script.onload = script.onreadystatechange = function() {
            var readyState = (!this.readyState || this.readyState === "loaded" || this.readyState === "complete");
            if (!done && readyState) {
                done = true;
                script.onload = script.onreadystatechange = null;
                if (script && script.parentNode) {
                    script.parentNode.removeChild(script);
                }
            }
        };
        script.onerror = function() {
            // call the error callback
            error();
        };
        if (!head) {
            head = document.getElementsByTagName('head')[0];
        }
        head.appendChild(script);
    }

    function jsonp(url, params, callback, error) {
        var query = "?";
        params = params || {};
        for ( var key in params) {
            if (params.hasOwnProperty(key)) {
                query += encodeURIComponent(key) + "=" + encodeURIComponent(params[key]) + "&";
            }
        }
        var _jsonp = "json" + (++counter);
        window[_jsonp] = function(data) {
            callback(data);
            try {
                delete window[_jsonp];
            } catch (e) {
            }
            window[_jsonp] = null;
        };

        var errorCalled = false;
        function fireErrorCallback() {
            if (!errorCalled) {
                errorCalled = true;
                if (typeof error === 'function') {
                    error();
                }
            }
        }

        load(url + query + "callback=" + _jsonp + '&random=' + Math.random(), fireErrorCallback);

        window.setTimeout(function() {
            if (typeof window[_jsonp] == "function") {

                // replace success with null callback in case the request is just very latent.
                window[_jsonp] = function(data) {
                    try {
                        delete window[_jsonp];
                    } catch (e) {
                    }
                    window[_jsonp] = null;
                };

                // call the error callback
                fireErrorCallback();

                // set a longer timeout to safely clean up the unused callback.
                window.setTimeout(function() {
                    if (typeof window[_jsonp] == "function") {
                        try {
                            delete window[_jsonp];
                        } catch (e) {
                        }
                        window[_jsonp] = null;
                    }
                }, 120000);
            }
        }, 10000);

        return jsonp;
    }
    return {
        get : jsonp
    };
}(this));

module.exports = JSONP;
});

// file: lib/common/OperationsConsumer.js
define("dataonoff/OperationsConsumer", function(require, exports, module) {
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
});

// file: lib/common/builder.js
define("dataonoff/builder", function(require, exports, module) {
function each(objects, func, context) {
    for (var prop in objects) {
        if (objects.hasOwnProperty(prop)) {
            func.apply(context, [objects[prop], prop]);
        }
    }
}

function include(parent, objects, clobber, merge) {
    each(objects, function (obj, key) {
        try {
          var result = obj.path ? require(obj.path) : {};

          if (clobber) {
              // Clobber if it doesn't exist.
              if (typeof parent[key] === 'undefined') {
                  parent[key] = result;
              } else if (typeof obj.path !== 'undefined') {
                  // If merging, merge properties onto parent, otherwise, clobber.
                  if (merge) {
                      recursiveMerge(parent[key], result);
                  } else {
                      parent[key] = result;
                  }
              }
              result = parent[key];
          } else {
            // Overwrite if not currently defined.
            if (typeof parent[key] == 'undefined') {
              parent[key] = result;
            } else if (merge && typeof obj.path !== 'undefined') {
              // If merging, merge parent onto result
              recursiveMerge(result, parent[key]);
              parent[key] = result;
            } else {
              // Set result to what already exists, so we can build children into it if they exist.
              result = parent[key];
            }
          }

          if (obj.children) {
            include(result, obj.children, clobber, merge);
          }
        } catch(e) {
          console.error('Exception building cordova JS globals: ' + e + ' for key "' + key + '"');
        }
    });
}

/**
 * Merge properties from one object onto another recursively.  Properties from
 * the src object will overwrite existing target property.
 *
 * @param target Object to merge properties into.
 * @param src Object to merge properties from.
 */
function recursiveMerge(target, src) {
    for (var prop in src) {
        if (src.hasOwnProperty(prop)) {
            if (typeof target.prototype !== 'undefined' && target.prototype.constructor === target) {
                // If the target object is a constructor override off prototype.
                target.prototype[prop] = src[prop];
            } else {
                target[prop] = typeof src[prop] === 'object' ? recursiveMerge(
                        target[prop], src[prop]) : src[prop];
            }
        }
    }
    return target;
}

module.exports = {
    build: function (objects) {
        return {
            intoButDontClobber: function (target) {
                include(target, objects, false, false);
            },
            intoAndClobber: function(target) {
                include(target, objects, true, false);
            },
            intoAndMerge: function(target) {
                include(target, objects, true, true);
            }
        };
    }
};

});

// file: lib/common/changes/ChangesFromServerProcessor.js
define("dataonoff/changes/ChangesFromServerProcessor", function(require, exports, module) {
var DataChangesFormServerProcessor = require('dataonoff/changes/DataChangesFormServerProcessor');

var ChangesFromServerProcessor = function () {
    this.changesProcessor = new DataChangesFormServerProcessor();
};

ChangesFromServerProcessor.prototype.onChanges = function(changes) {
    this.changesProcessor.onDataChanges(changes);
};

module.exports = ChangesFromServerProcessor;

});

// file: lib/common/changes/DataChangesFormServerProcessor.js
define("dataonoff/changes/DataChangesFormServerProcessor", function(require, exports, module) {
var DataChangesFormServerProcessor = function() {
    this.entitiesHandler = {};
};

DataChangesFormServerProcessor.prototype.addEntityHandler = function(entity, handler) {
    this.entitiesHandler[entity] = handler;
};

DataChangesFormServerProcessor.prototype.onDataChanges = function(dataChanges) {
    for ( var i = 0; i < dataChanges.length; i++) {
        var dataChange = dataChanges[i];
        if (dataChange) {
            this.onDataChange(dataChange);
        }
    }
};

DataChangesFormServerProcessor.prototype.onDataChange = function(dataChange) {
	//console.debug("Handling dataChange: " + JSON.stringify(dataChange));
	
    var entity = dataChange.entity;
    var entityHandler = this.entitiesHandler[entity];
    if (entityHandler) {
        var entityOperationHandler = entityHandler[dataChange.action];
        if (typeof entityOperationHandler === 'function') {
        	entityOperationHandler(dataChange);
        } else {
        	console.warn('Unknown operation entity handler.  Operation:' + dataChange.action + 
        			     ', Entity: ' + entity + 
        			     ', entityOperationHandler: ' + entityOperationHandler);
        }
    } else {
    	console.warn('You must declare an entityHandler for entity ' + entity  + 
    			     ', dataChange: '+ JSON.stringify(dataChange));
    }
};

module.exports = DataChangesFormServerProcessor;
});

// file: lib/common/common.js
define("dataonoff/common", function(require, exports, module) {
module.exports = {
    objects: {
        DataOnOff: {
            path: 'dataonoff'
        },
        ChangesFromServerProcessor : {
            path: 'dataonoff/changes/ChangesFromServerProcessor'
        },
        DataChangesFormServerProcessor : {
            path: 'dataonoff/changes/DataChangesFormServerProcessor'
        }
    }
};

});

// file: lib/scripts/bootstrap.js
(function (context) {
    var base = require('dataonoff/common'),
        builder = require('dataonoff/builder');

    // Drop the common globals into the window object, but be nice and don't overwrite anything.
    builder.build(base.objects).intoButDontClobber(context);

}(this));


})();