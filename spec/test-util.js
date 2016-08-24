/**
 * TODO: refactor out into a "jenkins-testutil" npm module? UIThemes has a "helper" module that could go there too.
 */
    
var jsdom = require("jsdom");

exports.onJenkinsPage = function(testFunc, content) {
    if (!content) {
        content = '<html><head data-rooturl="/jenkins" data-adjuncturl="/jenkins/adjuncts/xxx" data-resurl="/jenkins/static/xxx"></head><body><div></div></body></html>';
    }
    jsdom.env(content, [],
        function (errors, window) {
            global.window = window;
            require("../js/internal").clearJenkinsGlobal();
            testFunc();
        }
    );    
}