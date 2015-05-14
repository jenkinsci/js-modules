Jenkins CI JavaScript module loader.

 
Install Package:

```
npm install --save jenkins-modules
```
 
# The "problem"

[Browserify](http://browserify.org/) is a really nice solution for modularising CommonJS style JavaScript code
for running in the browser. The problems for Jenkins are:
 
1. There are many components potentially building JavaScript modules, all requiring access to common JavaScript libraries (jQuery, Bootstrap, jQuery UI etc).
We don't want each module loading their own copy of jQuery etc.
1. Jenkins is not a website built by one team of developers. There are 1000+ plugins now, all contributing to the UI and all developed in different "eras",
which among other things means they will be developed to work against different versions of JavaScript libraries.
    * jQuery is the really big concern here, where the version issue is exacerbated by the jQuery extensions issue i.e. Jenkins may have a single jQuery instance with a varying version + any number of unknown jQuery extensions "glom'd" onto it, all potentially conflicting with each other. So in effect, this is basically replicating the global `window` namespace issues of old into the `$` namespace. This is not sustainable for Jenkins and is guaranteed to lead to all sorts of strange UI errors. See "[jquery-detached](https://github.com/tfennelly/jquery-detached)"   
1. It is expect that Jenkins plugins will be building shareable JavaScript components e.g. a plugin that has a REST API could expose that rest API to other plugin UI components via a JavaScript module.
 
[Browserify](http://browserify.org/) can be used to build a single, self contained JavaScript bundle. The modules in that bundle can require other modules in the bundle, but cannot require modules from other bundles.
That means each bundle needs to include everything it needs, including jQuery and other framework libraries. This is not sustainable for Jenkins and is the problem that this module is targeted at i.e. to allow plugins
(or Jenkins core) that are building self contained CommonJS style JavaScript modules (using [Browserify](http://browserify.org/) if they want)
to "export" one or more of those modules in the browser, allowing those modules to be "required" across bundle boundaries.

# Exporting JavaScript modules

A Jenkins Plugin can "export" a JavaScript module (CommonJS style module) by calling
`require('jenkins-modules').exportModule`, allowing other plugin bundles to `require` that module
(see next section).


```javascript
exports.add = function(lhs, rhs {
    return lhs + hrs;
}

// export the module/bundle
require('jenkins-modules').exportModule('pluginA', 'mathUtils', exports);
```

We assume that the plugin bundle JavaScript is bundled using [Browserify](http://browserify.org/), and can be
loaded from `<jenkins>/plugin/<pluginName>/jsmodules/<moduleName>.js` e.g. `/jenkins/plugin/pluginA/jsmodules/mathUtils.js`.


# Requiring/importing JavaScript modules

A JavaScript module in one plugin ("pluginB") can "require" a module from another plugin ("pluginA" see above)
by calling `require('jenkins-modules').requireModule`.


```javascript
var mathUtil; // initialise once the module is loaded and registered 

// The require is async (returning a Promise) because the 'pluginA:mathUtils' is loaded async.
require('jenkins-modules').requireModule('pluginA', 'mathUtils')
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

If `require('jenkins-modules').requireModule` is called for a module that is not yet loaded, 
`require('jenkins-modules').requireModule` will trigger the loading of that module from the plugin, hence the 
async/promise nature i.e. you can't synchronously `get` a module.