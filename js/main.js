var BrowserWindow, MainMenu, MdsPresenDevWindow, MdsPresenWindow, MdsWindow, MickrClient, MickrWindow, Path, Tray, app, arg, break_arg, client, dialog, electron, exist, fs, globalShortcut, ipc, j, len, mickrWin, opts, powerSaveBlocker, presenDevWin, presenWin, ref, ref1, resolved_file, setting, slideInfo, tray, tray2, win;

global.marp || (global.marp = {
  config: require('./classes/mds_config'),
  development: false
});

ref = require('electron'), BrowserWindow = ref.BrowserWindow, app = ref.app, dialog = ref.dialog;

Path = require('path');

MdsWindow = require('./classes/mds_window');

MdsPresenWindow = require('./classes/mds_presen_window');

MdsPresenDevWindow = require('./classes/mds_presen_dev_window');

MainMenu = require('./classes/mds_main_menu');

exist = require('./classes/mds_file').exist;

electron = require('electron');

ipc = electron.ipcMain;

MickrWindow = require('../MickrWindow.js');

MickrClient = require('../modules/MickrClient');

Tray = electron.Tray;

globalShortcut = electron.globalShortcut;

powerSaveBlocker = electron.powerSaveBlocker;

fs = require('fs');

setting = {
  "id": "main",
  "url": "ws://apps.wisdomweb.net:64260/ws/mik",
  "site": "test",
  "token": "Pad:9948"
};

client = new MickrClient(setting);

slideInfo = "";

presenDevWin = null;

win = null;

mickrWin = null;

presenWin = null;

tray = null;

tray2 = null;

global.marp.config.initialize();

opts = {
  file: null
};

ref1 = process.argv.slice(1);
for (j = 0, len = ref1.length; j < len; j++) {
  arg = ref1[j];
  break_arg = false;
  switch (arg) {
    case '--development':
    case '--dev':
      global.marp.development = true;
      break;
    default:
      if (exist(resolved_file = Path.resolve(arg))) {
        opts.file = resolved_file;
        break_arg = true;
      }
  }
  if (break_arg) {
    break;
  }
}

app.on('window-all-closed', function() {
  if (process.platform !== 'darwin' || !!MdsWindow.appWillQuit) {
    return app.quit();
  }
});

app.on('before-quit', function() {
  return MdsWindow.appWillQuit = true;
});

app.on('activate', function(e, hasVisibleWindows) {
  if (app.isReady() && !hasVisibleWindows) {
    return new MdsWindow;
  }
});

app.on('open-file', function(e, path) {
  e.preventDefault();
  opts.fileOpened = true;
  return MdsWindow.loadFromFile(path, null);
});

app.on('ready', function() {
  mickrWin = new MickrWindow();
  mickrWin.activateMainWindows();
  tray = new Tray(Path.join(__dirname, '../', 'lib', 'img', 'cloud_on.png'));
  tray.on('click', (function(_this) {
    return function(e) {
      return mickrWin.switchShowMode(tray);
    };
  })(this));
  tray2 = new Tray(Path.join(__dirname, '../', 'lib', 'img', 'ic_pause_black_24dp_2x.png'));
  tray2.on('click', (function(_this) {
    return function(e) {
      return mickrWin.switchPause();
    };
  })(this));
  global.marp.mainMenu = new MainMenu({
    development: global.marp.development
  });
  if (!opts.fileOpened) {
    if (opts.file) {
      return MdsWindow.loadFromFile(opts.file, null);
    } else {
      return win = new MdsWindow;
    }
  }
});

