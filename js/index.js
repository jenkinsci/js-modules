var internal = require("./internal");
var promise = require("./promise");

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
    var plugin = internal.getPlugin(pluginName);
    var module = plugin[moduleName];
    if (module) {
        // module already loaded
        return promise.make(function (resolve) {
            resolve(module.exports);
        });
    } else {
        if (onRegisterTimeout === 0) {
            throw 'Plugin module ' + pluginName + ':' + moduleName + ' require failure. Async load mode disabled.';
        }
        
        // module not loaded. Load async, fulfilling promise once registered
        return internal.loadModule(pluginName, moduleName, onRegisterTimeout);
    }
}

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
    internal.notifyModuleExported(pluginName, moduleName, moduleExports)
}

/**
 * Save a global variable.
 * @param name The name of the variable.
 * @returns A memento object with a "restore" function for restoring the global to its original state.
 */
exports.saveGlobal = function(name) {
    var theWindow = internal.getWindow();
    var value;
    var memento;
    
    if (theWindow.hasOwnProperty(name)) {
        value = theWindow[name];
    }

    if (value) {
        memento = {
            restore: function() {
                theWindow[name] = value;
            }
        }
    } else {
        memento = {
            restore: function() {
                // no-op
            }
        }
    }
    
    return memento;
}