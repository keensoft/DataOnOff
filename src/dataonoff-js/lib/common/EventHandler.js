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
