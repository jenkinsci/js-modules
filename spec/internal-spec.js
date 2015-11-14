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
    }

    it("- test parseResourceQName", function () {
        var internal = require("../js/internal");

        assertQNameOK(internal.parseResourceQName('b'), {nsProvider: 'core', moduleName: 'b'});
        assertQNameOK(internal.parseResourceQName('a:b'), {nsProvider: undefined, namespace: 'a', moduleName: 'b'});
        assertQNameOK(internal.parseResourceQName('plugin/a:b'), {nsProvider: 'plugin', namespace: 'a', moduleName: 'b'});
        assertQNameOK(internal.parseResourceQName('core/a:b'), {nsProvider: 'core', namespace: 'a', moduleName: 'b'});

        // unsupported nsProvider should switch to 'plugin'
        assertQNameOK(internal.parseResourceQName('xyz/a:b'), {nsProvider: undefined, namespace: 'a', moduleName: 'b'});
    });
});