ipc.on('textSend', (function(_this) {
  return function(e, text) {
    var displays, electronScreen, externalDisplay, i, idx, input, k, len1, nonHTML, value;
    console.log('receive textSend');
    _this.presenDevWin = new MdsPresenDevWindow({}, {}, text);
    electronScreen = electron.screen;
    displays = electronScreen.getAllDisplays();
    externalDisplay = null;
    for (k = 0, len1 = displays.length; k < len1; k++) {
      i = displays[k];
      if (i.bounds.x !== 0 || i.bounds.y !== 0) {
        externalDisplay = i;
        break;
      }
    }
    if (externalDisplay) {
      _this.presenWin = new MdsPresenWindow({
        x: externalDisplay.bounds.x + 50,
        y: externalDisplay.bounds.y + 50
      });
    } else {
      _this.presenWin = new MdsPresenWindow({
        width: 800,
        height: 600
      });
    }
    _this.slideInfo = text;
    nonHTML = [];
    for (idx in text) {
      value = text[idx];
      nonHTML[idx] = value.replace(/<(".*?"|'.*?'|[^'"])*?>/gi, " ");
      nonHTML[idx] = nonHTML[idx].replace(/\n/gi, "");
      nonHTML[idx] = nonHTML[idx].replace(/\s+/gi, "");
      nonHTML[idx] = nonHTML[idx].substr(0, nonHTML[idx].length - 1);
    }
    console.log(nonHTML);
    nonHTML = nonHTML.join("");
    console.log(nonHTML);
    input = [];
    return input.push(nonHTML);
  };
})(this));

ipc.on('loadUsedSlide', function() {
  var args;
  console.log('receive loadUsedSlide');
  args = [
    {
      title: 'Open',
      filters: [
        {
          name: 'Markdown files',
          extensions: ['md', 'mdown']
        }, {
          name: 'Text file',
          extensions: ['txt']
        }, {
          name: 'All files',
          extensions: ['*']
        }
      ],
      properties: ['openFile', 'createDirectory']
    }, function(fnames) {
      if (fnames == null) {
        return;
      }
      return win.browserWindow.webContents.send('sendUsedSlidePath', fnames[0]);
    }
  ];
  return dialog.showOpenDialog.apply(win, args);
});

ipc.on('goToPage', (function(_this) {
  return function(e, page) {
    console.log(page);
    return win.browserWindow.webContents.send('goToPage', page);
  };
})(this));

ipc.on('PdfExport', (function(_this) {
  return function() {
    console.log('PDF Export');
    return win.trigger('exportPdfDialog');
  };
})(this));

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZXMiOlsibWFpbi5jb2ZmZWUiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsSUFBQTs7QUFBQSxNQUFNLENBQUMsU0FBUCxNQUFNLENBQUMsT0FDTDtFQUFBLE1BQUEsRUFBUSxPQUFBLENBQVEsc0JBQVIsQ0FBUjtFQUNBLFdBQUEsRUFBYSxLQURiOzs7QUFHRixNQUFvQyxPQUFBLENBQVEsVUFBUixDQUFwQyxFQUFDLGlDQUFELEVBQWdCLGFBQWhCLEVBQXFCOztBQUNyQixJQUFBLEdBQVksT0FBQSxDQUFRLE1BQVI7O0FBQ1osU0FBQSxHQUFZLE9BQUEsQ0FBUSxzQkFBUjs7QUFDWixlQUFBLEdBQWtCLE9BQUEsQ0FBUSw2QkFBUjs7QUFDbEIsa0JBQUEsR0FBcUIsT0FBQSxDQUFRLGlDQUFSOztBQUNyQixRQUFBLEdBQVksT0FBQSxDQUFRLHlCQUFSOztBQUNYLFFBQVcsT0FBQSxDQUFRLG9CQUFSOztBQUNaLFFBQUEsR0FBWSxPQUFBLENBQVEsVUFBUjs7QUFDWixHQUFBLEdBQVksUUFBUSxDQUFDOztBQUNyQixXQUFBLEdBQWMsT0FBQSxDQUFRLG1CQUFSOztBQUNkLFdBQUEsR0FBYyxPQUFBLENBQVEsd0JBQVI7O0FBQ2QsSUFBQSxHQUFZLFFBQVEsQ0FBQzs7QUFDckIsY0FBQSxHQUFpQixRQUFRLENBQUM7O0FBQzFCLGdCQUFBLEdBQW1CLFFBQVEsQ0FBQzs7QUFDNUIsRUFBQSxHQUFZLE9BQUEsQ0FBUSxJQUFSOztBQUlaLE9BQUEsR0FDSztFQUFBLElBQUEsRUFBTSxNQUFOO0VBQ0EsS0FBQSxFQUFPLHNDQURQO0VBRUEsTUFBQSxFQUFRLE1BRlI7RUFHQSxPQUFBLEVBQVMsVUFIVDs7O0FBSUwsTUFBQSxHQUFTLElBQUksV0FBSixDQUFnQixPQUFoQjs7QUFFVCxTQUFBLEdBQVk7O0FBQ1osWUFBQSxHQUFlOztBQUNmLEdBQUEsR0FBTTs7QUFDTixRQUFBLEdBQVc7O0FBQ1gsU0FBQSxHQUFZOztBQUVaLElBQUEs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LEtBQXRCLENBQTRCLEdBQTVCLEVBQWlDLElBQWpDO0FBaEJxQixDQUF4Qjs7QUF1QkQsR0FBRyxDQUFDLEVBQUosQ0FBTyxVQUFQLEVBQW1CLENBQUEsU0FBQSxLQUFBO1NBQUEsU0FBQyxDQUFELEVBQUksSUFBSjtJQUNqQixPQUFPLENBQUMsR0FBUixDQUFZLElBQVo7V0FDQSxHQUFHLENBQUMsYUFBYSxDQUFDLFdBQVcsQ0FBQyxJQUE5QixDQUFtQyxVQUFuQyxFQUErQyxJQUEvQztFQUZpQjtBQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBbkI7O0FBSUEsR0FBRyxDQUFDLEVBQUosQ0FBTyxXQUFQLEVBQW9CLENBQUEsU0FBQSxLQUFBO1NBQUEsU0FBQTtJQUNsQixPQUFPLENBQUMsR0FBUixDQUFZLFlBQVo7V0FDQSxHQUFHLENBQUMsT0FBSixDQUFZLGlCQUFaO0VBRmtCO0FBQUEsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQUFwQiIsInNvdXJjZXNDb250ZW50IjpbImdsb2JhbC5tYXJwIG9yPVxuICBjb25maWc6IHJlcXVpcmUgJy4vY2xhc3Nlcy9tZHNfY29uZmlnJ1xuICBkZXZlbG9wbWVudDogZmFsc2Vcblxue0Jyb3dzZXJXaW5kb3csIGFwcCwgZGlhbG9nIH0gICAgID0gcmVxdWlyZSAnZWxlY3Ryb24nXG5QYXRoICAgICAgPSByZXF1aXJlICdwYXRoJ1xuTWRzV2luZG93ID0gcmVxdWlyZSAnLi9jbGFzc2VzL21kc193aW5kb3cnXG5NZHNQcmVzZW5XaW5kb3cgPSByZXF1aXJlICcuL2NsYXNzZXMvbWRzX3ByZXNlbl93aW5kb3cnXG5NZHNQcmVzZW5EZXZXaW5kb3cgPSByZXF1aXJlICcuL2NsYXNzZXMvbWRzX3ByZXNlbl9kZXZfd2luZG93J1xuTWFpbk1lbnUgID0gcmVxdWlyZSAnLi9jbGFzc2VzL21kc19tYWluX21lbnUnXG57ZXhpc3R9ICAgPSByZXF1aXJlICcuL2NsYXNzZXMvbWRzX2ZpbGUnXG5lbGVjdHJvbiAgPSByZXF1aXJlICdlbGVjdHJvbidcbmlwYyAgICAgICA9IGVsZWN0cm9uLmlwY01haW5cbk1pY2tyV2luZG93ID0gcmVxdWlyZSAnLi4vTWlja3JXaW5kb3cuanMnXG5NaWNrckNsaWVudCA9IHJlcXVpcmUgJy4uL21vZHVsZXMvTWlja3JDbGllbnQnXG5UcmF5ICAgICAgPSBlbGVjdHJvbi5UcmF5XG5nbG9iYWxTaG9ydGN1dCA9IGVsZWN0cm9uLmdsb2JhbFNob3J0Y3V0XG5wb3dlclNhdmVCbG9ja2VyID0gZWxlY3Ryb24ucG93ZXJTYXZlQmxvY2tlclxuZnMgICAgICAgID0gcmVxdWlyZSAnZnMnXG5cbiMgYXBwLmNvbW1hbmRMaW5lLmFwcGVuZFN3aXRjaChcIi0tZW5hYmxlLWV4cGVyaW1lbnRhbC13ZWItcGxhdGZvcm0tZmVhdHVyZXNcIik7XG4jIGFib3V0IHByZXNlbnRhdGlvblxuc2V0dGluZyA9XG4gICAgIFwiaWRcIjogXCJtYWluXCJcbiAgICAgXCJ1cmxcIjogXCJ3czovL2FwcHMud2lzZG9td2ViLm5ldDo2NDI2MC93cy9taWtcIlxuICAgICBcInNpdGVcIjogXCJ0ZXN0XCJcbiAgICAgXCJ0b2tlblwiOiBcIlBhZDo5OTQ4XCJcbmNsaWVudCA9IG5ldyBNaWNrckNsaWVudChzZXR0aW5nKTtcblxuc2xpZGVJbmZvID0gXCJcIlxucHJlc2VuRGV2V2luID0gbnVsbFxud2luID0gbnVsbFxubWlja3JXaW4gPSBudWxsXG5wcmVzZW5XaW4gPSBudWxsXG5cbnRyYXkgPSBudWxsO1xudHJheTIgPSBudWxsO1xuXG4jIEluaXRpYWxpemUgY29uZmlnXG5nbG9iYWwubWFycC5jb25maWcuaW5pdGlhbGl6ZSgpXG5cbiMgUGFyc2UgYXJndW1lbnRzXG5vcHRzID1cbiAgZmlsZTogbnVsbFxuXG5mb3IgYXJnIGluIHByb2Nlc3MuYXJndi5zbGljZSgxKVxuICBicmVha19hcmcgPSBmYWxzZVxuICBzd2l0Y2ggYXJnXG4gICAgd2hlbiAnLS1kZXZlbG9wbWVudCcsICctLWRldidcbiAgICAgIGdsb2JhbC5tYXJwLmRldmVsb3BtZW50ID0gdHJ1ZVxuICAgIGVsc2VcbiAgICAgIGlmIGV4aXN0KHJlc29sdmVkX2ZpbGUgPSBQYXRoLnJlc29sdmUoYXJnKSlcbiAgICAgICAgb3B0cy5maWxlID0gcmVzb2x2ZWRfZmlsZVxuICAgICAgICBicmVha19hcmcgPSB0cnVlXG5cbiAgYnJlYWsgaWYgYnJlYWtfYXJnXG5cbiMgQXBwbGljYXRpb24gZXZlbnRzXG5hcHAub24gJ3dpbmRvdy1hbGwtY2xvc2VkJywgLT5cbiAgaWYgcHJvY2Vzcy5wbGF0Zm9ybSAhPSAnZGFyd2luJyBvciAhIU1kc1dpbmRvdy5hcHBXaWxsUXVpdFxuICAgICMgZ2xvYmFsLm1hcnAuY29uZmlnLnNhdmUoKVxuICAgIGFwcC5xdWl0KClcblxuYXBwLm9uICdiZWZvcmUtcXVpdCcsIC0+XG4gIE1kc1dpbmRvdy5hcHBXaWxsUXVpdCA9IHRydWVcblxuYXBwLm9uICdhY3RpdmF0ZScsIChlLCBoYXNWaXNpYmxlV2luZG93cykgLT5cbiAgbmV3IE1kc1dpbmRvdyBpZiBhcHAuaXNSZWFkeSgpIGFuZCBub3QgaGFzVmlzaWJsZVdpbmRvd3NcblxuYXBwLm9uICdvcGVuLWZpbGUnLCAoZSwgcGF0aCkgLT5cbiAgZS5wcmV2ZW50RGVmYXVsdCgpXG5cbiAgb3B0cy5maWxlT3BlbmVkID0gdHJ1ZVxuICBNZHNXaW5kb3cubG9hZEZyb21GaWxlIHBhdGgsIG51bGxcblxuYXBwLm9uICdyZWFkeScsIC0+XG4gICMgbWlja3Ig44Gu44Km44Kk44Oz44OJ44KmXG4gIG1pY2tyV2luID0gbmV3IE1pY2tyV2luZG93KClcbiAgbWlja3JXaW4uYWN0aXZhdGVNYWluV2luZG93cygpXG4gICMvKiDjg6Hjg4vjg6Xjg7zjg5Djg7zkuIrjga7jgqLjgqTjgrPjg7PjgYzmirzjgZXjgozjgZ/loLTlkIjjga7lh6bnkIYgKi9cbiAgdHJheSA9IG5ldyBUcmF5KFBhdGguam9pbiBfX2Rpcm5hbWUsICcuLi8nLCdsaWInLCAnaW1nJywgJ2Nsb3VkX29uLnBuZycpXG4gIHRyYXkub24gJ2NsaWNrJywgKGUpID0+XG4gICAgbWlja3JXaW4uc3dpdGNoU2hvd01vZGUodHJheSlcblxuICB0cmF5MiA9IG5ldyBUcmF5KFBhdGguam9pbiBfX2Rpcm5hbWUsICcuLi8nLCdsaWInLCAnaW1nJywgJ2ljX3BhdXNlX2JsYWNrXzI0ZHBfMngucG5nJylcbiAgdHJheTIub24gJ2NsaWNrJywgKGUpID0+XG4gICAgbWlja3JXaW4uc3dpdGNoUGF1c2UoKVxuXG4gICMg44Ki44OX44Oq44Gu44Km44Kk44Oz44OJ44KmXG4gIGdsb2JhbC5tYXJwLm1haW5NZW51ID0gbmV3IE1haW5NZW51XG4gICAgZGV2ZWxvcG1lbnQ6IGdsb2JhbC5tYXJwLmRldmVsb3BtZW50XG5cbiAgdW5sZXNzIG9wdHMuZmlsZU9wZW5lZFxuICAgIGlmIG9wdHMuZmlsZVxuICAgICAgTWRzV2luZG93LmxvYWRGcm9tRmlsZSBvcHRzLmZpbGUsIG51bGxcbiAgICBlbHNlXG4gICAgICB3aW4gPSBuZXcgTWRzV2luZG93XG4gIyByZWNlaXZlIFRleHRcbmlwYy5vbiAndGV4dFNlbmQnLCAoZSwgdGV4dCkgPT5cbiAgY29uc29sZS5sb2cgJ3JlY2VpdmUgdGV4dFNlbmQnXG4gICNjb25zb2xlLmxvZyB0ZXh0XG5cbiAgQHByZXNlbkRldldpbj0gbmV3IE1kc1ByZXNlbkRldldpbmRvdyB7fSwge30sIHRleHRcblxuICBlbGVjdHJvblNjcmVlbiA9IGVsZWN0cm9uLnNjcmVlblxuICBkaXNwbGF5cyA9IGVsZWN0cm9uU2NyZWVuLmdldEFsbERpc3BsYXlzKClcbiAgZXh0ZXJuYWxEaXNwbGF5ID0gbnVsbFxuICBmb3IgaSBpbiBkaXNwbGF5c1xuICAgIGlmIChpLmJvdW5kcy54ICE9IDAgfHwgaS5ib3VuZHMueSAhPSAwKVxuICAgICAgZXh0ZXJuYWxEaXNwbGF5ID0gaVxuICAgICAgYnJlYWtcbiAgI+OAgOWklumDqOODh+OCo+OCueODl+ODrOOCpOOBjOWtmOWcqOOBmeOCi+WgtOWQiFxuICBpZiAoZXh0ZXJuYWxEaXNwbGF5KVxuICAgIEBwcmVzZW5XaW4gPSBuZXcgTWRzUHJlc2VuV2luZG93XG4gICAgICB4OiBleHRlcm5hbERpc3BsYXkuYm91bmRzLnggKyA1MCxcbiAgICAgIHk6IGV4dGVybmFsRGlzcGxheS5ib3VuZHMueSArIDUwXG4gICMg5aSW6YOo44OH44Kj44K544OX44Os44Kk44GM5a2Y5Zyo44GX44Gq44GE5aC05ZCIXG4gIGVsc2VcbiAgICBAcHJlc2VuV2luID0gbmV3IE1kc1ByZXNlbldpbmRvd1xuICAgICAgd2lkdGg6ODAwXG4gICAgICBoZWlnaHQ6IDYwMFxuICAjIHRleHQg44Gr44Gv44CBc2xpZGVfd3JhcHBlcuOBrkhUTUzopoHntKDjgYxpZOmghuOBq+WFpeOBo+OBpuOBhOOCi1xuICBAc2xpZGVJbmZvID0gdGV4dFxuICBub25IVE1MID0gW11cblxuICAjIGh0bWzjgr/jgrDliYrpmaQgJiDmloflrZfliJfjga7lvaLjgpLmlbTjgYjjgotcbiAgZm9yIGlkeCwgdmFsdWUgb2YgdGV4dFxuICAgIG5vbkhUTUxbaWR4XSA9IHZhbHVlLnJlcGxhY2UoLzwoXCIuKj9cInwnLio/J3xbXidcIl0pKj8+L2dpLCBcIiBcIikgICAgIyBIVE1M44K/44Kw5raI5Y67XG4gICAgbm9uSFRNTFtpZHhdID0gbm9uSFRNTFtpZHhdLnJlcGxhY2UoL1xcbi9naSwgXCJcIikgICMg5pS56KGM5paH5a2X44Gu5YmK6ZmkXG4gICAgbm9uSFRNTFtpZHhdID0gbm9uSFRNTFtpZHhdLnJlcGxhY2UoL1xccysvZ2ksIFwiXCIpICMg56m655m944Gu5YmK6ZmkXG4gICAgbm9uSFRNTFtpZHhdID0gbm9uSFRNTFtpZHhdLnN1YnN0cigwLCBub25IVE1MW2lkeF0ubGVuZ3RoLTEpICAjIOacq+WwvuOBq+ODmuODvOOCuOaVsOOBjOWFpeOCi+OBruOBp+OAgeacq+WwvuOCkuWJiumZpFxuXG4gICMgaHRtbOOCv+OCsOOCkuWQq+OBvuOBquOBhOacrOaWh1xuICBjb25zb2xlLmxvZyBub25IVE1MXG4gICMg44Gd44KM44Ge44KM44Gu44K544Op44Kk44OJ44Gu44OG44Kt44K544OI44KS57WQ5ZCI44GX44CB44Oq44K544OI44Gr5LiA44Gk44Gu6KaB57Sg44Go44GX44Gm5YWl44KM44GmXG4gICMg44CB44Gd44KM44KScHl0aG9u44Gr5rih44GZXG4gIG5vbkhUTUwgPSBub25IVE1MLmpvaW4oXCJcIilcbiAgY29uc29sZS5sb2cgbm9uSFRNTFxuICBpbnB1dCA9IFtdXG4gIGlucHV0LnB1c2gobm9uSFRNTClcblxuIGlwYy5vbiAnbG9hZFVzZWRTbGlkZScsICgpIC0+XG4gICAgY29uc29sZS5sb2cgJ3JlY2VpdmUgbG9hZFVzZWRTbGlkZSdcbiAgICBhcmdzID0gW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIHRpdGxlOiAnT3BlbidcbiAgICAgICAgICAgIGZpbHRlcnM6IFtcbiAgICAgICAgICAgICAgeyBuYW1lOiAnTWFya2Rvd24gZmlsZXMnLCBleHRlbnNpb25zOiBbJ21kJywgJ21kb3duJ10gfVxuICAgICAgICAgICAgICB7IG5hbWU6ICdUZXh0IGZpbGUnLCBleHRlbnNpb25zOiBbJ3R4dCddIH1cbiAgICAgICAgICAgICAgeyBuYW1lOiAnQWxsIGZpbGVzJywgZXh0ZW5zaW9uczogWycqJ10gfVxuICAgICAgICAgICAgXVxuICAgICAgICAgICAgcHJvcGVydGllczogWydvcGVuRmlsZScsICdjcmVhdGVEaXJlY3RvcnknXVxuICAgICAgICAgIH1cbiAgICAgICAgICAoZm5hbWVzKSAtPlxuICAgICAgICAgICAgcmV0dXJuIHVubGVzcyBmbmFtZXM/XG4gICAgICAgICAgICB3aW4uYnJvd3NlcldpbmRvdy53ZWJDb250ZW50cy5zZW5kICdzZW5kVXNlZFNsaWRlUGF0aCcsIGZuYW1lc1swXVxuICAgICAgICBdXG4gICAgZGlhbG9nLnNob3dPcGVuRGlhbG9nLmFwcGx5IHdpbiwgYXJnc1xuXG5cbiMgaXBjLm9uICdyZXF1ZXN0U2xpZGVJbmZvJywgKCkgPT5cbiMgICBjb25zb2xlLmxvZyAncmVjZWl2ZSByZXF1ZXN0U2xpZGVJbmZvJ1xuIyAgIEBwcmVzZW5EZXZXaW4ud2ViQ29udGVudHMuc2VuZCAnc2VuZFNsaWRlSW5mbycsIEBzbGlkZUluZm9cblxuaXBjLm9uICdnb1RvUGFnZScsIChlLCBwYWdlKSA9PlxuICBjb25zb2xlLmxvZyBwYWdlXG4gIHdpbi5icm93c2VyV2luZG93LndlYkNvbnRlbnRzLnNlbmQgJ2dvVG9QYWdlJywgcGFnZVxuXG5pcGMub24gJ1BkZkV4cG9ydCcsICgpID0+XG4gIGNvbnNvbGUubG9nICdQREYgRXhwb3J0J1xuICB3aW4udHJpZ2dlciAnZXhwb3J0UGRmRGlhbG9nJ1xuIyBpcGMub24gJ1ByZXNlbnRhdGlvbicsICgpID0+XG4jICAgcHJlc2VuRGV2V2luID0gbmV3IE1kc1dpbmRvd1xuIyAgIHByZXNlbkRldldpbi53ZWJDb250ZW50cy5zZW5kICdpbml0aWFsaXplJ1xuIyAgIHByZXNlbkRldldpbi5vcGVuRGV2VG9vbHMoKVxuXG4iXX0=
