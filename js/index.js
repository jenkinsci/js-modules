var internal = require("./internal");
var windowHandle = require("window-handle");
var promise = require("./promise");

/**
 * Require a module.
 *
 * <p>
 * Responsible for triggering the async loading of the module from the plugin if
 * the module is not already loaded.
 *
 * @param moduleQName The module "qualified" name containing the module name prefixed with the Jenkins plugin name
 * separated by a colon i.e. "<pluginName>:<moduleName>" e.g. "jquery:jquery2".
 * @param onRegisterTimeout Millisecond duration before onRegister times out. Defaults to 10000 (10s) if not specified.
 *
 * @return A Promise, allowing async load of the module.
 */
exports.requireModule = function(moduleQName, onRegisterTimeout) {
    return internal.requireModule(moduleQName, onRegisterTimeout);
}

/**
 * Require a set of module.
 *
 * <p>
 * Responsible for triggering the async loading of modules from plugins if
 * a given module is not already loaded.
 *
 * @param moduleQNames... A list of module "qualified" names, each containing the module name prefixed with the Jenkins plugin name
 * separated by a colon i.e. "<pluginName>:<moduleName>" e.g. "jquery:jquery2".
 * @param onRegisterTimeout Millisecond duration before onRegister times out. Defaults to 10000 (10s) if not specified.
 *
 * @return A Promise, allowing async load of all modules. The promise is only fulfilled when all modules are loaded.
 */
exports.requireModules = function() {
    var moduleQNames = [];
    var onRegisterTimeout;
    
    for (var i = 0; i < arguments.length; i++) {
        var argument = arguments[i];
        if (typeof argument === 'string') {
            moduleQNames.push(argument);
        } else if (typeof argument === 'number') {
            onRegisterTimeout = argument;
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
                // means we can now fulfill the top level requireModules promise.
                resolve(modules);
            }
        }        
        
        // doRequire for each module
        for (var i = 0; i < moduleQNames.length; i++) {           
            function doRequire(moduleQName) {
                var promise = internal.requireModule(moduleQName, onRegisterTimeout);
                var fulfillment = {
                    promise: promise,
                    value: undefined
                };
                fulfillments.push(fulfillment);
                promise
                    .then(function(value) {
                        fulfillment.value = value;
                        onFulfillment();
                    })
                    .catch(function(error) {
                        reject(error);
                    });
            }
            doRequire(moduleQNames[i]);
        }
    }).applyArgsOnFulfill();    
};

/**
 * Export a module.
 * 
 * @param pluginName The Jenkins plugin in which the module resides.
 * @param moduleName The name of the module. 
 * @param moduleExports The CommonJS style module exports.
 * @param onError On error callback;
 */
exports.exportModule = function(pluginName, moduleName, moduleExports, onError) {
    // getPlugin etc needs to access the 'window' global. We want to make sure that
    // exists before continuing. It may not exists immediately in a test env.
    windowHandle.getWindow(function() {
        try {
            var plugin = internal.getPlugin(pluginName);
            if (plugin[moduleName]) {
                throw "Jenkins plugin module '" + pluginName + ":" + moduleName + "' already registered.";
            }
            var module = {
                exports: moduleExports
            };
            plugin[moduleName] = module;
            
            // Notify all that the module has been registered. See internal.loadModule also.
            internal.notifyModuleExported(pluginName, moduleName, moduleExports);
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
    // getPlugin etc needs to access the 'window' global. We want to make sure that
    // exists before continuing. It may not exists immediately in a test env.
    windowHandle.getWindow(function() {
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

