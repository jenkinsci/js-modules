### Do I need to learn all this "new" stuff?
No, this is all totally optional. Please read [Keep Calm](https://github.com/tfennelly/jenkins-js-modules#keep-calm).

### Do I really need this? Couldn't I have just done it using Gulp Browserify?
Yes, you could build modularized JS and used it in your plugin. However the problem is that means every app bundle
will contain all the code for every JS Framework lib it depends on. The big thing that `jenkins-js-modules` bring
is the ability to create slimmed down "app" bundles that only contain the "app" JS.