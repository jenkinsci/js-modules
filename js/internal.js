var promise = require("./promise");
var windowHandle = require("window-handle");
var jenkinsCIGlobal;
var globalInitListeners = [];
var whoami;

exports.whoami = function(moduleQName) {
    if (moduleQName) {
        whoami = exports.parseResourceQName(moduleQName);
        whoami.nsProvider = getBundleNSProviderFromScriptElement(whoami.namespace, whoami.moduleName);
    }
    return whoami;
};

exports.onReady = function(callback) {
    // This allows test based initialization of js-modules when there might 
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
    whoami = undefined;
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

exports.getModuleNamespaceObj = function(moduleSpec) {
    if (moduleSpec.namespace) {
        return exports.getNamespace(moduleSpec.namespace);
    } else {
        return exports.getGlobalModules();
    }
};

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
                        throw new Error('Module ' + moduleSpec.namespace + ':' + moduleSpec.moduleName + ' require failure. Async load mode disabled.');
                    } else {
                        throw new Error('Global module ' + moduleSpec.moduleName + ' require failure. Async load mode disabled.');
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
    var module = exports.getModule(moduleSpec);
    
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
    
    var moduleNamespaceObj = exports.getModuleNamespaceObj(moduleSpec);
    var loadModuleName = moduleSpec.getLoadBundleName();
    var loadVersion = moduleSpec.getLoadBundleVersion();
    var doScriptLoad = true;
    
    if (loadVersion) {
        // If a version was specified then we only do the script load if a
        // specific version was provided i.e. loading does not get triggered
        // by imports that specify non-specific version numbers e.g. "any"
        // or "1.2.x". A specific version number would be e.g. "1.2.3" i.e.
        // fully qualified. When loading is not triggered, the import is depending
        // on another import (with a specific version) or on another bundle to do an
        // export of an internal dependency i.e. on another bundle "providing"
        // the module by exporting it.
        doScriptLoad = loadVersion.isSpecific();
    }
    
    var loadingModule = getLoadingModule(moduleNamespaceObj, loadModuleName);
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
        if (doScriptLoad && moduleSpec.namespace) {
            var scriptId = exports.toModuleId(moduleSpec.namespace, loadModuleName) + ':js';
            var scriptSrc = exports.toModuleSrc(moduleSpec, 'js');
            var scriptEl = exports.addScript(scriptSrc, {
                scriptId: scriptId,
                scriptSrcBase: ''
            });

            if (scriptEl) {
                // Set the module spec info on the <script> element. This allows us to resolve the
                // nsProvider for that bundle after 'whoami' is called for it (as it loads). whoami
                // is not called with the nsProvider info on it because a given bundle can
                // potentially be loaded from multiple different ns providers, so we only resole the provider
                // at load-time i.e. just after a bundle is loaded it calls 'whoami' for itself
                // and then this module magically works out where it was loaded from (it's nsProvider)
                // by locating the <script> element and using this information. For a module/bundle, knowing
                // where it was loaded from is important because it dictates where that module/bundle
                // should load it dependencies from. For example, the Bootstrap module/bundle depends on the
                // jQuery bundle. So, if the bootstrap bundle is loaded from the 'core-assets' namespace provider,
                // then that means the jQuery bundle should also be loaded from the 'core-assets'
                // namespace provider.
                // See getBundleNSProviderFromScriptElement.
                scriptEl.setAttribute('data-jenkins-module-nsProvider', moduleSpec.nsProvider);
                scriptEl.setAttribute('data-jenkins-module-namespace', moduleSpec.namespace);
                scriptEl.setAttribute('data-jenkins-module-moduleName', loadModuleName);
            }
        }
    }
};

