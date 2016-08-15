var gulp = require('gulp');
var jasmine = require('gulp-jasmine');
var jasmineReporters = require('jasmine-reporters');
        
var terminalReporter = new jasmineReporters.TerminalReporter({
    verbosity: 3,
    color: true,
    showStack: true
});        
var junitReporter = new jasmineReporters.JUnitXmlReporter({
    savePath: 'target/surefire-reports',
    consolidateAll: true,
    filePrefix: 'JasmineReport'    
});
 
gulp.task('default', function () {
    return gulp.src('spec/*-spec.js')
        .pipe(jasmine({reporter: [terminalReporter, junitReporter]}));
    //return gulp.src('spec/import-version-ranges-spec.js')
    //    .pipe(jasmine({reporter: [terminalReporter, junitReporter]}));
});