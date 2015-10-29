var internal = require("./internal");
var promise = require("./promise");
var onRegisterTimeout;

/**
 * Asynchronously import/require a set of modules.
 *
 * <p>
 * Responsible for triggering the async loading of modules from plugins if
 * a given module is not already loaded.
 *
 * @param moduleQNames... A list of module "qualified" names, each containing the module name prefixed with the Jenkins plugin name
 * separated by a colon i.e. "<pluginName>:<moduleName>" e.g. "jquery:jquery2".
 *
 * @return A Promise, allowing async load of all modules. The promise is only fulfilled when all modules are loaded.
 */
exports.import = function() {
    if (arguments.length === 1) {
        return internal.import(arguments[0], onRegisterTimeout);        
    }
    
    var moduleQNames = [];    
    for (var i = 0; i < arguments.length; i++) {
        var argument = arguments[i];
        if (typeof argument === 'string') {
            moduleQNames.push(argument);
        }
    }
    
    if (moduleQNames.length == 0) {
        throw "No plugin module names specified.";
    }
    
    return promise.make(function (resolve, reject) {
        var fulfillments = [];
        
        function onFulfillment() {
            if (fulfillments.length === moduleQNames.length) {
                var modules = [];
                for (var i = 0; i < fulfillments.length; i++) {
                    if (fulfillments[i].value) {
                        modules.push(fulfillments[i].value);
                    } else {
                        // don't have everything yet so can't fulfill all.
                        return;
                    }
                }
                // If we make it here, then we have fulfilled all individual promises, which 
                // means we can now fulfill the top level import promise.
                resolve(modules);
            }
        }        
        
        // doRequire for each module
        for (var i = 0; i < moduleQNames.length; i++) {           
            function doRequire(moduleQName) {
                var promise = internal.import(moduleQName, onRegisterTimeout);
                var fulfillment = {
                    promise: promise,
                    value: undefined
                };
                fulfillments.push(fulfillment);
                promise
                    .onFulfilled(function(value) {
                        fulfillment.value = value;
                        onFulfillment();
                    })
                    .onRejected(function(error) {
                        reject(error);
                    });
            }
            doRequire(moduleQNames[i]);
        }
    }).applyArgsOnFulfill();    
};

/**
 * Synchronously "require" a module that it already loaded/registered.
 *
 * <p>
 * This function will throw an error if the module is not already loaded via an outer call to 'import'
 * (or 'import').
 *
 * @param moduleQName The module "qualified" name containing the module name prefixed with the Jenkins plugin name
 * separated by a colon i.e. "<pluginName>:<moduleName>" e.g. "jquery:jquery2".
 *
 * @return The module.
 */
exports.require = function(moduleQName) {
    var parsedModuleName = internal.parseModuleQName(moduleQName);
    var module = internal.getModule(parsedModuleName);    
    if (!module) {
        throw "Unable to perform synchronous 'require' for module '" + moduleQName + "'. This module is not pre-loaded. " +
            "The module needs to have been asynchronously pre-loaded via an outer call to 'import'.";
    }
    return module.exports;
}

/**
 * Export a module.
 * 
 * @param pluginName The Jenkins plugin in which the module resides, or "undefined" if the modules is in
 * the "global" module namespace e.g. a Jenkins core bundle.
 * @param moduleName The name of the module. 
 * @param module The CommonJS style module, or "undefined" if we just want to notify other modules waiting on
 * the loading of this module.
 * @param onError On error callback;
 */