exports.addScript = function(scriptSrc, options) {
    if (!scriptSrc) {
        console.warn('Call to addScript with undefined "scriptSrc" arg.');
        return undefined;
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
        normalizedOptions.scriptSrcBase = '@root';
    }
    
    if (normalizedOptions.scriptSrcBase === '@root') {
        normalizedOptions.scriptSrcBase = getRootURL() + '/';
    } else if (normalizedOptions.scriptSrcBase === '@adjunct') {
        normalizedOptions.scriptSrcBase = getAdjunctURL() + '/';
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
    var moduleNamespaceObj = exports.getModuleNamespaceObj(moduleSpec);
    var loadingModule = getLoadingModule(moduleNamespaceObj, moduleSpec.getLoadBundleName());
    
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
    var moduleSpec = exports.getModuleSpec(namespace + ':' + moduleName);
    var cssElId = exports.toModuleId(namespace, moduleName) + ':css';
    var cssPath = exports.toModuleSrc(moduleSpec, 'css');
    return exports.addCSSToPage(namespace, cssPath, cssElId);
};

exports.addPluginCSSToPage = function(namespace, cssPath, cssElId) {
    var cssPath = exports.getPluginPath(namespace) + '/' + cssPath;
    return exports.addCSSToPage(namespace, cssPath, cssElId);
};

exports.toCSSId = function (cssPath, namespace) {
    return 'jenkins-js-module:' + (namespace || 'global' ) + ':css:' + cssPath;
};

exports.addCSSToPage = function(namespace, cssPath, cssElId) {
    var document = windowHandle.getWindow().document;
    
    if (cssElId === undefined) {
        cssElId = exports.toCSSId(cssPath, namespace);
    }
    
    var cssEl = document.getElementById(cssElId);
    
    if (cssEl) {
        // already added to page
        return;
    }

    var docHead = exports.getHeadElement();
    cssEl = createElement('link');
    cssEl.setAttribute('id', cssElId);
    cssEl.setAttribute('type', 'text/css');
    cssEl.setAttribute('rel', 'stylesheet');
    cssEl.setAttribute('href', cssPath);
    docHead.appendChild(cssEl);

    return cssEl;
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

exports.toModuleSrc = function(moduleSpec, srcType) {
    var nsProvider = moduleSpec.nsProvider;

    // If a moduleSpec on a module/bundle import doesn't specify a namespace provider
    // (i.e. is of the form "a:b" and not "core-assets/a:b"),
    // then check "this" bundles module spec and see if it was imported from a specific
    // namespace. If it was (e.g. 'core-assets'), then import from that namespace.
    if (nsProvider === undefined) {
        nsProvider = thisBundleNamespaceProvider();
        if (nsProvider === undefined) {
            nsProvider = 'adjuncts';
        }
        // Store the nsProvider back onto the moduleSpec.
        moduleSpec.nsProvider = nsProvider;
    }

    var srcPath = undefined;
    if (srcType === 'js') {
        srcPath = moduleSpec.getLoadBundleFileNamePrefix() + '.js';
    } else if (srcType === 'css') {
        srcPath = moduleSpec.moduleName + '/style.css';
    } else {
        throw new Error('Unsupported srcType "'+ srcType + '".');
    }

    if (nsProvider === 'adjuncts') {
        return exports.getAdjunctJSModulesPath(moduleSpec.namespace) + '/' + srcPath;
    } else if (nsProvider === 'plugin') {
        return exports.getPluginJSModulesPath(moduleSpec.namespace) + '/' + srcPath;
    } else if (nsProvider === 'core-assets') {
        return exports.getCoreAssetsJSModulesPath(moduleSpec.namespace) + '/' + srcPath;
    } else {
        throw new Error('Unsupported namespace provider: ' + nsProvider);
    }
};

exports.getAdjunctJSModulesPath = function(namespace) {
    if (namespace) {
        return getAdjunctURL() + '/org/jenkins/ui/jsmodules/' + namespace;
    } else {
        return getAdjunctURL() + '/org/jenkins/ui/jsmodules';
    }
};

exports.getPluginJSModulesPath = function(pluginId) {
    return exports.getPluginPath(pluginId) + '/jsmodules';
};

exports.getCoreAssetsJSModulesPath = function(namespace) {
    return getRootURL() + '/assets/' + namespace + '/jsmodules';
};

exports.getPluginPath = function(pluginId) {
    return getRootURL() + '/plugin/' + pluginId;
};

exports.getHeadElement = function() {
    var window = windowHandle.getWindow();
    var docHead = window.document.getElementsByTagName("head");
    if (!docHead || docHead.length == 0) {
        throw new Error('No head element found in document.');
    }
    return docHead[0];
};

exports.setRootURL = function(url) {    
    if (!jenkinsCIGlobal) {
        exports.initJenkinsGlobal();
    }
    jenkinsCIGlobal.rootURL = url;
};

exports.parseNPMName = function(resourceName) {
    if (resourceName.length > 1) {
        var npmName = {};
        var orgSlashIndex = resourceName.indexOf('/');
        
        if (resourceName.charAt(0) === '@' && orgSlashIndex > 0) {
            // It's an NPM org package. Strip off the org and package
            // and add it to the name. We'll get the rest then and parse
            // that.
            npmName.name = resourceName.substring(0, orgSlashIndex + 1);
            
            // Remove the org part from the name and continue parsing.
            resourceName = resourceName.substring(orgSlashIndex + 1);
        } else {
            // Initialise it so we can append to it below.
            npmName.name = '';
        }
        
        var versionIndex = resourceName.indexOf('@');
        if (versionIndex > 0) {
            npmName.name += resourceName.substring(0, versionIndex);
            npmName.version = resourceName.substring(versionIndex + 1);
        } else {
            npmName.name += resourceName;
        }
        
        return npmName;
    } else {
        return {
            name: resourceName
        }
    }
};

exports.parseNPMVersion = function(version) {
    if (!version) {
        return undefined;
    } else if (version === 'any') {
        // Return an empty object i.e. don't specify a major,
        // minor, patch etc.
        return {
            raw: 'any'
        };
    }
    
    function normalizeToken(string) {
        // remove anything that's not a digit, a dot or an x.
        var normalized = string.replace(/[^\d.x]/g, '');
        if (normalized === '') {
            return undefined;
        }
        return normalized;
    }
    
    var versionTokens = version.split('.');
    var parsedVer = {
        raw: version
    };
    
    parsedVer.prerelease = undefined;
    
    var patchAndPrerelease = '';
    for (var i = 2; i < versionTokens.length; i++) {
        if (patchAndPrerelease.length > 0) {
            patchAndPrerelease += '.';
        }
        patchAndPrerelease += versionTokens[i];
        
        var separatorIdx = patchAndPrerelease.indexOf('-');
        if (separatorIdx !== -1) {
            parsedVer.patch = normalizeToken(patchAndPrerelease.substring(0, separatorIdx));
            parsedVer.prerelease = patchAndPrerelease.substring(separatorIdx + 1);
        } else {
            parsedVer.patch = normalizeToken(patchAndPrerelease);
        }
    }
    
    if (versionTokens.length >= 2) {
        parsedVer.minor = normalizeToken(versionTokens[1]);
    }
    if (versionTokens.length >= 1) {
        parsedVer.major = normalizeToken(versionTokens[0]);
    }
    
    parsedVer.isSpecific = (parsedVer.major && parsedVer.minor && parsedVer.patch);
    
    return parsedVer;
};

function attachModuleCompatVersions(moduleSpec) {
    var versions = [];
    
    if (moduleSpec.moduleVersion) {
        var moduleVersionTokens = moduleSpec.moduleVersion.split('|');

        for (var i in moduleVersionTokens) {
            var moduleVersionToken = moduleVersionTokens[i].trim();
            var parsedVersion = exports.parseNPMVersion(moduleVersionToken);
            versions.push(parsedVersion);
        }
    }
    
    moduleSpec.moduleCompatVersions = versions;
    
    moduleSpec.getLoadBundleVersion = function() {
        if (versions.length === 0) {
            // If no versions were specified on the name, then we
            // just return undefined.
            return undefined;
        }
        // If a version is specified, we use the first "specific" version
        // e.g. "1.1.2" is specific while "1.1.x" and "any" are not.
        for (var i in versions) {
            var version = versions[i];
            if (version.isSpecific()) {
                return version;
            }
        }
        // If there's no specific version then we return the first
        // version in the list.
        return versions[0];
    };
    
    moduleSpec.getLoadBundleName = function() {
        var version = moduleSpec.getLoadBundleVersion();
        if (version) {
            return moduleSpec.moduleName + '@' + version.raw;
        } else {
            return moduleSpec.moduleName;
        }
    };

    moduleSpec.getLoadBundleFileNamePrefix = function() {
        var version = moduleSpec.getLoadBundleVersion();
        if (version) {
            // If a version was specified then we only do the script load if a
            // specific version was provided i.e. loading does not get triggered
            // by imports that specify non-specific version numbers e.g. "any"
            // or "1.2.x". A specific version number would be e.g. "1.2.3" i.e.
            // fully qualified. When loading is not triggered, the import is depending
            // on another import (with a specific version) or on a bundle do an
            // export of an internal dependency i.e. on another bundle "providing"
            // the module be exporting it.
            if (version.isSpecific()) {
                return moduleSpec.moduleName + '-' + version.raw.replace('.', '-');
            } else {
                return undefined;
            }
        } else {
            return moduleSpec.moduleName;
        }
    };
    
    return moduleSpec;
}

exports.parseResourceQName = function(resourceQName) {
    var qNameTokens = resourceQName.split(":");
    var moduleSpec;
    
    if (qNameTokens.length === 2) {
        var namespace = qNameTokens[0].trim();
        var nsTokens = namespace.split("/");
        var namespaceProvider = undefined;
        if (nsTokens.length === 2) {
            namespaceProvider = nsTokens[0].trim();
            namespace = nsTokens[1].trim();
            if (namespaceProvider !== 'plugin' && namespaceProvider !== 'core-assets') {
                console.error('Unsupported module namespace provider "' + namespaceProvider + '". Setting to undefined.');
                namespaceProvider = undefined;
            }
        }
        
        var npmName = exports.parseNPMName(qNameTokens[1].trim());
        moduleSpec = {
            nsProvider: namespaceProvider,
            namespace: namespace,
            moduleName: npmName.name,
            moduleVersion: npmName.version
        };
    } else {
        // The module/bundle is not in a namespace and doesn't
        // need to be loaded i.e. it will load itself and export.
        var npmName = exports.parseNPMName(qNameTokens[0].trim());

        moduleSpec = {
            moduleName: npmName.name,
            moduleVersion: npmName.version
        };
    }
    
    attachModuleCompatVersions(moduleSpec);
    
    return moduleSpec;
};

exports.getModule = function(moduleSpec) {
    var namespace = exports.getModuleNamespaceObj(moduleSpec);
    
    if (!moduleSpec.moduleVersion) {
        return namespace[moduleSpec.moduleName];
    } else {
        for (var i in moduleSpec.moduleCompatVersions) {
            var moduleCompatVersion = moduleSpec.moduleCompatVersions[i];
            var module = namespace[moduleSpec.moduleName + '@' + moduleCompatVersion.raw];
            if (module) {
                return module;
            }
        }
    }
    
    return undefined;
};

exports.getModuleSpec = function(moduleQName) {
    var moduleSpec = exports.parseResourceQName(moduleQName);
    var moduleNamespaceObj = exports.getModuleNamespaceObj(moduleSpec);
    if (moduleNamespaceObj) {
        var loading = getLoadingModule(moduleNamespaceObj, moduleSpec.getLoadBundleName());
        if (loading && loading.moduleSpec) {
            return loading.moduleSpec;
        }
    }
    return moduleSpec;
};

function getScriptId(scriptSrc, config) {
    if (typeof config === 'string') {
        return config;
    } else if (typeof config === 'object' && config.scriptId) {
        return config.scriptId;
    } else {
        return 'jenkins-script:' + scriptSrc;
    }    
}

exports.getRootURL = getRootURL;
function getRootURL() {
    if (jenkinsCIGlobal && jenkinsCIGlobal.rootURL) {
        return jenkinsCIGlobal.rootURL;
    }
    
    var docHead = exports.getHeadElement();
    var rootURL = getAttribute(docHead, "data-rooturl");

    if (rootURL === undefined || rootURL === null) {
        // Backward compatibility - used to use a 'resurl' attribute.
        rootURL = getAttribute(docHead, "resurl");
        if (rootURL === undefined || rootURL === null) {
            throw new Error("Attribute 'data-rooturl' not defined on the document <head> element.");
        }
    }

    if (jenkinsCIGlobal) {
        jenkinsCIGlobal.rootURL = rootURL;
    }
    
    return rootURL;
}

exports.getAdjunctURL = getAdjunctURL;
function getAdjunctURL() {
    if (jenkinsCIGlobal && jenkinsCIGlobal.adjunctURL) {
        return jenkinsCIGlobal.adjunctURL;
    }
    
    var docHead = exports.getHeadElement();
    var adjunctURL = getAttribute(docHead, "data-adjuncturl");

    if (adjunctURL === undefined || adjunctURL === null) {
        // Backward compatibility - older Jenkins do not have the adjunct url on the
        // <head> element. Lets try getting the resurl (older jenkins) and patching it 
        // to be an adjunct url.
        adjunctURL = getAttribute(docHead, "resurl");
        if (adjunctURL === undefined || adjunctURL === null) {
            throw new Error("Attribute 'data-adjuncturl' not defined on the document <head> element.");
        }
        // Replace the first occurrence of 'static/' with 'adjuncts/' 
        adjunctURL = adjunctURL.replace('static\/', 'adjuncts\/');
    }

    if (jenkinsCIGlobal) {
        jenkinsCIGlobal.adjunctURL = adjunctURL;
    }
    
    return adjunctURL;
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

function getLoadingModule(moduleNamespaceObj, moduleName) {
    if (!moduleNamespaceObj.loadingModules) {
        moduleNamespaceObj.loadingModules = {};
    }
    if (!moduleNamespaceObj.loadingModules[moduleName]) {
        moduleNamespaceObj.loadingModules[moduleName] = {};
    }
    return moduleNamespaceObj.loadingModules[moduleName];
}

function endsWith(string, suffix) {
    return (string.indexOf(suffix, string.length - suffix.length) !== -1);
}

function thisBundleNamespaceProvider() {
    if (whoami !== undefined) {
        return whoami.nsProvider;
    }
    return undefined;
}

function getBundleNSProviderFromScriptElement(namespace, moduleName) {
    var docHead = exports.getHeadElement();
    var scripts = docHead.getElementsByTagName("script");

    for (var i = 0; i < scripts.length; i++) {
        var script = scripts[i];
        var elNamespace = script.getAttribute('data-jenkins-module-namespace');
        var elModuleName = script.getAttribute('data-jenkins-module-moduleName');

        if (elNamespace === namespace && elModuleName === moduleName) {
            return script.getAttribute('data-jenkins-module-nsProvider');
        }
    }

    return undefined;
}
