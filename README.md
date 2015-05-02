Jenkins CI core JavaScript module (CommonJS).
 
Install Package:

```
npm install --save jenkins-js-core
```

# Exporting JavaScript modules

A Jenkins Plugin can "export" a JavaScript module (CommonJS style module) by calling
`require('jenkins-js-core').exportModule`, allowing other plugin bundles to `require` that module
(see next section).


```javascript
exports.add = function(lhs, rhs {
    return lhs + hrs;
}

// export the module/bundle
require('jenkins-js-core').exportModule('pluginA', 'mathUtils', exports);
```

We assume that the plugin bundle JavaScript is bundled using [Browserify](http://browserify.org/), and can be
loaded from `<jenkins>/plugin/<pluginName>/jsmodules/<moduleName>.js` e.g. `/jenkins/plugin/pluginA/jsmodules/mathUtils.js`.


# Requiring/importing JavaScript modules

A JavaScript module in one plugin ("pluginB") can "require" a module from another plugin ("pluginA" see above)
by calling `require('jenkins-js-core').requireModule`.


```javascript
var mathUtil; // initialise once the module is loaded and registered 

// The require is async (returning a Promise) because the 'pluginA:mathUtils' is loaded async.
require('jenkins-js-core').requireModule('pluginA', 'mathUtils')
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

If `require('jenkins-js-core').requireModule` is called for a module that is not yet loaded, 
`require('jenkins-js-core').requireModule` will trigger the loading of that module from the plugin, hence the 
async/promise nature i.e. you can't synchronously `get` a module.