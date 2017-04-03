# FAQs

<p>
    <a href="#do-i-really-need-to-learn-all-this-new-stuff">Do I really need to learn all this "new" stuff?</a><br/>
    <a href="#what-is-the-difference-between-a-module-and-a-bundle">What is the difference between a "module" and a "bundle"?</a><br/>
    <a href="#do-we-really-need-bundles">Do we really need bundles?</a><br/>
    <a href="#couldnt-i-just-use-gulp-and-browserify">Couldn't I just use Gulp and Browserify?</a><br/>
    <a href="#what-does-module-loading-mean">What does "module loading" mean?</a><br/>
    <a href="#why-not-use-requirejsamd-or-es6-modules-for-modulebundle-loading">Why not use RequireJS/AMD or ES6 modules for module/bundle loading?</a><br/>
    <a href="#how-do-i-create-a-bundle">How do I create a bundle?</a><br/>    
</p>

<hr/>

### Do I really need to learn all this "new" stuff?
One concern that has been raised about new JavaScript approaches that might involve new technologies (new to the 
Jenkins tool-chain) is the fear that it would add to the learning curve for new and existing Jenkins plugin
developers. We added this section to this README specifically to alleviate that concern.

<p align="center">
    <img src="img/keep_calm.png" alt="KEEP CALM - THIS IS OPTIONAL">
</p>

The use of `js-modules` for plugin GUI development is __totally optional__! If you want to continue developing
your plugin's GUI using the same technologies you've always used (Jelly etc), then that is not a problem. You can
happily ignore everything here; nothing new is being forced on anyone!

`js-modules` is designed to help where the maintainer is interested in using "newer" JavaScript technologies
to build a richer plugin GUI that has more maintainable JavaScript code (more modular, better unit testing etc) that
can be more easily evolved over time (can safely move to newer versions of "Framework" libraries such as jQuery etc).
 
Again, if none of this interests you at the moment, then that is not a problem. You can continue building your plugin
GUI using the same techniques and technologies as before (server-side, Jelly etc).

### What is the difference between a "module" and a "bundle"?
A "bundle" is a single JavaScript file that contains 1 or more [CommonJS] "modules", inlined into the file, with all `require`s resolved internally in the bundle.

[CommonJS] modules employ a nice (easy to understand) synchronous module loading pattern via synchronous `require` statements.
This works fine in a server type environment (ala NodeJS), but things get a bit weird and messy in the browser if these
modules need to be asynchronously loaded from the remote server, resulting in an ugly synch/asynch mismatch (see [Why AMD?], as
described on by [RequireJS]).

A JavaScript "bundle" allows us to use [CommonJS] code __*and synchronous coding patterns*__ in the browser, while still
maintaining the cleaner synchronous module loading of pure `require` statements. It does this by "bundling" all the
[CommonJS] modules associated with a top level "entry" module into a single JavaScript file that can be loaded "all at
once" by the browser. The fact that all associated [CommonJS] modules are loaded at the same time means that all
[CommonJS] `require` statements can be resolved synchronously, meaning we can avoid AMD style ugliness. This is something
we feel is very important with respect to having long-term maintainable code.

We use [Browserify] to handle the creation of these bundles. It handles the process of making sure all the module
`require` calls are resolvable within the "bundle" i.e. that the bundle has everything it needs to execute properly.

### Do we really need bundles?
In theory "no", but bundles provide 2 big benefits (and probably more):

1. Bundles allow us to load a suite of tightly related [CommonJS] modules (an "app") in a single request Vs loading them all individually (ala RequireJS/AMD).
1. Bundles make modularized "app" coding a lot nicer/cleaner because they allows us to use the synchronous
`require` programming model made popular by [node.js]. The bundling makes this possible because it removes the need
for the asynchronous module loading (ala RequireJS/AMD - ugly anonymous callbacks etc) that would be required if the browser needed to load each module
individually.

### Couldn't I just use Gulp and Browserify?
Yes, you could build modularized JS (and use it in your plugin) using Gulp and Browserify only. In fact, that was what
we did before creating `js-modules`.

