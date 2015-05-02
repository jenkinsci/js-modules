/* jslint node: true */
/* global describe, it, expect */

"use strict";

var promise = require("../js/promise");

console.log('Boooooom');

describe("promise.js", function () {

    // promised is resolved after the "then" func is added
    it("- promise resolve after", function (done) {
        
        var aPromise = promise.make(function(resolve, reject) {
            setTimeout(function() {
                expect(aPromise.state).toBe('PENDING');                
                resolve('success');                
                expect(aPromise.thenCalled).toBe(true);                
                expect(aPromise.state).toBe('FULFILLED');                
                done();
            }, 1000);
        });
        
        aPromise
            .then(function(result) {
                expect(aPromise.state).toBe('FULFILLED');                
                expect(result).toBe('success');
                aPromise.thenCalled = true;
            });
    });

    // promised is resolved before the "then" func is added
    it("- promise resolve before", function (done) {
        
        var aPromise = promise.make(function(resolve, reject) {
            expect(this.state).toBe('PENDING');
            resolve('success');
            expect(this.state).toBe('FULFILLED');
        });
        
        setTimeout(function() {
            // Should already be fulfilled
            expect(aPromise.state).toBe('FULFILLED');                
            aPromise
                .then(function(result) {
                    expect(result).toBe('success');
                    done();
                });
        }, 1000);
    });

    // promised is rejected after the "catch" func is added
    it("- promise reject after", function (done) {
        
        var aPromise = promise.make(function(resolve, reject) {
            setTimeout(function() {
                expect(aPromise.state).toBe('PENDING');                
                reject('failed');
                expect(aPromise.catchCalled).toBe(true);                
                expect(aPromise.state).toBe('REJECTED');                
                done();
            }, 1000);
        });
        
        aPromise
            .catch(function(error) {
                expect(error).toBe('failed');
                aPromise.catchCalled = true;
            });
    });

    // promised is rejected before the "catch" func is added
    it("- promise reject before", function (done) {
        
        var aPromise = promise.make(function(resolve, reject) {
            expect(this.state).toBe('PENDING');
            reject('failed');
            expect(this.state).toBe('REJECTED');
        });
        
        setTimeout(function() {
            // Should already be rejected
            expect(aPromise.state).toBe('REJECTED');                
            aPromise
                .catch(function(error) {
                    expect(error).toBe('failed');
                    done();
                });
        }, 1000);
    });
});
