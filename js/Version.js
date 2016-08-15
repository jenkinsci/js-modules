/*
 * The MIT License
 *
 * Copyright (c) 2016, CloudBees, Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

function Version(version) {
    this.raw = version;
    
    // The version string must start with a digit.
    // It's not an error for it not to start with a number e.g. it can
    // be "any" and we may introduce other aliases.
    if (!version || version.length === 0 || isNaN(version.charAt(0))) {
        return;
    }
    
    function normalizeToken(string) {
        // remove anything that's not a digit, a dot or an x.
        var normalized = string.replace(/[^\d]/g, '');
        if (normalized === '') {
            return undefined;
        }
        return normalized;
    }
    
    var versionTokens = version.split('.');
    
    this.prerelease = undefined;
    
    var patchAndPrerelease = '';
    for (var i = 2; i < versionTokens.length; i++) {
        if (patchAndPrerelease.length > 0) {
            patchAndPrerelease += '.';
        }
        patchAndPrerelease += versionTokens[i];
        
        var separatorIdx = patchAndPrerelease.indexOf('-');
        if (separatorIdx !== -1) {
            this.patch = normalizeToken(patchAndPrerelease.substring(0, separatorIdx));
            this.prerelease = patchAndPrerelease.substring(separatorIdx + 1);
        } else {
            this.patch = normalizeToken(patchAndPrerelease);
        }
    }
    
    if (versionTokens.length >= 2) {
        this.minor = normalizeToken(versionTokens[1]);
    }
    if (versionTokens.length >= 1) {
        this.major = normalizeToken(versionTokens[0]);
    }    
}

Version.prototype.isSpecific = function() {
    return (this.major !== undefined && this.minor !== undefined && this.patch !== undefined);
};

module.exports = Version;