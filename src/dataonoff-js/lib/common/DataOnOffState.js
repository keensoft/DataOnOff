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
