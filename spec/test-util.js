/**
 * TODO: refactor out into a "jenkins-testutil" npm module? UIThemes has a "helper" module that could go there too.
 */
    
var jsdom = require("jsdom");

var JENKINS_PAGE = '<html><head resURL="/jenkins"></head><body><div></div></body></html>';

exports.onJenkinsPage = function(testFunc) {
    jsdom.env(JENKINS_PAGE, [],
        function (errors, window) {
            exports.mockWindow(window);
            testFunc();
        }
    );    
}

exports.mockWindow = function(window) {
    var internal = require("../js/internal");
    internal.getWindow = function() {
        return window;
    };    
}