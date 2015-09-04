# FAQs

<p>
    <a href="#do-i-really-need-to-learn-all-this-new-stuff">Do I really need to learn all this "new" stuff?</a><br/>
    <a href="#what-is-the-difference-between-a-module-and-a-bundle">What is the difference between a "module" and a "bundle"?</a><br/>
    <a href="#do-we-really-need-bundles">Do we really need bundles?</a><br/>
    <a href="#couldnt-i-just-use-gulp-and-browserify">Couldn't I just use Gulp and Browserify?</a><br/>
    <a href="#what-does-module-loading-mean">What does "module loading" mean?</a><br/>
    <a href="#why-not-use-requirejsamd-or-es6-modules-for-modulebundle-loading">Why not use RequireJS/AMD or ES6 modules for module/bundle loading?</a><br/>
</p>

<hr/>

### Do I really need to learn all this "new" stuff?
No, this is all totally optional. Please read [Keep Calm].

### What is the difference between a "module" and a "bundle"?
A "bundle" is a single JavaScript file that contains 1 or more [CommonJS] "modules". We use [Browserify] to handle the creation of these bundles. It
handles the process of making sure all the module `require` calls are resolvable within the "bundle" i.e. that the bundle
has everything it needs to execute properly.

### Do we really need bundles?
In theory "no", but bundles provide 2 big benefits (and probably more):

1. Bundles allow us to load a suite of tightly related [CommonJS] modules (an "app") in a single request Vs loading them all individually (ala RequireJS/AMD).
1. Bundles make modularized "app" coding a lot nicer/cleaner because they allows us to use the synchronous
`require` programming model made popular by [node.js]. The bundling makes this possible because it removes the need
for the asynchronous module loading (ala RequireJS/AMD - ugly anonymous callbacks etc) that would be required if the browser needed to load each module
individually.

### Couldn't I just use Gulp and Browserify?
Yes, you could build modularized JS (and use it in your plugin) using Gulp and Browserify only. In fact, that was what
we did before creating `jenkins-js-modules`.

However, the problem with that approach is that it means every app bundle will contain all the code for every JS 
Framework lib it depends on. That might not seem like a problem when a page has just one of these "apps", but if it has
multiple "apps" from different plugins, all using jQuery (and maybe some other libs e.g. Bootstrap), then you have a
situation where all of these libraries are being loaded multiple times. This is something we would like to avoid.

One of the main things that `jenkins-js-modules` is trying provide is the ability to create slimmed down "app" bundles
that only contain the "app" JS modules i.e. no framework libs. The framework libs are bundled separately
(in their own bundles) and "linked" into "app" bundles that need them via the `export` / `import` mechanism.
See [Framework libs].

### What does "module loading" mean?
Two __module loading__ patterns are "relevant" here:
  
1. __Intra__-bundle module loading. The loading of [CommonJS] style modules within a bundle e.g. module `A` loading module `B`, where both modules are within the __same__ bundle.
1. __Inter__-bundle module loading. The loading of [CommonJS] style modules across bundle "boundaries" e.g. module `A` loading module `B`, where both modules are in __different__ bundles.

> Also see <a href="#do-we-really-need-bundles">Do we really need bundles?</a>.

### Why not use RequireJS/AMD or ES6 modules for module/bundle loading?
One could debate the pros and cons of different module loading systems ad nauseam.
  
> Read these first:
> - <a href="#do-we-really-need-bundles">Do we really need bundles?</a>
> - <a href="#what-does-module-loading-mean">What does "module loading" mean?</a>

We went with the [Browserify] + `jenkins-js-modules` approach for a few reasons:

1. [Browserify] lets us use [CommonJS] style modules in browser code i.e. synchronous `require` of modules for intra-bundle module loading. Asynchronous module loading patterns (ala Require/AMD) is something we wanted to avoid as we were not fans of the async AMD loading patterns involved (anonymous callbacks etc).
1. [Browserify] lets us bundle all the [CommonJS] modules for an "app" into a single JavaScript file, allowing them all to be loaded in a single request Vs loading each module to the browser one at a time ala RequireJS.
1. Using RequireJS to perform the loading of the [Browserify] generated bundles is something we considered (and experimented with). A number of problems were encountered here, but the main one (that seems insurmountable) was the fact that [Browserify] and RequireJS have difficulty living alongside each other on the same page due to the fact that RequireJS defines a `require` function in the global scope.
1. We felt that using a simple name-based module loader (ala `jenkins-js-modules` - "does a module of this name exist, yes/no?" - no funky module path resolution algorithms etc) for inter-bundle module loading would be less likely to result in strange unforeseen things happening.

[Browserify]: http://browserify.org/
[CommonJS]: http://www.commonjs.org/
[node.js]: https://nodejs.org/en/
[Keep Calm]: https://github.com/tfennelly/jenkins-js-modules#keep-calm
[Framework libs]: https://github.com/tfennelly/jenkins-js-modules#framework-libs-jenkinscijs-libs