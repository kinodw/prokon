const electron = require('electron');
const url = require('url')
const path = require('path');
const EventEmitter = new require('events').EventEmitter;

const {app, ipcMain, clipboard, Tray} = electron;

class ClipboardHandler extends EventEmitter{
  constructor(){
    super()
    this.type = "text";
    this.text = "";
    this.img = null;
    setInterval(() => {
      var _text = clipboard.readText()
      var _img = clipboard.readImage()

      if(_text){
        if(this.text != _text){
          this.text = _text;
          console.log(this.text);
          this.emit('update', {
            text: this.text,
            url: null,
            around: false
          })
        }
      }
      else if(this.img != null){
        console.log(this.img);
        if(this.img.toDataURL() !== _img.toDataURL()){
          this.img = _img;
          console.log(this.img);
          this.emit('update', {
            text: '',
            url: this.img.toDataURL(),
            around: false
          });
        }
      }
      else if(!_img.isEmpty()){
        console.log("null: ",this.img);
        this.img = _img;
        this.emit('update', {
          text: '',
          url: _img.toDataURL(),
          around: false
        });
      }
    }, 500)
  }
  getClipboard(){return this.tmp}
  writeData(data ,format){clipboard.write(data)}
}

module.exports = new ClipboardHandler();
