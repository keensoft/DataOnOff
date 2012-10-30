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