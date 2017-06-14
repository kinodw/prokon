const path = require('path');
const http = require('http');
const express = require('express');

const TelepathyClient = require('./client')

/* サーバの設定（テスト用） */
// const app = express();
// app.use(express.static(path.join(__dirname, '/public')));
// const server = http.createServer(app);
// server.listen(60000);

/* インスタンスの生成 */
const client = new TelepathyClient()

/* 受け取り時の処理 */
client.on('test', (to, data) => {
  console.log("EventEmitter TEST", to, data);
})
/* recommend */
const query_sample = require('./query_sample.json')
client.send({
  "to": "JSAI-server",
  "body": {
    "command": "recommend",
    "content": {
      "type": "0",
      "query": {
        "anchor": "ビジネス",
        "num": 10,
        "depth": 3,
        "keywords": [
        ]
      }
    }
  }
}, (req, res)=>{console.log(res.body.content.cardInfoList);})
// client.send({
//   "to": "recommend",
//   "body": {
//     "command": "recommend",
//     "content": {
//       "type": "0",
//       "query": {
//         "anchor": "研究",
//         "num": 10,
//         "depth": 3,
//         "keywords": [
//           "人工知能",
//           "推薦",
//           "自然言語処理",
//           "音声認識",
//           "インタフェース",
//           "VR",
//           "深層学習",
//           "画像処理"
//         ]
//       }
//     }
//   }
// }, (req, res)=>{console.log(res.body.content.cardInfoList);})

/* 動作確認用 */
// client.emit('test', 'ashun', {'text': "TEST"})

/* rcmnd確認 */
// const query_sample = require('./query_sample.json')
// client.send({
//     "to": "rcmnd",
//     "body": {
//       "command": "rcmnd",
//       "content": query_sample
//     }
//   }, (req, res)=>{
//     console.log("sent rcmnd: ", res.body.content);
// })

/* AmebaThree確認 */
// client.send({
//     "to": "three",
//     "body": {
//       "command": "mickr_text",
//       "content": "天気",
//     }
//   }, (req, res)=>{
//     console.log("sent three", req, res);
// })

/* mecab確認 */
// client.send({
//     "to": "mecab",
//     "body": {
//       "command": "mecab",
//       "content": "今日はいい天気ですね",
//     }
//   }, (req, res)=>{
//     console.log("sent mecab", req, res);
// })
