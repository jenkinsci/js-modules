/* jslint node: true */
/* global describe, it, expect */

"use strict";

var testUtil = require("./test-util");

describe("internal.js", function () {
    it("- test getJenkins", function (done) {
        testUtil.onJenkinsPage(function() {
            var internal = require("../js/internal");                                
            var jenkins = internal.getJenkins();
            
            expect(jenkins.rootURL).toBe('/jenkins');
            done();
        });
    });

    it("- test toModuleSrc", function (done) {
        testUtil.onJenkinsPage(function() {
            var ModuleSpec = require('../js/ModuleSpec');
            var internal = require("../js/internal");
            
            // from adjuncts
            var b = new ModuleSpec('b');
            var bJs = internal.toModuleSrc(b, 'js');
            expect(bJs).toBe('/jenkins/adjuncts/xxx/org/jenkins/ui/jsmodules/b.js');
            var ab = new ModuleSpec('a:b');
            var abJs = internal.toModuleSrc(ab, 'js');
            expect(abJs).toBe('/jenkins/adjuncts/xxx/org/jenkins/ui/jsmodules/a/b.js');
    
            // from plugin
            ab = new ModuleSpec('plugin/a:b');
            abJs = internal.toModuleSrc(ab, 'js');
            expect(abJs).toBe('/jenkins/plugin/a/jsmodules/b.js');
    
            // from core assets
            ab = new ModuleSpec('core-assets/a:b');
            abJs = internal.toModuleSrc(ab, 'js');
            expect(abJs).toBe('/jenkins/assets/a/jsmodules/b.js');

            done();
        });
    });
    
});
