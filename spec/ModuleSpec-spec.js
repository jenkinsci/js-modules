/* jslint node: true */
/* global describe, it, expect */

"use strict";

describe("ModuleSpec.js", function () {

    function assertQNameOK(actual, expected) {
        expect(actual.nsProvider).toBe(expected.nsProvider);
        expect(actual.namespace).toBe(expected.namespace);
        expect(actual.moduleName).toBe(expected.moduleName);
        expect(actual.moduleVersion).toBe(expected.moduleVersion);
    }

    it("- test parse ModuleSpec", function () {
        var ModuleSpec = require('../js/ModuleSpec');

        assertQNameOK(new ModuleSpec('b'), {nsProvider: undefined, namespace: undefined, moduleName: 'b'});
        assertQNameOK(new ModuleSpec('@orgx/b'), {nsProvider: undefined, namespace: undefined, moduleName: '@orgx/b'});
        assertQNameOK(new ModuleSpec('a:b'), {nsProvider: undefined, namespace: 'a', moduleName: 'b'});
        assertQNameOK(new ModuleSpec('plugin/a:b'), {nsProvider: 'plugin', namespace: 'a', moduleName: 'b'});
        assertQNameOK(new ModuleSpec('core-assets/a:b'), {nsProvider: 'core-assets', namespace: 'a', moduleName: 'b'});
        assertQNameOK(new ModuleSpec('core-assets/a:@orgx/b'), {nsProvider: 'core-assets', namespace: 'a', moduleName: '@orgx/b'});

        assertQNameOK(new ModuleSpec('b@1.1.1'), {nsProvider: undefined, namespace: undefined, moduleName: 'b', moduleVersion: '1.1.1'});
        assertQNameOK(new ModuleSpec('@orgx/b@1.1.1'), {nsProvider: undefined, namespace: undefined, moduleName: '@orgx/b', moduleVersion: '1.1.1'});
        assertQNameOK(new ModuleSpec('a:b@1.1.1'), {nsProvider: undefined, namespace: 'a', moduleName: 'b', moduleVersion: '1.1.1'});
        assertQNameOK(new ModuleSpec('plugin/a:b@1.1.1'), {nsProvider: 'plugin', namespace: 'a', moduleName: 'b', moduleVersion: '1.1.1'});
        assertQNameOK(new ModuleSpec('core-assets/a:b@1.1.1'), {nsProvider: 'core-assets', namespace: 'a', moduleName: 'b', moduleVersion: '1.1.1'});
        assertQNameOK(new ModuleSpec('core-assets/a:@orgx/b@1.1.1'), {nsProvider: 'core-assets', namespace: 'a', moduleName: '@orgx/b', moduleVersion: '1.1.1'});
        
        // unsupported nsProvider should switch to 'plugin'
        assertQNameOK(new ModuleSpec('xyz/a:b'), {nsProvider: undefined, namespace: 'a', moduleName: 'b'});
    });
    
});
