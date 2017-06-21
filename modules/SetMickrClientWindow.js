const BrowserWindow = require('electron').BrowserWindow
const url = require('url')
const path = require('path')

const SetMickrClientWindow = {
  create: (callback = () => {}) => {
    this.subWindow = new BrowserWindow({
      width: 480,
      height: 540,
      alwaysOnTop: true
    })
    this.subWindow.loadURL(url.format({
        pathname: path.join(__dirname, '..', 'public', 'setting.html'),
        protocol: 'file:',
        slashes: true
    }));
    this.subWindow.focus()
    this.subWindow.on('closed', () => {
      this.subWindow = null;
      callback()
    });
  },
  close: () => {
    this.subWindow.close()
  }
}

module.exports = SetMickrClientWindow;
