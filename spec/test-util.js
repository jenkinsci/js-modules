/**
 * TODO: refactor out into a "jenkins-testutil" npm module? UIThemes has a "helper" module that could go there too.
 */
    
var jsdom = require("jsdom");

exports.onJenkinsPage = function(testFunc, content) {
    if (!content) {
        content = '<html><head resURL="/jenkins"></head><body><div></div></body></html>';
    }
    jsdom.env(content, [],
        function (errors, window) {
            require("window-handle").setWindow(window);
            testFunc();
        }
    );    
}