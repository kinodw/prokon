ipc = require('electron').ipcRenderer;
/* DOM要素が読み込まれてから */
document.addEventListener('DOMContentLoaded', (e) => {
  /* 雲を表示するskyの生成 */
  var sky = new MickrSky();
  // const client = new MickrClient({
  //   "id": "sky",
  //   "url": "ws://apps.wisdomweb.net:64260/ws/mik",
  //   "site": "test",
  //   "token": "Pad:9948"
  // })
  // 確認用
  var cloud = sky.addCloud({text: "もくもく",});
  ipc.on('show', (e,data) => {
    console.log(data)
    sky.addCloud({text: data});
  });
});
