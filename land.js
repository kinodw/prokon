ipc = require('electron').ipcRenderer;
/* DOM要素が読み込まれてから */
document.addEventListener('DOMContentLoaded', (e) => {
  /* 雲を表示するskyの生成 */
  var sky = new MickrSky();
  const setting = {
    "id": "land",
    "url": "ws://apps.wisdomweb.net:64260/ws/mik",
    "site": "test",
    "token": "Pad:9948",
    "to"  : "index"
  };
  const client = new MickrClient(setting);
  // 確認用
  var cloud = sky.addCloud({text: "もくもく",});
  ipc.on('show', (e,data) => {
    console.log(data)
    sky.addCloud({text: data});
  });
  // inde.htmlにメッセージ送信
  client.send("" , {
    "from" : setting.id,
    "to"   : setting.to,
    "body" : {
      "content" : "hello! index!"
    }
  });
  // slide.htmlへ
  client.send("" , {
    "from" : setting.id,
    "to"   : "slide",
    "body" : {
      "content" : "hello! slide!"
    }
  });
});
