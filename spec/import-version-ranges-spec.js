/* jslint node: true */
/* global describe, it, expect */

"use strict";

var testUtil = require("./test-util");

describe("index.js", function () {
    
    function getJSModules() {
        return require("../js/index");
    }
    
    it("- test import/require exact version match - namespaced", function (done) {
        testUtil.onJenkinsPage(function() {
            var jsmodules = getJSModules();
            
            jsmodules.importModule('pluginA:mathUtils@1.2.3', 2000).onFulfilled(function(module) {
                expect(module.add(2,2)).toBe(4);
            }); // timeout before Jasmine does
            
            // Check that the <script> element was added to the <head>
            var internal = require("../js/internal");
            var document = window.document;
            var moduleId = internal.toModuleId('pluginA', 'mathUtils@1.2.3') + ':js';
            
            var scriptEl = document.getElementById(moduleId);            
            
            expect(scriptEl).toBeDefined();
            expect(scriptEl.getAttribute('src')).toBe('/jenkins/adjuncts/xxx/org/jenkins/ui/jsmodules/pluginA/mathUtils-1-2-3.js');
                        
            // Now mimic registering of the plugin module. In real Jenkins land, this would happen
            // async. The call to "require" would trigger the plugin js to be loaded
            // via adding of a <script> element to the page DOM. That plugin module
            // is then responsible for calling 'export', which should trigger
            // the notify etc
            jsmodules.exportModule('pluginA', 'mathUtils@1.2.3', {
                add: function(lhs, rhs) {
                    return lhs + rhs;
                }
            });
            
            // Verify that only one <script> element was added to the dom. Remove the one we found and
            // attempt to find another with the same id - we should fail.
            internal.getHeadElement().removeChild(scriptEl);
            scriptEl = document.getElementById(moduleId);
            expect(scriptEl).toBe(null);
            
            // Make sure we can synchronously get the module.
            var mathUtils = jsmodules.requireModule('pluginA:mathUtils@1.2.3');
            expect(mathUtils).toBeDefined();
            
            done();               
        });
    });

    it("- test import/require exact version match - no namespace", function (done) {
        testUtil.onJenkinsPage(function() {
            var jsmodules = getJSModules();
            
            jsmodules.importModule('mathUtils@1.2.3', 2000).onFulfilled(function(module) {
                expect(module.add(2,2)).toBe(4);
            }); // timeout before Jasmine does
            
            // Check that the <script> element was added to the <head>
            var internal = require("../js/internal");
            var document = window.document;
            var moduleId = internal.toModuleId(undefined, 'mathUtils@1.2.3') + ':js';
            
            var scriptEl = document.getElementById(moduleId);            
            
            expect(scriptEl).toBeDefined();
            expect(scriptEl.getAttribute('src')).toBe('/jenkins/adjuncts/xxx/org/jenkins/ui/jsmodules/mathUtils-1-2-3.js');
                        
            // Now mimic registering of the plugin module. In real Jenkins land, this would happen
            // async. The call to "require" would trigger the plugin js to be loaded
            // via adding of a <script> element to the page DOM. That plugin module
            // is then responsible for calling 'export', which should trigger
            // the notify etc
            jsmodules.exportModule(undefined, 'mathUtils@1.2.3', {
                add: function(lhs, rhs) {
                    return lhs + rhs;
                }
            });
            
            // Verify that only one <script> element was added to the dom. Remove the one we found and
            // attempt to find another with the same id - we should fail.
            internal.getHeadElement().removeChild(scriptEl);
            scriptEl = document.getElementById(moduleId);
            expect(scriptEl).toBe(null);
            
            // Make sure we can synchronously get the module.
            var mathUtils = jsmodules.requireModule('mathUtils@1.2.3');
            expect(mathUtils).toBeDefined();
            
            done();               
        });
    });

    it("- test import/require 'any' - not loaded", function (done) {
        testUtil.onJenkinsPage(function() {
            var jsmodules = getJSModules();
            
            jsmodules.importModule('mathUtils@any|1.2.3', 2000).onFulfilled(function(module) {
                expect(module.add(2,2)).toBe(4);
            }); // timeout before Jasmine does
            
            // Check that the <script> element was added to the <head>
            var internal = require("../js/internal");
            var document = window.document;
            var moduleId = internal.toModuleId(undefined, 'mathUtils@1.2.3') + ':js';
            
            // Should still add the <script> tags for v1.2.3 because it didn't find an "any"
            // already loaded.
            var scriptEl = document.getElementById(moduleId);
            expect(scriptEl).toBeDefined();
            expect(scriptEl.getAttribute('src')).toBe('/jenkins/adjuncts/xxx/org/jenkins/ui/jsmodules/mathUtils-1-2-3.js');
                        
            // Now mimic registering of the plugin module. In real Jenkins land, this would happen
            // async. The call to "require" would trigger the plugin js to be loaded
            // via adding of a <script> element to the page DOM. That plugin module
            // is then responsible for calling 'export', which should trigger
            // the notify etc
            jsmodules.exportModule(undefined, 'mathUtils@1.2.3', {
                add: function(lhs, rhs) {
                    return lhs + rhs;
                }
            });
            
            // Make sure we can synchronously get the module.
            var mathUtils = jsmodules.requireModule('mathUtils@1.2.3');
            expect(mathUtils).toBeDefined();
            
            done();               
        });
    });    

    it("- test import/require 'any' - pre loaded/exported", function (done) {
        testUtil.onJenkinsPage(function() {
            var jsmodules = getJSModules();

            // Pre load/export the "any"
            jsmodules.exportModule(undefined, 'mathUtils@any', {
                add: function(lhs, rhs) {
                    return lhs + rhs;
                }
            });
            
            jsmodules.importModule('mathUtils@any|1.2.3', 2000).onFulfilled(function(module) {
                expect(module.add(2,2)).toBe(4);
            }); // timeout before Jasmine does
            
            // Should not have added <script> tags for v1.2.3 because it found an "any"
            // already loaded.
            var internal = require("../js/internal");
            var document = window.document;
            expect(document.getElementsByTagName('script').length).toBe(0);
            
            // Make sure we can synchronously get the module.
            var mathUtils = jsmodules.requireModule('mathUtils@any');
            expect(mathUtils).toBeDefined();
            
            done();               
        });
    });    
    
    it("- test import/require 'any' - NOT pre loaded/exported", function (done) {
        testUtil.onJenkinsPage(function() {
            var jsmodules = getJSModules();

            // Don't pre load/export the "any"
           
            jsmodules.importModule('mathUtils@any', 2000).onFulfilled(function(module) {
                expect(module.add(2,2)).toBe(4);
            }); // timeout before Jasmine does
            
            // Should not have added <script> tags for anything because "any"
            // was the only version specified and it is not a specific version
            var internal = require("../js/internal");
            var document = window.document;
            expect(document.getElementsByTagName('script').length).toBe(0);
            
            // Now do the export so the import can be fullfilled and the test
            // can finish out cleanly
            jsmodules.exportModule(undefined, 'mathUtils@any', {
                add: function(lhs, rhs) {
                    return lhs + rhs;
                }
            });
            
            // Make sure we can synchronously get the module.
            var mathUtils = jsmodules.requireModule('mathUtils@any');
            expect(mathUtils).toBeDefined();
            
            done();               
        });
    });   
    
    it("- test import/require non-specific version", function (done) {
        testUtil.onJenkinsPage(function() {
            var jsmodules = getJSModules();

            // Don't pre load/export the "any"
           
            jsmodules.importModule('mathUtils@1.2.x', 2000).onFulfilled(function(module) {
                expect(module.add(2,2)).toBe(4);
            }); // timeout before Jasmine does
            
            // Should not have added <script> tags for anything because "1.2.x"
            // was the only version specified and it is not a specific version
            var internal = require("../js/internal");
            var document = window.document;
            expect(document.getElementsByTagName('script').length).toBe(0);
            
            // Now do the export so the import can be fullfilled and the test
            // can finish out cleanly
            jsmodules.exportModule(undefined, 'mathUtils@1.2.x', {
                add: function(lhs, rhs) {
                    return lhs + rhs;
                }
            });
            
            // Make sure we can synchronously get the module.
            var mathUtils = jsmodules.requireModule('mathUtils@1.2.x');
            expect(mathUtils).toBeDefined();
            
            done();               
        });
    });   
});
