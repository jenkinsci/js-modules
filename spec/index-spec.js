/* jslint node: true */
/* global describe, it, expect */

"use strict";

var testUtil = require("./test-util");

describe("index.js", function () {

    it("- test require and registerModule timeout", function (done) {
        testUtil.onJenkinsPage(function() {
            var jenkins = require("../js/index");
            
            // should fail because a registerModule never happens
            jenkins.require('pluginA', 'mathUtils', 100)
                .catch(function(error) {
                    expect(error.reason).toBe('timeout');
                    expect(error.detail).toBe("Please verify that the plugin 'pluginA' is installed, and that it registers a module named 'mathUtils'");
                    done();               
                });
        });
    });

    it("- test require and registerModule async successful", function (done) {
        testUtil.onJenkinsPage(function() {
            var jenkins = require("../js/index");
            
            // Require before the module is registered.
            // The require should "trigger" the loading of the module from the plugin.
            // Should pass because registerModule will happen before the timeout
            jenkins.require('pluginA', 'mathUtils', 2000).then(function(module) {
                expect(module.add(2,2)).toBe(4);
                done();               
            }); // timeout before Jasmine does
            
            // Check that the <script> element was added to the <head>
            var internal = require("../js/internal");
            var document = internal.getWindow().document;
            var scriptEl = document.getElementById(internal.toPluginModuleId('pluginA', 'mathUtils'));            
            expect(scriptEl).toBeDefined();
            expect(scriptEl.getAttribute('src')).toBe('/jenkins/pluginA/jsmodules/mathUtils.js');
                        
            // Now mimic registering of the plugin module. In real Jenkins land, this would happen
            // async. The call to "require" would trigger the plugin js to be loaded
            // via adding of a <script> element to the page DOM. That plugin module
            // is then responsible for calling 'registerModule', which should trigger
            // the notify etc
            jenkins.registerModule('pluginA', 'mathUtils', {
                add: function(lhs, rhs) {
                    return lhs + rhs;
                }
            });
        });
    });

    it("- test require and registerModule sync successful", function (done) {
        testUtil.onJenkinsPage(function() {
            var jenkins = require("../js/index");

            // Register the module before calling require. See above test too.
            jenkins.registerModule('pluginA', 'mathUtils', {
                add: function(lhs, rhs) {
                    return lhs + rhs;
                }
            });
            
            // Should pass immediately because registerModule has already happened.
            jenkins.require('pluginA', 'mathUtils', 0).then(function(module) {
                expect(module.add(2,2)).toBe(4);
                done();               
            }); // disable async load mode
            
        });
    });
});
