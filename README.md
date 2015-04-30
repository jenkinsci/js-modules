Jenkins CI core JavaScript module (CommonJS).
 
Install Package:

```
npm install --save jenkins-js-core
```

# Exporting/Registering JS modules from a plugin

We assume the plugin bundle JS is bundled using Browserify, and that bundle performs the registration
of the module, allowing other plugin bundles to `require` that module.


```
exports.add = function(lhs, rhs {
    return lhs + hrs;
}

var jenkinsCore = require('jenkins-js-core');

// register the module/bundle exports
jenkinsCore.registerModule('pluginA', 'mathUtils', exports);
```

# Requiring/importing JS modules from a plugin

A module in plugin ("pluginB") can `require` a module from another plugin ("pluginA" see above).


```
var jenkinsCore = require('jenkins-js-core');
var mathUtil; // initialise once the module is loaded and registered 

// The require is async because the 'pluginA:mathUtils' is loaded async, hence the callback.
jenkinsCore.require('pluginA', 'mathUtils', function(requireResult) {
    if (requireResult.loaded) {
        // It loaded ok ... grab the exports and store them
        mathUtil = requireResult.exports;
    } else {
        alert(requireResult.detail);
    }    
});

exports.magicFunc = function() {
    // might want to assert mathUtil is initialised
    
    // do stuff ...
}
```