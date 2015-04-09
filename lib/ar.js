var   fs    = require('fs'),
      url   = require('url'),
      path  = require('path'),
      console = require('nwconsole');

var  SR = require('./screenrecorder.js');



var nw = !!global.window,
    gui;

if(nw)
  gui = global.window.nwDispatcher.requireNwGui();


var Main = module.exports = new Class({
  Binds : [
      'createTray', 'openMootoolsBlank'
  ],

  Implements : [Events],

  config : {},
  _screenrecorder : null,

  initialize:function(config){
    this.config = config;
    var source_path = this.config.source_path;
    this.config.source_path = ("file:///" + path.resolve(source_path)).replace(new RegExp("\\\\", "g"), "/");

    var output_path = this.config.output_path;
    this.config.output_path = (path.resolve(output_path)).replace(new RegExp("\\\\", "g"), "/");

    this.config.width  = this.config.width || 640;
    this.config.height = this.config.height || 480;

    console.log("Path is ", this.config.source_path);

    this._screenrecorder = new SR({x:0,y:0,w:this.config.width,h:this.config.height,output_path:this.config.output_path});

    if(!fs.existsSync(source_path)) {
      console.log("Invalid configuration source " + source_path);
      throw "Invalid configuration source " + source_path;
    }
  },

  run : function() {
    var self = this;

    self._screenrecorder.warmup(function(){
      self.startGUI();
    });
  },

  startGUI: function() {
    var self = this,
        url = this.config.source_path;
    console.log("Browsing to ", url);

    var options = {
          focus:true,
          toolbar:!!self.config.toolbar,
          //'new-instance': true,
          height : Number(self.config.height),
          width : Number(self.config.width),
          frame:false,
          resizable : false,
          show:false,
        };


    var appframe = gui.Window.open(url, options); // Open app in new window
    //appframe.maximize();

    if(options["new-instance"]) {
      //on new instance, Window.window is nw global window  !!!
      //only Window.y seems to change , as Window.on events are not fired
      setInterval(function(){
        if(appframe.y === undefined)
          gui.App.quit();
      }, 200);
    } else {
      appframe.on('closed', gui.App.quit);
      appframe.on("document-start", function(){
        appframe.x = appframe.y = 0;
        appframe.show();
      });

      appframe.on('loaded', function(){
        console.log("LOADED");
        appframe.window.addEventListener("AR_BEGIN", function(){
          self._screenrecorder.StartRecord(function(){
            console.log("Record started");
          });
        });

        appframe.window.addEventListener("AR_END", function(){

          self._screenrecorder.StopRecord(function(){
            console.log("Record stopped");
            setTimeout(function(){
              console.log("Rename file");
              fs.renameSync(self._screenrecorder._tmpPath.name, self._screenrecorder._recordingRect.output_path);
              appframe.close();
            }, 2000);
          });
        });
      });
    }
  },

});

