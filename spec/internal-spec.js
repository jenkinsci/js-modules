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

    function assertQNameOK(actual, expected) {
        expect(actual.nsProvider).toBe(expected.nsProvider);
        expect(actual.namespace).toBe(expected.namespace);
        expect(actual.moduleName).toBe(expected.moduleName);
        expect(actual.moduleVersion).toBe(expected.moduleVersion);
    }

    it("- test parseResourceQName", function () {
        var internal = require("../js/internal");

        assertQNameOK(internal.parseResourceQName('b'), {nsProvider: undefined, namespace: undefined, moduleName: 'b'});
        assertQNameOK(internal.parseResourceQName('@orgx/b'), {nsProvider: undefined, namespace: undefined, moduleName: '@orgx/b'});
        assertQNameOK(internal.parseResourceQName('a:b'), {nsProvider: undefined, namespace: 'a', moduleName: 'b'});
        assertQNameOK(internal.parseResourceQName('plugin/a:b'), {nsProvider: 'plugin', namespace: 'a', moduleName: 'b'});
        assertQNameOK(internal.parseResourceQName('core-assets/a:b'), {nsProvider: 'core-assets', namespace: 'a', moduleName: 'b'});
        assertQNameOK(internal.parseResourceQName('core-assets/a:@orgx/b'), {nsProvider: 'core-assets', namespace: 'a', moduleName: '@orgx/b'});

        assertQNameOK(internal.parseResourceQName('b@1.1.1'), {nsProvider: undefined, namespace: undefined, moduleName: 'b', moduleVersion: '1.1.1'});
        assertQNameOK(internal.parseResourceQName('@orgx/b@1.1.1'), {nsProvider: undefined, namespace: undefined, moduleName: '@orgx/b', moduleVersion: '1.1.1'});
        assertQNameOK(internal.parseResourceQName('a:b@1.1.1'), {nsProvider: undefined, namespace: 'a', moduleName: 'b', moduleVersion: '1.1.1'});
        assertQNameOK(internal.parseResourceQName('plugin/a:b@1.1.1'), {nsProvider: 'plugin', namespace: 'a', moduleName: 'b', moduleVersion: '1.1.1'});
        assertQNameOK(internal.parseResourceQName('core-assets/a:b@1.1.1'), {nsProvider: 'core-assets', namespace: 'a', moduleName: 'b', moduleVersion: '1.1.1'});
        assertQNameOK(internal.parseResourceQName('core-assets/a:@orgx/b@1.1.1'), {nsProvider: 'core-assets', namespace: 'a', moduleName: '@orgx/b', moduleVersion: '1.1.1'});
        
        // unsupported nsProvider should switch to 'plugin'
        assertQNameOK(internal.parseResourceQName('xyz/a:b'), {nsProvider: undefined, namespace: 'a', moduleName: 'b'});
    });

    it("- test parseVersion", function () {
        var internal = require('../js/internal');
        
        var parsedVer = internal.parseNPMVersion('1.2.3');
        expect(parsedVer.major).toBe('1');
        expect(parsedVer.minor).toBe('2');
        expect(parsedVer.patch).toBe('3');
        expect(parsedVer.prerelease).toBe(undefined);
        
        parsedVer = internal.parseNPMVersion('1.2.3-beta.1');
        expect(parsedVer.major).toBe('1');
        expect(parsedVer.minor).toBe('2');
        expect(parsedVer.patch).toBe('3');
        expect(parsedVer.prerelease).toBe('beta.1');
    });

    it("- test toModuleSrc", function () {
        var internal = require("../js/internal");
        
        // from adjuncts
        var b = internal.parseResourceQName('b');
        var bJs = internal.toModuleSrc(b, 'js');
        expect(bJs).toBe('/jenkins/adjuncts/xxx/org/jenkins/ui/jsmodules/b.js');
        var ab = internal.parseResourceQName('a:b');
        var abJs = internal.toModuleSrc(ab, 'js');
        expect(abJs).toBe('/jenkins/adjuncts/xxx/org/jenkins/ui/jsmodules/a/b.js');

        // from plugin
        ab = internal.parseResourceQName('plugin/a:b');
        abJs = internal.toModuleSrc(ab, 'js');
        expect(abJs).toBe('/jenkins/plugin/a/jsmodules/b.js');

        // from core assets
        ab = internal.parseResourceQName('core-assets/a:b');
        abJs = internal.toModuleSrc(ab, 'js');
        expect(abJs).toBe('/jenkins/assets/a/jsmodules/b.js');
    });
    
});