exports.export = function(pluginName, moduleName, module, onError) {
    internal.onReady(function() {
        try {
            var moduleSpec = {pluginName: pluginName, moduleName: moduleName};
            var moduleNamespace = internal.getModuleNamespace(moduleSpec);
            
            if (moduleNamespace[moduleName]) {
                if (pluginName) {
                    throw "Jenkins plugin module '" + pluginName + ":" + moduleName + "' already registered.";
                } else {
                    throw "Jenkins global module '" + moduleName + "' already registered.";
                }
            }
            
            if (!module) {
                module = {
                    exports: {}
                };
            } else if (module.exports === undefined) {
                module = {
                    exports: module
                };
            }
            moduleNamespace[moduleName] = module;
            
            // Notify all that the module has been registered. See internal.loadModule also.
            internal.notifyModuleExported(moduleSpec, module.exports);
        } catch (e) {
            console.error(e);
            if (onError) {
                onError(e);
            }
        }
    });
};

/**
 * Add a module's CSS to the browser page.
 * 
 * <p>
 * The assumption is that the CSS can be accessed at
 * {@code <rootURL>/plugin/<pluginName>/jsmodules/<moduleName>/style.css}
 * 
 * @param pluginName The Jenkins plugin in which the module resides.
 * @param moduleName The name of the module. 
 * @param onError On error callback;
 */
exports.addModuleCSSToPage = function(pluginName, moduleName, onError) {
    internal.onReady(function() {
        try {
            internal.addModuleCSSToPage(pluginName, moduleName);
        } catch (e) {
            console.error(e);
            if (onError) {
                onError(e);
            }
        }
    });
};

/**
 * Add a plugin CSS file to the browser page.
 * 
 * @param pluginName The Jenkins plugin in which the module resides.
 * @param moduleName The name of the module. 
 * @param onError On error callback;
 */
exports.addPluginCSSToPage = function(pluginName, cssPath, onError) {
    internal.onReady(function() {
        try {
            internal.addPluginCSSToPage(pluginName, cssPath);
        } catch (e) {
            console.error(e);
            if (onError) {
                onError(e);
            }
        }
    });
};

/**
 * Add a javascript &lt;script&gt; element to the document &lt;head&gt;.
 * <p/>
 * Options:
 * <ul>
 *     <li><strong>scriptId</strong>: The script Id to use for the element. If not specified, one will be generated from the scriptSrc.</li>
 *     <li><strong>async</strong>: Asynchronous loading of the script. Default is 'true'.</li>
 *     <li><strong>success</strong>: An optional onload success function for the script element.</li>
 *     <li><strong>error</strong>: An optional onload error function for the script element. This is called if the .js file exists but there's an error evaluating the script. It is NOT called if the .js file doesn't exist (ala 404).</li>
 *     <li><strong>removeElementOnLoad</strong>: Remove the script element after loading the script. Default is 'false'.</li>
 * </ul>
 * 
 * @param scriptSrc The script src.
 * @param options Optional script load options object. See above.
 */
exports.addScript = function(scriptSrc, options) {
    internal.onReady(function() {
        internal.addScript(scriptSrc, options);
    });    
};

/**
 * Set the module registration timeout i.e. the length of time to wait for a module to load before failing.
 *
 * @param timeout Millisecond duration before onRegister times out. Defaults to 10000 (10s) if not specified.
 */
exports.setRegisterTimeout = function(timeout) {
    onRegisterTimeout = timeout;
}

/**
 * Set the Jenkins root/base URL.
 * 
 * @param rootUrl The root/base URL.
 */
exports.setRootURL = function(rootUrl) {
    internal.setRootURL(rootUrl);
};

/**
 * Manually initialise the Jenkins Global.
 * <p>
 * This should only ever be called from a test environment.
 */
exports.initJenkinsGlobal = function() {
    internal.initJenkinsGlobal();
};

internal.onJenkinsGlobalInit(function(jenkinsCIGlobal) {
    // For backward compatibility, we need to make some jenkins-js-modules
    // functions globally available e.g. to allow legacy code wait for
    // certain modules to be loaded, as with legacy adjuncts.
    if (!jenkinsCIGlobal._internal) {
        // Put the functions on an object called '_internal' as a way
        // of hinting to people to not use it.
        jenkinsCIGlobal._internal = {
            import: exports.import,
            addScript: internal.addScript
        };
    }
});