const ioHook = require('iohook');

class MouseWatcher{
  constructor(){
    ioHook.on("mouseclick", e => {
      var p = electron.screen.getCursorScreenPoint();
      var d = electron.screen.getDisplayNearestPoint(p);
      var w = this.getWindowWithDisplay(d);

      w.webContents.send('click', {
        x: p.x - d.bounds.x,
        y: p.y - d.bounds.y
      })
    });
    ioHook.start();
  }
  quit(){
    if(ioHook !== null || ioHook !== undefined){
      ioHook.stop()
    }
  }
}
