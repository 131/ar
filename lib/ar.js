"use strict";

const fs     = require('fs');
const url    = require('url');
const path   = require('path');
const Events = require('events');

const mv     = require('mv');

const SR        = require('screen-capture-recorder');
const deepMixIn = require('mout/object/deepMixIn');
const $E        = require('udom/element/create');


const nw = !!global.window;
const gui = nw ? window.require('nw.gui') : null;


class AnimationRecorder extends Events.EventEmitter {

  constructor(config) {
    super();

    gui.Window.get().showDevTools()

    this.config = {
      capture_mode : 'html5', //or swf
    };

    this._screenrecorder = null;


    deepMixIn(this.config, config);



console.log("INEHEHR");
    var source_path = this.config.source_path;
    if(!source_path)
      throw new Error("Missing source path");

    this.config.source_path = ("file:///" + path.resolve(source_path)).replace(new RegExp("\\\\", "g"), "/");
    if(!this.config.output_path)
      throw new Error("Missing output path");
    this.config.output_path = path.resolve(this.config.output_path);


    this.config.width  = this.config.width || 640;
    this.config.height = this.config.height || 480;


    this._screenrecorder = new SR({x:0,y:0,w:this.config.width,h:this.config.height});

    console.log("Path is ", this.config.source_path);

    if(!fs.existsSync(source_path)) 
      throw "Invalid configuration source path";
  }

  * run() {
    var self = this;
    yield new Promise(function(resolve) {
      self._screenrecorder.warmup(resolve)
    });

    yield self.startGUI();
  }

  * startGUI() {
    var self = this;
    var url = this.config.source_path;

    console.log("Browsing to ", url);

    var options = {
          focus:true,
          //toolbar:true || !!self.config.toolbar,
          //'new-instance': true,
          height : Number(self.config.height),
          width : Number(self.config.width),
          frame:false,
          resizable : false,
          show:false,
        };


    var frame_url = self.config.capture_mode == "swf" ? "blank" : url;

    var appframe = yield new Promise(function(resolve){
      gui.Window.open(frame_url, options, resolve);
    });


    console.log("GOT FRAME", appframe);

    //appframe.maximize();

    self._screenrecorder.once(SR.EVENT_DONE, function(err, path){
        console.log("This is path %s, err is %s into ", path, err, self.config.output_path);

        mv(path, self.config.output_path, function(){
          appframe.close();
        });
    });


    //appframe.on('closed', gui.App.quit);
    appframe.on("document-start", function(){

console.log("IN OCUMENT START");

    });

    appframe.on('loaded', function(){
      console.log("LOADED");

      appframe.x = appframe.y = 0;
      appframe.show();


      if(self.config.capture_mode == "swf") {

        var embed = $E('embed', {
          src : url,
          allowScriptAccess: 'always',
          quality: 'high',
          width: '100%',
          height: '100%',
          type: 'application/x-shockwave-flash',
          name: 'are',
        }, appframe.window.document);
        
        appframe.window.are_DoFSCommand = function(command, args) {
          console.log(command, args);
        };
        appframe.window.document.body.appendChild(embed);
      }


      appframe.window.addEventListener("AR_BEGIN", function(){
        self._screenrecorder.StartRecord(function(){
          console.log("Record started");
        });
      });

      appframe.window.addEventListener("AR_END", function(){

        self._screenrecorder.StopRecord(function(){
          console.log("Record stopped");
        });
      });

    });




  }
};



module.exports = AnimationRecorder;