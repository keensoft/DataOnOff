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

var fs    = require('fs');
var util  = require('util');
var path  = require('path');

var packager = module.exports;

//------------------------------------------------------------------------------
packager.generate = function(commitId) {
    var time = new Date().valueOf();
    
    var libraryRelease = packager.bundle(false, commitId, true);
    var libraryDebug   = packager.bundle(true, commitId, true);
    
    time = new Date().valueOf() - time;
    
    var outFile;
    
    outFile = path.join('pkg', 'dataonoff.js');
    fs.writeFileSync(outFile, libraryRelease, 'utf8');
    
    outFile = path.join('pkg', 'dataonoff-debug.js');
    fs.writeFileSync(outFile, libraryDebug, 'utf8');
    
    console.log('generated in ' + time + 'ms');
};

//------------------------------------------------------------------------------
packager.bundle = function(debug, commitId, require) {
    var modules = collectFiles('lib/common');
    var scripts = collectFiles('lib/scripts');
    
    modules[''] = 'lib/DataOnOff.js';
    
    var output = [];
	
    output.push("// "  + commitId + "\n");
	output.push("// File generated at :: "  + new Date() + "\n");

    // write header     
    output.push('/*\n' + getContents('LICENSE-for-js-file.txt') + '\n*/');
    output.push('\n;(function() {\n');
    
    if (require) {
		// write initial scripts
		if (!scripts['require']) {
			throw new Error("didn't find a script for 'require'");
		}
		writeScript(output, scripts['require'], debug);
    }

    // write modules
    var moduleIds = Object.keys(modules);
    moduleIds.sort();
    
    console.log((debug ? 'DEBUG' : 'RELEASE') + ' bundle ...');
    for (var i=0; i<moduleIds.length; i++) {
        var moduleId = moduleIds[i];
        
        console.log('    ' + modules[moduleId]);
        writeModule(output, modules[moduleId], moduleId, debug);
    }

/*
    output.push("\nwindow.dataonoff = require('dataonoff');\n");
*/    
    // write final scripts
    if (!scripts['bootstrap']) {
        throw new Error("didn't find a script for 'bootstrap'");
    }
    
    writeScript(output, scripts['bootstrap'], debug);
/*    
    var bootstrapPlatform = 'bootstrap-' + platform
    if (scripts[bootstrapPlatform]) {
        writeScript(output, scripts[bootstrapPlatform], debug)
    }
*/
    // write trailer
    output.push('\n})();');

    return output.join('\n');
};

//------------------------------------------------------------------------------
var CollectedFiles = {};

function collectFiles(dir, id) {
    if (!id) id = '';
    
    if (CollectedFiles[dir]) {
        return copyProps({}, CollectedFiles[dir]);
    }

    var result = {};
    
    var entries = fs.readdirSync(dir);
    
    entries = entries.filter(function(entry) {
        if (entry.match(/\.js$/)) return true;
        
        var stat = fs.statSync(path.join(dir, entry));
        if (stat.isDirectory())  return true;
    });

    entries.forEach(function(entry) {
        var moduleId = path.join(id,  entry);
        var fileName = path.join(dir, entry);
        
        var stat = fs.statSync(fileName);
        if (stat.isDirectory()) {
            copyProps(result, collectFiles(fileName, moduleId));
        }
        else {
            moduleId         = getModuleId(moduleId);
            result[moduleId] = fileName;
        }
    });
    
    CollectedFiles[dir] = result;
    
    return copyProps({}, result);
}

//------------------------------------------------------------------------------
function writeScript(oFile, fileName, debug) {
    var contents = getContents(fileName, 'utf8');
    
    writeContents(oFile, fileName, contents, debug);
}

//------------------------------------------------------------------------------
function writeModule(oFile, fileName, moduleId, debug) {
    var contents = '\n' + getContents(fileName, 'utf8') + '\n';

	// Windows fix, '\' is an escape, but defining requires '/' -jm
    moduleId = path.join('dataonoff', moduleId).split("\\").join("/");
	
	
    
    var signature = 'function(require, exports, module)';
	
	
    
    contents = 'define("' + moduleId + '", ' + signature + ' {' + contents + '});\n';

    writeContents(oFile, fileName, contents, debug);
}

//------------------------------------------------------------------------------
var FileContents = {};

function getContents(file) {
    if (!FileContents.hasOwnProperty(file)) {
        FileContents[file] = fs.readFileSync(file, 'utf8');
    }
    
    return FileContents[file];
}

//------------------------------------------------------------------------------
function writeContents(oFile, fileName, contents, debug) {
    
    if (debug) {
        contents += '\n//@ sourceURL=' + fileName;
        
        contents = 'eval(' + JSON.stringify(contents) + ')';
        
        // this bit makes it easier to identify modules
        // with syntax errors in them
        var handler = 'console.log("exception: in ' + fileName + ': " + e);';
        handler += 'console.log(e.stack);';
        
        contents = 'try {' + contents + '} catch(e) {' + handler + '}';
    }
    
    else {
        contents = '// file: ' + fileName + '\n' + contents;
    }

    oFile.push(contents);
};

//------------------------------------------------------------------------------
function getModuleId(fileName) {
    return fileName.match(/(.*)\.js$/)[1];
};

//------------------------------------------------------------------------------
function copyProps(target, source) {
    for (var key in source) {
        if (!source.hasOwnProperty(key)) continue;
        
        target[key] = source[key];
    }
    
    return target;
}
