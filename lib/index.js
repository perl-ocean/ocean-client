// Public object
Ocean = (function(){
              var _document = document;
              var _window = window;
              var utils = {};

<!-- include lib/reventtarget.js -->
<!-- include lib/simpleevent.js -->
<!-- include lib/eventemitter.js -->
<!-- include lib/utils.js -->
<!-- include lib/dom.js -->
<!-- include lib/dom2.js -->
<!-- include lib/ocean.js -->
<!-- include lib/trans-websocket.js -->
<!-- include lib/trans-sender.js -->
<!-- include lib/trans-jsonp-receiver.js -->
<!-- include lib/trans-jsonp-polling.js -->
<!-- include lib/trans-xhr.js -->
<!-- include lib/trans-iframe.js -->
<!-- include lib/trans-iframe-within.js -->
<!-- include lib/info.js -->
<!-- include lib/trans-iframe-eventsource.js -->
<!-- include lib/trans-iframe-xhr-polling.js -->
<!-- include lib/trans-iframe-htmlfile.js -->
<!-- include lib/trans-polling.js -->
<!-- include lib/trans-receiver-eventsource.js -->
<!-- include lib/trans-receiver-htmlfile.js -->
<!-- include lib/trans-receiver-xhr.js -->
<!-- include lib/test-hooks.js -->
                  return Ocean;
          })();
if ('_ocean_onload' in window) setTimeout(_ocean_onload, 1);

// AMD compliance
if (typeof define === 'function' && define.amd) {
    define('ocean', [], function(){return Ocean;});
}
