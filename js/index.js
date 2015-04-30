var internal = require("./internal");

/**
 * Require a module.
 *
 * <p>
 * Responsible for triggering the async loading of the module from the plugin if
 * the module is not already loaded.
 *
 * @param pluginName The Jenkins plugin in which the module resides.
 * @param moduleName The name of the module.
 * @param onRegister The callback function to call when the module is registered. The module is passed (it's exports) as a parameter to the function. 
 * Called immediately if the module is already registered.
 * @param onRegisterTimeout Millisecond duration before onRegister times out. Defaults to 10000 (10s) if not specified.
 *
 * @return The module loaded object.
 */
exports.require = function(pluginName, moduleName, onRegister, onRegisterTimeout) {
    
    // TODO: Look at replacing this ugly callback with a promise/future
    
    var plugin = internal.getPlugin(pluginName);
    var module = plugin[moduleName];
    if (module) {
        // module already loaded
        onRegister({
            loaded: true,
            exports: module.exports
        });
    } else {
        if (onRegisterTimeout === 0) {
            throw 'Plugin module ' + pluginName + ':' + moduleName + ' require failure. Async load mode disabled.';
        }
        
        // module not loaded. Load async and wait for it to be registered
        internal.loadModule(pluginName, moduleName, onRegister, onRegisterTimeout);
    }
}

/**
 * Register a module.
 * 
 * @param pluginName The Jenkins plugin in which the module resides.
 * @param moduleName The name of the module. 
 * @param moduleExports The CommonJS style module exports.
 */
exports.registerModule = function(pluginName, moduleName, moduleExports) {
    var plugin = internal.getPlugin(pluginName);
    if (plugin[moduleName]) {
        throw "Jenkins plugin module '" + pluginName + ":" + moduleName + "' already registered.";
    }
    var module = {
        exports: moduleExports
    };
    plugin[moduleName] = module;
    
    // Notify all that the module has been registered. See internal.loadModule also.
    internal.notifyModuleRegistered(pluginName, moduleName, moduleExports)
}