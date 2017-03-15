"use strict";

const fs      = require('fs');
const http    = require('http');
const url     = require('url');
const path    = require('path');
const Events  = require('events');

const express = require('express');
const mv      = require('mv');

const SR        = require('screen-capture-recorder');
const deepMixIn = require('mout/object/deepMixIn');
const $E        = require('udom/element/create');
const sprintf   = require('nyks/string/format');
const SWFReader = require('swf-properties');

const nw = !!global.window;
const gui = nw ? window.require('nw.gui') : null;


class AnimationRecorder extends Events.EventEmitter {

  constructor(config) {
    super();

    gui.Window.get().showDevTools()

    this.config = {
      output_path  : 'test.avi',
      capture_mode : 'html5', //or swf
      swf_version  : '2.0', //1.0 or 2.0
    };

    this._screenrecorder = null;

    deepMixIn(this.config, config);

    var source_path = this.config.source_path;
    if(!source_path)
      throw new Error("Missing source path");

    this.config.source_path = path.resolve(source_path);
    this.config.source_name = path.basename(this.config.source_path)

    if(!this.config.output_path)
      throw new Error("Missing output path");

    this.config.output_path = path.resolve(this.config.output_path);

    var app = express();

    app.use(express.static(path.dirname(source_path)));

    var self = this;
    var template = fs.readFileSync(path.join(__dirname, '_flash_bootstrap.html'), "utf-8");
      template = template.replace("{MOVIE_NAME}", self.config.source_name);
    app.use('/_flash_bootstrap.html', function(req, res){ res.end(template); });

    this.server = http.createServer(app);

    this.config.width  = this.config.width || 640;
    this.config.height = this.config.height || 480;

    this._screenrecorder = new SR({x:0,y:0,w:this.config.width,h:this.config.height});

    console.log("Path is ", this.config.source_path);

    if(!fs.existsSync(source_path)) 
      throw "Invalid configuration source path";
  }

  * run() {
    var self = this;

    if(self.config.capture_mode == "swf") {
      var props = yield new Promise(function(resolve, reject) {
        SWFReader(self.config.source_path, function(err, props) {
          if ( err )
            return reject(err);
          resolve(props);
        });
      });
      this.swf_properties = {
        size  : props.frameSize,
        duration :  props.frameRate != 0 ? props.frameCount / props.frameRate : 0,
      };
      console.log({prps : this.swf_properties});
    }


    this.port = yield new Promise(function(resolve){
      self.server.listen(function(){
        resolve(this.address().port);
      });
    });


    yield new Promise(function(resolve) {
      self._screenrecorder.warmup(resolve)
    });

    yield self.startGUI();
  }

  * startGUI() {
    var self = this;

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


    var frame_url = sprintf("http://127.0.0.1:%d/%s", this.port, self.config.capture_mode == "swf" ? "_flash_bootstrap.html"  : this.config.source_name);

    console.log("Browsing to ", {frame_url});

    var appframe = yield new Promise(function(resolve){
      gui.Window.open(frame_url, options, resolve);
    });




    //appframe.maximize();

    self._screenrecorder.once(SR.EVENT_DONE, function(err, path){
        console.log("This is path %s, err is %s into ", path, err, self.config.output_path);

        mv(path, self.config.output_path, function(){
          appframe.close();
        });
    });


    //appframe.on('closed', gui.App.quit);


   appframe.once('loaded', function(){
      console.log("LOADED");

      appframe.x = appframe.y = 0;
      appframe.show();

      console.log("CATPURE MODE", self.config.capture_mode);


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


      if(self.config.capture_mode == "swf"  && self.config.swf_version == "1.0") {
        setTimeout(appframe.window.dispatchEvent.bind(appframe.window), 200, new Event("AR_BEGIN"));
        setTimeout(appframe.window.dispatchEvent.bind(appframe.window), self.swf_properties.duration * 1000, new Event("AR_END"));
        console.log("SHould timeout after ", self.swf_properties.duration);
      }



    });




  }
};



module.exports = AnimationRecorder;