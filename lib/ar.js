"use strict";

const fs      = require('fs');
const http    = require('http');
const path    = require('path');
const Events  = require('events');



const SR        = require('screen-capture-recorder');
const deepMixIn = require('mout/object/deepMixIn');
const pick      = require('mout/object/pick');
const sprintf   = require('nyks/string/format');
const promisify = require('nyks/function/promisify');
const SWFReader = require('swf-properties');
const winapi    = require('winapi');

const express = require('express');
const mv      = promisify(require('fs.extra').copy);


const nw = !!global.window;
const gui = nw ? window.require('nw.gui') : null;


class AnimationRecorder extends Events.EventEmitter {

  constructor(config) {
    super();


    this.config = {
      output_path  : 'test.avi',
      capture_mode : 'html5', //or swf
      swf_version  : '2.0', //1.0 or 2.0
      duration     : 180, //max duration
      width        : 640,
      height       : 480,
      debug        : false,
      orientation  : "auto", //or 'keep'
    };

    this._screenrecorder = null;

    deepMixIn(this.config, config);

    if(this.config.debug) {
      gui.Window.get().show();
      gui.Window.get().showDevTools();
      gui.Window.get().hide();
    }

    if(process.env.CWD) {
      this.config.source_path = path.join(process.env.CWD, this.config.source_path);
      this.config.output_path = path.join(process.env.CWD, this.config.output_path);
    }

    var source_path = this.config.source_path;
    if(!source_path)
      throw new Error("Missing source path");

    this.config.source_path = path.resolve(source_path);
    this.config.source_name = path.basename(this.config.source_path);

    if(!this.config.output_path)
      throw new Error("Missing output path");

    this.config.output_path = path.resolve(this.config.output_path);

    var app = express();

    app.use(express.static(path.dirname(source_path)));

    var template = fs.readFileSync(path.join(__dirname, '_flash_bootstrap.html'), "utf-8");
    template = template.replace("{MOVIE_NAME}", this.config.source_name);
    app.use('/_flash_bootstrap.html', function(req, res) { res.end(template); });

    this.server = http.createServer(app);


    console.log("Path is ", this.config.source_path);

    if(!fs.existsSync(source_path))
      throw "Invalid configuration source path";
  }

  async run() {

    if(this.config.capture_mode == "swf") {
      var props = await new Promise((resolve, reject) => {
        SWFReader(this.config.source_path, function(err, props) {
          if(err)
            return reject(err);
          resolve(props);
        });
      });

      if(this.config.swf_version == "1.0")
        this.config.duration = props.frameRate != 0 ? props.frameCount / props.frameRate : 0;

      this.config.width  = props.frameSize.width;
      this.config.height = props.frameSize.height;
    }

    var size = pick(this.config, 'width', 'height');
    var isValidSize = function(size, screen) {
      return size.width <= screen.width && size.height <= screen.height;
    };

    var screenInfos = await promisify(winapi.GetDisplaySettings, winapi)();
    var screen = {
      width  : screenInfos.Size.Width,
      height : screenInfos.Size.Height,
      orientation : screenInfos.Orientation,
    };

    console.log({content :  size, screen : screen});

    if(this.config.orientation == "auto") {

      if(!isValidSize(size, screen)) {
        var rotated = {width : screen.height, height : screen.width };
        var enoughRotate = isValidSize(size, rotated);
        if(!enoughRotate)
          throw "Cannot find matching rotation";

        console.log("Request screen flip");
        if(screen.orientation == 0 || screen.orientation == 2)
          await promisify(winapi.ReOrientDisplay, winapi)(1);
        else
          await promisify(winapi.ReOrientDisplay, winapi)(0);
      }
    }
    //var fps = this.config.swf_version == "1.0" ? 20 : 25;
    this._screenrecorder = new SR({x : 0, y : 0, w : this.config.width, h : this.config.height}, {'fps' : 30});

    this.port = await new Promise((resolve) => {
      this.server.listen(function() {
        resolve(this.address().port);
      });
    });

    await this._screenrecorder.warmup();
    await this.startGUI();
  }


  async startGUI() {

    var options = {
      focus : true,
      //toolbar:true || !!this.config.toolbar,
      //'new-instance': true,
      height : Number(this.config.height),
      width : Number(this.config.width),
      always_on_top : true,
      frame : false,
      resizable : false,
      show : false,
    };


    var frame_url = sprintf("http://127.0.0.1:%d/%s", this.port, this.config.capture_mode == "swf" ? "_flash_bootstrap.html"  : this.config.source_name);
    console.log("Browsing to ", {frame_url});
    var appframe = await new Promise(function(resolve) {
      gui.Window.open(frame_url, options, resolve);
    });
    //appframe.maximize();

    if(!this.config.debug)
      appframe.on('closed', gui.App.quit);

    appframe.once('loaded', () => {
      console.log("LOADED");
      appframe.x = appframe.y = 0;
      appframe.show();
      console.log("CATPURE MODE", this.config.capture_mode);

      appframe.window.addEventListener("AR_BEGIN", async () => {
        await this._screenrecorder.StartRecord();
        console.log("Record started");
      });

      appframe.window.addEventListener("AR_END", async () => {
        const path = await this._screenrecorder.StopRecord();
        try {
          await mv(path, this.config.output_path);
        } catch(err) {
          console.log('get when stop recording', err);
        } finally {
          appframe.close();
        }
      });

      var timeout = this.config.duration * 1000;
      console.log("Will timeout after", this.config.duration);

      if(this.config.capture_mode == "swf"  && this.config.swf_version == "1.0") {
        setTimeout(appframe.window.dispatchEvent.bind(appframe.window), 200, new Event("AR_BEGIN"));
        timeout += 200;
      }

      setTimeout(appframe.window.dispatchEvent.bind(appframe.window), timeout, new Event("AR_END"));
    });

  }
}



module.exports = AnimationRecorder;
