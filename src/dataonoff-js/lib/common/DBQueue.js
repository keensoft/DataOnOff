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