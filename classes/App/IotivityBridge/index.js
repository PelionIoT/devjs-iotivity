// console.log("arguments: ",process.argv);
// process.exit(1);

var util = require('util');

// startup DeviceJS...
var devjs = require('exec/dev.js');
var log = require('Class/coreTools.js').log;
var path = require('path');
var OIC = require('iotivity');
var _ = require('underscore.js');


//var cookieParser = require('cookie-parser');

var dev$Promise = require('Class/DevPromise');
var App = require('Class/App');
var express = require('express');


// Array.includes is an ECMAscript 7 thing. So this will do:
var arrayIncludes = function(a,v) {
  for (var n=0;n<a.length;n++) {
    if(a[n] && a[n] == v)
      return true;
  }
  return false;
}







var IotivityBridge = App.create('IotivityBridge', function() {
  var self = this;

  var OICstack = new OIC(  {
    debugOut: log.debug,
    errorOut: log.error,
    debugOutput: true,
    errorOutput: true
  });

  var grabbedDevices = []; // for this simple example we grab all the devices which are Colorable

  // An iotivity 'switchable' device:
  // this is all set up for a static demo for an Iotivity example Android App
  // which uses the following URLs
  /**
   * [IotivitySwitchable description]
   * @param {[type]} device The DeviceJS device
   */
  var IotivitySwitchable = function(device) {
    var ledState = false; // aka off

    var uri = "/a/led";
    var typename = "core.led";
    var interfacename = "core.rw";
    var props = OIC.OC_DISCOVERABLE | OIC.OC_OBSERVABLE;

    var handlerCB = function(method,payload,req,responseCB) {
      console.log(" ledDemoServer: handler");
      if(method == 'GET') {
        return { state: ledState };
      } else if (method == 'PUT') {
        if(payload && payload.rep && payload.rep.state) {
          ledState = payload.rep.state;
          log.info(" **** LED: " + uri + " now <"+ledState+">");
          responseCB( {state: ledState } );
          log.debug("ledState: " + util.inspect(ledState));
          if(ledState == 'true') {
            for(var n=0;n<grabbedDevices.length;n++) {
              log.debug("Turning device " + grabbedDevices[n] + " on()");
              console.log(dev$.deviceById(grabbedDevices[n]));
              dev$.selectByID(grabbedDevices[n]).device().on().then(function(){
                log.debug("success");
              });
              log.debug("done.");
            }
          }
          else {
            for(var n=0;n<grabbedDevices.length;n++) {
              log.debug("Turning device " + grabbedDevices[n] + " off()");
              dev$.selectByID(grabbedDevices[n]).device().off().then(function(){
                log.debug("success");
              });
            //  dev$.selectByID(grabbedDevices[n]).then(function(d){
            //   console.dir(d);
            //   d.off();
            //   log.debug("success");
            //  });
            //  log.debug("done.");
            }
          }
        } else {
          log.info(" **** LED: " + uri + " uknown payload.");
          responseCB( {state: ledState } );
        }
      }
    }

    OICstack.newResource(typename,interfacename,uri,handlerCB,props);
  }

  var iotivityExampleDevice = null;
  var stackRunning = false;

  this.start = function(runtime) {
    // globals.dev$ = runtime;
    // dev$ = runtime;
    var configuration = this.configuration();

    return new dev$Promise().when(function(token) {

        app = express();

        OICstack.startServer(function(err){
          if(!err) {
            log.info("Iotivity stack started.");
            stackRunning = true;
          }
          else
            log.error("Error starting Iotivity stack: " + util.inspect(err));
        });


        app.get(/.*/,function(req,res){
          var out = 'iotivity.org app started.<br>';
          if(grabbedDevices.length > 0) {
            out += "DeviceJS ids:<br>";
            for(var n=0;n<grabbedDevices.length;n++) {
              out += dev$.selectByID(grabbedDevices[n]).device().type().entityTypePath() + ' --> ';
              out += "id: " + grabbedDevices[n] + '<br>';
            }
          } else {
            out += "DeviceJS has not found a compatible device yet.<br>";
          }
          out += "Iotivity Stack: ";
          if(stackRunning) {
            out += '<span style="color:green">Running</span><br>';
          } else {
            out += '<span style="color:red">Stopped</span><br>';
          }
          res.send(out);
        });

        var server = app.listen(configuration.httpPort, '127.0.0.1', function() {  // only listen on loopback, because DeviceJS will redirect you to a specific path.
          log.info('Listening on port %d', configuration.httpPort);
          token.resolve(); // done.
        });


        dev$.runtime.onDeviceOnline(function(device){
          log.info("Have new device with facades: " + device.facades());
            var facades = device.facades();
            if(facades && arrayIncludes(facades,'Colorable')) {
//              dev$.controlGraph().addDevice(device.id(),{});
              if(!arrayIncludes(grabbedDevices,device.id()))
                grabbedDevices.push(device.id());
              log.info("IotivityBridge grabbed device: " + device.type().entityTypePath());

              if(!iotivityExampleDevice)
                iotivityExampleDevice = new IotivitySwitchable(device);
          }
        });
    });
  };

  this.stop = function() {
    return new dev$Promise().when(function(token) {
        token.resolve();
    });
  };
});

module.exports = IotivityBridge;
