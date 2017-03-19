# Animation recorder
Convert API compliant HTML5 or SWF animations to video using VLC screengrab features.

Use VLC remote-control interface (TCP control interface) to sync events (see [screen-capture-recorder](https://github.com/131/screen-recorder)) 

[![Version](https://img.shields.io/npm/v/animationrecorder.svg)](https://www.npmjs.com/package/animationrecorder)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](http://opensource.org/licenses/MIT)
![Available platform](https://img.shields.io/badge/platform-win32-blue.svg)

# API/Usage

```
nw path/to/ar/ --mode=swf|html5 --source_path=[SOURCE_PATH] --output_path=[OUTPUT_PATH]
```

## Extra options
* --timeout=[TIMEOUT] : set animation timeout (default 180s)

# Grab API
## AR_BEGIN
At animation begin, fire "AR_BEGIN"

## AR_END
At animation end, fire "AR_END"


# Credits
* [131](https://github.com/131)

# License
* MIT