However, the problem with that approach is that it means every app bundle will contain all the code for every JS 
Framework lib it depends on. That might not seem like a problem when a page has just one of these "apps", but if it has
multiple "apps" from different plugins, all using jQuery (and maybe some other libs e.g. Bootstrap), then you have a
situation where all of these libraries are being loaded multiple times. This is something we would like to avoid.

One of the main things that `js-modules` is trying provide is the ability to create slimmed down "app" bundles
that only contain the "app" JS modules i.e. no framework libs. The framework libs are bundled separately
(in their own bundles) and "linked" into "app" bundles that need them via the `export` / `import` mechanism.
See [Framework libs].

### What does "module loading" mean?
`js-modules` is a "module bundle" loader.

> Read:
> - <a href="#what-is-the-difference-between-a-module-and-a-bundle">What is the difference between a "module" and a "bundle"?</a>.
> - <a href="#do-we-really-need-bundles">Do we really need bundles?</a>.

Two __module loading__ patterns are "relevant" with `js-modules`:
  
1. __Intra__-bundle module loading. The loading of [CommonJS] style modules within a bundle e.g. module `A` loading module `B`, where both modules are within the __same__ bundle.
1. __Inter__-bundle module loading. The loading of [CommonJS] style modules across bundle "boundaries" e.g. module `A` loading module `B`, where both modules are in __different__ bundles.

[Browserify] handles `#1` nicely, but it doesn't really handle `#2` in a way that works nicely for Jenkins. This is why `js-modules`
exists. Of course, one could just build self contained bundles using [Gulp] and [Browserify] (and so stick with `#1`), but that's not
a scalable solution (see link below).

> Read:
> - <a href="#couldnt-i-just-use-gulp-and-browserify">Couldn't I just use Gulp and Browserify?</a>
> - <a href="#why-not-use-requirejsamd-or-es6-modules-for-modulebundle-loading">Why not use RequireJS/AMD or ES6 modules for module/bundle loading?</a>

### Why not use RequireJS/AMD or ES6 modules for module/bundle loading?
One could debate the pros and cons of different module loading systems ad nauseam.
  
> Read:
> - <a href="#do-we-really-need-bundles">Do we really need bundles?</a>
> - <a href="#what-does-module-loading-mean">What does "module loading" mean?</a>

We went with the [Browserify] + `js-modules` approach for a few reasons:

1. [Browserify] lets us use [CommonJS] style modules in browser code i.e. synchronous `require` of modules for intra-bundle module loading. Asynchronous module loading patterns (ala Require/AMD) is something we wanted to avoid as we were not fans of the async AMD loading patterns involved (anonymous callbacks etc).
1. [Browserify] lets us bundle all the [CommonJS] modules for an "app" into a single JavaScript file, allowing them all to be loaded in a single request Vs loading each module to the browser one at a time ala RequireJS.
1. Using RequireJS to perform the loading of the [Browserify] generated bundles is something we considered (and experimented with). A number of problems were encountered here, but the main one (that seems insurmountable) was the fact that [Browserify] and RequireJS have difficulty living alongside each other on the same page due to the fact that RequireJS defines a `require` function in the global scope.
1. We felt that using a simple name-based module loader (ala `js-modules` - "does a module of this name exist, yes/no?" - no funky module path resolution algorithms etc) for inter-bundle module loading would be less likely to result in strange unforeseen things happening.

### How do I create a bundle?
See [jenkins-js-builder].

[Browserify]: http://browserify.org/
[Gulp]: http://gulpjs.com/
[CommonJS]: http://www.commonjs.org/
[node.js]: https://nodejs.org/en/
[Keep Calm]: https://github.com/jenkinsci/js-modules#keep-calm
[Framework libs]: https://github.com/jenkinsci/js-modules#framework-libs-jenkinscijs-libs
[jenkins-js-builder]: https://github.com/jenkinsci/js-builder
[RequireJS]: http://requirejs.org/
[Why AMD?]: http://requirejs.org/docs/whyamd.html