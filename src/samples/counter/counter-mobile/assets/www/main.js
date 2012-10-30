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

function onMenuKeyDown() {
	// console.debug('event - onMenuKeyDown');
	navigator.app.exitApp();
}

function server(msg, color) {
	if (typeof color !== 'undefined') {
		document.getElementById("server").style.background = color;
	}
	if (typeof status !== 'undefined') {
		document.getElementById("server").innerHTML = msg;
	}
}

function status(msg) {
	if (typeof status !== 'undefined') {
		document.getElementById("status").innerHTML = msg;
	}
}

function addOne() {
	dataOnOff.sendOperationToServer(JSON.stringify({
		"operation" : "add",
		"value" : 1
	}));
}

function subtractOne() {
	dataOnOff.sendOperationToServer(JSON.stringify({
		"operation" : "add",
		"value" : -1
	}));
}

function downloadSomeFiles() {
	download("counter/dataonoff.counter.sample.lnx.amd64.tar.gz");
	download("counter/dataonoff.counter.sample.lnx.i386.tar.gz");
	download("catalog/dataonoff.catalog.sample.lnx.amd64.tar.gz");
	download("catalog/dataonoff.catalog.sample.lnx.i386.tar.gz");

	function download(file) {
		var url = "http://samples.dataonoff.org/" + file;
		var filePath = "/tmp/" + file;

		var fileTransfer = new FileTransfer();
		fileTransfer.download(url, filePath, function(entry) {
			console.debug("download complete: " + entry.fullPath);
		}, function(error) {
			console.error("download " + file + " failed. error code " + error.code);
		});
	}
}

var changesFromServer = new ChangesFromServerProcessor();
changesFromServer.changesProcessor.onDataChange = function(dataChange) {
	console.debug("main() - dataChange: " + JSON.stringify(dataChange));
	document.getElementById("counter").innerHTML = dataChange.value;
};

var dataOnOff = null;
function onDeviceReady() {
	// console.debug('event - onDeviceReady');

	document.addEventListener("menubutton", onMenuKeyDown, false);

	// console.debug("Creating DataOnOff object ....");

	var currentVersionNumber = '';
	var dataOnOffConfig = {
		//serverUrl : 'http://localhost:8080/counter-server/DataOnOff',
		serverUrl : 'http://samples.dataonoff.org/counter/DataOnOff',

		// scheduleServerSyncPeriod : 5 * 1000,

		onChangesCallback : function(changes) {
			changesFromServer.onChanges(changes);
		},

		onProcessedOperation : function(operation, response) {
			console.debug("onProcessedOperation() - operation:" + JSON.stringify(operation) + ', response:'
					+ JSON.stringify(response));
			if (response === 'OK') {
				document.getElementById("counter").style.background = '#FFA';
			} else {
				document.getElementById("counter").style.background = '#FF0000';
			}
		},

		onFatalError : function(error) {
			server(error, '#AA0000');
		},

		onOnLineCallback : function() {
			server('Connected to server', '#004400');
		},

		onOffLineCallback : function() {
			server('Server connection is lost', '#AA0000');
		},

		onIdleStatusCallback : function() {
			status('');
		},

		onSendingOperationCallback : function() {
			status('Sending operations ...');
		},

		onReceivingChangesCallback : function() {
			status('Receiving changes ...');
		},

		onRetryingChangesCallback : function() {
			status('Trying to restore link ...');
		},

		storeVersionNumber : function(versionNumber) {
			currentVersionNumber = versionNumber;
		},

		getVersionNumber : function() {
			return currentVersionNumber;
		}
	};
	dataOnOff = new DataOnOff(dataOnOffConfig);
	// console.debug(".... created DataOnOff object");

	server('Getting server state&nbsp;...');
}