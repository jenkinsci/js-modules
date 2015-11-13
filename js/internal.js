var promise = require("./promise");
var windowHandle = require("window-handle");
var jenkinsCIGlobal;
var globalInitListeners = [];

exports.onReady = function(callback) {
    // This allows test based initialization of jenkins-js-modules when there might 
    // not yet be a global window object.
    if (jenkinsCIGlobal) {
        callback();
    } else {
        windowHandle.getWindow(function() {
            callback();
        });
    }    
};

exports.onJenkinsGlobalInit = function(callback) {
    globalInitListeners.push(callback);
};

exports.initJenkinsGlobal = function() {
    jenkinsCIGlobal = {
    };
    if (globalInitListeners) {
        for (var i = 0; i < globalInitListeners.length; i++) {
            globalInitListeners[i](jenkinsCIGlobal);
        }
    }
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

exports.getModuleNamespace = function(moduleSpec) {
    if (moduleSpec.namespace) {
        return exports.getNamespace(moduleSpec.namespace);
    } else {
        return exports.getGlobalModules();
    }
}

exports.getNamespace = function(namespaceName) {
    var namespaces = exports.getNamespaces();
    var namespace = namespaces[namespaceName];
    if (!namespace) {
        namespace = {
            globalNS: false            
        };
        namespaces[namespaceName] = namespace;
    }
    return namespace;
};

exports.import = function(moduleQName, onRegisterTimeout) {
    return promise.make(function (resolve, reject) {
        // Some functions here needs to access the 'window' global. We want to make sure that
        // exists before attempting to fulfill the require operation. It may not exists
        // immediately in a test env.
        exports.onReady(function() {
            var moduleSpec = exports.parseResourceQName(moduleQName);
            var module = exports.getModule(moduleSpec);
            
            if (module) {
                // module already loaded
                resolve(module.exports);
            } else {
                if (onRegisterTimeout === 0) {
                    if (moduleSpec.namespace) {
                        throw 'Module ' + moduleSpec.namespace + ':' + moduleSpec.moduleName + ' require failure. Async load mode disabled.';
                    } else {
                        throw 'Global module ' + moduleSpec.moduleName + ' require failure. Async load mode disabled.';
                    }
                }

                // module not loaded. Load async, fulfilling promise once registered
                exports.loadModule(moduleSpec, onRegisterTimeout)
                    .onFulfilled(function (moduleExports) {
                        resolve(moduleExports);
                    })
                    .onRejected(function (error) {
                        reject(error);
                    });
            }
        });
    });    
};

exports.loadModule = function(moduleSpec, onRegisterTimeout) {
    var moduleNamespace = exports.getModuleNamespace(moduleSpec);
    var module = moduleNamespace[moduleSpec.moduleName];
    
    if (module) {
        // Module already loaded. This prob shouldn't happen.
        console.log("Unexpected call to 'loadModule' for a module (" + moduleSpec.moduleName + ") that's already loaded.");
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
                    var moduleSpec = loadingModule.moduleSpec;
                    var errorDetail;
                    
                    if (moduleSpec.namespace) {
                        errorDetail = "Timed out waiting on module '" + moduleSpec.namespace + ":" + moduleSpec.moduleName + "' to load.";
                    } else {
                        errorDetail = "Timed out waiting on global module '" + moduleSpec.moduleName + "' to load.";
                    }                    
                    console.error('Module load failure: ' + errorDetail);

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
    
    var loadingModule = getLoadingModule(moduleNamespace, moduleSpec.moduleName);
    if (!loadingModule.waitList) {
        loadingModule.waitList = [];
    }
    loadingModule.moduleSpec = moduleSpec; 
    loadingModule.loaded = false;

    try {
        return waitForRegistration(loadingModule, onRegisterTimeout);
    } finally {
        // We can auto/dynamic load modules in a non-global namespace. Global namespace modules
        // need to make sure they load themselves (via an adjunct, or whatever).
        if (moduleSpec.namespace) {
            var scriptId = exports.toModuleId(moduleSpec.namespace, moduleSpec.moduleName) + ':js';
            var scriptSrc = exports.toModuleSrc(moduleSpec.namespace, moduleSpec.moduleName);
            exports.addScript(scriptSrc, {
                scriptId: scriptId,
                scriptSrcBase: ''
            });
        }
    }
};

exports.addScript = function(scriptSrc, options) {
    if (!scriptSrc) {
        console.warn('Call to addScript with undefined "scriptSrc" arg.');
        return;
    }    
    
    var normalizedOptions;
    
    // If there's no options object, create it.
    if (typeof options === 'object') {
        normalizedOptions = options;
    } else {
        normalizedOptions = {};
    }
    
    // May want to transform/map some urls.
    if (normalizedOptions.scriptSrcMap) {
        if (typeof normalizedOptions.scriptSrcMap === 'function') {
            scriptSrc = normalizedOptions.scriptSrcMap(scriptSrc);
        } else if (Array.isArray(normalizedOptions.scriptSrcMap)) {
            // it's an array of suffix mappings
            for (var i = 0; i < normalizedOptions.scriptSrcMap.length; i++) {
                var mapping = normalizedOptions.scriptSrcMap[i];
                if (mapping.from && mapping.to) {
                    if (endsWith(scriptSrc, mapping.from)) {
                        normalizedOptions.originalScriptSrc = scriptSrc;
                        scriptSrc = scriptSrc.replace(mapping.from, mapping.to);
                        break;
                    }
                }
            }
        }
    }
    
    normalizedOptions.scriptId = getScriptId(scriptSrc, options);
    
    // set some default options
    if (normalizedOptions.async === undefined) {
        normalizedOptions.async = true;
    }
    if (normalizedOptions.scriptSrcBase === undefined) {
        normalizedOptions.scriptSrcBase = getRootURL() + '/';
    }

    var document = windowHandle.getWindow().document;
    var head = exports.getHeadElement();
    var script = document.getElementById(normalizedOptions.scriptId);

    if (script) {
        var replaceable = script.getAttribute('data-replaceable');
        if (replaceable && replaceable === 'true') {
            // This <script> element is replaceable. In this case, 
            // we remove the existing script element and add a new one of the
            // same id and with the specified src attribute.
            // Adding happens below.
            script.parentNode.removeChild(script);
        } else {
            return undefined;
        }
    }

    script = createElement('script');

    // Parts of the following onload code were inspired by how the ACE editor does it,
    // as well as from the follow SO post: http://stackoverflow.com/a/4845802/1166986
    var onload = function (_, isAborted) {
        script.setAttribute('data-onload-complete', true);
        try {
            if (isAborted) {
                console.warn('Script load aborted: ' + scriptSrc);
            } else if (!script.readyState || script.readyState === "loaded" || script.readyState === "complete") {
                // If the options contains an onload function, call it.
                if (typeof normalizedOptions.success === 'function') {
                    normalizedOptions.success(script);
                }
                return;
            }
            if (typeof normalizedOptions.error === 'function') {
                normalizedOptions.error(script, isAborted);
            }
        } finally {
            if (normalizedOptions.removeElementOnLoad) {
                head.removeChild(script);
            }
            // Handle memory leak in IE
            script = script.onload = script.onreadystatechange = null;
        }
    };
    script.onload = onload; 
    script.onreadystatechange = onload;

    script.setAttribute('id', normalizedOptions.scriptId);
    script.setAttribute('type', 'text/javascript');
    script.setAttribute('src', normalizedOptions.scriptSrcBase + scriptSrc);
    if (normalizedOptions.originalScriptSrc) {
        script.setAttribute('data-referrer', normalizedOptions.originalScriptSrc);        
    }
    if (normalizedOptions.async) {
        script.setAttribute('async', normalizedOptions.async);
    }
    
    head.appendChild(script);
    
    return script;
};

exports.notifyModuleExported = function(moduleSpec, moduleExports) {
    var moduleNamespace = exports.getModuleNamespace(moduleSpec);
    var loadingModule = getLoadingModule(moduleNamespace, moduleSpec.moduleName);
    
    loadingModule.loaded = true;
    if (loadingModule.waitList) {
        for (var i = 0; i < loadingModule.waitList.length; i++) {
            var waiter = loadingModule.waitList[i];
            clearTimeout(waiter.timeoutObj);
            waiter.resolve(moduleExports);
        }
    }    
};

exports.addModuleCSSToPage = function(namespace, moduleName) {
    var cssElId = exports.toModuleId(namespace, moduleName) + ':css';
    exports.addPluginCSSToPage(namespace, 'jsmodules/' + moduleName + '/style.css', cssElId);
};

exports.addPluginCSSToPage = function(namespace, cssPath, cssElId) {
    var document = windowHandle.getWindow().document;
    
    if (!cssElId) {
        cssElId = 'jenkins-plugin:' + namespace + ':' + ':css:' + cssPath;
    }
    
    var cssEl = document.getElementById(cssElId);
    
    if (cssEl) {
        // already added to page
        return;
    }

    var cssPath = exports.getPluginPath(namespace) + '/' + cssPath;
    var docHead = exports.getHeadElement();
    cssEl = createElement('link');
    cssEl.setAttribute('id', cssElId);
    cssEl.setAttribute('type', 'text/css');
    cssEl.setAttribute('rel', 'stylesheet');
    cssEl.setAttribute('href', cssPath);
    docHead.appendChild(cssEl);
};

exports.getGlobalModules = function() {
    var jenkinsCIGlobal = exports.getJenkins();
    if (!jenkinsCIGlobal.globals) {
        jenkinsCIGlobal.globals = {
            globalNS: true
        };
    }
    return jenkinsCIGlobal.globals;
};

exports.getNamespaces = function() {
    var jenkinsCIGlobal = exports.getJenkins();

    // The namespaces are stored in an object named "plugins". This is a legacy from the
    // time when all modules lived in plugins. By right we'd like to rename this, but
    // that would cause compatibility issues.

    if (!jenkinsCIGlobal.plugins) {
        jenkinsCIGlobal.plugins = {
            __README__: 'This object holds namespaced JS modules/bundles, with the property names representing the module namespace. It\'s name ("plugins") is a legacy thing. Changing it to a better name (e.g. "namespaces") would cause compatibility issues.'
        };
    }
    return jenkinsCIGlobal.plugins;
};

exports.toModuleId = function(namespace, moduleName) {
    return 'jenkins-js-module:' + namespace + ':' + moduleName;
};

exports.toModuleSrc = function(namespace, moduleName) {
    return exports.getPluginJSModulesPath(namespace) + '/' + moduleName + '.js';
};

exports.getPluginJSModulesPath = function(namespace) {
    return exports.getPluginPath(namespace) + '/jsmodules';
};

exports.getPluginPath = function(namespace) {
    return getRootURL() + '/plugin/' + namespace;
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

exports.parseResourceQName = function(resourceQName) {
    var qNameTokens = resourceQName.split(":");
    if (qNameTokens.length === 2) {
        return {
            namespace: qNameTokens[0].trim(),
            moduleName: qNameTokens[1].trim()
        };
    } else {
        // The module/bundle is not in a namespace and doesn't
        // need to be loaded i.e. it will load itself and export.
        return {
            moduleName: qNameTokens[0].trim()
        };
    }
}

exports.getModule = function(moduleSpec) {
    if (moduleSpec.namespace) {
        var plugin = exports.getNamespace(moduleSpec.namespace);
        return plugin[moduleSpec.moduleName];
    } else {
        var globals = exports.getGlobalModules();
        return globals[moduleSpec.moduleName];
    }
}

function getScriptId(scriptSrc, config) {
    if (typeof config === 'string') {
        return config;
    } else if (typeof config === 'object' && config.scriptId) {
        return config.scriptId;
    } else {
        return 'jenkins-script:' + scriptSrc;
    }    
}

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

function getLoadingModule(moduleNamespace, moduleName) {
    if (!moduleNamespace.loadingModules) {
        moduleNamespace.loadingModules = {};
    }
    if (!moduleNamespace.loadingModules[moduleName]) {
        moduleNamespace.loadingModules[moduleName] = {};
    }
    return moduleNamespace.loadingModules[moduleName];
}

function endsWith(string, suffix) {
    return (string.indexOf(suffix, string.length - suffix.length) !== -1);
}
