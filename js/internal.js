var promise = require("./promise");
var windowHandle = require("window-handle");
var jenkinsCIGlobal;

exports.onReady = function(callback) {
    // This allows test based initialization of jenkins-modules when there might 
    // not yet be a global window object.
    if (jenkinsCIGlobal) {
        callback();
    } else {
        windowHandle.getWindow(function() {
            callback();
        });
    }    
}

exports.initJenkinsGlobal = function() {
    jenkinsCIGlobal = {
    };
};

exports.clearJenkinsGlobal = function() {    
    jenkinsCIGlobal = undefined;
};

exports.getJenkins = function() {
    if (jenkinsCIGlobal) {
        return jenkinsCIGlobal;
    }
    var window = windowHandle.getWindow();
    if (window.jenkinsCIGlobal) {
        jenkinsCIGlobal = window.jenkinsCIGlobal;
    } else {
        exports.initJenkinsGlobal();
        jenkinsCIGlobal.rootURL = getRootURL();
        window.jenkinsCIGlobal = jenkinsCIGlobal;
    }   
    return jenkinsCIGlobal;
};

exports.getPlugin = function(pluginName) {
    var plugins = exports.getPlugins();
    var plugin = plugins[pluginName];
    if (!plugin) {
        plugin = {};
        plugins[pluginName] = plugin;
    }
    return plugin;
};

exports.requireModule = function(moduleQName, onRegisterTimeout) {
    return promise.make(function (resolve, reject) {
        // getPlugin etc needs to access the 'window' global. We want to make sure that
        // exists before attempting to fulfill the require operation. It may not exists
        // immediately in a test env.
        windowHandle.getWindow(function() {
            var qNameTokens = moduleQName.split(":");
            
            if (qNameTokens.length != 2) {
                throw "'moduleQName' argument must contain 2 tokens i.e. '<pluginName>:<moduleName>'";
            }
    
            var pluginName = qNameTokens[0].trim();
            var moduleName = qNameTokens[1].trim();

            var plugin = exports.getPlugin(pluginName);
            var module = plugin[moduleName];
            if (module) {
                // module already loaded
                resolve(module.exports);
            } else {
                if (onRegisterTimeout === 0) {
                    throw 'Plugin module ' + pluginName + ':' + moduleName + ' require failure. Async load mode disabled.';
                }

                // module not loaded. Load async, fulfilling promise once registered
                exports.loadModule(pluginName, moduleName, onRegisterTimeout)
                    .then(function(moduleExports) {
                        resolve(moduleExports);
                    })
                    .catch(function(error) {
                        reject(error);
                    });
            }
        });
    });    
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
        var moduleId = exports.toPluginModuleId(pluginName, moduleName) + ':js';
        var document = windowHandle.getWindow().document;
        var script = document.getElementById(moduleId);

        // Add the <script> element to the <head> if it's not already there.
        if (!script) {
            var docHead = exports.getHeadElement();

            script = createElement('script');
            script.setAttribute('id', moduleId);
            script.setAttribute('type', 'text/javascript');
            script.setAttribute('src', exports.toPluginModuleSrc(pluginName, moduleName));
            script.setAttribute('async', 'true');
            docHead.appendChild(script);
        }
    }
};

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
};

exports.addModuleCSSToPage = function(pluginName, moduleName) {
    var cssElId = exports.toPluginModuleId(pluginName, moduleName) + ':css';
    var document = windowHandle.getWindow().document;
    var cssEl = document.getElementById(cssElId);
    
    if (cssEl) {
        // already added to page
        return;
    }

    var cssPath = exports.getJSModulesDir(pluginName) + '/' + moduleName + '/style.css';
    var docHead = exports.getHeadElement();
    cssEl = createElement('link');
    cssEl.setAttribute('id', cssElId);
    cssEl.setAttribute('type', 'text/css');
    cssEl.setAttribute('rel', 'stylesheet');
    cssEl.setAttribute('href', cssPath);
    docHead.appendChild(cssEl);
};

exports.getPlugins = function() {
    var jenkinsCIGlobal = exports.getJenkins();
    if (!jenkinsCIGlobal.plugins) {
        jenkinsCIGlobal.plugins = {};
    }
    return jenkinsCIGlobal.plugins;
};

exports.toPluginModuleId = function(pluginName, moduleName) {
    return 'jenkins-plugin-module:' + pluginName + ':' + moduleName;
};

exports.toPluginModuleSrc = function(pluginName, moduleName) {
    return exports.getJSModulesDir(pluginName) + '/' + moduleName + '.js';
};

exports.getJSModulesDir = function(pluginName) {
    return getRootURL() + '/plugin/' + pluginName + '/jsmodules';
};

exports.getHeadElement = function() {
    var window = windowHandle.getWindow();
    var docHead = window.document.getElementsByTagName("head");
    if (!docHead || docHead.length == 0) {
        throw 'No head element found in document.';
    }
    return docHead[0];
};

exports.setRootURL = function(url) {    
    if (!jenkinsCIGlobal) {
        exports.initJenkinsGlobal();
    }
    jenkinsCIGlobal.rootURL = url;
};

function getRootURL() {
    if (jenkinsCIGlobal && jenkinsCIGlobal.rootURL) {
        return jenkinsCIGlobal.rootURL;
    }
    
    var docHead = exports.getHeadElement();
    var resURL = getAttribute(docHead, "resURL");

    if (!resURL) {
        throw "Attribute 'resURL' not defined on the document <head> element.";
    }

    if (jenkinsCIGlobal) {
        jenkinsCIGlobal.rootURL = resURL;
    }
    
    return resURL;
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
        return element.getAttribute(attributeName);
    }    
}

function getLoadingModule(plugin, moduleName) {
    if (!plugin.loadingModules) {
        plugin.loadingModules = {};
    }
    if (!plugin.loadingModules[moduleName]) {
        plugin.loadingModules[moduleName] = {};
    }
    return plugin.loadingModules[moduleName];
}
