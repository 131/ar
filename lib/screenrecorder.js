var console = require('nwconsole'),
    fs  = require('fs'),
    net = require('net'),
    cp  = require('child_process'),

    tmp = require('tmp');


var Main = module.exports = new Class({
  Implements : [Events],
  RC_PORT : 8088,

  _tmpPath  : null,
  _duration : 180,
  _grabFps  : 20,
  _recordingRect : null,

  _vlcCtrlStream : null,
  _recordingProcess : null,

  initialize : function(rect) {
    this._tmpPath       = tmp.fileSync();
    this._recordingRect = rect;
  },

  warmup : function(chain) {
    var self = this;

    var transcodeOpt = {
      'vcodec' : 'mp2v',
      'vb'     : 4096,
      'fps'    : self._grabFps,
      'acodec' : 'none',
      'scale'  : 1,
      'width'  : self._recordingRect.w,
      'height' : self._recordingRect.h,
    }, transcode = Object.mask_join(transcodeOpt, ',', '%s=%s');

    var outputOpt = {
      'access' : 'file',
      'mux'    : 'ogg',
      'dst'    : '"' + this._tmpPath.name + '"',
    }, output = Object.mask_join(outputOpt, ',', '%s=%s');

    var configOpt = {
      'no-screen-follow-mouse' : null,

      'ignore-config'    : null,
      'no-plugins-cache' : null,
      'verbose'          : 0,
      'no-media-library' : null,
      'config'           : 'blank',

      'intf'             : 'none',
      'dummy-quiet'      : null,
      'screen-fps'       : self._grabFps,
      'screen-top'       : self._recordingRect.x,
      'screen-left'      : self._recordingRect.y,
      'screen-width'     : self._recordingRect.w,
      'screen-height'    : self._recordingRect.h,
      'run-time'         : self._duration,

      'extraintf'        : 'rc',
      'rc-host'          : 'localhost:' + self.RC_PORT,
      'rc-quiet'         : null,
      'sout'             : '#transcode{'+transcode+'}:duplicate{dst=std{'+output+'}}',
    }, config = Object.values( Object.map(configOpt, function(v, k){
      return '--' + k + '' +(v === null ? '' : '=' + v);
    } )).join(' ');

    var cmd = "vlc\\vlc.exe " + config;
    console.log(cmd);
    var record = self._recordingProcess = cp.exec(cmd, function(err, stdout, stderr){
      console.log(err, stdout, stderr);
    });
    record.on("exit", function(){
      self.fireEvent('exit');
      self._recordingProcess = null;
    });

    process.on('exit', function(code) {
      record.kill();
    });

    var attempt = 5;
    function doConnect(){
      console.log("Trying to connect after 1s");
      self._vlcCtrlStream = net.connect(self.RC_PORT, function(){
        console.log("Connected to " + self.RC_PORT);
        self._vlcCtrlStream.removeAllListeners("error");
        chain();
      });
      
      self._vlcCtrlStream.on("error", function(){
        attempt --;
        if(!attempt)
          throw Error("Could not connect");
        
        setTimeout(doConnect, 1000);
        console.log("Failed to connect to, reconnect");
      });
    }; doConnect();

  },

  StartRecord : function(chain) {
    this._send("add screen://\r\n", chain);
  },

  _send : function(str, chain) {
    this._vlcCtrlStream.write(str, chain);
  },

  StopRecord : function(chain) {
    if (this._recordingProcess == null)
        return;

    try {
      this._send("quit\r\n", chain);
    } catch (e){}
  }
});

