/* TelepathyClientの読み込み. */
const TelepathyClient = require('./modules/node-telepathy-client.js');
/* Telepathyサーバー、サイト、トークンの設定 */
const config = require('./config.json')
const EventEmitter = new require('events').EventEmitter;

/* TelepathyClient */
class MickrClient extends EventEmitter{
  /* メンバー要素 */
  constructor(option){
    super()
    this.client = new TelepathyClient();
    this.isConnected = false;
    this.syncing = false;
    this.settings = option || config;
    this.contexts = {}

    this.client.on('error', event => {console.log('error', event);});
    this.client.on('close', event => {console.log('close', event);});

    /* 返信処理 */
    this.client.on('response', (req, res) => {
      // if(res.method != "ECHO") console.log('message: ');
    });

    /* 接続時の処理 */
    this.client.on('connect', event => {
      console.log('connect', event);
      this.connected()
    });

    /* メッセージを受信した時の処理 */
    this.client.on('message', message => {
      const self = this;
      if(message.body.key in self.contexts){
        console.log("responce: ", message);
        var req = self.contexts[message.body.key].message;
        var callback = self.contexts[message.body.key].callback;
        delete self.contexts[message.body.key];
        callback(req, message);
      }else{
        console.log("message: ",message);
        var response = {
          "from": message.to,
          "to": message.from,
          "body": {
            "key": message.body.key,
            "command": message.body.command,
            "content": message.body.content,
            "response": message.body.response
          }
        };
        /* message中のコマンドの実行 */
        self.emit(message.body.command, message, response);
      }
    });
    this.client.connect(this.settings.url, this.settings.site, this.settings.token );
  }

  /* 通信確認 */
  connect(callback){
    return new Promise((resolve)=>{
      if(this.isConnected){
        console.log("connected");
        if(typeof callback == 'function') callback()
        resolve()
      }
      else{
        console.log("wait");
        this.on('connect', ()=>{
          console.log("connected", callback);
          if(typeof callback == 'function') callback()
          resolve()
        })
      }
    })
  }

  // connectFromTo(from, to, callback){
  //   return new Promise((resolve, reject)=>{
  //     if(this.isConnected){
  //       this.client.hello({
  //         "from": option.from === undefined ? self.settings.id : option.from,
  //         "to": option.to === undefined ? undefined : option.to,
  //       }, (...args) => {
  //         if(typeof callback == 'function') callback(args)
  //         resolve(args)
  //       })
  //     }else{
  //       console.log("Not connecting");
  //     }
  //   })
  // }
  //
  // connectTo(to, callback){
  //   return this.connectFromTo(this.settings.id, to, callback)
  // }

  /* Helloリクエストによる接続確認 */
  connected(){
    return new Promise((resolve, reject) => {
      /* 既に通信が完了しているか確認 */
      const self = this;
      if(self.isConnected) console.log("Connected");
      else{
        self.client.hello({"from": self.settings.id }, (req, res) => {
          // console.log("hello:callback", req, res);
          self.isConnected = res.status == 200;
          /* 接続があるならHelloリクエストによる確認を行う */
          if(self.isConnected){
            console.log("HELLO: " + (self.isConnected ? "OK" : "NO"));
            /* HeartBeat: 接続確認 */
            setInterval(() => {
              if(self.isConnected){
                self.client.echo({});
                console.log("HeartBeat");
              }else{
                console.log("ReConnection");
                self.client.connect(self.settings.url, self.settings.site, self.settings.token );
              }
            }, 30000);
            self.emit('connect');
            resolve();
          }
          else{
            reject()
          }
        });
      }
    })
  }

  /*
    送信処理
    from: 送信者
    to: 送信先
    body: 送信内容
      command: String, コマンド
      response: boolean, 返信の可否
      body: Object, メッセージ(json)
    callback: 送信後の処理
  */
  send(command, option, callback){
    return new Promise((resolve, reject) => {
      this.connect().then(()=>{

        const message = {
          "from": option.from === undefined ? this.settings.id : option.from,
          "to": option.to === undefined ? undefined : option.to,
          "body": {
            "key": option.body.key === undefined ? this.generateRandomID() : option.body.key,
            "command": command === undefined ? "test" : command,
            "content": option.body.content === undefined ? "" : option.body.content,
            "response": option.body.response === undefined ? true : option.body.response
          }
        }

        /* 送信処理 */
        this.client.send(message, (req, res) => {
          console.log("send mes", req);
          this.contexts[message.body.key] = { "message": req, callback: callback };
        });
      })
    })
  }
  /* ブロードキャスト送信 */
  broadcast(command, option, callback){
    return this.send({
      "from": option.from === undefined ? self.settings.id : option.from,
      "to": undefined,
      "body": {
        "command": command === undefined ? "test" : command,
        "content": option.body.content === undefined ? "" : option.body.content,
        "response": option.body.response === undefined ? true : option.body.response
      }
    }, callback)
  };
  response(message){
    this.send(message)
  }
  generateRandomID(){
    var id = null;
    while (true) {
      id = Math.random().toString(16).slice(-8).toUpperCase();
      if (id in this.contexts == false) {
        break;
      }
    }
    return id;
  };
};

module.exports = MickrClient;
