/* jslint node: true */
/* global describe, it, expect */

"use strict";

var testUtil = require("./test-util");

describe("index.js", function () {
    
    function getJSModules() {
        return require("../js/index");
    }
    //
    //it("- test import/require exact version match - namespaced", function (done) {
    //    testUtil.onJenkinsPage(function() {
    //        var jsmodules = getJSModules();
    //        
    //        jsmodules.import('pluginA:mathUtils@1.2.3', 2000).onFulfilled(function(module) {
    //            expect(module.add(2,2)).toBe(4);
    //            done();               
    //        }); // timeout before Jasmine does
    //        
    //        // Check that the <script> element was added to the <head>
    //        var internal = require("../js/internal");
    //        var document = require('window-handle').getWindow().document;
    //        var moduleId = internal.toModuleId('pluginA', 'mathUtils') + ':js';
    //        
    //        var scriptEl = document.getElementById(moduleId);            
    //        
    //        expect(scriptEl).toBeDefined();
    //        expect(scriptEl.getAttribute('src')).toBe('/jenkins/adjuncts/xxx/org/jenkins/ui/jsmodules/pluginA/mathUtils-1-2-3.js');
    //                    
    //        // Now mimic registering of the plugin module. In real Jenkins land, this would happen
    //        // async. The call to "require" would trigger the plugin js to be loaded
    //        // via adding of a <script> element to the page DOM. That plugin module
    //        // is then responsible for calling 'export', which should trigger
    //        // the notify etc
    //        jsmodules.export('pluginA', 'mathUtils@1.2.3', {
    //            add: function(lhs, rhs) {
    //                return lhs + rhs;
    //            }
    //        });
    //        
    //        // Verify that only one <script> element was added to the dom. Remove the one we found and
    //        // attempt to find another with the same id - we should fail.
    //        internal.getHeadElement().removeChild(scriptEl);
    //        scriptEl = document.getElementById(moduleId);
    //        expect(scriptEl).toBe(null);
    //        
    //        // Make sure we can synchronously get the module.
    //        var mathUtils = jsmodules.require('pluginA:mathUtils@1.2.3');
    //        expect(mathUtils).toBeDefined();
    //    });
    //});

});
