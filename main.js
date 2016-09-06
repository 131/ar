require('nyks');

var console   = require('nwconsole'),
    parseargs = require('nyks/process/parseargs');
console.log('IT WORKs !');


var nw = !!global.window;
var gui;
if(nw) {
  //gui = global.window.nwDispatcher.requireNwGui();
  gui = window.require('nw.gui');
}

var args = nw ? gui.App.argv : process.argv.splice(2),
    dict = parseargs(args).dict;

var App = require('./lib/ar.js');

var app = new App(dict);

process.on('uncaughtException', function(err) {
    // handle the error safely
    console.error(err);
});

console.log("Initializing app");


  console.log("Starting GUI");
  app.run();

if(nw) {
}
