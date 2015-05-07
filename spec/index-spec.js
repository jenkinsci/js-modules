/* jslint node: true */
/* global describe, it, expect */

"use strict";

var testUtil = require("./test-util");

describe("index.js", function () {

    it("- test require and exportModule timeout", function (done) {
        testUtil.onJenkinsPage(function() {
            var jenkins = require("../js/index");
            
            // should fail because a exportModule never happens
            jenkins.requireModule('pluginA', 'mathUtils', 100)
                .catch(function(error) {
                    expect(error.reason).toBe('timeout');
                    expect(error.detail).toBe("Please verify that the plugin 'pluginA' is installed, and that it registers a module named 'mathUtils'");
                    done();               
                });
        });
    });

    it("- test require and exportModule async successful", function (done) {
        testUtil.onJenkinsPage(function() {
            var jenkins = require("../js/index");
            
            // Require before the module is registered.
            // The require should "trigger" the loading of the module from the plugin.
            // Should pass because exportModule will happen before the timeout
            jenkins.requireModule('pluginA', 'mathUtils', 2000).then(function(module) {
                expect(module.add(2,2)).toBe(4);
                done();               
            }); // timeout before Jasmine does
            
            // Check that the <script> element was added to the <head>
            var internal = require("../js/internal");
            var document = internal.getWindow().document;
            var scriptEl = document.getElementById(internal.toPluginModuleId('pluginA', 'mathUtils'));            
            expect(scriptEl).toBeDefined();
            expect(scriptEl.getAttribute('src')).toBe('/jenkins/plugin/pluginA/jsmodules/mathUtils.js');
                        
            // Now mimic registering of the plugin module. In real Jenkins land, this would happen
            // async. The call to "require" would trigger the plugin js to be loaded
            // via adding of a <script> element to the page DOM. That plugin module
            // is then responsible for calling 'exportModule', which should trigger
            // the notify etc
            jenkins.exportModule('pluginA', 'mathUtils', {
                add: function(lhs, rhs) {
                    return lhs + rhs;
                }
            });
        });
    });

    it("- test require and exportModule sync successful", function (done) {
        testUtil.onJenkinsPage(function() {
            var jenkins = require("../js/index");

            // Register the module before calling require. See above test too.
            jenkins.exportModule('pluginA', 'mathUtils', {
                add: function(lhs, rhs) {
                    return lhs + rhs;
                }
            });
            
            // Should pass immediately because exportModule has already happened.
            jenkins.requireModule('pluginA', 'mathUtils', 0).then(function(module) {
                expect(module.add(2,2)).toBe(4);
                done();               
            }); // disable async load mode
            
        });
    });

    it("- test saveGlobal exists", function () {
        testUtil.onJenkinsPage(function() {
            var jenkins = require("../js/index");
            var theWindow = require("../js/internal").getWindow();
                        
            // save a few globals
            
            theWindow.jenkinsG1 = "1";        
            var mementoG1 = jenkins.saveGlobal('jenkinsG1');
            theWindow.jenkinsG1 = "A";

            theWindow.jenkinsG2 = "2";        
            var mementoG2 = jenkins.saveGlobal('jenkinsG2');
            theWindow.jenkinsG2 = "B";

            theWindow.jenkinsG3 = "3";        
            var mementoG3 = jenkins.saveGlobal('jenkinsG3');
            theWindow.jenkinsG3 = "C";
            
            // restore the globals, but in a different order ... make sure it doesn't matter

            expect(theWindow.jenkinsG1).toBe("A");
            mementoG1.restore();
            expect(theWindow.jenkinsG1).toBe("1");
            
            expect(theWindow.jenkinsG3).toBe("C");
            mementoG3.restore();
            expect(theWindow.jenkinsG3).toBe("3");

            expect(theWindow.jenkinsG2).toBe("B");
            mementoG2.restore();
            expect(theWindow.jenkinsG2).toBe("2");
        });
    });

    it("- test saveGlobal doesn't exist", function () {
        testUtil.onJenkinsPage(function() {
            var jenkins = require("../js/index");
            var theWindow = require("../js/internal").getWindow();
                        
            // save a global that doesn't exist            
            var mementoGX = jenkins.saveGlobal('jenkinsGX');
            
            // Now give it a value...
            theWindow.jenkinsGX = "X";

            // Now restore it ... should be a no-op i.e. the restore doesn't delete it
            mementoGX.restore();
            expect(theWindow.jenkinsGX).toBe("X");
        });
    });
});
