/*
 * ***** BEGIN LICENSE BLOCK *****
 * Copyright (c) 2011-2012 VMware, Inc.
 *
 * For the license see COPYING.
 * ***** END LICENSE BLOCK *****
 */

var Ocean = function(url, options) {
    if (!(this instanceof Ocean)) {
        // makes `new` optional
        return new Ocean(url, options);
    }
    
    var that = this, protocols_whitelist;
    that._options = {devel: false, debug: false, protocols_whitelist: [],
                     info: undefined, rtt: undefined};
    if (options) {
        utils.objectExtend(that._options, options);
    }
    that._base_url = utils.amendUrl(url);
    that._server = that._options.server || utils.random_number_string(1000);
    if (that._options.protocols_whitelist &&
        that._options.protocols_whitelist.length) {
        protocols_whitelist = that._options.protocols_whitelist;
    }

    that._protocols = [];
    that.protocol = null;
    that.readyState = Ocean.CONNECTING;
    that._ir = createInfoReceiver(that._base_url);
    that._ir.onfinish = function(info, rtt) {
        that._ir = null;
        if (info) {
            if (that._options.info) {
                // Override if user supplies the option
                info = utils.objectExtend(info, that._options.info);
            }
            if (that._options.rtt) {
                rtt = that._options.rtt;
            }
            that._applyInfo(info, rtt, protocols_whitelist);
            that._didClose();
        } else {
            that._didClose(1002, 'Can\'t connect to server', true);
        }
    };
};
// Inheritance
Ocean.prototype = new REventTarget();

Ocean.version = "<!-- version -->";

Ocean.CONNECTING = 0;
Ocean.OPEN = 1;
Ocean.CLOSING = 2;
Ocean.CLOSED = 3;

Ocean.prototype._debug = function() {
    if (this._options.debug)
        utils.log.apply(utils, arguments);
};

Ocean.prototype._dispatchOpen = function() {
    var that = this;
    if (that.readyState === Ocean.CONNECTING) {
        if (that._transport_tref) {
            clearTimeout(that._transport_tref);
            that._transport_tref = null;
        }
        that.readyState = Ocean.OPEN;
        that.dispatchEvent(new SimpleEvent("open"));
    } else {
        // The server might have been restarted, and lost track of our
        // connection.
        that._didClose(1006, "Server lost session");
    }
};

Ocean.prototype._dispatchMessage = function(data) {
    var that = this;
    if (that.readyState !== Ocean.OPEN)
            return;
    that.dispatchEvent(new SimpleEvent("message", {data: data}));
};

Ocean.prototype._dispatchHeartbeat = function(data) {
    var that = this;
    if (that.readyState !== Ocean.OPEN)
        return;
    that.dispatchEvent(new SimpleEvent('heartbeat', {}));
};

Ocean.prototype._didClose = function(code, reason, force) {
    var that = this;
    if (that.readyState !== Ocean.CONNECTING &&
        that.readyState !== Ocean.OPEN &&
        that.readyState !== Ocean.CLOSING)
            throw new Error('INVALID_STATE_ERR');
    if (that._ir) {
        that._ir.nuke();
        that._ir = null;
    }

    if (that._transport) {
        that._transport.doCleanup();
        that._transport = null;
    }

    var close_event = new SimpleEvent("close", {
        code: code,
        reason: reason,
        wasClean: utils.userSetCode(code)});

    if (!utils.userSetCode(code) &&
        that.readyState === Ocean.CONNECTING && !force) {
        if (that._try_next_protocol(close_event)) {
            return;
        }
        close_event = new SimpleEvent("close", {code: 2000,
                                                reason: "All transports failed",
                                                wasClean: false,
                                                last_event: close_event});
    }
    that.readyState = Ocean.CLOSED;

    utils.delay(function() {
                   that.dispatchEvent(close_event);
                });
};

Ocean.prototype._didMessage = function(data) {
    this._dispatchMessage(JSON.parse(data));
};

Ocean.prototype._try_next_protocol = function(close_event) {
    var that = this;
    if (that.protocol) {
        that._debug('Closed transport:', that.protocol, ''+close_event);
        that.protocol = null;
    }
    if (that._transport_tref) {
        clearTimeout(that._transport_tref);
        that._transport_tref = null;
    }

    while(1) {
        var protocol = that.protocol = that._protocols.shift();
        if (!protocol) {
            return false;
        }
        // Some protocols require access to `body`, what if were in
        // the `head`?
        if (Ocean[protocol] &&
            Ocean[protocol].need_body === true &&
            (!_document.body ||
             (typeof _document.readyState !== 'undefined'
              && _document.readyState !== 'complete'))) {
            that._protocols.unshift(protocol);
            that.protocol = 'waiting-for-load';
            utils.attachEvent('load', function(){
                that._try_next_protocol();
            });
            return true;
        }

        if (!Ocean[protocol] ||
              !Ocean[protocol].enabled(that._options)) {
            that._debug('Skipping transport:', protocol);
        } else {
            that._dispatchOpen();
            that._debug('Opening transport:', protocol, ' url:' + that._base_url,
                        ' RTO:' + that._options.rto);
            that._transport = new Ocean[protocol](that, that._base_url, that._base_url);
            return true;
        }
    }
};

Ocean.prototype.close = function(code, reason) {
    var that = this;
    if (code && !utils.userSetCode(code))
        throw new Error("INVALID_ACCESS_ERR");
    if(that.readyState !== Ocean.CONNECTING &&
       that.readyState !== Ocean.OPEN) {
        return false;
    }
    that.readyState = Ocean.CLOSING;
    that._didClose(code || 1000, reason || "Normal closure");
    return true;
};

Ocean.prototype.send = function(data) {
    var that = this;
    if (that.readyState === Ocean.CONNECTING)
        throw new Error('INVALID_STATE_ERR');
    if (that.readyState === Ocean.OPEN) {
        that._transport.doSend(utils.quote('' + data));
    }
    return true;
};

Ocean.prototype._applyInfo = function(info, rtt, protocols_whitelist) {
    var that = this;
    that._options.info = info;
    that._options.rtt = rtt;
    that._options.rto = utils.countRTO(rtt);
    that._options.info.null_origin = !_document.domain;
    var probed = utils.probeProtocols();
    that._protocols = utils.detectProtocols(probed, protocols_whitelist, info);
};
