/* jslint node: true */
/* global describe, it, expect */

"use strict";

var testUtil = require("./test-util");

describe("index.js", function () {

    it("- test requireModule and exportModule timeout", function (done) {
        testUtil.onJenkinsPage(function() {
            var jenkins = require("../js/index");
            
            // should fail because a exportModule never happens
            jenkins.requireModule('pluginA:mathUtils', 100)
                .catch(function(error) {
                    expect(error.reason).toBe('timeout');
                    expect(error.detail).toBe("Please verify that the plugin 'pluginA' is installed, and that it registers a module named 'mathUtils'");
                    done();               
                });
        });
    });

    it("- test requireModule and exportModule async successful", function (done) {
        testUtil.onJenkinsPage(function() {
            var jenkins = require("../js/index");
            
            // Require before the module is registered.
            // The require should "trigger" the loading of the module from the plugin.
            // Should pass because exportModule will happen before the timeout
            jenkins.requireModule('pluginA:mathUtils', 2000).then(function(module) {
                expect(module.add(2,2)).toBe(4);
                done();               
            }); // timeout before Jasmine does
            
            // Try requiring the module again immediately. Should be ignored i.e. a second
            // <script> element should NOT be added to the dom. See the test at the end
            // of this method.
            jenkins.requireModule('pluginA:mathUtils', 1000).then(function(module) {
            });
            
            // Check that the <script> element was added to the <head>
            var internal = require("../js/internal");
            var document = require('window-handle').getWindow().document;
            var moduleId = internal.toPluginModuleId('pluginA', 'mathUtils') + ':js';
            
            var scriptEl = document.getElementById(moduleId);            
            
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
            
            // Verify that only one <script> element was added to the dom. Remove the one we found and
            // attempt to find another with the same id - we should fail.
            internal.getHeadElement().removeChild(scriptEl);
            scriptEl = document.getElementById(moduleId);
            expect(scriptEl).toBe(null);
        });
    });

    it("- test requireModule and exportModule sync successful", function (done) {
        testUtil.onJenkinsPage(function() {
            var jenkins = require("../js/index");

            // Register the module before calling require. See above test too.
            jenkins.exportModule('pluginA', 'mathUtils', {
                add: function(lhs, rhs) {
                    return lhs + rhs;
                }
            });
            
            // Should pass immediately because exportModule has already happened.
            jenkins.requireModule('pluginA:mathUtils', 0).then(function(module) {
                expect(module.add(2,2)).toBe(4);
                done();               
            }); // disable async load mode
            
        });
    });

    it("- test requireModules and exportModule async successful", function (done) {
        testUtil.onJenkinsPage(function() {
            var jenkins = require("../js/index");
            
            // Require before the modules are registered.
            // The require should "trigger" the loading of the module from the plugin.
            // Should pass because exportModule will happen before the timeout
            jenkins.requireModules('pluginA:mathUtils', 'pluginB:timeUtils', 2000)
                .then(function(mathUtils, timeUtils) {
                    // This function should only be called once both modules have been exported
                    expect(mathUtils.add(2,2)).toBe(4);
                    expect(timeUtils.now().getTime()).toBe(1000000000000);
                    done();               
                }); // timeout before Jasmine does
            
            // Now mimic registering of the plugin modules.
            jenkins.exportModule('pluginA', 'mathUtils', {
                add: function(lhs, rhs) {
                    return lhs + rhs;
                }
            });
            jenkins.exportModule('pluginB', 'timeUtils', {
                now: function() {
                    return new Date(1000000000000);
                }
            });
        });
    });

    it("- test requireModules and exportModule sync successful", function (done) {
        testUtil.onJenkinsPage(function() {
            var jenkins = require("../js/index");
            
            // Register the plugin modules before requiring.
            jenkins.exportModule('pluginA', 'mathUtils', {
                add: function(lhs, rhs) {
                    return lhs + rhs;
                }
            });
            jenkins.exportModule('pluginB', 'timeUtils', {
                now: function() {
                    return new Date(1000000000000);
                }
            });
            
            // Now require.
            // Should pass immediately because exportModule has already happened for each plugin.
            jenkins.requireModules('pluginA:mathUtils', 'pluginB:timeUtils', 0) // disable async load mode
                .then(function(mathUtils, timeUtils) {
                    // This function should only be called once both modules have been exported
                    expect(mathUtils.add(2,2)).toBe(4);
                    expect(timeUtils.now().getTime()).toBe(1000000000000);
                    done();               
                }); // timeout before Jasmine does
        });
    });

    it("- test addModuleCSSToPage", function (done) {
        testUtil.onJenkinsPage(function() {
            var jenkins = require("../js/index");
            var internal = require("../js/internal");
            var document = require('window-handle').getWindow().document;

            var cssEl = document.getElementById(internal.toPluginModuleId('pluginA', 'mathUtils') + ':css');            
            expect(cssEl).toBe(null);
            
            jenkins.addModuleCSSToPage('pluginA', 'mathUtils');
            cssEl = document.getElementById(internal.toPluginModuleId('pluginA', 'mathUtils') + ':css');
            expect(cssEl).toBeDefined();
            expect(cssEl.getAttribute('href')).toBe('/jenkins/plugin/pluginA/jsmodules/mathUtils/style.css');
            
            done();
        });
    });


    it("- test rootURL/resURL not defined", function (done) {
        testUtil.onJenkinsPage(function() {
            var jenkins = require("../js/index");
            jenkins.exportModule('pluginA', 'mathUtils', {
                add: function(lhs, rhs) {
                    return lhs + rhs;
                }
            }, function (e) {
                expect(e).toBe("Attribute 'resURL' not defined on the document <head> element.");
                done();
            });
        }, '<html><head></head></html>');
    });

    it("- test rootURL/resURL defined", function (done) {
        testUtil.onJenkinsPage(function() {
            var jenkins = require("../js/index");
            jenkins.setRootURL('/jenkins')
            jenkins.exportModule('pluginA', 'mathUtils', {
                add: function(lhs, rhs) {
                    return lhs + rhs;
                }
            });
            done();
        }, '<html><head></head></html>');
    });
});
