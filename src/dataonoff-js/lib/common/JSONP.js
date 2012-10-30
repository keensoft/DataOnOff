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