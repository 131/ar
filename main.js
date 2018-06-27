"use strict";

const parseArgs = require('nyks/process/parseArgs');


const nw = !!global.window;
const gui = nw ? window.require('nw.gui') : null;


const args = nw ? gui.App.argv : process.argv.splice(2);
const dict = parseArgs(args).dict;



const App = require('./lib/ar.js');
const app = new App(dict);


console.log("Initializing app");
console.log("Starting GUI");


app.run();
