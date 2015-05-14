var internal = require("./internal");
var promise = require("./promise");
var windowHandle = require('window-handle');

/**
 * Require a module.
 *
 * <p>
 * Responsible for triggering the async loading of the module from the plugin if
 * the module is not already loaded.
 *
 * @param pluginName The Jenkins plugin in which the module resides.
 * @param moduleName The name of the module.
 * @param onRegisterTimeout Millisecond duration before onRegister times out. Defaults to 10000 (10s) if not specified.
 *
 * @return A Promise, allowing async load of the module.
 */
exports.requireModule = function(pluginName, moduleName, onRegisterTimeout) {
    return promise.make(function (resolve, reject) {
        // getPlugin etc needs to access the 'window' global. We want to make sure that
        // exists before attempting to fulfill the require operation. It may not exists
        // immediately in a test env.
        windowHandle.getWindow(function() {
            var plugin = internal.getPlugin(pluginName);
            var module = plugin[moduleName];
            if (module) {
                // module already loaded
                resolve(module.exports);
            } else {
                if (onRegisterTimeout === 0) {
                    throw 'Plugin module ' + pluginName + ':' + moduleName + ' require failure. Async load mode disabled.';
                }

                // module not loaded. Load async, fulfilling promise once registered
                internal.loadModule(pluginName, moduleName, onRegisterTimeout)
                    .then(function(moduleExports) {
                        resolve(moduleExports);
                    })
                    .catch(function(error) {
                        reject(error);
                    });
            }
        });
    });
};

/**
 * Export a module.
 * 
 * @param pluginName The Jenkins plugin in which the module resides.
 * @param moduleName The name of the module. 
 * @param moduleExports The CommonJS style module exports.
 */
exports.exportModule = function(pluginName, moduleName, moduleExports) {
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
 */
exports.addModuleCSSToPage = function(pluginName, moduleName) {
    internal.addModuleCSSToPage(pluginName, moduleName);
};

/**
 * Set the Jenkins root/base URL.
 * 
 * @param rootUrl The root/base URL.
 */
exports.setRootURL = function(rootUrl) {
    internal.setRootURL(rootUrl);
};