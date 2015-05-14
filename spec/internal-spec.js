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
});
