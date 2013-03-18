/*
 * ***** BEGIN LICENSE BLOCK *****
 * Copyright (c) 2011-2012 VMware, Inc.
 *
 * For the license see COPYING.
 * ***** END LICENSE BLOCK *****
 */

var InfoReceiverOcean = function() {
    var that = this;
    utils.delay(function() {
        that.emit('finish', {}, 2000);
    });
};
InfoReceiverOcean.prototype = new EventEmitter(['finish']);

var createInfoReceiver = function(base_url, options) {
    return new InfoReceiverOcean();
};
