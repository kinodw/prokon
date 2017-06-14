node-telepathy-client
===============

Node.jsで動くTelepathyClient

# インストール.

ソースコードをダウンロードする.

	git clone http://spring.ics.nitech.ac.jp:8081/git/ashun/node-telepathy-client.git

依存関係のインストール

	npm install

`config.json` で設定

	{
	  "id": "id_shun",
	  "url": "ws://apps.wisdomweb.net:64260/ws/mik",
	  "site": "site_shun",
	  "token": "token_shun"
	}

実行する.

	npm start

`client.js` がTelepathyClientのラッパーとなっている

`modules/node-telepathy-client.js` が元の[TelepathyClient]('http://spring.ics.nitech.ac.jp:8081/git/yusuken/node-telepathy-client.git')

## Example
`app.js`

	const path = require('path');
	const http = require('http');
	const express = require('express');

	const TelepathyClient = require('./client')

	/* サーバの設定（テスト用） */
	const app = express();
	app.use(express.static(path.join(__dirname, '/public')));
	const server = http.createServer(app);
	server.listen(60000);

	/* インスタンスの生成 */
	const client = new TelepathyClient()

	/* 受け取り時の処理 */
	client.on('test', (to, data) => {
		console.log("EventEmitter TEST", to, data);
	})
	/* 動作確認用 */
	client.emit('test', 'ashun', {'text': "TEST"})


# API

## メソッド

### on(command, callback)

`command` を受けた際の処理

* `command`: String型, 必須, TelepathyサーバーのURL
* `callback`: Function型, `function () {}`, 必須, `command` を受けた際の処理


### sendTo(command, message, [from, to, callback])

* `command`: String型, 必須, コマンド名
* `message`: Object型, 必須, 送信内容
* `from`: String型, 任意, 送信元のid。undefinedならば自身
* `to`: String型, 任意, 送り先のid。undefinedならばブロードキャスト
* `callback`: Function型, `function () {}`, 任意, 実行後の処理

### broadcast(command, message, [from, callback])
* `command`: String型, 必須, コマンド名
* `message`: Object型, 必須, 送信内容
* `from`: String型, 任意, 送信元のid。undefinedならば自身
* `callback`: Function型, `function () {}`, 任意, 実行後の処理
