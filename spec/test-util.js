/**
 * TODO: refactor out into a "jenkins-testutil" npm module? UIThemes has a "helper" module that could go there too.
 */
    
var jsdom = require("jsdom");

exports.onJenkinsPage = function(testFunc) {
    var JENKINS_PAGE = '<html><head resURL="/jenkins"></head><body><div></div></body></html>';
    jsdom.env(JENKINS_PAGE, [],
        function (errors, window) {
            require("window-handle").setWindow(window);
            testFunc();
        }
    );    
}