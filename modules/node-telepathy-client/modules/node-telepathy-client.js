'use strict';

var crypto = require('crypto');
var EventEmitter = require('events').EventEmitter;
var bson = require('bson');
var WebSocket = require('ws');
var uuid = require('node-uuid');

var TelepathyClient = (function() {

	var BSON = new bson.BSON();

	var md5 = function (value) {
	    var hash = crypto.createHash('md5');
	    hash.update(value, 'utf8');
	    return hash.digest('hex');
	};

	var makeSalt = function(site, token) {
		return md5(site + '@WWMIK@' + token).toString();
	};

	var makeCode = function(salt, from) {
		return md5(salt + '@' + from).toString();
	};

	var makeCode2 = function(salt, key, number) {
		return md5(salt + '@' + key + '#' + number).toString();
	};

	var module = function TelepathyClient() {

		var self = this;
		self.url = null;
		self.site = null;
		self.token = null;
		self.salt = null;
		self.number = null;
		self.from = null;
		self.key = null;
		self.contexts = null;
		self.socket = null;

	};

	module.prototype = Object.create(EventEmitter.prototype);

	module.prototype.onopen = function(event) {

		this.emit('connect-callback', event);
		this.emit('connect', event);

	};

	module.prototype.onmessage = function(data, flags) {

		var raw = data;

		var message = null;
		if (typeof raw == 'string') {
			try {
				message = JSON.parse(raw);
			} catch (error) {
				// throw new Error();
				console.log('json parse failed');
			}
		} else {
			try {
				message = BSON.deserialize(raw);
			} catch (error) {
				// throw new Error();
				console.log('bson parse failed');
				return;
			}
		}
		if (typeof message != 'object' || message == null) {
			// throw new Error();
			console.log('unknown message');
			return;
		}

		if (typeof message.method != 'string') {
			// throw new Error();
			console.log('unknown method');
			return;
		}
		switch (message.method) {
			case 'HELLO':      { break; }
			case 'BYE':        { break; }
			case 'ECHO':       { break; }
			case 'SEND':       { break; }
			case 'ANON':       { break; }
			case 'LIST':       { break; }
			case 'COUNT':      { break; }
			case 'GET':        { break; }
			case 'SET':        { break; }
			case 'DELETE':     { break; }
			case 'OBSERVE':    { break; }
			case 'DISOBSERVE': { break; }
			case 'NOTIFY':     { break; }
			default: {
				// throw new Error();
				console.log('unknown method');
				return;
			}
		}

		if (message.method == 'SEND' && message.status == null && message.message == null) {
			this.emit('message', message);
			return;
		}

		if (message.method == 'NOTIFY') {
			this.emit('message', message);
			return;
		}

		var response = message;
		var context = this.contexts[response.cheese];
		delete this.contexts[response.cheese];
		if (context == null) {
			// throw new Error();
			console.log('context is null');
			return;
		}
		var request = context.message;
		switch(response.method) {
			case 'HELLO': {
				if (response.status == 200) {
					this.from = request.from;
					this.key = response.ticket.code;
				}
				break;
			}
			case 'BYE': {
				if (response.status == 200) {
					this.from = null;
					this.key = null;
				}
				break;
			}
		}
		if (context.callback != null) {
			context.callback(request, response);
		}
		this.emit('response', request, response);

	};

	module.prototype.onerror = function(event) {

		this.emit('error', event);

	};

	module.prototype.onclose = function(event) {

		this.emit('close-callback', event);
		this.emit('close', event);

		this.socket = null;

	};

	module.prototype.connect = function(url, site, token, callback) {

		if (this.socket != null) {
			return;
		}

		this.url = url;
		this.site = site;
		this.token = token;
		this.salt = makeSalt(this.site, this.token);

		this.number = Date.now();
		this.from = null;
		this.key = null;
		this.contexts = {};

		if (typeof callback != 'undefined') {
			if (typeof callback != 'function') {
				throw new Error();
			}
			this.once('connect-callback', callback);
		}

		this.socket = new WebSocket(this.url);
		// this.socket.binaryType = 'arraybuffer';
		this.socket.on('open', this.onopen.bind(this));
		this.socket.on('message', this.onmessage.bind(this));
		this.socket.on('error', this.onerror.bind(this));
		this.socket.on('close', this.onclose.bind(this));

	};

	module.prototype.close = function() {

		if (typeof callback != 'undefined') {
			if (typeof callback != 'function') {
				throw new Error();
			}
			this.once('close-callback', callback);
		}

		if (this.socket != null) {
			try {
				this.socket.close();
			} catch (error) {}
		}

	};

	module.prototype.sendMessageAsJSON = function (message) {

		var text = JSON.stringify(message);
		this.socket.send(text);

	};

	module.prototype.sendMessageAsBSON = function (message) {

		var data = BSON.serialize(message, false, true, false);
		this.socket.send(data);

	};

	module.prototype.sendMessageAs = function (encoding, message, callback) {

		var cheese = null;
		if (message.cheese == null) {
			while (true) {
				cheese = Math.random().toString(16).slice(-8).toUpperCase();
				if (cheese in this.contexts == false) {
					break;
				}
			}
		}
		message.cheese = cheese;
		this.contexts[cheese] = { message: message, callback: callback };

		switch (encoding) {
			case 'json': {
				this.sendMessageAsJSON(message);
			}
			case 'bson': {
				this.sendMessageAsBSON(message);
			}
			default: {
				this.sendMessageAsBSON(message);
			}
		}

	};

	module.prototype.hello = function(message, callback) {

		message               = (message || {});
		message.site          = (message.site          !== undefined ? message.site          : this.site);
		message.from          = (message.from          !== undefined ? message.from          : this.from);
		message.to            = (message.to            !== undefined ? message.to            : '*');
		message.cheese        = (message.cheese        !== undefined ? message.cheese        : null);
		message.method        = (message.method        !== undefined ? message.method        : 'HELLO');
		message.body          = (message.body          !== undefined ? message.body          : {});
		message.id            = (message.id            !== undefined ? message.id            : uuid.v4().toLowerCase());
		message.timestamp     = (message.timestamp     !== undefined ? message.timestamp     : Date.now());
		message.ticket        = (message.ticket        !== undefined ? message.ticket        : {});
		message.ticket.type   = (message.ticket.type   !== undefined ? message.ticket.type   : 'fixed');
		message.ticket.code   = (message.ticket.code   !== undefined ? message.ticket.code   : makeCode(this.salt, message.from));

		this.sendMessageAs('bson', message, callback);

	};

	module.prototype.bye = function(message, callback) {

		message               = (message || {});
		message.site          = (message.site          !== undefined ? message.site          : this.site);
		message.from          = (message.from          !== undefined ? message.from          : this.from);
		message.to            = (message.to            !== undefined ? message.to            : '*');
		message.cheese        = (message.cheese        !== undefined ? message.cheese        : null);
		message.method        = (message.method        !== undefined ? message.method        : 'BYE');
		message.body          = (message.body          !== undefined ? message.body          : {});
		message.id            = (message.id            !== undefined ? message.id            : uuid.v4().toLowerCase());
		message.timestamp     = (message.timestamp     !== undefined ? message.timestamp     : Date.now());
		message.ticket        = (message.ticket        !== undefined ? message.ticket        : {});
		message.ticket.type   = (message.ticket.type   !== undefined ? message.ticket.type   : 'onetime');
		message.ticket.code   = (message.ticket.code   !== undefined ? message.ticket.code   : makeCode2(this.salt, this.key, this.number));
		message.ticket.number = (message.ticket.number !== undefined ? message.ticket.number : this.number);
		this.number += 1;

		this.sendMessageAs('bson', message, callback);

	};

	module.prototype.echo = function(message, callback) {

		message               = (message || {});
		message.site          = (message.site          !== undefined ? message.site          : this.site);
		message.from          = (message.from          !== undefined ? message.from          : this.from);
		message.to            = (message.to            !== undefined ? message.to            : '*');
		message.cheese        = (message.cheese        !== undefined ? message.cheese        : null);
		message.method        = (message.method        !== undefined ? message.method        : 'ECHO');
		message.body          = (message.body          !== undefined ? message.body          : {});
		message.id            = (message.id            !== undefined ? message.id            : uuid.v4().toLowerCase());
		message.timestamp     = (message.timestamp     !== undefined ? message.timestamp     : Date.now());
		message.ticket        = (message.ticket        !== undefined ? message.ticket        : {});
		message.ticket.type   = (message.ticket.type   !== undefined ? message.ticket.type   : 'onetime');
		message.ticket.code   = (message.ticket.code   !== undefined ? message.ticket.code   : makeCode2(this.salt, this.key, this.number));
		message.ticket.number = (message.ticket.number !== undefined ? message.ticket.number : this.number);
		this.number += 1;

		this.sendMessageAs('bson', message, callback);

	};

	module.prototype.send = function(message, callback) {

		message               = (message || {});
		message.site          = (message.site          !== undefined ? message.site          : this.site);
		message.from          = (message.from          !== undefined ? message.from          : this.from);
		message.to            = (message.to            !== undefined ? message.to            : '*');
		message.cheese        = (message.cheese        !== undefined ? message.cheese        : null);
		message.method        = (message.method        !== undefined ? message.method        : 'SEND');
		message.body          = (message.body          !== undefined ? message.body          : {});
		message.id            = (message.id            !== undefined ? message.id            : uuid.v4().toLowerCase());
		message.timestamp     = (message.timestamp     !== undefined ? message.timestamp     : Date.now());
		message.ticket        = (message.ticket        !== undefined ? message.ticket        : {});
		message.ticket.type   = (message.ticket.type   !== undefined ? message.ticket.type   : 'onetime');
		message.ticket.code   = (message.ticket.code   !== undefined ? message.ticket.code   : makeCode2(this.salt, this.key, this.number));
		message.ticket.number = (message.ticket.number !== undefined ? message.ticket.number : this.number);
		this.number += 1;

		this.sendMessageAs('bson', message, callback);

	};

	module.prototype.anon = function(message, callback) {

		message               = (message || {});
		message.site          = (message.site          !== undefined ? message.site          : this.site);
		message.from          = (message.from          !== undefined ? message.from          : this.from);
		message.to            = (message.to            !== undefined ? message.to            : '*');
		message.cheese        = (message.cheese        !== undefined ? message.cheese        : null);
		message.method        = (message.method        !== undefined ? message.method        : 'ANON');
		message.body          = (message.body          !== undefined ? message.body          : {});
		message.id            = (message.id            !== undefined ? message.id            : uuid.v4().toLowerCase());
		message.timestamp     = (message.timestamp     !== undefined ? message.timestamp     : Date.now());
		message.ticket        = (message.ticket        !== undefined ? message.ticket        : {});
		message.ticket.type   = (message.ticket.type   !== undefined ? message.ticket.type   : 'onetime');
		message.ticket.code   = (message.ticket.code   !== undefined ? message.ticket.code   : makeCode2(this.salt, this.key, this.number));
		message.ticket.number = (message.ticket.number !== undefined ? message.ticket.number : this.number);
		this.number += 1;

		this.sendMessageAs('bson', message, callback);

	};

	module.prototype.list = function(message, callback) {

		message               = (message || {});
		message.site          = (message.site          !== undefined ? message.site          : this.site);
		message.from          = (message.from          !== undefined ? message.from          : this.from);
		message.to            = (message.to            !== undefined ? message.to            : '*');
		message.cheese        = (message.cheese        !== undefined ? message.cheese        : null);
		message.method        = (message.method        !== undefined ? message.method        : 'LIST');
		message.body          = (message.body          !== undefined ? message.body          : {});
		message.id            = (message.id            !== undefined ? message.id            : uuid.v4().toLowerCase());
		message.timestamp     = (message.timestamp     !== undefined ? message.timestamp     : Date.now());
		message.ticket        = (message.ticket        !== undefined ? message.ticket        : {});
		message.ticket.type   = (message.ticket.type   !== undefined ? message.ticket.type   : 'onetime');
		message.ticket.code   = (message.ticket.code   !== undefined ? message.ticket.code   : makeCode2(this.salt, this.key, this.number));
		message.ticket.number = (message.ticket.number !== undefined ? message.ticket.number : this.number);
		this.number += 1;

		this.sendMessageAs('bson', message, callback);

	};

	module.prototype.count = function(message, callback) {

		message               = (message || {});
		message.site          = (message.site          !== undefined ? message.site          : this.site);
		message.from          = (message.from          !== undefined ? message.from          : this.from);
		message.to            = (message.to            !== undefined ? message.to            : '*');
		message.cheese        = (message.cheese        !== undefined ? message.cheese        : null);
		message.method        = (message.method        !== undefined ? message.method        : 'COUNT');
		message.body          = (message.body          !== undefined ? message.body          : {});
		message.id            = (message.id            !== undefined ? message.id            : uuid.v4().toLowerCase());
		message.timestamp     = (message.timestamp     !== undefined ? message.timestamp     : Date.now());
		message.ticket        = (message.ticket        !== undefined ? message.ticket        : {});
		message.ticket.type   = (message.ticket.type   !== undefined ? message.ticket.type   : 'onetime');
		message.ticket.code   = (message.ticket.code   !== undefined ? message.ticket.code   : makeCode2(this.salt, this.key, this.number));
		message.ticket.number = (message.ticket.number !== undefined ? message.ticket.number : this.number);
		this.number += 1;

		this.sendMessageAs('bson', message, callback);

	};

	module.prototype.get = function(message, callback) {

		message               = (message || {});
		message.site          = (message.site          !== undefined ? message.site          : this.site);
		message.from          = (message.from          !== undefined ? message.from          : this.from);
		message.to            = (message.to            !== undefined ? message.to            : '*');
		message.cheese        = (message.cheese        !== undefined ? message.cheese        : null);
		message.method        = (message.method        !== undefined ? message.method        : 'GET');
		message.body          = (message.body          !== undefined ? message.body          : {});
		message.id            = (message.id            !== undefined ? message.id            : uuid.v4().toLowerCase());
		message.timestamp     = (message.timestamp     !== undefined ? message.timestamp     : Date.now());
		message.ticket        = (message.ticket        !== undefined ? message.ticket        : {});
		message.ticket.type   = (message.ticket.type   !== undefined ? message.ticket.type   : 'onetime');
		message.ticket.code   = (message.ticket.code   !== undefined ? message.ticket.code   : makeCode2(this.salt, this.key, this.number));
		message.ticket.number = (message.ticket.number !== undefined ? message.ticket.number : this.number);
		this.number += 1;

		this.sendMessageAs('bson', message, callback);

	};

	module.prototype.set = function(message, callback) {

		message               = (message || {});
		message.site          = (message.site          !== undefined ? message.site          : this.site);
		message.from          = (message.from          !== undefined ? message.from          : this.from);
		message.to            = (message.to            !== undefined ? message.to            : '*');
		message.cheese        = (message.cheese        !== undefined ? message.cheese        : null);
		message.method        = (message.method        !== undefined ? message.method        : 'SET');
		message.body          = (message.body          !== undefined ? message.body          : {});
		message.id            = (message.id            !== undefined ? message.id            : uuid.v4().toLowerCase());
		message.timestamp     = (message.timestamp     !== undefined ? message.timestamp     : Date.now());
		message.ticket        = (message.ticket        !== undefined ? message.ticket        : {});
		message.ticket.type   = (message.ticket.type   !== undefined ? message.ticket.type   : 'onetime');
		message.ticket.code   = (message.ticket.code   !== undefined ? message.ticket.code   : makeCode2(this.salt, this.key, this.number));
		message.ticket.number = (message.ticket.number !== undefined ? message.ticket.number : this.number);
		this.number += 1;

		this.sendMessageAs('bson', message, callback);

	};

	module.prototype.delete = function(message, callback) {

		message               = (message || {});
		message.site          = (message.site          !== undefined ? message.site          : this.site);
		message.from          = (message.from          !== undefined ? message.from          : this.from);
		message.to            = (message.to            !== undefined ? message.to            : '*');
		message.cheese        = (message.cheese        !== undefined ? message.cheese        : null);
		message.method        = (message.method        !== undefined ? message.method        : 'DELETE');
		message.body          = (message.body          !== undefined ? message.body          : {});
		message.id            = (message.id            !== undefined ? message.id            : uuid.v4().toLowerCase());
		message.timestamp     = (message.timestamp     !== undefined ? message.timestamp     : Date.now());
		message.ticket        = (message.ticket        !== undefined ? message.ticket        : {});
		message.ticket.type   = (message.ticket.type   !== undefined ? message.ticket.type   : 'onetime');
		message.ticket.code   = (message.ticket.code   !== undefined ? message.ticket.code   : makeCode2(this.salt, this.key, this.number));
		message.ticket.number = (message.ticket.number !== undefined ? message.ticket.number : this.number);
		this.number += 1;

		this.sendMessageAs('bson', message, callback);

	};

	module.prototype.observe = function(message, callback) {

		message               = (message || {});
		message.site          = (message.site          !== undefined ? message.site          : this.site);
		message.from          = (message.from          !== undefined ? message.from          : this.from);
		message.to            = (message.to            !== undefined ? message.to            : '*');
		message.cheese        = (message.cheese        !== undefined ? message.cheese        : null);
		message.method        = (message.method        !== undefined ? message.method        : 'OBSERVE');
		message.body          = (message.body          !== undefined ? message.body          : {});
		message.id            = (message.id            !== undefined ? message.id            : uuid.v4().toLowerCase());
		message.timestamp     = (message.timestamp     !== undefined ? message.timestamp     : Date.now());
		message.ticket        = (message.ticket        !== undefined ? message.ticket        : {});
		message.ticket.type   = (message.ticket.type   !== undefined ? message.ticket.type   : 'onetime');
		message.ticket.code   = (message.ticket.code   !== undefined ? message.ticket.code   : makeCode2(this.salt, this.key, this.number));
		message.ticket.number = (message.ticket.number !== undefined ? message.ticket.number : this.number);
		this.number += 1;

		this.sendMessageAs('bson', message, callback);

	};

	module.prototype.disobserve = function(message, callback) {

		message               = (message || {});
		message.site          = (message.site          !== undefined ? message.site          : this.site);
		message.from          = (message.from          !== undefined ? message.from          : this.from);
		message.to            = (message.to            !== undefined ? message.to            : '*');
		message.cheese        = (message.cheese        !== undefined ? message.cheese        : null);
		message.method        = (message.method        !== undefined ? message.method        : 'DISOBSERVE');
		message.body          = (message.body          !== undefined ? message.body          : {});
		message.id            = (message.id            !== undefined ? message.id            : uuid.v4().toLowerCase());
		message.timestamp     = (message.timestamp     !== undefined ? message.timestamp     : Date.now());
		message.ticket        = (message.ticket        !== undefined ? message.ticket        : {});
		message.ticket.type   = (message.ticket.type   !== undefined ? message.ticket.type   : 'onetime');
		message.ticket.code   = (message.ticket.code   !== undefined ? message.ticket.code   : makeCode2(this.salt, this.key, this.number));
		message.ticket.number = (message.ticket.number !== undefined ? message.ticket.number : this.number);
		this.number += 1;

		this.sendMessageAs('bson', message, callback);

	};

	module.prototype.raw = function(message, callback) {

		message               = (message || {});
		message.site          = (message.site          !== undefined ? message.site          : this.site);
		message.from          = (message.from          !== undefined ? message.from          : this.from);
		message.to            = (message.to            !== undefined ? message.to            : '*');
		message.cheese        = (message.cheese        !== undefined ? message.cheese        : null);
		message.method        = (message.method        !== undefined ? message.method        : 'RAW');
		message.body          = (message.body          !== undefined ? message.body          : {});
		message.id            = (message.id            !== undefined ? message.id            : uuid.v4().toLowerCase());
		message.timestamp     = (message.timestamp     !== undefined ? message.timestamp     : Date.now());
		message.ticket        = (message.ticket        !== undefined ? message.ticket        : {});
		message.ticket.type   = (message.ticket.type   !== undefined ? message.ticket.type   : 'onetime');
		message.ticket.code   = (message.ticket.code   !== undefined ? message.ticket.code   : makeCode2(this.salt, this.key, this.number));
		message.ticket.number = (message.ticket.number !== undefined ? message.ticket.number : this.number);
		this.number += 1;

		this.sendMessageAs('bson', message, callback);

	};

	return module;

})();

module.exports = TelepathyClient;
