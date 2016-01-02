var console   = require('nwconsole'),
    util      = require('util');

var parseargs = require('nyks/process/parseargs');


var nw = !!global.window;
var gui;
if(nw) {
  gui = global.window.nwDispatcher.requireNwGui();
}

var args = nw ? gui.App.argv : process.argv.splice(2),
    dict = parseargs(args).dict;


console.log(dict);

var App = require('./lib/ar.js');

var app = new App(dict);

if(false) process.on('uncaughtException', function(err) {
    // handle the error safely
    console.error(err);
});

console.log("Initializing app");


  console.log("Starting GUI");
  app.run();

if(nw) {
}
