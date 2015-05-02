Jenkins CI core JavaScript module (CommonJS).
 
Install Package:

```
npm install --save jenkins-js-core
```

# Exporting JavaScript modules

We assume that the plugin bundle JavaScript is bundled using Browserify, and that bundle performs the registration
of the module, allowing other plugin bundles to `require` that module.


```javascript
exports.add = function(lhs, rhs {
    return lhs + hrs;
}

var jenkinsCore = require('jenkins-js-core');

// register the module/bundle exports
jenkinsCore.registerModule('pluginA', 'mathUtils', exports);
```

# Requiring/importing JavaScript modules

A JavaScript module in one plugin ("pluginB") can `require` a module from another plugin ("pluginA" see above).


```javascript
var jenkinsCore = require('jenkins-js-core');
var mathUtil; // initialise once the module is loaded and registered 

// The require is async (returning a Promise) because the 'pluginA:mathUtils' is loaded async.
jenkinsCore.require('pluginA', 'mathUtils')
    .then(function(module) {
        // Module loaded ok
        mathUtil = module;
    })
    .catch(function(error) {
        // Module didn't load for some reason e.g. a timeout
        alert(error.detail);
    });

exports.magicFunc = function() {
    // might want to assert mathUtil is initialised
    
    // do stuff ...
}
```