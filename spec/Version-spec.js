/* jslint node: true */
/* global describe, it, expect */

"use strict";

describe("Version.js", function () {

    it("- test Version parse", function () {
        var Version = require('../js/Version');
        
        var parsedVer = new Version('1.2.3');
        expect(parsedVer.major).toBe('1');
        expect(parsedVer.minor).toBe('2');
        expect(parsedVer.patch).toBe('3');
        expect(parsedVer.prerelease).toBe(undefined);
        
        parsedVer = new Version('1.2.3-beta.1');
        expect(parsedVer.major).toBe('1');
        expect(parsedVer.minor).toBe('2');
        expect(parsedVer.patch).toBe('3');
        expect(parsedVer.prerelease).toBe('beta.1');
        
        parsedVer = new Version('blah');
        expect(parsedVer.major).toBe(undefined);
        expect(parsedVer.minor).toBe(undefined);
        expect(parsedVer.patch).toBe(undefined);
        expect(parsedVer.prerelease).toBe(undefined);
    });
});
