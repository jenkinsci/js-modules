var promise = require("./promise");
var windowHandle = require("window-handle");

exports.getJenkins = function() {
    var window = windowHandle.getWindow();
    if (!window.jenkinsCIGlobal) {
        window.jenkinsCIGlobal = {
            resURL: getResURL()
        };
    }
    return window.jenkinsCIGlobal;
}

exports.getPlugin = function(pluginName) {
    var plugins = exports.getPlugins();
    var plugin = plugins[pluginName];
    if (!plugin) {
        plugin = {};
        plugins[pluginName] = plugin;
    }
    return plugin;
}

exports.loadModule = function(pluginName, moduleName, onRegisterTimeout) {
    var plugin = exports.getPlugin(pluginName);

    var module = plugin[moduleName];
    if (module) {
        // Module already loaded. This prob shouldn't happen.
        console.log("Unexpected call to 'loadModule' for a module (" + moduleName + ") that's already loaded.");
        return promise.make(function (resolve) {
            resolve(module.exports);
        });
    }

    function waitForRegistration(loadingModule, onRegisterTimeout) {
        return promise.make(function (resolve, reject) {
            if (typeof onRegisterTimeout !== "number") {
                onRegisterTimeout = 10000;
            }
            
            var timeoutObj = setTimeout(function () {
                // Timed out waiting on the module to load and register itself.
                if (!loadingModule.loaded) {
                    var errorDetail = "Please verify that the plugin '" +
                        loadingModule.pluginName + "' is installed, and that " +
                        "it registers a module named '" + loadingModule.moduleName + "'";
                    
                    console.error('Plugin module load failure: ' + errorDetail);

                    // Call the reject function and tell it we timed out
                    reject({
                        reason: 'timeout',
                        detail: errorDetail
                    });
                }
            }, onRegisterTimeout);
            
            loadingModule.waitList.push({
                resolve: resolve,
                timeoutObj: timeoutObj
            });                    
        });
    }
    
    var loadingModule = getLoadingModule(plugin, moduleName);
    if (!loadingModule.waitList) {
        loadingModule.waitList = [];
    }
    loadingModule.pluginName = pluginName; 
    loadingModule.moduleName = moduleName;
    loadingModule.loaded = false;

    try {
        return waitForRegistration(loadingModule, onRegisterTimeout);
    } finally {
        // Add the <script> element to the <head>
        var docHead = getHeadElement();
        var script = createElement('script');
        script.setAttribute('id', exports.toPluginModuleId(pluginName, moduleName));
        script.setAttribute('type', 'text/javascript');
        script.setAttribute('src', exports.toPluginModuleSrc(pluginName, moduleName));
        script.setAttribute('async', 'true');
        docHead.appendChild(script);
    }
}

exports.notifyModuleExported = function(pluginName, moduleName, moduleExports) {
    var plugin = exports.getPlugin(pluginName);

    var module = plugin[moduleName];
    var loadingModule = getLoadingModule(plugin, moduleName);
    
    loadingModule.loaded = true;
    if (loadingModule.waitList) {
        for (var i = 0; i < loadingModule.waitList.length; i++) {
            var waiter = loadingModule.waitList[i];
            clearTimeout(waiter.timeoutObj);
            waiter.resolve(moduleExports);
        }
    }    
}

exports.getPlugins = function() {
    var jenkinsCIGlobal = exports.getJenkins();
    if (!jenkinsCIGlobal.plugins) {
        jenkinsCIGlobal.plugins = {};
    }
    return jenkinsCIGlobal.plugins;
}

exports.toPluginModuleId = function(pluginName, moduleName) {
    return 'jenkins-plugin-module:' + pluginName + ':' + moduleName;
}

exports.toPluginModuleSrc = function(pluginName, moduleName) {
    return getResURL() + '/plugin/' + pluginName + '/jsmodules/' + moduleName + '.js';
}

function getResURL() {
    var docHead = getHeadElement();
    var resURL = getAttribute(docHead, "resURL");

    if (!resURL) {
        throw "Attribute 'resURL' not defined on the document <head> element.";
    }
    return resURL;
}

function getHeadElement() {
    var window = windowHandle.getWindow();
    var docHead = window.document.getElementsByTagName("head");
    if (!docHead || docHead.length == 0) {
        throw 'No head element found in document.';
    }
    return docHead[0];
}

function createElement(name) {
    var document = windowHandle.getWindow().document;
    return document.createElement(name);
}

function getAttribute(element, attributeName) {
    var value = element.getAttribute(attributeName.toLowerCase());
    
    if (value) {
        return value;
    } else {
        // try without lowercasing
        element.getAttribute(attributeName);
    }    
}

function getLoadingModule(plugin, moduleName) {
    if (!plugin.loadingModules) {
        plugin.loadingModules = {};
    }
    if (!plugin.loadingModules[moduleName]) {
        plugin.loadingModules[moduleName] = {};
    }
    var loadingModule = plugin.loadingModules[moduleName];
    return loadingModule;
}
