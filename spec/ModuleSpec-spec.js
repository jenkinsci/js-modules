/* jslint node: true */
/* global describe, it, expect */

"use strict";

var ModuleSpec = require('../js/ModuleSpec');

describe("ModuleSpec.js", function () {

    function assertQNameOK(actual, expected) {
        expect(actual.nsProvider).toBe(expected.nsProvider);
        expect(actual.namespace).toBe(expected.namespace);
        expect(actual.moduleName).toBe(expected.moduleName);
        expect(actual.moduleVersion).toBe(expected.moduleVersion);
    }

    it("- test basic constructor", function () {
        assertQNameOK(new ModuleSpec('b'), {nsProvider: undefined, namespace: undefined, moduleName: 'b'});
        assertQNameOK(new ModuleSpec('./b'), {nsProvider: undefined, namespace: undefined, moduleName: './b'});
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

    it("- test getLoadBundleVersion", function () {
        expect(new ModuleSpec('b').getLoadBundleVersion()).toBe(undefined);
        // None of the versions are specific ... return the first
        expect(new ModuleSpec('b@any|1.2.x').getLoadBundleVersion().raw).toBe('any');
        // Should return 1.2.3 because it's the first "specific" version in the list
        expect(new ModuleSpec('b@any|1.2.3|3.2.1').getLoadBundleVersion().raw).toBe('1.2.3');
        expect(new ModuleSpec('b@any,1.2.3,3.2.1').getLoadBundleVersion().raw).toBe('1.2.3');
    });

    it("- test getLoadBundleName", function () {
        expect(new ModuleSpec('b').getLoadBundleName()).toBe('b');
        // None of the versions are specific ... return the first
        expect(new ModuleSpec('b@any|1.2.x').getLoadBundleName()).toBe('b@any');
        // Should return 1.2.3 because it's the first "specific" version in the list
        expect(new ModuleSpec('b@any|1.2.3|3.2.1').getLoadBundleName()).toBe('b@1.2.3');
    });

    it("- test importAs", function () {
        
        var x = new ModuleSpec('core-assets/b');
        
        expect(new ModuleSpec('b').importAs()).toBe('b:b');
        expect(new ModuleSpec('a:b').importAs()).toBe('a:b');
        expect(new ModuleSpec('./b').importAs()).toBe('./b');
        // None of the versions are specific ... return the first
        expect(new ModuleSpec('b@any|1.2.x').importAs()).toBe('b:b@any');
        // Should return 1.2.3 because it's the first "specific" version in the list
        expect(new ModuleSpec('b@any|1.2.3|3.2.1').importAs()).toBe('b:b@1.2.3');
        expect(new ModuleSpec('@xorg/b@any|1.2.3|3.2.1').importAs()).toBe('xorg-b:xorg-b@1.2.3');

        // And with namespaces
        expect(new ModuleSpec('core-assets/a:b').importAs()).toBe('core-assets/a:b');
        expect(new ModuleSpec('core-assets/b:@xorg/b@any|1.2.3|3.2.1').importAs()).toBe('core-assets/b:xorg-b@1.2.3');
    });

    it("- test getLoadBundleFileNamePrefix", function () {
        expect(new ModuleSpec('b').getLoadBundleFileNamePrefix()).toBe('b');
        // Has versions, but none are specific ... return undefined
        expect(new ModuleSpec('b@any|1.2.x').getLoadBundleFileNamePrefix()).toBe(undefined);
        // Should return 1.2.3 because it's the first "specific" version in the list
        expect(new ModuleSpec('b@any|1.2.3|3.2.1').getLoadBundleFileNamePrefix()).toBe('b-1-2-3');
        
        // And test that org package names get normalized...
        expect(new ModuleSpec('@xorg/funkypack').getLoadBundleFileNamePrefix()).toBe('xorg-funkypack');
        expect(new ModuleSpec('@xorg/funkypack@any|1.2.3|3.2.1').getLoadBundleFileNamePrefix()).toBe('xorg-funkypack-1-2-3');
    });
});
