var BrowserWindow, MainMenu, MdsPresenDevWindow, MdsPresenWindow, MdsWindow, MickrWindow, Path, Tray, app, arg, break_arg, electron, exist, globalShortcut, ipc, j, len, mickrWin, opts, powerSaveBlocker, presenDevWin, presenWin, ref, ref1, resolved_file, slideInfo, tray, tray2, win;

global.marp || (global.marp = {
  config: require('./classes/mds_config'),
  development: false
});

ref = require('electron'), BrowserWindow = ref.BrowserWindow, app = ref.app;

Path = require('path');

MdsWindow = require('./classes/mds_window');

MdsPresenWindow = require('./classes/mds_presen_window');

MdsPresenDevWindow = require('./classes/mds_presen_dev_window');

MainMenu = require('./classes/mds_main_menu');

exist = require('./classes/mds_file').exist;

electron = require('electron');

ipc = electron.ipcMain;

MickrWindow = require('../MickrWindow.js');

Tray = electron.Tray;

globalShortcut = electron.globalShortcut;

powerSaveBlocker = electron.powerSaveBlocker;

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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZXMiOlsibWFpbi5jb2ZmZWUiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsSUFBQTs7QUFBQSxNQUFNLENBQUMsU0FBUCxNQUFNLENBQUMsT0FDTDtFQUFBLE1BQUEsRUFBUSxPQUFBLENBQVEsc0JBQVIsQ0FBUjtFQUNBLFdBQUEsRUFBYSxLQURiOzs7QUFHRixNQUEyQixPQUFBLENBQVEsVUFBUixDQUEzQixFQUFDLGlDQUFELEVBQWdCOztBQUNoQixJQUFBLEdBQVksT0FBQSxDQUFRLE1BQVI7O0FBQ1osU0FBQSxHQUFZLE9BQUEsQ0FBUSxzQkFBUjs7QUFDWixlQUFBLEdBQWtCLE9BQUEsQ0FBUSw2QkFBUjs7QUFDbEIsa0JBQUEsR0FBcUIsT0FBQSxDQUFRLGlDQUFSOztBQUNyQixRQUFBLEdBQVksT0FBQSxDQUFRLHlCQUFSOztBQUNYLFFBQVcsT0FBQSxDQUFRLG9CQUFSOztBQUNaLFFBQUEsR0FBWSxPQUFBLENBQVEsVUFBUjs7QUFDWixHQUFBLEdBQVksUUFBUSxDQUFDOztBQUNyQixXQUFBLEdBQWMsT0FBQSxDQUFRLG1CQUFSOztBQUNkLElBQUEsR0FBWSxRQUFRLENBQUM7O0FBQ3JCLGNBQUEsR0FBaUIsUUFBUSxDQUFDOztBQUMxQixnQkFBQSxHQUFtQixRQUFRLENBQUM7O0FBRzVCLFNBQUEsR0FBWTs7QUFDWixZQUFBLEdBQWU7O0FBQ2YsR0FBQSxHQUFNOztBQUNOLFFBQUEsR0FBVzs7QUFDWCxTQUFBLEdBQVk7O0FBRVosSUFBQSxHQUFPOztBQUNQLEtBQUEsR0FBUTs7QUFHUixNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxVQUFuQixDQUFBOztBQUdBLElBQUEsR0FDRTtFQUFBLElBQUEsRUFBTSxJQUFOOzs7QUFFRjtBQUFBLEtBQUEsc0NBQUE7O0VBQ0UsU0FBQSxHQUFZO0FBQ1osVUFBTyxHQUFQO0FBQUEsU0FDTyxlQURQO0FBQUEsU0FDd0IsT0FEeEI7TUFFSSxNQUFNLENBQUMsSUFBSSxD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LEdBQVUsT0FBTyxDQUFDLElBQVIsQ0FBYSxFQUFiO0lBQ1YsT0FBTyxDQUFDLEdBQVIsQ0FBWSxPQUFaO0lBQ0EsS0FBQSxHQUFRO1dBQ1IsS0FBSyxDQUFDLElBQU4sQ0FBVyxPQUFYO0VBekNpQjtBQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBbkI7O0FBaURBLEdBQUcsQ0FBQyxFQUFKLENBQU8sVUFBUCxFQUFtQixDQUFBLFNBQUEsS0FBQTtTQUFBLFNBQUMsQ0FBRCxFQUFJLElBQUo7SUFDakIsT0FBTyxDQUFDLEdBQVIsQ0FBWSxJQUFaO1dBQ0EsR0FBRyxDQUFDLGFBQWEsQ0FBQyxXQUFXLENBQUMsSUFBOUIsQ0FBbUMsVUFBbkMsRUFBK0MsSUFBL0M7RUFGaUI7QUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBQW5COztBQUlBLEdBQUcsQ0FBQyxFQUFKLENBQU8sV0FBUCxFQUFvQixDQUFBLFNBQUEsS0FBQTtTQUFBLFNBQUE7SUFDbEIsT0FBTyxDQUFDLEdBQVIsQ0FBWSxZQUFaO1dBQ0EsR0FBRyxDQUFDLE9BQUosQ0FBWSxpQkFBWjtFQUZrQjtBQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBcEIiLCJzb3VyY2VzQ29udGVudCI6WyJnbG9iYWwubWFycCBvcj1cbiAgY29uZmlnOiByZXF1aXJlICcuL2NsYXNzZXMvbWRzX2NvbmZpZydcbiAgZGV2ZWxvcG1lbnQ6IGZhbHNlXG5cbntCcm93c2VyV2luZG93LCBhcHB9ICAgICA9IHJlcXVpcmUgJ2VsZWN0cm9uJ1xuUGF0aCAgICAgID0gcmVxdWlyZSAncGF0aCdcbk1kc1dpbmRvdyA9IHJlcXVpcmUgJy4vY2xhc3Nlcy9tZHNfd2luZG93J1xuTWRzUHJlc2VuV2luZG93ID0gcmVxdWlyZSAnLi9jbGFzc2VzL21kc19wcmVzZW5fd2luZG93J1xuTWRzUHJlc2VuRGV2V2luZG93ID0gcmVxdWlyZSAnLi9jbGFzc2VzL21kc19wcmVzZW5fZGV2X3dpbmRvdydcbk1haW5NZW51ICA9IHJlcXVpcmUgJy4vY2xhc3Nlcy9tZHNfbWFpbl9tZW51J1xue2V4aXN0fSAgID0gcmVxdWlyZSAnLi9jbGFzc2VzL21kc19maWxlJ1xuZWxlY3Ryb24gID0gcmVxdWlyZSAnZWxlY3Ryb24nXG5pcGMgICAgICAgPSBlbGVjdHJvbi5pcGNNYWluXG5NaWNrcldpbmRvdyA9IHJlcXVpcmUgJy4uL01pY2tyV2luZG93LmpzJ1xuVHJheSAgICAgID0gZWxlY3Ryb24uVHJheVxuZ2xvYmFsU2hvcnRjdXQgPSBlbGVjdHJvbi5nbG9iYWxTaG9ydGN1dFxucG93ZXJTYXZlQmxvY2tlciA9IGVsZWN0cm9uLnBvd2VyU2F2ZUJsb2NrZXJcbiMgYXBwLmNvbW1hbmRMaW5lLmFwcGVuZFN3aXRjaChcIi0tZW5hYmxlLWV4cGVyaW1lbnRhbC13ZWItcGxhdGZvcm0tZmVhdHVyZXNcIik7XG4jIGFib3V0IHByZXNlbnRhdGlvblxuc2xpZGVJbmZvID0gXCJcIlxucHJlc2VuRGV2V2luID0gbnVsbFxud2luID0gbnVsbFxubWlja3JXaW4gPSBudWxsXG5wcmVzZW5XaW4gPSBudWxsXG5cbnRyYXkgPSBudWxsO1xudHJheTIgPSBudWxsO1xuXG4jIEluaXRpYWxpemUgY29uZmlnXG5nbG9iYWwubWFycC5jb25maWcuaW5pdGlhbGl6ZSgpXG5cbiMgUGFyc2UgYXJndW1lbnRzXG5vcHRzID1cbiAgZmlsZTogbnVsbFxuXG5mb3IgYXJnIGluIHByb2Nlc3MuYXJndi5zbGljZSgxKVxuICBicmVha19hcmcgPSBmYWxzZVxuICBzd2l0Y2ggYXJnXG4gICAgd2hlbiAnLS1kZXZlbG9wbWVudCcsICctLWRldidcbiAgICAgIGdsb2JhbC5tYXJwLmRldmVsb3BtZW50ID0gdHJ1ZVxuICAgIGVsc2VcbiAgICAgIGlmIGV4aXN0KHJlc29sdmVkX2ZpbGUgPSBQYXRoLnJlc29sdmUoYXJnKSlcbiAgICAgICAgb3B0cy5maWxlID0gcmVzb2x2ZWRfZmlsZVxuICAgICAgICBicmVha19hcmcgPSB0cnVlXG5cbiAgYnJlYWsgaWYgYnJlYWtfYXJnXG5cbiMgQXBwbGljYXRpb24gZXZlbnRzXG5hcHAub24gJ3dpbmRvdy1hbGwtY2xvc2VkJywgLT5cbiAgaWYgcHJvY2Vzcy5wbGF0Zm9ybSAhPSAnZGFyd2luJyBvciAhIU1kc1dpbmRvdy5hcHBXaWxsUXVpdFxuICAgICMgZ2xvYmFsLm1hcnAuY29uZmlnLnNhdmUoKVxuICAgIGFwcC5xdWl0KClcblxuYXBwLm9uICdiZWZvcmUtcXVpdCcsIC0+XG4gIE1kc1dpbmRvdy5hcHBXaWxsUXVpdCA9IHRydWVcblxuYXBwLm9uICdhY3RpdmF0ZScsIChlLCBoYXNWaXNpYmxlV2luZG93cykgLT5cbiAgbmV3IE1kc1dpbmRvdyBpZiBhcHAuaXNSZWFkeSgpIGFuZCBub3QgaGFzVmlzaWJsZVdpbmRvd3NcblxuYXBwLm9uICdvcGVuLWZpbGUnLCAoZSwgcGF0aCkgLT5cbiAgZS5wcmV2ZW50RGVmYXVsdCgpXG5cbiAgb3B0cy5maWxlT3BlbmVkID0gdHJ1ZVxuICBNZHNXaW5kb3cubG9hZEZyb21GaWxlIHBhdGgsIG51bGxcblxuYXBwLm9uICdyZWFkeScsIC0+XG4gICMgbWlja3Ig44Gu44Km44Kk44Oz44OJ44KmXG5cbiAgbWlja3JXaW4gPSBuZXcgTWlja3JXaW5kb3coKVxuICBtaWNrcldpbi5hY3RpdmF0ZU1haW5XaW5kb3dzKClcbiAgIy8qIOODoeODi+ODpeODvOODkOODvOS4iuOBruOCouOCpOOCs+ODs+OBjOaKvOOBleOCjOOBn+WgtOWQiOOBruWHpueQhiAqL1xuICB0cmF5ID0gbmV3IFRyYXkoUGF0aC5qb2luIF9fZGlybmFtZSwgJy4uLycsJ2xpYicsICdpbWcnLCAnY2xvdWRfb24ucG5nJylcbiAgdHJheS5vbiAnY2xpY2snLCAoZSkgPT5cbiAgICBtaWNrcldpbi5zd2l0Y2hTaG93TW9kZSh0cmF5KVxuXG4gIHRyYXkyID0gbmV3IFRyYXkoUGF0aC5qb2luIF9fZGlybmFtZSwgJy4uLycsJ2xpYicsICdpbWcnLCAnaWNfcGF1c2VfYmxhY2tfMjRkcF8yeC5wbmcnKVxuICB0cmF5Mi5vbiAnY2xpY2snLCAoZSkgPT5cbiAgICBtaWNrcldpbi5zd2l0Y2hQYXVzZSgpXG5cbiAgIyDjgqLjg5fjg6rjga7jgqbjgqTjg7Pjg4njgqZcbiAgZ2xvYmFsLm1hcnAubWFpbk1lbnUgPSBuZXcgTWFpbk1lbnVcbiAgICBkZXZlbG9wbWVudDogZ2xvYmFsLm1hcnAuZGV2ZWxvcG1lbnRcblxuICB1bmxlc3Mgb3B0cy5maWxlT3BlbmVkXG4gICAgaWYgb3B0cy5maWxlXG4gICAgICBNZHNXaW5kb3cubG9hZEZyb21GaWxlIG9wdHMuZmlsZSwgbnVsbFxuICAgIGVsc2VcbiAgICAgIHdpbiA9IG5ldyBNZHNXaW5kb3dcblxuICMgcmVjZWl2ZSBUZXh0XG5pcGMub24gJ3RleHRTZW5kJywgKGUsIHRleHQpID0+XG4gIGNvbnNvbGUubG9nICdyZWNlaXZlIHRleHRTZW5kJ1xuICAjY29uc29sZS5sb2cgdGV4dFxuXG4gIEBwcmVzZW5EZXZXaW49IG5ldyBNZHNQcmVzZW5EZXZXaW5kb3cge30sIHt9LCB0ZXh0XG5cbiAgZWxlY3Ryb25TY3JlZW4gPSBlbGVjdHJvbi5zY3JlZW5cbiAgZGlzcGxheXMgPSBlbGVjdHJvblNjcmVlbi5nZXRBbGxEaXNwbGF5cygpXG4gIGV4dGVybmFsRGlzcGxheSA9IG51bGxcbiAgZm9yIGkgaW4gZGlzcGxheXNcbiAgICBpZiAoaS5ib3VuZHMueCAhPSAwIHx8IGkuYm91bmRzLnkgIT0gMClcbiAgICAgIGV4dGVybmFsRGlzcGxheSA9IGlcbiAgICAgIGJyZWFrXG4gICPjgIDlpJbpg6jjg4fjgqPjgrnjg5fjg6zjgqTjgYzlrZjlnKjjgZnjgovloLTlkIhcbiAgaWYgKGV4dGVybmFsRGlzcGxheSlcbiAgICBAcHJlc2VuV2luID0gbmV3IE1kc1ByZXNlbldpbmRvd1xuICAgICAgeDogZXh0ZXJuYWxEaXNwbGF5LmJvdW5kcy54ICsgNTAsXG4gICAgICB5OiBleHRlcm5hbERpc3BsYXkuYm91bmRzLnkgKyA1MFxuICAjIOWklumDqOODh+OCo+OCueODl+ODrOOCpOOBjOWtmOWcqOOBl+OBquOBhOWgtOWQiFxuICBlbHNlXG4gICAgQHByZXNlbldpbiA9IG5ldyBNZHNQcmVzZW5XaW5kb3dcbiAgICAgIHdpZHRoOjgwMFxuICAgICAgaGVpZ2h0OiA2MDBcbiAgIyB0ZXh0IOOBq+OBr+OAgXNsaWRlX3dyYXBwZXLjga5IVE1M6KaB57Sg44GMaWTpoIbjgavlhaXjgaPjgabjgYTjgotcbiAgQHNsaWRlSW5mbyA9IHRleHRcbiAgbm9uSFRNTCA9IFtdXG5cbiAgIyBodG1s44K/44Kw5YmK6ZmkICYg5paH5a2X5YiX44Gu5b2i44KS5pW044GI44KLXG4gIGZvciBpZHgsIHZhbHVlIG9mIHRleHRcbiAgICBub25IVE1MW2lkeF0gPSB2YWx1ZS5yZXBsYWNlKC88KFwiLio/XCJ8Jy4qPyd8W14nXCJdKSo/Pi9naSwgXCIgXCIpICAgICMgSFRNTOOCv+OCsOa2iOWOu1xuICAgIG5vbkhUTUxbaWR4XSA9IG5vbkhUTUxbaWR4XS5yZXBsYWNlKC9cXG4vZ2ksIFwiXCIpICAjIOaUueihjOaWh+Wtl+OBruWJiumZpFxuICAgIG5vbkhUTUxbaWR4XSA9IG5vbkhUTUxbaWR4XS5yZXBsYWNlKC9cXHMrL2dpLCBcIlwiKSAjIOepuueZveOBruWJiumZpFxuICAgIG5vbkhUTUxbaWR4XSA9IG5vbkhUTUxbaWR4XS5zdWJzdHIoMCwgbm9uSFRNTFtpZHhdLmxlbmd0aC0xKSAgIyDmnKvlsL7jgavjg5rjg7zjgrjmlbDjgYzlhaXjgovjga7jgafjgIHmnKvlsL7jgpLliYrpmaRcblxuICAjIGh0bWzjgr/jgrDjgpLlkKvjgb7jgarjgYTmnKzmlodcbiAgY29uc29sZS5sb2cgbm9uSFRNTFxuICAjIOOBneOCjOOBnuOCjOOBruOCueODqeOCpOODieOBruODhuOCreOCueODiOOCkue1kOWQiOOBl+OAgeODquOCueODiOOBq+S4gOOBpOOBruimgee0oOOBqOOBl+OBpuWFpeOCjOOBplxuICAjIOOAgeOBneOCjOOCknB5dGhvbuOBq+a4oeOBmVxuICBub25IVE1MID0gbm9uSFRNTC5qb2luKFwiXCIpXG4gIGNvbnNvbGUubG9nIG5vbkhUTUxcbiAgaW5wdXQgPSBbXVxuICBpbnB1dC5wdXNoKG5vbkhUTUwpXG5cblxuXG4jIGlwYy5vbiAncmVxdWVzdFNsaWRlSW5mbycsICgpID0+XG4jICAgY29uc29sZS5sb2cgJ3JlY2VpdmUgcmVxdWVzdFNsaWRlSW5mbydcbiMgICBAcHJlc2VuRGV2V2luLndlYkNvbnRlbnRzLnNlbmQgJ3NlbmRTbGlkZUluZm8nLCBAc2xpZGVJbmZvXG5cbmlwYy5vbiAnZ29Ub1BhZ2UnLCAoZSwgcGFnZSkgPT5cbiAgY29uc29sZS5sb2cgcGFnZVxuICB3aW4uYnJvd3NlcldpbmRvdy53ZWJDb250ZW50cy5zZW5kICdnb1RvUGFnZScsIHBhZ2VcblxuaXBjLm9uICdQZGZFeHBvcnQnLCAoKSA9PlxuICBjb25zb2xlLmxvZyAnUERGIEV4cG9ydCdcbiAgd2luLnRyaWdnZXIgJ2V4cG9ydFBkZkRpYWxvZydcbiMgaXBjLm9uICdQcmVzZW50YXRpb24nLCAoKSA9PlxuIyAgIHByZXNlbkRldldpbiA9IG5ldyBNZHNXaW5kb3dcbiMgICBwcmVzZW5EZXZXaW4ud2ViQ29udGVudHMuc2VuZCAnaW5pdGlhbGl6ZSdcbiMgICBwcmVzZW5EZXZXaW4ub3BlbkRldlRvb2xzKClcblxuIl19
