exports.getWindow = function() {
    return window;
}

exports.getJenkins = function() {
    var window = exports.getWindow();
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

exports.loadModule = function(pluginName, moduleName, onRegister, onRegisterTimeout) {
    var plugin = exports.getPlugin(pluginName);

    var module = plugin[moduleName];
    if (module) {
        // Module already loaded. This prob shouldn't happen.
        onRegister(module.exports);
        console.log("Unexpected call to 'loadModule' for a module (" + moduleName + ") that's already loaded.");
        return;
    }

    function waitForRegistration(loadingModule, onRegister, onRegisterTimeout) {
        if (typeof onRegisterTimeout !== "number") {
            onRegisterTimeout = 10000;
        }
        
        var timeoutObj = setTimeout(function () {
            // Timed out waiting on the module to load and register itself.
            if (!loadingModule.loaded) {
                // Call the on onRegister function and tell it we timed out
                onRegister({
                        loaded: false,
                        reason: 'timeout',
                        detail: "Please verify that the plugin '" + 
                            loadingModule.pluginName + "' is installed, and that " +
                            "it registers a module named '" + loadingModule.moduleName + "'"
                    }
                );
            }
        }, onRegisterTimeout);
        
        loadingModule.waitList.push({
            onRegister: onRegister,
            timeoutObj: timeoutObj
        });        
    }
    
    var loadingModule = getLoadingModule(plugin, moduleName);
    if (!loadingModule.waitList) {
        loadingModule.waitList = [];
    }
    loadingModule.pluginName = pluginName; 
    loadingModule.moduleName = moduleName; 
    loadingModule.loaded = false;
    
    waitForRegistration(loadingModule, onRegister, onRegisterTimeout);
    
    // Add the <script> element to the <head>
    var docHead = getHeadElement();
    var script = createElement('script');
    script.setAttribute('id', exports.toPluginModuleId(pluginName, moduleName));
    script.setAttribute('type', 'text/javascript');
    script.setAttribute('src', exports.toPluginModuleSrc(pluginName, moduleName));
    script.setAttribute('async', 'true');
    docHead.appendChild(script);
}

exports.notifyModuleRegistered = function(pluginName, moduleName, moduleExports) {
    var plugin = exports.getPlugin(pluginName);

    var module = plugin[moduleName];
    var loadingModule = getLoadingModule(plugin, moduleName);
    
    loadingModule.loaded = true;
    if (loadingModule.waitList) {
        for (var i = 0; i < loadingModule.waitList.length; i++) {
            var waiter = loadingModule.waitList[i];
            clearTimeout(waiter.timeoutObj);
            waiter.onRegister({
                loaded: true,
                exports: moduleExports
            });
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
    return getResURL() + '/' + pluginName + '/jsmodules/' + moduleName + '.js';
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
    var window = exports.getWindow();
    var docHead = window.document.getElementsByTagName("head");
    if (!docHead || docHead.length == 0) {
        throw 'No head element found in document.';
    }
    return docHead[0];
}

function createElement(name) {
    var document = exports.getWindow().document;
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
