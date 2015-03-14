= Animation recorder
Convert API compliant HTML5 or SWF animations to video using VLC screengrab features.

Use VLC remote-control interface (TCP control interface) to sync events.

= Usage

```
nw path/to/ar/ --mode=swf|html5 --source_path=[SOURCE_PATH] --output_path=[OUTPUT_PATH]
```

== Extra options
* --timeout=[TIMEOUT] : set animation timeout (default 180s)


= Grab API
== AR_BEGIN
At animation begin, fire "AR_BEGIN"

== AR_END
At animation end, fire "AR_END"

