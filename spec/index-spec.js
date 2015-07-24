/* jslint node: true */
/* global describe, it, expect */

"use strict";

var testUtil = require("./test-util");

describe("index.js", function () {

    it("- test import/require and export timeout", function (done) {
        testUtil.onJenkinsPage(function() {
            var jenkins = require("../js/index");
            
            try {
                jenkins.require('pluginA:mathUtils');
            } catch (e) {
                expect(e).toBe("Unable to perform synchronous 'require' for module 'pluginA:mathUtils'. This module is not pre-loaded. The module needs to have been asynchronously pre-loaded via an outer call to 'import'.");
            }
            
            // should fail because a export never happens
            jenkins.setRegisterTimeout(100);
            jenkins.import('pluginA:mathUtils')
                .catch(function(error) {
                    expect(error.reason).toBe('timeout');
                    expect(error.detail).toBe("Please verify that the plugin 'pluginA' is installed, and that it registers a module named 'mathUtils'");
                    done();               
                });
        });
    });

    it("- test import/require and export async successful", function (done) {
        testUtil.onJenkinsPage(function() {
            var jenkins = require("../js/index");
            
            // Require before the module is registered.
            // The require should "trigger" the loading of the module from the plugin.
            // Should pass because export will happen before the timeout
            jenkins.import('pluginA:mathUtils', 2000).onFulfilled(function(module) {
                expect(module.add(2,2)).toBe(4);
                done();               
            }); // timeout before Jasmine does
            
            // Try requiring the module again immediately. Should be ignored i.e. a second
            // <script> element should NOT be added to the dom. See the test at the end
            // of this method.
            jenkins.import('pluginA:mathUtils', 1000).onFulfilled(function(module) {
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
            // is then responsible for calling 'export', which should trigger
            // the notify etc
            jenkins.export('pluginA', 'mathUtils', {
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
            var mathUtils = jenkins.require('pluginA:mathUtils');
            expect(mathUtils).toBeDefined();
        });
    });

    it("- test import and export sync successful", function (done) {
        testUtil.onJenkinsPage(function() {
            var jenkins = require("../js/index");

            // Register the module before calling require. See above test too.
            jenkins.export('pluginA', 'mathUtils', {
                add: function(lhs, rhs) {
                    return lhs + rhs;
                }
            });
            
            // Should pass immediately because export has already happened.
            jenkins.import('pluginA:mathUtils', 0).onFulfilled(function(module) {
                expect(module.add(2,2)).toBe(4);
                done();               
            }); // disable async load mode
            
        });
    });

    it("- test import and export async successful", function (done) {
        testUtil.onJenkinsPage(function() {
            var jenkins = require("../js/index");
            
            // Require before the modules are registered.
            // The require should "trigger" the loading of the module from the plugin.
            // Should pass because export will happen before the timeout
            jenkins.setRegisterTimeout(2000);
            jenkins.import('pluginA:mathUtils', 'pluginB:timeUtils')
                .onFulfilled(function(mathUtils, timeUtils) {
                    // This function should only be called once both modules have been exported
                    expect(mathUtils.add(2,2)).toBe(4);
                    expect(timeUtils.now().getTime()).toBe(1000000000000);
                    done();               
                }); // timeout before Jasmine does
            
            // Now mimic registering of the plugin modules.
            jenkins.export('pluginA', 'mathUtils', {
                add: function(lhs, rhs) {
                    return lhs + rhs;
                }
            });
            jenkins.export('pluginB', 'timeUtils', {
                now: function() {
                    return new Date(1000000000000);
                }
            });
        });
    });

    it("- test import and export sync successful", function (done) {
        testUtil.onJenkinsPage(function() {
            var jenkins = require("../js/index");
            
            // Register the plugin modules before requiring.
            jenkins.export('pluginA', 'mathUtils', {
                add: function(lhs, rhs) {
                    return lhs + rhs;
                }
            });
            jenkins.export('pluginB', 'timeUtils', {
                now: function() {
                    return new Date(1000000000000);
                }
            });
            
            // Now require.
            // Should pass immediately because export has already happened for each plugin.
            jenkins.setRegisterTimeout(0);
            jenkins.import('pluginA:mathUtils', 'pluginB:timeUtils') // disable async load mode
                .onFulfilled(function(mathUtils, timeUtils) {
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
            jenkins.export('pluginA', 'mathUtils', {
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
            jenkins.export('pluginA', 'mathUtils', {
                add: function(lhs, rhs) {
                    return lhs + rhs;
                }
            });
            done();
        }, '<html><head></head></html>');
    });
});
