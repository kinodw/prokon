/*
	
	Title: telepathy-client.js
	Version: 2.2.1
	Author: Yusuke Niwa <niwa@wisdomweb.co.jp>
	Last Modified Date: 2015/02/03

	Copyright (C) 2015 Wisdom Web Co.,Ltd.
	
*/

var TelepathyClient = (function (dependencies) {

	var bson = dependencies.bson;
	if (typeof bson == 'undefined' || bson == null) {
		throw new Error();
	}

	var EventEmitter = dependencies.EventEmitter;
	if (typeof EventEmitter == 'undefined' || EventEmitter == null) {
		throw new Error();
	}

	var CryptoJS = dependencies.CryptoJS;
	if (typeof CryptoJS == 'undefined' || CryptoJS == null) {
		throw new Error();
	}

	var uuid = dependencies.uuid;
	if (typeof uuid == 'undefined' || uuid == null) {
		throw new Error();
	}

	var BSON = bson().BSON;

	var JSONConverter = {
		
		serialize: function (obj) {
			return JSON.stringify(obj);
		},
		
		deserialize: function (obj) {
			return JSON.parse(obj);
		},

	};

	var BSONConverter = {
		
		serialize: function (obj) {
			return BSON.serialize(obj, false, true, false);
		},
		
		deserialize: function (obj) {
			return BSON.deserialize(new Uint8Array(obj))
		},

	};

	var makeSalt = function(site, token) {
		
		return CryptoJS.MD5(site + '@WWMIK@' + token).toString();

	};

	var makeCode = function(salt, from) {
		
		return CryptoJS.MD5(salt + '@' + from).toString();

	};

	var makeCode2 = function(salt, key, number) {
		
		return CryptoJS.MD5(salt + '@' + key + '#' + number).toString();

	};

	var makeUUID = function () {

		return uuid.v4().toLowerCase();

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

		self.txFirstTime = null;
		self.txLastTime = null;
		self.txLastBytes = 0;
		self.txTotalPackets = 0;
		self.txTotalBytes = 0;

		self.rxFirstTime = null;
		self.rxLastTime = null;
		self.rxLastBytes = 0;
		self.rxTotalPackets = 0;
		self.rxTotalBytes = 0;

		self.watchHandlers = [];

	};

	module.prototype = new EventEmitter();

	module.prototype.onopen = function(event) {

		var self = this;

		self.emit('connect-callback', event);
		self.emit('connect', event);

	};

	module.prototype.onmessage = function(event) {

		var self = this;
		
		var data = event.data;
		var dataLength = data.length || data.byteLength || 0;

		var message = null;

		if (typeof data == 'string') {
			try {
				message = JSONConverter.deserialize(data);
			} catch (error) {
				return;
			}
		} else
		
		if (data instanceof ArrayBuffer) {
			try {
				message = BSONConverter.deserialize(data);
			} catch (error) {
				return;
			}
		}

		if (self.rxFirstTime == null) {
			self.rxFirstTime = new Date();
		}
		self.rxLastTime = new Date();
		self.rxLastBytes = dataLength;
		self.rxTotalPackets += 1;
		self.rxTotalBytes += dataLength
		
		if (typeof message != 'object' || message == null) {
			return;
		}

		if (typeof message.method != 'string') {
			return;
		}
		switch (message.method) {
			case 'HELLO':       { break; }
			case 'BYE':         { break; }
			case 'ECHO':        { break; }
			case 'SEND':        { break; }
			case 'ANON':        { break; }
			case 'LIST':        { break; }
			case 'COUNT':       { break; }
			case 'GET':         { break; }
			case 'SET':         { break; }
			case 'DELETE':      { break; }
			case 'OBSERVE':     { break; }
			case 'DISOBSERVE':  { break; }
			case 'NOTIFY':      { break; }
			case 'ARRAY_CLEAR': { break; }
			case 'ARRAY_ADD':   { break; }
			case 'ARRAY_SLICE': { break; }
			default: {
				return;
			}
		}

		if (message.method == 'SEND' && message.status == null && message.message == null) {
			self.emit('message', message);
			return;
		}

		if (message.method == 'NOTIFY') {
			self.watchHandlers.forEach(function (watchHandler) {
				if (message.key == watchHandler.key) {
					if (message.deleted) {
						watchHandler.callback(null, null, message.deleted);
					} else {
						self.getItem(message.key, function (err, value) {
							watchHandler.callback(err, value, false);
						});
					}
				}
			});
			self.emit('message', message);
			return;
		}

		var response = message;
		var context = self.contexts[response.cheese];
		delete self.contexts[response.cheese];
		if (context == null) {
			return;
		}
		var request = context.message;
		switch(response.method) {
			case 'HELLO': {
				if (response.status == 200) {
					self.from = request.from;
					self.key = response.ticket.code;
				}
				break;
			}
			case 'BYE': {
				if (response.status == 200) {
					self.from = null;
					self.key = null;
				}
				break;
			}
		}
		if (typeof context.callback == 'function') {
			context.callback(request, response);
		}
		self.emit('response', request, response);
		
	};

	module.prototype.onerror = function(event) {

		var self = this;

		self.emit('error', event);

	};

	module.prototype.onclose = function(event) {

		var self = this;

		self.emit('close-callback', event);
		self.emit('close', event);

		self.socket = null;

	};

	module.prototype.connect = function(url, site, token, callback) {

		var self = this;

		if (self.socket != null) {
			return;
		}
		
		self.url = url;
		self.site = site;
		self.token = token;
		self.salt = makeSalt(self.site, self.token);

		self.number = Date.now();
		self.from = null;
		self.key = null;
		self.contexts = {};

		if (typeof callback != 'undefined') {
			if (typeof callback != 'function') {
				throw new Error();
			}
			self.once('connect-callback', callback);
		}
		
		self.socket = new WebSocket(self.url);
		self.socket.binaryType = 'arraybuffer';
		self.socket.addEventListener('open', self.onopen.bind(self));
		self.socket.addEventListener('message', self.onmessage.bind(self));
		self.socket.addEventListener('error', self.onerror.bind(self));
		self.socket.addEventListener('close', self.onclose.bind(self));

	};

	module.prototype.close = function(callback) {

		var self = this;

		if (typeof callback != 'undefined') {
			if (typeof callback == 'function') {
				throw new Error();
			}
			self.once('close-callback', callback);
		}

		if (self.socket != null) {
			try {
				self.socket.close();
			} catch (error) {}
		}

	};

	module.prototype.sendMessageAs = function (encoding, message, callback) {

		var self = this;

		var cheese = null;
		if (message.cheese == null) {
			while (true) {
				cheese = Math.random().toString(16).slice(-8).toUpperCase();
				if (cheese in self.contexts == false) {
					break;
				}
			}
		}
		message.cheese = cheese;
		self.contexts[cheese] = { message: message, callback: callback };

		var data = null;
		switch (encoding) {
			case 'json': {
				data = JSONConverter.serialize(message);
				break;
			}
			case 'bson': {
				data = BSONConverter.serialize(message);
				break;
			}
			default: {
				data = BSONConverter.serialize(message);
				break;
			}
		}
		var dataLength = data.length || data.byteLength || 0;

		self.socket.send(data);

		if (self.txFirstTime == null) {
			self.txFirstTime = new Date();
		}
		self.txLastTime = new Date();
		self.txLastBytes = dataLength;
		self.txTotalPackets += 1;
		self.txTotalBytes += dataLength;

	};
	
	module.prototype.hello = function(message, callback) {

		var self = this;

		message               = (typeof message != 'undefined' ? message : {});
		message.site          = self.site;
		message.from          = (typeof message.from != 'undefined' ? message.from : self.from);
		message.to            = '*';
		message.cheese        = null;
		message.method        = 'HELLO';
		message.body          = {};
		message.id            = makeUUID();
		message.timestamp     =  Date.now();
		message.ticket        = {};
		message.ticket.type   = 'fixed';
		message.ticket.code   = makeCode(self.salt, message.from);

		self.sendMessageAs('bson', message, callback);

	};

	module.prototype.bye = function(message, callback) {

		var self = this;
		
		message               = (typeof message != 'undefined' ? message : {});
		message.site          = self.site;
		message.from          = self.from;
		message.to            = '*';
		message.cheese        = null;
		message.method        = 'BYE';
		message.body          = {};
		message.id            = makeUUID();
		message.timestamp     = Date.now();
		message.ticket        = {};
		message.ticket.type   = 'onetime';
		message.ticket.code   = makeCode2(self.salt, self.key, self.number);
		message.ticket.number = self.number;
		self.number += 1;
		
		self.sendMessageAs('bson', message, callback);

	};

	module.prototype.echo = function(message, callback) {

		var self = this;
		
		message               = (typeof message != 'undefined' ? message : {});
		message.site          = self.site;
		message.from          = self.from;
		message.to            = (typeof message.to != 'undefined' ? message.to : '*');
		message.cheese        = null;
		message.method        = 'ECHO';
		message.body          = (typeof message.body != 'undefined' ? message.body : {});
		message.id            = makeUUID();
		message.timestamp     = Date.now();
		message.ticket        = {};
		message.ticket.type   = 'onetime';
		message.ticket.code   = makeCode2(self.salt, self.key, self.number);
		message.ticket.number = self.number;
		self.number += 1;
		
		self.sendMessageAs('bson', message, callback);

	};
	
	module.prototype.send = function(message, callback) {

		var self = this;
		
		message               = (typeof message != 'undefined' ? message : {});
		message.site          = self.site;
		message.from          = self.from;
		message.to            = (typeof message.to != 'undefined' ? message.to : '*');
		message.cheese        = null;
		message.method        = 'SEND';
		message.body          = (typeof message.body          != 'undefined' ? message.body          : {});
		message.id            = makeUUID();
		message.timestamp     = Date.now();
		message.ticket        = {};
		message.ticket.type   = 'onetime';
		message.ticket.code   = makeCode2(self.salt, self.key, self.number);
		message.ticket.number = self.number;
		self.number += 1;
		
		self.sendMessageAs('bson', message, callback);
		
	};

	module.prototype.anon = function(message, callback) {

		var self = this;
		
		message               = (typeof message != 'undefined' ? message : {});
		message.site          = self.site;
		message.from          = self.from;
		message.to            = '*';
		message.cheese        = null;
		message.method        = 'ANON';
		message.body          = {};
		message.id            = makeUUID();
		message.timestamp     = Date.now();
		message.ticket        = {};
		message.ticket.type   = 'onetime';
		message.ticket.code   = makeCode2(self.salt, self.key, self.number);
		message.ticket.number = self.number;
		self.number += 1;
		
		self.sendMessageAs('bson', message, callback);

	};
	
	module.prototype.list = function(message, callback) {

		var self = this;
		
		message               = (typeof message != 'undefined' ? message : {});
		message.site          = self.site;
		message.from          = self.from;
		message.to            = '*';
		message.cheese        = null;
		message.method        = 'LIST';
		message.body          = {};
		message.id            = makeUUID();
		message.timestamp     = Date.now();
		message.ticket        = {};
		message.ticket.type   = 'onetime';
		message.ticket.code   = makeCode2(self.salt, self.key, self.number);
		message.ticket.number = self.number;
		self.number += 1;
		
		self.sendMessageAs('bson', message, callback);
		
	};
	
	module.prototype.count = function(message, callback) {

		var self = this;
		
		message               = (typeof message != 'undefined' ? message : {});
		message.site          = self.site;
		message.from          = self.from;
		message.to            = '*';
		message.cheese        = null;
		message.method        = 'COUNT';
		message.body          = {};
		message.id            = makeUUID();
		message.timestamp     = Date.now();
		message.ticket        = {};
		message.ticket.type   = 'onetime';
		message.ticket.code   = makeCode2(self.salt, self.key, self.number);
		message.ticket.number = self.number;
		self.number += 1;
		
		self.sendMessageAs('bson', message, callback);
		
	};
	
	module.prototype.get = function(message, callback) {

		var self = this;
		
		message               = (typeof message != 'undefined' ? message : {});
		message.site          = self.site;
		message.from          = self.from;
		message.to            = '*';
		message.cheese        = null;
		message.method        = 'GET';
		message.body          = {};
		message.id            = makeUUID();
		message.timestamp     = Date.now();
		message.ticket        = {};
		message.ticket.type   = 'onetime';
		message.ticket.code   = makeCode2(self.salt, self.key, self.number);
		message.ticket.number = self.number;
		self.number += 1;
		
		self.sendMessageAs('bson', message, callback);
		
	};
	
	module.prototype.set = function(message, callback) {

		var self = this;
		
		message               = (typeof message != 'undefined' ? message : {});
		message.site          = self.site;
		message.from          = self.from;
		message.to            = '*';
		message.cheese        = null;
		message.method        = 'SET';
		message.body          = {};
		message.id            = makeUUID();
		message.timestamp     = Date.now();
		message.ticket        = {};
		message.ticket.type   = 'onetime';
		message.ticket.code   = makeCode2(self.salt, self.key, self.number);
		message.ticket.number = self.number;
		self.number += 1;
		
		self.sendMessageAs('bson', message, callback);
		
	};
	
	module.prototype.delete = function(message, callback) {

		var self = this;
		
		message               = (typeof message != 'undefined' ? message : {});
		message.site          = self.site;
		message.from          = self.from;
		message.to            = '*';
		message.cheese        = null;
		message.method        = 'DELETE';
		message.body          = {};
		message.id            = makeUUID();
		message.timestamp     = Date.now();
		message.ticket        = {};
		message.ticket.type   = 'onetime';
		message.ticket.code   = makeCode2(self.salt, self.key, self.number);
		message.ticket.number = self.number;
		self.number += 1;
		
		self.sendMessageAs('bson', message, callback);
		
	};
	
	module.prototype.observe = function(message, callback) {

		var self = this;
		
		message               = (typeof message != 'undefined' ? message : {});
		message.site          = self.site;
		message.from          = self.from;
		message.to            = '*';
		message.cheese        = null;
		message.method        = 'OBSERVE';
		message.body          = {};
		message.id            = makeUUID();
		message.timestamp     = Date.now();
		message.ticket        = {};
		message.ticket.type   = 'onetime';
		message.ticket.code   = makeCode2(self.salt, self.key, self.number);
		message.ticket.number = self.number;
		self.number += 1;
		
		self.sendMessageAs('bson', message, callback);
		
	};
	
	module.prototype.disobserve = function(message, callback) {

		var self = this;
		
		message               = (typeof message != 'undefined' ? message : {});
		message.site          = self.site;
		message.from          = self.from;
		message.to            = '*';
		message.cheese        = null;
		message.method        = 'DISOBSERVE';
		message.body          = {};
		message.id            = makeUUID();
		message.timestamp     = Date.now();
		message.ticket        = {};
		message.ticket.type   = 'onetime';
		message.ticket.code   = makeCode2(self.salt, self.key, self.number);
		message.ticket.number = self.number;
		self.number += 1;
		
		self.sendMessageAs('bson', message, callback);
		
	};
	
	module.prototype.arrayClear = function(message, callback) {

		var self = this;
		
		message               = (typeof message != 'undefined' ? message : {});
		message.site          = self.site;
		message.from          = self.from;
		message.to            = '*';
		message.cheese        = null;
		message.method        = 'ARRAY_CLEAR';
		message.body          = {};
		message.id            = makeUUID();
		message.timestamp     = Date.now();
		message.ticket        = {};
		message.ticket.type   = 'onetime';
		message.ticket.code   = makeCode2(self.salt, self.key, self.number);
		message.ticket.number = self.number;
		self.number += 1;
		
		self.sendMessageAs('bson', message, callback);
		
	};
	
	module.prototype.arrayAdd = function(message, callback) {

		var self = this;
		
		message               = (typeof message != 'undefined' ? message : {});
		message.site          = self.site;
		message.from          = self.from;
		message.to            = '*';
		message.cheese        = null;
		message.method        = 'ARRAY_ADD';
		message.body          = {};
		message.id            = makeUUID();
		message.timestamp     = Date.now();
		message.ticket        = {};
		message.ticket.type   = 'onetime';
		message.ticket.code   = makeCode2(self.salt, self.key, self.number);
		message.ticket.number = self.number;
		self.number += 1;
		
		self.sendMessageAs('bson', message, callback);
		
	};
	
	module.prototype.arraySlice = function(message, callback) {

		var self = this;
		
		message               = (typeof message != 'undefined' ? message : {});
		message.site          = self.site;
		message.from          = self.from;
		message.to            = '*';
		message.cheese        = null;
		message.method        = 'ARRAY_SLICE';
		message.body          = {};
		message.id            = makeUUID();
		message.timestamp     = Date.now();
		message.ticket        = {};
		message.ticket.type   = 'onetime';
		message.ticket.code   = makeCode2(self.salt, self.key, self.number);
		message.ticket.number = self.number;
		self.number += 1;
		
		self.sendMessageAs('bson', message, callback);
		
	};

	module.prototype.raw = function(message, callback) {

		var self = this;
		
		message               = (typeof message               != 'undefined' ? message               : {});
		message.site          = (typeof message.site          != 'undefined' ? message.site          : self.site);
		message.from          = (typeof message.from          != 'undefined' ? message.from          : self.from);
		message.to            = (typeof message.to            != 'undefined' ? message.to            : '*');
		message.cheese        = (typeof message.cheese        != 'undefined' ? message.cheese        : null);
		message.method        = (typeof message.method        != 'undefined' ? message.method        : 'RAW');
		message.body          = (typeof message.body          != 'undefined' ? message.body          : {});
		message.id            = (typeof message.id            != 'undefined' ? message.id            : makeUUID());
		message.timestamp     = (typeof message.timestamp     != 'undefined' ? message.timestamp     : Date.now());
		message.ticket        = (typeof message.ticket        != 'undefined' ? message.ticket        : {});
		message.ticket.type   = (typeof message.ticket.type   != 'undefined' ? message.ticket.type   : 'onetime');
		message.ticket.code   = (typeof message.ticket.code   != 'undefined' ? message.ticket.code   : makeCode2(self.salt, self.key, self.number));
		message.ticket.number = (typeof message.ticket.number != 'undefined' ? message.ticket.number : self.number);
		self.number += 1;
		
		self.sendMessageAs('bson', message, callback);
		
	};

	/* BEGIN: 拡張メソッド. */

		/*
			Telepathyサーバーに接続された別クライアントにメッセージを送信する処理.
			引数
				destination: String. 送信先クライアントのクライアントIDを指定する.
				message: Object, 送信先クライアントへ送信するメッセージを指定する.
				callback: Function. サーバーからレスポンスが返ってきた時に実行される関数.
					function (err) {}
						err: エラーオブジェクト. 成功した場合はnullが設定される.
			戻り値
				なし 
		*/
		module.prototype.sendTo = function (destination, message, callback) {

			if (typeof destination != 'string') {
				throw new Error('destinationは文字列で指定してください.');
			}

			if (typeof message != 'object') {
				throw new Error('messageは文字列で指定してください.');
			}

			if (typeof callback != 'undefined' && typeof callback != 'function') {
				throw new Error('callbackを指定する場合はfunctionを指定してください.');
			}

			var self = this;
			self.send({ to: destination, body: message }, function (request, response) {
				if (response.status != 200) {
					if (typeof callback == 'function') {
						callback({ status: response.status, message: response.message });
					} else {
						throw new Error();
					} 
					return;
				}
				if (typeof callback == 'function') {
					callback(null);
				}
			});

		};

		/*
			TelepathyサーバーのKVS上に存在するすべてのキーの配列を取得する処理.
			引数
				callback: Function. サーバーからレスポンスが返ってきた時に実行される関数.
					function (err, keys) {}
						err: エラーオブジェクト. 成功した場合はnullが設定される.
						keys: キーの配列. 失敗した場合はnullが設定される.
			戻り値
				なし 
		*/
		module.prototype.getKeys = function (callback) {

			if (typeof callback != 'function') {
				throw new Error('callbackを指定する場合はfunctionを指定してください.');
			}

			var self = this;
			self.list({}, function (request, response) {
				if (response.status != 200) {
					callback({ status: response.status, message: response.message }, null);
					return;
				}
				callback(null, Object.keys(response.list));
			});

		};
		
		/*
			TelepathyサーバーのKVS上に存在するすべての値の配列を取得する処理.
			引数
				callback: Function. サーバーからレスポンスが返ってきた時に実行される関数.
					function (err, values) {}
						err: エラーオブジェクト. 成功した場合はnullが設定される.
						values: 値の配列. 失敗した場合はnullが設定される.
			戻り値
				なし 
		*/
		module.prototype.getValues = function (callback) {

			if (typeof callback != 'function') {
				throw new Error('callbackを指定する場合はfunctionを指定してください.');
			}

			var self = this;
			self.list({}, function (request, response) {
				if (response.status != 200) {
					callback({ status: response.status, message: response.message }, null);
					return;
				}
				callback(null, Object.keys(response.list).map(function (key) { return response.list[key]; }));
			});

		};
		
		/*
			TelepathyサーバーのKVS上に存在するすべてのキーと値を取得する処理.
			引数
				callback: Function. サーバーからレスポンスが返ってきた時に実行される関数.
					function (err, values) {}
						err: エラーオブジェクト. 成功した場合はnullが設定される.
						values: 値の配列. 失敗した場合はnullが設定される.
			戻り値
				なし 
		*/
		module.prototype.getPairs = function (callback) {

			if (typeof callback != 'function') {
				throw new Error('callbackを指定する場合はfunctionを指定してください.');
			}

			var self = this;
			self.list({}, function (request, response) {
				if (response.status != 200) {
					callback({ status: response.status, message: response.message }, null);
					return;
				}
				callback(null, response.list);
			});

		};

		/*
			TelepathyサーバーのKVS上に存在するキーに対応した値を取得する処理.
			引数
				key: String. 取得する値に対応したキー.
				callback: Function. サーバーからレスポンスが返ってきた時に実行される関数.
					function (err, value) {}
						err: エラーオブジェクト. 成功した場合はnullが設定される.
						value: キーに対応した値. 失敗した場合はnullが設定される.
			戻り値
				なし 
		*/
		module.prototype.getItem = function (key, callback) {
			
			if (typeof key != 'string') {
				throw new Error('keyは文字列を指定してください.');
			}

			if (typeof callback != 'function') {
				throw new Error('callbackを指定する場合はfunctionを指定してください.');
			}

			var self = this;
			self.get({ key: key }, function (request, response) {
				if (response.status != 200) {
					callback({ status: response.status, message: response.message }, null);
					return;
				}
				callback(null, response.value);
			});

		};

		/*
			TelepathyサーバーのKVS上に存在するキーに対応した値を設定する処理.
			引数
				key: String. 設定する値に対応したキー.
				value: Object. 設定する値.
				callback: Function. 省略可能. サーバーからレスポンスが返ってきた時に実行される関数.
					function (err) {}
						err: エラーオブジェクト. 成功した場合はnullが設定される.
			戻り値
				なし 
		*/
		module.prototype.setItem = function (key, value, callback) {
			
			if (typeof key != 'string') {
				throw new Error('keyは文字列を指定してください.');
			}

			if (typeof value == 'undefined') {
				throw new Error('valueはundefined以外の値を指定してください.');
			}

			if (typeof callback != 'undefined' && typeof callback != 'function') {
				throw new Error('callbackを指定する場合はfunctionを指定してください.');
			}

			var self = this;
			self.set({ key: key, value: value }, function (request, response) {
				if (response.status != 200) {
					if (typeof callback == 'function') {
						callback({ status: response.status, message: response.message });
					} else {
						throw new Error();
					} 
					return;
				}
				if (typeof callback == 'function') {
					callback(null);
				}
			});

		};

		/*
			TelepathyサーバーのKVS上に存在するキーを削除する処理.
			引数
				key: String. 削除するキー.
				callback: Function. 省略可能. サーバーからレスポンスが返ってきた時に実行される関数.
					function (err) {}
						err: エラーオブジェクト. 成功した場合はnullが設定される.
			戻り値
				なし 
		*/
		module.prototype.removeItem = function (key, callback) {
			
			if (typeof key != 'string') {
				throw new Error('keyは文字列を指定してください.');
			}

			if (typeof callback != 'undefined' && typeof callback != 'function') {
				throw new Error('callbackを指定する場合はfunctionを指定してください.');
			}

			var self = this;
			self.delete({ key: key }, function (request, response) {
				if (response.status != 200) {
					if (typeof callback == 'function') {
						callback({ status: response.status, message: response.message });
					} else {
						throw new Error();
					} 
					return;
				}
				if (typeof callback == 'function') {
					callback(null);
				}
			});

		};

		/*
			TelepathyサーバーのKVS上のキーの監視を設定する処理.
			引数
				key: String. 取得する値に対応したキー.
				callback: Function. キーの値が変更または削除された場合に実行される関数.
					function (err, value, deleted) {}
						err: エラーオブジェクト. 成功した場合はnullが設定される.
						value: キーに対応した値. 失敗した場合はnullが設定される.
						deleted: キーが削除された場合は, trueが設定される.
			戻り値
				なし 
		*/
		module.prototype.watchItem = function (key, callback) {
			
			if (typeof key != 'string') {
				throw new Error('keyは文字列を指定してください.');
			}

			if (typeof callback != 'function') {
				throw new Error('callbackを指定する場合はfunctionを指定してください.');
			}

			var self = this;
			self.observe({ key: key }, function (request, response) {
				if (response.status != 200) {
					callback({ status: response.status, message: response.message }, null); 
					return;
				}
				self.watchHandlers.push({ key: key, callback: callback }); 
			});

		};

		/*
			TelepathyサーバーのKVS上のキーの監視を解除する処理.
			引数
				key: String. 取得する値に対応したキー. 
				callback: Function. サーバーからレスポンスが返ってきた時に実行される関数.
					function (err) {}
						err: エラーオブジェクト. 成功した場合はnullが設定される.
			戻り値
				なし 
		*/
		module.prototype.unwatchItem = function (key, callback) {
			
			if (typeof key != 'string') {
				throw new Error('keyは文字列を指定してください.');
			}

			if (typeof callback != 'undefined' && typeof callback != 'function') {
				throw new Error('callbackを指定する場合はfunctionを指定してください.');
			}

			var self = this;
			self.disobserve({ key: key }, function (request, response) {
				self.watchHandlers = self.watchHandlers.filter(function (watchHandler) {
					return watchHandler.key != key;
				});
				if (response.status != 200) {
					if (typeof callback == 'function') {
						callback({ status: response.status, message: response.message });
					} else {
						throw new Error();
					} 
					return;
				}
				if (typeof callback == 'function') {
					callback(null);
				}
			});

		};

	/* END: 拡張メソッド. */

	return module;

})({
	bson: bson,
	EventEmitter: EventEmitter,
	CryptoJS: CryptoJS,
	uuid: uuid
});