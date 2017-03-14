"use strict";

const co        = require('co');
const util      = require('util');
const parseargs = require('nyks/process/parseargs');


const nw = !!global.window;
const gui = nw ? window.require('nw.gui') : null;


const args = nw ? gui.App.argv : process.argv.splice(2);
const dict = parseargs(args).dict;



const App = require('./lib/ar.js');
const app = new App(dict);

if(false) process.on('uncaughtException', function(err) {
    // handle the error safely
    console.error(err);
});

console.log("Initializing app");
console.log("Starting GUI");


co(function* (){
  yield app.run();
});
