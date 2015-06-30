Jenkins CI JavaScript "module bundle" loader i.e. a loader for loading more than one module in one request 
(i.e. a "bundle").

 
Install Package:

```
npm install --save jenkins-modules
```
 
# Background

JavaScript modularization has been a bit of a black spot for Jenkins UI for a while. Jenkins UI rendering has really 
been a server side process. Client side JavaScript is something that has been shoehorned in after-the-fact using adjuncts etc.

Something that we (at CloudBees) started experimenting with was the idea of modularizing JavaScript using
[nodejs](https://nodejs.org/)/[CommonJS](http://wiki.commonjs.org/wiki/CommonJS) style modules. This also
allowed us to tap into a huge ecosystem of mature and modern JavaScript libraries.

On the browser side, the options for loading these modules seemed mainly to be [RequireJS](http://requirejs.org/) and
[Browserify](http://browserify.org/). We went with Browserify because it allowed two things:

1. Loading of all "application" modules in a single request as a "bundle". This might seem like premature optimization but we had heard stories re how this became a problem when using AMD/RequireJS i.e. performance issues with apps having lots of modules and the modules being loaded one at a time. Just google and you'll find plenty of them.
1. It allowed us to have a really nice/clean synchronous nodejs style `require` semantics wrt to loading modules. Loading all modules via an asynchronous `define` (ala RequireJS) is not so nide.  

[Browserify](http://browserify.org/) is a really nice solution for modularising CommonJS style JavaScript code
for running in the browser. The problems for Jenkins are:

1. There are many components potentially building JavaScript modules, all requiring access to common JavaScript libraries (jQuery, Bootstrap, jQuery UI etc).
We don't want each module loading their own copy of jQuery etc.
1. Jenkins is not a website built by one team of developers. There are 1000+ plugins now, all contributing to the UI and all developed in different "eras",
which among other things means they will be developed to work against different versions of JavaScript libraries.
    * jQuery is the really big concern here, where the version issue is exacerbated by the jQuery extensions issue i.e. Jenkins may have a single jQuery instance with a varying version + any number of unknown jQuery extensions "glom'd" onto it, all potentially conflicting with each other. So in effect, this is basically replicating the global `window` namespace issues of old into the `$` namespace. This is not sustainable for Jenkins and is guaranteed to lead to all sorts of strange UI errors. See "[jquery-detached](https://github.com/tfennelly/jquery-detached)"   
1. It is expect that Jenkins plugins will be building shareable JavaScript components e.g. a plugin that has a REST API could expose that rest API to other plugin UI components via a JavaScript module.
 
[Browserify](http://browserify.org/) can be used to build a single, self contained JavaScript bundle. The modules in that bundle can require other modules in the bundle, but cannot require modules from other bundles ("external" modules).
That means each bundle needs to include everything it needs, including jQuery and other framework libraries. This is not sustainable for Jenkins and is the problem that this module is targeted at i.e. to allow plugins
(or Jenkins core) that are building self contained CommonJS style JavaScript modules (using [Browserify](http://browserify.org/) if they want)
to "export" one or more of those modules in the browser, allowing those modules to be "required" across bundle boundaries.

So, this module is all about loading module "bundles" (apps) and providing a means for them to load their dependencies (jQuery etc) and wiring them together. The idea is that
the app modules are all loaded cleanly through the nodejs style `require` semantics (because they are all loaded in a single bundle), while "external" dependencies (jQuery etc) 
are loaded asynchronously (allowing them to be loaded on demand etc). The assumption here is that the number of external module dependencies should be relatively small in comparison
to the number of modules in the app itself. In fact, this module lets us async load the external modules upfront in the app's "main" module and then sync require those modules
from down in the app sub-modules.

# `export` JavaScript modules

A Jenkins Plugin can "export" a JavaScript module (CommonJS style module) by calling
`require('jenkins-modules').export`, allowing other plugin bundles to `import` that module
(see next section).


```javascript
exports.add = function(lhs, rhs {
    return lhs + hrs;
}

// export the CommonJS module
require('jenkins-modules').export('pluginA', 'mathUtils', module);
```

We assume that the plugin bundle JavaScript is bundled using [Browserify](http://browserify.org/), and can be
loaded from `<jenkins>/plugin/<pluginName>/jsmodules/<moduleName>.js` e.g. `/jenkins/plugin/pluginA/jsmodules/mathUtils.js`.

# Asynchronously `import` JavaScript modules

A JavaScript module in one plugin ("pluginB") can "require" a module from another plugin ("pluginA" see above)
by calling `require('jenkins-modules').import`. We call these "external" modules here.


```javascript
var mathUtil; // initialise once the module is loaded and registered 

// The require is async (returning a Promise) because the 'pluginA:mathUtils' is loaded async.
require('jenkins-modules').import('pluginA:mathUtils')
    .then(function(mathUtils) {
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

If `require('jenkins-modules').import` is called for a module that is not yet loaded, 
`require('jenkins-modules').import` will trigger the loading of that module from the plugin, hence the 
async/promise nature i.e. you can't synchronously `get` a module.

You can also perform an `import` operation if you require loading of multiple modules. So if you require
2 modules (e.g. "bootstrap3" and "jqueryui1") before proceeding, you can do the following:

```javascript
// Again, the require is async (returning a Promise). The promise will not be fulfilled until both
// "bootstrap3" and "jqueryui1" are loaded.
require('jenkins-modules').import('jenkins-jslib:bootstrap3', 'jenkins-jslib:jqueryui1')
    .then(function(bootstrap3, jqueryui1) {
        // Note how the loaded modules are passed as args in the 
        // same order as they are specified in the call to import.
    });
}
```

You might call `import` wth multiple module names in your "top level" script if you want to make sure your "application"
only runs after all required external modules are loaded. 

```javascript
require('jenkins-modules').import('jenkins-jslib:bootstrap3', 'jenkins-jslib:jqueryui1')
    .then(function() {
        // Now it's safe for my "application" to run...
    });
}
```

# Synchronously `require` JavaScript modules

Asynchronously requiring external modules in an application can be a bit "ugly", requiring wrapping of code in
async callbacks etc. For that reason, `jenkins-modules` supports a `require` function that can be used
to synchronously `require` these external modules ala how CommonJS `require` can be used to `require` a
local module (local to the application bundle).

The assumption here is that the application has a top level "main" JavaScript file from there all other
modules in the application are loaded e.g.
 
```
-- main-mod.js
   \- sub-mod-1.js
      \- sub-mod-1.1.js
      \- sub-mod-1.2.js
   \- sub-mod-2.js
      \- sub-mod-2.1.js
      \- sub-mod-2.2.js
```

Another assumption is that "apps" will typically have more internal modules than they will have dependencies on
external modules which would typically be "framework" type modules such as jQuery, Bootstrap etc.  