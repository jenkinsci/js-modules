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

var Version = require('./Version');

function ModuleSpec(qName) {
    var qNameTokens = qName.split(":");
    
    if (qNameTokens.length === 2) {
        var namespace = qNameTokens[0].trim();
        var nsTokens = namespace.split("/");
        var namespaceProvider = undefined;
        if (nsTokens.length === 2) {
            namespaceProvider = nsTokens[0].trim();
            namespace = nsTokens[1].trim();
            if (namespaceProvider !== 'plugin' && namespaceProvider !== 'core-assets') {
                console.error('Unsupported module namespace provider "' + namespaceProvider + '". Setting to undefined.');
                namespaceProvider = undefined;
            }
        }
        
        var npmName = parseNPMName(qNameTokens[1].trim());
        
        this.nsProvider = namespaceProvider;
        this.namespace = namespace;
        this.moduleName = npmName.name;
        this.moduleVersion = npmName.version;
    } else {
        // The module/bundle is not in a namespace and doesn't
        // need to be loaded i.e. it will load itself and export.
        var npmName = parseNPMName(qNameTokens[0].trim());

        this.moduleName = npmName.name;
        this.moduleVersion = npmName.version;
    }

    // Attach version compatibility info
    var versions = [];
    
    if (this.moduleVersion) {
        var moduleVersionTokens = this.moduleVersion.split(/[,|]+/);

        for (var i in moduleVersionTokens) {
            var moduleVersionToken = moduleVersionTokens[i].trim();
            var parsedVersion = new Version(moduleVersionToken);
            versions.push(parsedVersion);
        }
    }
    
    this.moduleCompatVersions = versions;
}

ModuleSpec.prototype.getLoadBundleVersion = function() {
    if (this.moduleCompatVersions.length === 0) {
        // If no versions were specified on the name, then we
        // just return undefined.
        return undefined;
    }
    // If a version is specified, we use the first "specific" version
    // e.g. "1.1.2" is specific while "1.1.x" and "any" are not.
    for (var i in this.moduleCompatVersions) {
        var version = this.moduleCompatVersions[i];
        if (version.isSpecific()) {
            return version;
        }
    }
    
    // If there's no specific version then we return the first
    // version in the list.
    return this.moduleCompatVersions[0];
};

ModuleSpec.prototype.getLoadBundleName = function() {
    var version = this.getLoadBundleVersion();
    if (version) {
        return this.moduleName + '@' + version.raw;
    } else {
        return this.moduleName;
    }
};

ModuleSpec.prototype.getLoadBundleFileNamePrefix = function() {
    var version = this.getLoadBundleVersion();
    var normalizedName = normalizePackageName(this.moduleName);
    if (version) {
        // If a version was specified then we only do the script load if a
        // specific version was provided i.e. loading does not get triggered
        // by imports that specify non-specific version numbers e.g. "any"
        // or "1.2.x". A specific version number would be e.g. "1.2.3" i.e.
        // fully qualified. When loading is not triggered, the import is depending
        // on another import (with a specific version) or on a bundle do an
        // export of an internal dependency i.e. on another bundle "providing"
        // the module be exporting it.
        if (version.isSpecific()) {
            return normalizedName + '-' + version.raw.replace(new RegExp('\\.', 'g'), '-');
        } else {
            return undefined;
        }
    } else {
        return normalizedName;
    }
};

/**
 * Normalize an NPM package name by removing all non alpha numerics and replacing
 * with hyphens.
 * @param packageName The NPM package name.
 * @returns The normalized NPM package name.
 */
function normalizePackageName(packageName) {
    packageName = packageName.replace(/[^\w.]/g, "-"); // replace non alphanumerics.
    if (packageName.charAt(0) === '-') {
        packageName = packageName.substring(1);
    }
    return packageName;
};

function parseNPMName(resourceName) {
    if (resourceName.length > 1) {
        var npmName = {};
        var orgSlashIndex = resourceName.indexOf('/');
        
        if (resourceName.charAt(0) === '@' && orgSlashIndex > 0) {
            // It's an NPM org package. Strip off the org and package
            // and add it to the name. We'll get the rest then and parse
            // that.
            npmName.name = resourceName.substring(0, orgSlashIndex + 1);
            
            // Remove the org part from the name and continue parsing.
            resourceName = resourceName.substring(orgSlashIndex + 1);
        } else {
            // Initialise it so we can append to it below.
            npmName.name = '';
        }
        
        var versionIndex = resourceName.indexOf('@');
        if (versionIndex > 0) {
            npmName.name += resourceName.substring(0, versionIndex);
            npmName.version = resourceName.substring(versionIndex + 1);
        } else {
            npmName.name += resourceName;
        }
        
        return npmName;
    } else {
        return {
            name: resourceName
        }
    }
}

module.exports = ModuleSpec;

