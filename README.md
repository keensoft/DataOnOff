DataOnOff
===========

Introduction
------------
* Mobilize existing applications
* One development that runs on all mobile devices: iOS, Android, Blackberry and Desktop
* Heterogeneus evironments 
* Both connected and disconnected operations
* Developing a JavaScript library to be used in conjunction with PhoneGap/Cordova.
* Run mobile applications on a normal computer using Windows.

Getting Started with DataOnOff
------------

**DataOnOff from a 10.000 feet view**

* JavaScript library, compatible with Apache Cordova. May work in other environments, like Samsumg TV platform or similar.
* Designed
  * in a modular way
  * to be easy to use
* Many “work in progress” callbacks are provided to be used by the final application
* Everything is queued. It remains even if the device is powered off.

**Counter Sample – Mobile side**
* index.html
```javascript
  <script type="text/javascript" charset="utf-8" src="cordova-1.7.0.js"></script>
  <script type="text/javascript" charset="utf-8" src="dataonoff.js"></script>
  <script type="text/javascript" charset="utf-8" src="main.js"></script>
  
  window.onload = function() {
    if (!window.device)
      document.addEventListener("deviceready", onDeviceReady, false);
  }
```
* main.js
```javascript
  function onDeviceReady() {
    var currentVersionNumber = '';
    var dataOnOffConfig = {
      serverUrl : 'http://samples.dataonoff.org/counter/DataOnOff',
      onChangesCallback : function(changes) {
                              changesFromServer.onChanges(changes);
                          },
      storeVersionNumber : function(versionNumber) {
                              currentVersionNumber = versionNumber;
                          },
      getVersionNumber : function() {
                              return currentVersionNumber;
                          }
      };
    dataOnOff = new DataOnOff(dataOnOffConfig);
  }
```
* Sending an operation to the server
```javascript
  dataOnOff.sendOperationToServer(JSON.stringify({
      "operation" : "add",
      "value" : 1
  }));
```
* Receiving changes from the server
```javascript
  var changesFromServer = new ChangesFromServerProcessor();
  changesFromServer.changesProcessor.onDataChange = function(dataChange) {
      console.debug("main() - dataChange: " + JSON.stringify(dataChange));
      document.getElementById("counter").innerHTML = dataChange.value;
  };
```
