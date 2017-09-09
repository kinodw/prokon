var BrowserWindow, MdsFileHistory, MdsMainMenu, MdsManager, MdsMenu, MdsWindow, MickrClient, Path, dialog, extend, fs, iconv_lite, jschardet, ref,
  bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  slice = [].slice;

ref = require('electron'), BrowserWindow = ref.BrowserWindow, dialog = ref.dialog;

MdsManager = require('./mds_manager');

MdsMenu = require('./mds_menu');

MdsMainMenu = require('./mds_main_menu');

MdsFileHistory = require('./mds_file_history');

extend = require('extend');

fs = require('fs');

jschardet = require('jschardet');

iconv_lite = require('iconv-lite');

Path = require('path');

MickrClient = require('../../modules/MickrClient');

module.exports = MdsWindow = (function() {
  MdsWindow.appWillQuit = false;

  MdsWindow.client = null;

  MdsWindow.defOptions = function() {
    return {
      title: 'Electron',
      show: false,
      x: global.marp.config.get('windowPosition.x'),
      y: global.marp.config.get('windowPosition.y'),
      width: global.marp.config.get('windowPosition.width'),
      height: global.marp.config.get('windowPosition.height')
    };
  };

  MdsWindow.prototype.browserWindow = null;

  MdsWindow.prototype.path = null;

  MdsWindow.prototype.changed = false;

  MdsWindow.prototype.freeze = false;

  MdsWindow.prototype.resourceState = null;

  MdsWindow.prototype._closeConfirmed = false;

  MdsWindow.prototype._watchingResources = new Set;

  MdsWindow.prototype.viewMode = null;

  function MdsWindow(fileOpts, options1) {
    var setting;
    if (fileOpts == null) {
      fileOpts = {};
    }
    this.options = options1 != null ? options1 : {};
    this.send = bind(this.send, this);
    this.isBufferEmpty = bind(this.isBufferEmpty, this);
    this._setIsOpen = bind(this._setIsOpen, this);
    this.isOpen = bind(this.isOpen, this);
    this.updateResourceState = bind(this.updateResourceState, this);
    this.getShortPath = bind(this.getShortPath, this);
    this.refreshTitle = bind(this.refreshTitle, this);
    this.trigger = bind(this.trigger, this);
    this.loadFromFile = bind(this.loadFromFile, this);
    setting = {
      "id": "window",
      "url": "ws://apps.wisdomweb.net:64260/ws/mik",
      "site": "test",
      "token": "Pad:9948"
    };
    this.client = new MickrClient(setting);
    this.path = (fileOpts != null ? fileOpts.path : void 0) || null;
    this.viewMode = 'screen';
    this.browserWindow = (function(_this) {
      return function() {
        var bw, loadCmp, updateWindowPosition;
        bw = new BrowserWindow(extend(true, {}, MdsWindow.defOptions(), _this.options, {
          'titleBarStyle': 'hidden',
          'acceptFirstMouse': true
        }));
        _this._window_id = bw.id;
        loadCmp = function(details) {
          return setTimeout(function() {
            _this._watchingResources["delete"](details.id);
            return _this.updateResourceState();
          }, 500);
        };
        bw.webContents.session.webRequest.onCompleted(loadCmp);
        bw.webContents.session.webRequest.onErrorOccurred(loadCmp);
        bw.webContents.session.webRequest.onBeforeRequest(function(details, callback) {
          _this._watchingResources.add(details.id);
          _this.updateResourceState();
          return callback({});
        });
        _this.menu = new MdsMainMenu({
          window: bw,
          development: global.marp.development,
          viewMode: _this.viewMode
        });
        if (global.marp.config.get('windowPosition.maximized')) {
          bw.maximize();
        }
        bw.loadURL("file://" + __dirname + "/../../index.html#" + _this._window_id);
        bw.webContents.on('did-finish-load', function() {
          _this._windowLoaded = true;
          _this.send('setSplitter', global.marp.config.get('splitterPosition'));
          _this.send('setEditorConfig', global.marp.config.get('editor'));
          return _this.trigger('load', (fileOpts != null ? fileOpts.buffer : void 0) || '', _this.path);
        });
        bw.once('ready-to-show', function() {
          return bw.show();
        });
        bw.on('close', function(e) {
          if (_this.freeze) {
            e.preventDefault();
            MdsWindow.appWillQuit = false;
          }
        });
        bw.on('closed', function() {
          _this.browserWindow = null;
          return _this._setIsOpen(false);
        });
        updateWindowPosition = function(e) {
          if (!global.marp.config.set('windowPosition.maximized', bw.isMaximized())) {
            return global.marp.config.merge({
              windowPosition: bw.getBounds()
            });
          }
        };
        bw.on('move', updateWindowPosition);
        bw.on('resize', updateWindowPosition);
        bw.on('maximize', updateWindowPosition);
        bw.on('unmaximize', updateWindowPosition);
        bw.mdsWindow = _this;
        return bw;
      };
    })(this)();
    this._setIsOpen(true);
  }

  MdsWindow.loadFromFile = function(fname, mdsWindow, options) {
    if (options == null) {
      options = {};
    }
    return fs.readFile(fname, (function(_this) {
      return function(err, txt) {
        var buf, encoding, ref1;
        if (err) {
          return;
        }
        encoding = (options != null ? options.encoding : void 0) || ((ref1 = jschardet.detect(txt)) != null ? ref1.encoding : void 0);
        buf = encoding !== 'UTF-8' && encoding !== 'ascii' && iconv_lite.encodingExists(encoding) ? iconv_lite.decode(txt, encoding) : txt.toString();
        if (!(options != null ? options.ignoreRecent : void 0)) {
          MdsFileHistory.push(fname);
          MdsMainMenu.updateMenuToAll();
        }
        if ((mdsWindow != null) && ((options != null ? options.override : void 0) || mdsWindow.isBufferEmpty())) {
          return mdsWindow.trigger('load', buf, fname);
        } else {
          return new MdsWindow({
            path: fname,
            buffer: buf
          });
        }
      };
    })(this));
  };

  MdsWindow.prototype.loadFromFile = function(fname, options) {
    if (options == null) {
      options = {};
    }
    return MdsWindow.loadFromFile(fname, this, options);
  };

  MdsWindow.prototype.trigger = function() {
    var args, evt, ref1;
    evt = arguments[0], args = 2 <= arguments.length ? slice.call(arguments, 1) : [];
    return (ref1 = this.events[evt]) != null ? ref1.apply(this, args) : void 0;
  };

  MdsWindow.prototype.events = {
    previewInitialized: function() {
      return this.trigger('viewMode', this.viewMode);
    },
    setConfig: function(name, value, isSave) {
      if (isSave == null) {
        isSave = true;
      }
      global.marp.config.set(name, value);
      if (isSave) {
        return global.marp.config.save();
      }
    },
    load: function(buffer, path) {
      if (buffer == null) {
        buffer = '';
      }
      if (path == null) {
        path = null;
      }
      this.trigger('initializeState', path);
      return this.send('loadText', buffer);
    },
    loadFromFile: function(fname, options) {
      if (options == null) {
        options = {};
      }
      return this.loadFromFile(fname, options);
    },
    reopen: function(options) {
      if (options == null) {
        options = {};
      }
      if (this.freeze || !this.path) {
        return;
      }
      if (this.changed && dialog.showMessageBox(this.browserWindow, {
        type: 'question',
        buttons: ['OK', 'Cancel'],
        title: '',
        message: 'Are you sure?',
        detail: 'You will lose your changes. Reopen anyway?'
      })) {
        return;
      }
      return this.loadFromFile(this.path, extend({
        override: true
      }, options));
    },
    save: function(triggers) {
      if (triggers == null) {
        triggers = {};
      }
      if (this.path) {
        return this.send('save', this.path, triggers);
      } else {
        return this.trigger('saveAs', triggers);
      }
    },
    saveAs: function(triggers) {
      if (triggers == null) {
        triggers = {};
      }
      return dialog.showSaveDialog(this.browserWindow, {
        title: 'Save as...',
        filters: [
          {
            name: 'Markdown file',
            extensions: ['md']
          }
        ]
      }, (function(_this) {
        return function(fname) {
          if (fname != null) {
            return _this.send('save', fname, triggers);
          } else {
            return MdsWindow.appWillQuit = false;
          }
        };
      })(this));
    },
    writeFile: function(fileName, data, triggers) {
      if (triggers == null) {
        triggers = {};
      }
      return fs.writeFile(fileName, data, (function(_this) {
        return function(err) {
          if (!err) {
            console.log("Write file to " + fileName + ".");
            if (triggers.succeeded != null) {
              _this.trigger(triggers.succeeded);
            }
          } else {
            console.log(err);
            MdsWindow.appWillQuit = false;
            if (triggers.failed != null) {
              _this.trigger(triggers.failed, err);
            }
          }
          if (triggers.finalized != null) {
            return _this.trigger(triggers.finalized);
          }
        };
      })(this));
    },
    forceClose: function() {
      return this.browserWindow.destroy();
    },
    exportPdfDialog: function() {
      if (this.freeze) {
        return;
      }
      return dialog.showSaveDialog(this.browserWindow, {
        title: 'Export to PDF...',
        filters: [
          {
            name: 'PDF file',
            extensions: ['pdf']
          }
        ]
      }, (function(_this) {
        return function(fname) {
          if (fname == null) {
            return;
          }
          _this.freeze = true;
          return _this.send('publishPdf', fname);
        };
      })(this));
    },
    initializeState: function(filePath, changed) {
      var dir;
      if (filePath == null) {
        filePath = null;
      }
      if (changed == null) {
        changed = false;
      }
      this.path = filePath;
      this.trigger('setChangedStatus', changed);
      dir = filePath ? "" + (Path.dirname(filePath)) + Path.sep : null;
      this.send('setImageDirectory', dir);
      return this.menu.updateMenu();
    },
    setChangedStatus: function(changed) {
      this.changed = !!changed;
      return this.refreshTitle();
    },
    viewMode: function(mode) {
      global.marp.config.set('viewMode', mode);
      global.marp.config.save();
      this.send('viewMode', mode);
      this.menu.states.viewMode = mode;
      return this.menu.updateMenu();
    },
    themeChanged: function(theme) {
      this.menu.states.theme = theme;
      return this.menu.updateMenu();
    },
    unfreeze: function() {
      this.freeze = false;
      return this.send('unfreezed');
    }
  };

  MdsWindow.prototype.refreshTitle = function() {
    var ref1, ref2, ref3, ref4, ref5;
    if (process.platform === 'darwin') {
      if ((ref1 = this.browserWindow) != null) {
        ref1.setTitle("" + (this.getShortPath()) + (this.changed ? ' *' : ''));
      }
      if ((ref2 = this.browserWindow) != null) {
        ref2.setRepresentedFilename(this.path || '');
      }
      return (ref3 = this.browserWindow) != null ? ref3.setDocumentEdited(this.changed) : void 0;
    } else {
      return (ref4 = this.browserWindow) != null ? ref4.setTitle((((ref5 = this.options) != null ? ref5.title : void 0) || 'Marp') + " - " + (this.getShortPath()) + (this.changed ? ' *' : '')) : void 0;
    }
  };

  MdsWindow.prototype.getShortPath = function() {
    if (this.path == null) {
      return '(untitled)';
    }
    return this.path.replace(/\\/g, '/').replace(/.*\//, '');
  };

  MdsWindow.prototype.updateResourceState = function() {
    var newState;
    newState = this._watchingResources.size <= 0 ? 'loaded' : 'loading';
    if (this.resourceState !== newState) {
      this.send('resourceState', newState);
    }
    return this.resourceState = newState;
  };

  MdsWindow.prototype.isOpen = function() {
    return this._isOpen;
  };

  MdsWindow.prototype._setIsOpen = function(state) {
    this._isOpen = !!state;
    if (this._isOpen) {
      MdsManager.addWindow(this._window_id, this);
    } else {
      MdsManager.removeWindow(this._window_id);
    }
    return this._isOpen;
  };

  MdsWindow.prototype.isBufferEmpty = function() {
    return !this.path && !this.changed;
  };

  MdsWindow.prototype.send = function() {
    var args, evt;
    evt = arguments[0], args = 2 <= arguments.length ? slice.call(arguments, 1) : [];
    if (!(this._windowLoaded && (this.browserWindow != null))) {
      return false;
    }
    return this.browserWindow.webContents.send('MdsManagerSendEvent', evt, {
      from: null,
      to: this._window_id
    }, args);
  };

  return MdsWindow;

})();

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xhc3Nlcy9tZHNfd2luZG93LmpzIiwic291cmNlcyI6WyJjbGFzc2VzL21kc193aW5kb3cuY29mZmVlIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLElBQUEsNklBQUE7RUFBQTs7O0FBQUEsTUFBMEIsT0FBQSxDQUFRLFVBQVIsQ0FBMUIsRUFBQyxpQ0FBRCxFQUFnQjs7QUFFaEIsVUFBQSxHQUFpQixPQUFBLENBQVEsZUFBUjs7QUFDakIsT0FBQSxHQUFpQixPQUFBLENBQVEsWUFBUjs7QUFDakIsV0FBQSxHQUFpQixPQUFBLENBQVEsaUJBQVI7O0FBQ2pCLGNBQUEsR0FBaUIsT0FBQSxDQUFRLG9CQUFSOztBQUNqQixNQUFBLEdBQWlCLE9BQUEsQ0FBUSxRQUFSOztBQUNqQixFQUFBLEdBQWlCLE9BQUEsQ0FBUSxJQUFSOztBQUNqQixTQUFBLEdBQWlCLE9BQUEsQ0FBUSxXQUFSOztBQUNqQixVQUFBLEdBQWlCLE9BQUEsQ0FBUSxZQUFSOztBQUNqQixJQUFBLEdBQWlCLE9BQUEsQ0FBUSxNQUFSOztBQUNqQixXQUFBLEdBQWlCLE9BQUEsQ0FBUSwyQkFBUjs7QUFFakIsTUFBTSxDQUFDLE9BQVAsR0FBdUI7RUFDckIsU0FBQyxDQUFBLFdBQUQsR0FBYzs7RUFDZCxTQUFDLENBQUEsTUFBRCxHQUFVOztFQUVWLFNBQUMsQ0FBQSxVQUFELEdBQWEsU0FBQTtXQUNYO01BQUEsS0FBQSxFQUFRLFVBQVI7TUFDQSxJQUFBLEVBQVEsS0FEUjtNQUVBLENBQUEsRUFBUSxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFuQixDQUF1QixrQkFBdkIsQ0FGUjtNQUdBLENBQUEsRUFBUSxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFuQixDQUF1QixrQkFBdkIsQ0FIUjtNQUlBLEtBQUEsRUFBUSxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFuQixDQUF1QixzQkFBdkIsQ0FKUjtNQUtBLE1BQUEsRUFBUSxNQUFNLENBQUMs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ckIsTUFBQSxHQUFRLFNBQUE7V0FBRyxJQUFDLENBQUE7RUFBSjs7c0JBQ1IsVUFBQSxHQUFZLFNBQUMsS0FBRDtJQUNWLElBQUMsQ0FBQSxPQUFELEdBQVcsQ0FBQyxDQUFDO0lBRWIsSUFBRyxJQUFDLENBQUEsT0FBSjtNQUNFLFVBQVUsQ0FBQyxTQUFYLENBQXFCLElBQUMsQ0FBQSxVQUF0QixFQUFrQyxJQUFsQyxFQURGO0tBQUEsTUFBQTtNQUdFLFVBQVUsQ0FBQyxZQUFYLENBQXdCLElBQUMsQ0FBQSxVQUF6QixFQUhGOztBQUtBLFdBQU8sSUFBQyxDQUFBO0VBUkU7O3NCQVVaLGFBQUEsR0FBZSxTQUFBO1dBQUcsQ0FBQyxJQUFDLENBQUEsSUFBRixJQUFXLENBQUksSUFBQyxDQUFBO0VBQW5COztzQkFFZixJQUFBLEdBQU0sU0FBQTtBQUNKLFFBQUE7SUFESyxvQkFBSztJQUNWLElBQUEsQ0FBQSxDQUFvQixJQUFDLENBQUEsYUFBRCxJQUFtQiw0QkFBdkMsQ0FBQTtBQUFBLGFBQU8sTUFBUDs7V0FDQSxJQUFDLENBQUEsYUFBYSxDQUFDLFdBQVcsQ0FBQyxJQUEzQixDQUFnQyxxQkFBaEMsRUFBdUQsR0FBdkQsRUFBNEQ7TUFBRSxJQUFBLEVBQU0sSUFBUjtNQUFjLEVBQUEsRUFBSSxJQUFDLENBQUEsVUFBbkI7S0FBNUQsRUFBNkYsSUFBN0Y7RUFGSSIsInNvdXJjZXNDb250ZW50IjpbIntCcm93c2VyV2luZG93LCBkaWFsb2d9ID0gcmVxdWlyZSAnZWxlY3Ryb24nXG5cbk1kc01hbmFnZXIgICAgID0gcmVxdWlyZSAnLi9tZHNfbWFuYWdlcidcbk1kc01lbnUgICAgICAgID0gcmVxdWlyZSAnLi9tZHNfbWVudSdcbk1kc01haW5NZW51ICAgID0gcmVxdWlyZSAnLi9tZHNfbWFpbl9tZW51J1xuTWRzRmlsZUhpc3RvcnkgPSByZXF1aXJlICcuL21kc19maWxlX2hpc3RvcnknXG5leHRlbmQgICAgICAgICA9IHJlcXVpcmUgJ2V4dGVuZCdcbmZzICAgICAgICAgICAgID0gcmVxdWlyZSAnZnMnXG5qc2NoYXJkZXQgICAgICA9IHJlcXVpcmUgJ2pzY2hhcmRldCdcbmljb252X2xpdGUgICAgID0gcmVxdWlyZSAnaWNvbnYtbGl0ZSdcblBhdGggICAgICAgICAgID0gcmVxdWlyZSAncGF0aCdcbk1pY2tyQ2xpZW50ICAgID0gcmVxdWlyZSAnLi4vLi4vbW9kdWxlcy9NaWNrckNsaWVudCdcblxubW9kdWxlLmV4cG9ydHMgPSBjbGFzcyBNZHNXaW5kb3dcbiAgQGFwcFdpbGxRdWl0OiBmYWxzZVxuICBAY2xpZW50ID0gbnVsbFxuXG4gIEBkZWZPcHRpb25zOiAoKSAtPlxuICAgIHRpdGxlOiAgJ0VsZWN0cm9uJ1xuICAgIHNob3c6ICAgZmFsc2VcbiAgICB4OiAgICAgIGdsb2JhbC5tYXJwLmNvbmZpZy5nZXQgJ3dpbmRvd1Bvc2l0aW9uLngnXG4gICAgeTogICAgICBnbG9iYWwubWFycC5jb25maWcuZ2V0ICd3aW5kb3dQb3NpdGlvbi55J1xuICAgIHdpZHRoOiAgZ2xvYmFsLm1hcnAuY29uZmlnLmdldCAnd2luZG93UG9zaXRpb24ud2lkdGgnXG4gICAgaGVpZ2h0OiBnbG9iYWwubWFycC5jb25maWcuZ2V0ICd3aW5kb3dQb3NpdGlvbi5oZWlnaHQnXG4gICAgIyBpY29uOiAgIFBhdGguam9pbihfX2Rpcm5hbWUsICcvLi4vLi4vaW1hZ2VzL21hcnAucG5nJylcblxuICBicm93c2VyV2luZG93OiBudWxsXG4gIHBhdGg6IG51bGxcbiAgY2hhbmdlZDogZmFsc2VcbiAgZnJlZXplOiBmYWxzZVxuICByZXNvdXJjZVN0YXRlOiBudWxsXG5cbiAgX2Nsb3NlQ29uZmlybWVkOiBmYWxzZVxuICBfd2F0Y2hpbmdSZXNvdXJjZXM6IG5ldyBTZXRcblxuICB2aWV3TW9kZTogbnVsbFxuXG4gIGNvbnN0cnVjdG9yOiAoZmlsZU9wdHMgPSB7fSwgQG9wdGlvbnMgPSB7fSkgLT5cbiAgICBzZXR0aW5nID1cbiAgICAgIFwiaWRcIjogXCJ3aW5kb3dcIlxuICAgICAgXCJ1cmxcIjogXCJ3czovL2FwcHMud2lzZG9td2ViLm5ldDo2NDI2MC93cy9taWtcIlxuICAgICAgXCJzaXRlXCI6IFwidGVzdFwiXG4gICAgICBcInRva2VuXCI6IFwiUGFkOjk5NDhcIlxuICAgIEBjbGllbnQgPSBuZXcgTWlja3JDbGllbnQoc2V0dGluZylcblxuICAgIEBwYXRoID0gZmlsZU9wdHM/LnBhdGggfHwgbnVsbFxuXG4gICAgIyBAdmlld01vZGUgPSBnbG9iYWwubWFycC5jb25maWcuZ2V0KCd2aWV3TW9kZScpXG4gICAgQHZpZXdNb2RlID0gJ3NjcmVlbidcblxuICAgIEBicm93c2VyV2luZG93ID0gZG8gPT5cbiAgICAgICMg5Yid5pyf6Kit5a6ab3B0aW9ucyDjgaggQG9wdGlvbnMg44KS44Oe44O844K444GX44Gm5Yid5pyf5YyW44CB44Km44Kk44Oz44OJ44KmSUToqK3lrppcbiAgICAgIGJ3ID0gbmV3IEJyb3dzZXJXaW5kb3cgZXh0ZW5kKHRydWUsIHt9LCBNZHNXaW5kb3cuZGVmT3B0aW9ucygpLCBAb3B0aW9ucyxcbiAgICAgIHtcbiAgICAgICd0aXRsZUJhclN0eWxlJzogJ2hpZGRlbicsICPjg5jjg4Pjg4Djg7zjg5Djg7zjgpLpgI/mmI7jgavjgZfjgIHjg5zjgr/jg7PjgaDjgZHooajnpLpcbiAgICAgICdhY2NlcHRGaXJzdE1vdXNlJzogdHJ1ZVxuICAgICAgfSlcbiAgICAgIEBfd2luZG93X2lkID0gYncuaWRcblxuXG4gICAgICBsb2FkQ21wID0gKGRldGFpbHMpID0+XG4gICAgICAgIHNldFRpbWVvdXQgPT5cbiAgICAgICAgICBAX3dhdGNoaW5nUmVzb3VyY2VzLmRlbGV0ZShkZXRhaWxzLmlkKVxuICAgICAgICAgIEB1cGRhdGVSZXNvdXJjZVN0YXRlKClcbiAgICAgICAgLCA1MDBcbiAgICAgICMgYWJvdXQgd2ViUmVxdWVzdFxuICAgICAgIyBkZXRhaWxzIG9iamVjdCBkZXNjcmliZXMgcmVxdWVzdFxuICAgICAgIyBUaGUgZmlsdGVyIG9iamVjdCBoYXMgYSB1cmxzIHByb3BlcnR5IHdoaWNoIGlzIGFuIEFycmF5IG9mIFVSTCBwYXR0ZXJucy1cbiAgICAgICMgLXRoYXQgd2lsbCBiZSB1c2VkIHRvIGZpbHRlciBvdXQgdGhlIHJlcXVlc3RzIHRoYXQgZG8gbm90IG1hdGNoIHRoZSBVUkwgcGF0dGVybnMuXG4gICAgICAjIElmIHRoZSBmaWx0ZXIgaXMgb21pdHRlZCB0aGVuIGFsbCByZXF1ZXN0cyB3aWxsIGJlIG1hdGNoZWQuXG4gICAgICBidy53ZWJDb250ZW50cy5zZXNzaW9uLndlYlJlcXVlc3Qub25Db21wbGV0ZWQgbG9hZENtcFxuICAgICAgYncud2ViQ29udGVudHMuc2Vzc2lvbi53ZWJSZXF1ZXN0Lm9uRXJyb3JPY2N1cnJlZCBsb2FkQ21wXG4gICAgICBidy53ZWJDb250ZW50cy5zZXNzaW9uLndlYlJlcXVlc3Qub25CZWZvcmVSZXF1ZXN0IChkZXRhaWxzLCBjYWxsYmFjaykgPT5cbiAgICAgICAgQF93YXRjaGluZ1Jlc291cmNlcy5hZGQoZGV0YWlscy5pZClcbiAgICAgICAgQHVwZGF0ZVJlc291cmNlU3RhdGUoKVxuICAgICAgICBjYWxsYmFjayh7fSlcblxuICAgICAgQG1lbnUgPSBuZXcgTWRzTWFpbk1lbnVcbiAgICAgICAgd2luZG93OiBid1xuICAgICAgICBkZXZlbG9wbWVudDogZ2xvYmFsLm1hcnAuZGV2ZWxvcG1lbnRcbiAgICAgICAgdmlld01vZGU6IEB2aWV3TW9kZVxuXG4gICAgICBidy5tYXhpbWl6ZSgpIGlmIGdsb2JhbC5tYXJwLmNvbmZpZy5nZXQgJ3dpbmRvd1Bvc2l0aW9uLm1heGltaXplZCdcblxuICAgICAgYncubG9hZFVSTCBcImZpbGU6Ly8je19fZGlybmFtZX0vLi4vLi4vaW5kZXguaHRtbCMje0Bfd2luZG93X2lkfVwiXG5cbiAgICAgIGJ3LndlYkNvbnRlbnRzLm9uICdkaWQtZmluaXNoLWxvYWQnLCA9PlxuICAgICAgICBAX3dpbmRvd0xvYWRlZCA9IHRydWVcbiAgICAgICAgQHNlbmQgJ3NldFNwbGl0dGVyJywgZ2xvYmFsLm1hcnAuY29uZmlnLmdldCgnc3BsaXR0ZXJQb3NpdGlvbicpXG4gICAgICAgIEBzZW5kICdzZXRFZGl0b3JDb25maWcnLCBnbG9iYWwubWFycC5jb25maWcuZ2V0KCdlZGl0b3InKVxuICAgICAgICBAdHJpZ2dlciAnbG9hZCcsIGZpbGVPcHRzPy5idWZmZXIgfHwgJycsIEBwYXRoXG5cbiAgICAgIGJ3Lm9uY2UgJ3JlYWR5LXRvLXNob3cnLCA9PiBidy5zaG93KClcblxuICAgICAgYncub24gJ2Nsb3NlJywgKGUpID0+XG4gICAgICAgIGlmIEBmcmVlemVcbiAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KClcbiAgICAgICAgICBNZHNXaW5kb3cuYXBwV2lsbFF1aXQgPSBmYWxzZVxuICAgICAgICAgIHJldHVyblxuXG4gICAgICAgICMgd2hlbiBjbG9zZSB3aW5kb3csIHdhd3JuaW5nIGRpYWxvZyBpcyBzaG93blxuICAgICAgICAjIGlmIEBjaGFuZ2VkXG4gICAgICAgICMgICBlLnByZXZlbnREZWZhdWx0KClcbiAgICAgICAgIyAgIGRpYWxvZy5zaG93TWVzc2FnZUJveCBAYnJvd3NlcldpbmRvdyxcbiAgICAgICAgIyAgICAgdHlwZTogJ3F1ZXN0aW9uJ1xuICAgICAgICAjICAgICBidXR0b25zOiBbJ1llcycsICdObycsICdDYW5jZWwnXVxuICAgICAgICAjICAgICB0aXRsZTogJ01hcnAnXG4gICAgICAgICMgICAgIG1lc3NhZ2U6ICdBcmUgeW91IHN1cmU/J1xuICAgICAgICAjICAgICBkZXRhaWw6IFwiI3tAZ2V0U2hvcnRQYXRoKCl9IGhhcyBiZWVuIG1vZGlmaWVkLiBEbyB5b3Ugd2FudCB0byBzYXZlIHRoZSBjaGFuZ2VzP1wiXG4gICAgICAgICMgICAgIGNhbmNlbElkOiAyXG4gICAgICAgICMgICAsIChyZXN1bHQpID0+XG4gICAgICAgICMgICAgICMgV3JhcCBieSBzZXRUaW1lb3V0IHRvIGF2b2lkIGFwcCB0ZXJtaW5hdGlvbiB1bmV4cGVjdGVkbHkgb24gTGludXguXG4gICAgICAgICMgICAgIHN3aXRjaCByZXN1bHRcbiAgICAgICAgIyAgICAgICB3aGVuIDAgdGhlbiBzZXRUaW1lb3V0ICg9PiBAdHJpZ2dlciAnc2F2ZScsICdmb3JjZUNsb3NlJyksIDBcbiAgICAgICAgIyAgICAgICB3aGVuIDEgdGhlbiBzZXRUaW1lb3V0ICg9PiBAdHJpZ2dlciAnZm9yY2VDbG9zZScpLCAwXG4gICAgICAgICMgICAgICAgZWxzZVxuICAgICAgICAjICAgICAgICAgTWRzV2luZG93LmFwcFdpbGxRdWl0ID0gZmFsc2VcblxuICAgICAgYncub24gJ2Nsb3NlZCcsID0+XG4gICAgICAgIEBicm93c2VyV2luZG93ID0gbnVsbFxuICAgICAgICBAX3NldElzT3BlbiBmYWxzZVxuXG4gICAgICB1cGRhdGVXaW5kb3dQb3NpdGlvbiA9IChlKSA9PlxuICAgICAgICB1bmxlc3MgZ2xvYmFsLm1hcnAuY29uZmlnLnNldCgnd2luZG93UG9zaXRpb24ubWF4aW1pemVkJywgYncuaXNNYXhpbWl6ZWQoKSlcbiAgICAgICAgICBnbG9iYWwubWFycC5jb25maWcubWVyZ2UgeyB3aW5kb3dQb3NpdGlvbjogYncuZ2V0Qm91bmRzKCkgfVxuXG4gICAgICBidy5vbiAnbW92ZScsIHVwZGF0ZVdpbmRvd1Bvc2l0aW9uXG4gICAgICBidy5vbiAncmVzaXplJywgdXBkYXRlV2luZG93UG9zaXRpb25cbiAgICAgIGJ3Lm9uICdtYXhpbWl6ZScsIHVwZGF0ZVdpbmRvd1Bvc2l0aW9uXG4gICAgICBidy5vbiAndW5tYXhpbWl6ZScsIHVwZGF0ZVdpbmRvd1Bvc2l0aW9uXG5cblxuXG5cbiAgICAgIGJ3Lm1kc1dpbmRvdyA9IEBcbiAgICAgIGJ3XG5cbiAgICBAX3NldElzT3BlbiB0cnVlXG5cbiAgQGxvYWRGcm9tRmlsZTogKGZuYW1lLCBtZHNXaW5kb3csIG9wdGlvbnMgPSB7fSkgLT5cbiAgICBmcy5yZWFkRmlsZSBmbmFtZSwgKGVyciwgdHh0KSA9PlxuICAgICAgcmV0dXJuIGlmIGVyclxuXG4gICAgICBlbmNvZGluZyA9IG9wdGlvbnM/LmVuY29kaW5nIHx8IGpzY2hhcmRldC5kZXRlY3QodHh0KT8uZW5jb2RpbmdcbiAgICAgIGJ1ZiA9IGlmIGVuY29kaW5nIGlzbnQgJ1VURi04JyBhbmQgZW5jb2RpbmcgaXNudCAnYXNjaWknIGFuZCBpY29udl9saXRlLmVuY29kaW5nRXhpc3RzKGVuY29kaW5nKVxuICAgICAgICBpY29udl9saXRlLmRlY29kZSh0eHQsIGVuY29kaW5nKVxuICAgICAgZWxzZVxuICAgICAgICB0eHQudG9TdHJpbmcoKVxuXG4gICAgICAjIGlnbm9yZeOBl+OBquOBhOWgtOWQiCBmaWxlTmFtZSDjgpIgZmlsZUhpc3RyeeOAgOOBq3B1c2jjgZfjgIHjgZnjgbnjgabjga7jgqbjgqTjg7Pjg4njgqbjga7jg6Hjg4vjg6Xjg7zmm7TmlrBcbiAgICAgIHVubGVzcyBvcHRpb25zPy5pZ25vcmVSZWNlbnRcbiAgICAgICAgTWRzRmlsZUhpc3RvcnkucHVzaCBmbmFtZVxuICAgICAgICBNZHNNYWluTWVudS51cGRhdGVNZW51VG9BbGwoKVxuXG4gICAgICAjIOOCpuOCpOODs+ODieOCpuOBjOWtmOWcqOOBl+OAgeOBi+OBpOOAgW92ZXJyaWRl44G+44Gf44Gv44Km44Kk44Oz44OJ44Km44Gu44OQ44OD44OV44Kh44GM56m644CB44Gn44GC44KL44Go44GNXG4gICAgICBpZiBtZHNXaW5kb3c/IGFuZCAob3B0aW9ucz8ub3ZlcnJpZGUgb3IgbWRzV2luZG93LmlzQnVmZmVyRW1wdHkoKSlcbiAgICAgICAgbWRzV2luZG93LnRyaWdnZXIgJ2xvYWQnLCBidWYsIGZuYW1lXG5cbiAgICAgICMg44Km44Kk44Oz44OJ44Km5Yid5pyf5YyW44CAcGFyYW0gPSBmaWxlT3B0c+OAgOOBpyBmaWxlT3B0cyA9IHsgcGF0aDogZm5hbWUsIGJ1ZmZlcjogYnVmIH1cbiAgICAgICMg56ys5LqM5byV5pWw44Gv44Gq44GXIC0+IEBvcHRpb25zID0ge31cbiAgICAgIGVsc2VcbiAgICAgICAgbmV3IE1kc1dpbmRvdyB7IHBhdGg6IGZuYW1lLCBidWZmZXI6IGJ1ZiB9XG5cbiAgbG9hZEZyb21GaWxlOiAoZm5hbWUsIG9wdGlvbnMgPSB7fSkgPT4gTWRzV2luZG93LmxvYWRGcm9tRmlsZSBmbmFtZSwgQCwgb3B0aW9uc1xuXG4gIHRyaWdnZXI6IChldnQsIGFyZ3MuLi4pID0+XG4gICAgQGV2ZW50c1tldnRdPy5hcHBseShALCBhcmdzKSAjIOWRvOOBsOOCjOOCi+mWouaVsOWGheOBrnRoaXPjgpLnrKzkuIDlvJXmlbDjgafmjIflrprjgZfjgZ/jgoLjga7jgavlpInjgYjjgabjgYTjgoso44Gd44KM44Ge44KM44GuTWRzV2luZG93KVxuXG5cbiAgZXZlbnRzOlxuICAgIHByZXZpZXdJbml0aWFsaXplZDogLT5cbiAgICAgIEB0cmlnZ2VyICd2aWV3TW9kZScsIEB2aWV3TW9kZVxuXG4gICAgc2V0Q29uZmlnOiAobmFtZSwgdmFsdWUsIGlzU2F2ZSA9IHRydWUpIC0+XG4gICAgICBnbG9iYWwubWFycC5jb25maWcuc2V0IG5hbWUsIHZhbHVlXG4gICAgICBnbG9iYWwubWFycC5jb25maWcuc2F2ZSgpIGlmIGlzU2F2ZVxuXG4gICAgbG9hZDogKGJ1ZmZlciA9ICcnLCBwYXRoID0gbnVsbCkgLT5cbiAgICAgIEB0cmlnZ2VyICdpbml0aWFsaXplU3RhdGUnLCBwYXRoXG4gICAgICBAc2VuZCAnbG9hZFRleHQnLCBidWZmZXJcblxuICAgIGxvYWRGcm9tRmlsZTogKGZuYW1lLCBvcHRpb25zID0ge30pIC0+IEBsb2FkRnJvbUZpbGUgZm5hbWUsIG9wdGlvbnNcblxuICAgIHJlb3BlbjogKG9wdGlvbnMgPSB7fSkgLT5cbiAgICAgIHJldHVybiBpZiBAZnJlZXplIG9yICFAcGF0aFxuICAgICAgcmV0dXJuIGlmIEBjaGFuZ2VkIGFuZCBkaWFsb2cuc2hvd01lc3NhZ2VCb3goQGJyb3dzZXJXaW5kb3csXG4gICAgICAgIHR5cGU6ICdxdWVzdGlvbidcbiAgICAgICAgYnV0dG9uczogWydPSycsICdDYW5jZWwnXVxuICAgICAgICB0aXRsZTogJydcbiAgICAgICAgbWVzc2FnZTogJ0FyZSB5b3Ugc3VyZT8nXG4gICAgICAgIGRldGFpbDogJ1lvdSB3aWxsIGxvc2UgeW91ciBjaGFuZ2VzLiBSZW9wZW4gYW55d2F5PycpXG5cbiAgICAgIEBsb2FkRnJvbUZpbGUgQHBhdGgsIGV4dGVuZCh7IG92ZXJyaWRlOiB0cnVlIH0sIG9wdGlvbnMpXG5cbiAgICBzYXZlOiAodHJpZ2dlcnMgPSB7fSkgLT5cbiAgICAgIGlmIEBwYXRoIHRoZW4gQHNlbmQoJ3NhdmUnLCBAcGF0aCwgdHJpZ2dlcnMpIGVsc2UgQHRyaWdnZXIoJ3NhdmVBcycsIHRyaWdnZXJzKVxuXG4gICAgc2F2ZUFzOiAodHJpZ2dlcnMgPSB7fSkgLT5cbiAgICAgIGRpYWxvZy5zaG93U2F2ZURpYWxvZyBAYnJvd3NlcldpbmRvdyxcbiAgICAgICAgdGl0bGU6ICdTYXZlIGFzLi4uJ1xuICAgICAgICBmaWx0ZXJzOiBbeyBuYW1lOiAnTWFya2Rvd24gZmlsZScsIGV4dGVuc2lvbnM6IFsnbWQnXSB9XVxuICAgICAgLCAoZm5hbWUpID0+XG4gICAgICAgIGlmIGZuYW1lP1xuICAgICAgICAgIEBzZW5kICdzYXZlJywgZm5hbWUsIHRyaWdnZXJzXG4gICAgICAgIGVsc2VcbiAgICAgICAgICBNZHNXaW5kb3cuYXBwV2lsbFF1aXQgPSBmYWxzZVxuXG4gICAgd3JpdGVGaWxlOiAoZmlsZU5hbWUsIGRhdGEsIHRyaWdnZXJzID0ge30pIC0+XG4gICAgICBmcy53cml0ZUZpbGUgZmlsZU5hbWUsIGRhdGEsIChlcnIpID0+XG4gICAgICAgIHVubGVzcyBlcnJcbiAgICAgICAgICBjb25zb2xlLmxvZyBcIldyaXRlIGZpbGUgdG8gI3tmaWxlTmFtZX0uXCJcbiAgICAgICAgICAjIGRlbGV0ZSBtYXJrZG93biAjIGFuZCAtLS1cbiAgICAgICAgICAjIGlmKHR5cGVvZiBkYXRhID09ICdzdHJpbmcnKVxuICAgICAgICAgICAgIyB0bXAgID0gZGF0YVxuICAgICAgICAgICAgIyB0bXAgPSB0bXAucmVwbGFjZSgvLS0tL2csICcnKVxuICAgICAgICAgICAgIyB0bXAgPSB0bXAucmVwbGFjZSgvXFxuL2csICcnKVxuICAgICAgICAgICAgIyB0bXAgPSB0bXAucmVwbGFjZSgvXiMjIyMjIy9nLCcnKVxuICAgICAgICAgICAgIyB0bXAgPSB0bXAucmVwbGFjZSgvXiMjIyMjL2csJycpXG4gICAgICAgICAgICAjIHRtcCA9IHRtcC5yZXBsYWNlKC9eIyMjIy9nLCcnKVxuICAgICAgICAgICAgIyB0bXAgPSB0bXAucmVwbGFjZSgvXiMjIy9nLCcnKVxuICAgICAgICAgICAgIyB0bXAgPSB0bXAucmVwbGFjZSgvXiMjL2csJycpXG4gICAgICAgICAgICAjIHRtcCA9IHRtcC5yZXBsYWNlKC9eIy9nLCcnKVxuICAgICAgICAgICAgIyBpbnB1dCA9IFtdXG4gICAgICAgICAgICAjIGlucHV0LnB1c2godG1wKVxuICAgICAgICAgICAgIyBjb25zb2xlLmxvZyBpbnB1dFxuICAgICAgICAgICAgIyBmaWxlTmFtZUxpc3QgPSBmaWxlTmFtZS5zcGxpdCgnLycpXG4gICAgICAgICAgICAjIGZpbGUgPSBmaWxlTmFtZUxpc3RbZmlsZU5hbWVMaXN0Lmxlbmd0aC0xXVxuICAgICAgICAgICAgIyBjb25zb2xlLmxvZyBmaWxlXG5cbiAgICAgICAgICAgICMgIyBweXRob24g44OX44Ot44K744K555Sf5oiQ44CB44Gd44GX44Gm57WQ5p6c44KS5Y+X44GR5Y+W44KLXG4gICAgICAgICAgICAjIHNwYXduID0gcmVxdWlyZSgnY2hpbGRfcHJvY2VzcycpLnNwYXduXG4gICAgICAgICAgICAjIHB5ICAgID0gc3Bhd24oJ3B5dGhvbicsIFtcIiN7X19kaXJuYW1lfS8uLi8uLi9jb21wdXRlX2lucHV0LnB5XCJdKVxuICAgICAgICAgICAgIyBkYXRhU3RyaW5nID0gJydcblxuICAgICAgICAgICAgIyBweS5zdGRvdXQub24gJ2RhdGEnLCAoZGF0YSkgPT5cbiAgICAgICAgICAgICMgICBkYXRhU3RyaW5nICs9IGRhdGEudG9TdHJpbmcoKVxuXG4gICAgICAgICAgICAjIHB5LnN0ZG91dC5vbiAnZW5kJywgKCkgPT5cbiAgICAgICAgICAgICMgICBkYXRhU3RyaW5nID0gZGF0YVN0cmluZy5zbGljZSgyKVxuICAgICAgICAgICAgIyAgIGNvbnNvbGUubG9nIGRhdGFTdHJpbmdcbiAgICAgICAgICAgICMgICBkYXRhU3RyaW5nID0gZGF0YVN0cmluZy5zbGljZSgwLGRhdGFTdHJpbmcubGVuZ3RoLTMpXG4gICAgICAgICAgICAjICAgY29uc29sZS5sb2cgZGF0YVN0cmluZ1xuICAgICAgICAgICAgIyAgIGZpbGVwYXRoID0gUGF0aC5qb2luIFwiL1VzZXJzL2hpa2FydS9EZXNrdG9wXCIsIFwic2xpZGVcIiwgZGF0YVN0cmluZywgZmlsZVxuICAgICAgICAgICAgIyAgIGZzLndyaXRlRmlsZSBmaWxlcGF0aCwgZGF0YSwgKGVycikgPT5cbiAgICAgICAgICAgICMgICAgIGlmIGVyclxuICAgICAgICAgICAgIyAgICAgICBjb25zb2xlLmxvZyBlcnJcbiAgICAgICAgICAgICMgICAgIHVubGVzcyBlcnJcbiAgICAgICAgICAgICMgICAgICAgY29uc29sZS5sb2cgXCJXcml0ZSBmaWxlIHRvICN7ZmlsZXBhdGh9XCJcbiAgICAgICAgICAgICMgICAgICAgIyDliIbpoZ7ntZDmnpwg6Zuy44Gn6KGo56S6XG4gICAgICAgICAgICAjICAgICAgIEBjbGllbnQuc2VuZCAnc2hvdycsIHtcbiAgICAgICAgICAgICMgICAgICAgICBcInRvXCI6IFwibGFuZFwiXG4gICAgICAgICAgICAjICAgICAgICAgXCJib2R5XCI6XG4gICAgICAgICAgICAjICAgICAgICAgICBcImNvbnRlbnRcIjogZGF0YVN0cmluZ1xuICAgICAgICAgICAgIyAgICAgICB9XG5cbiAgICAgICAgICAgICMgcHkuc3RkaW4ud3JpdGUoSlNPTi5zdHJpbmdpZnkoaW5wdXQpKTtcbiAgICAgICAgICAgICMgcHkuc3RkaW4uZW5kKClcblxuICAgICAgICAgIEB0cmlnZ2VyIHRyaWdnZXJzLnN1Y2NlZWRlZCBpZiB0cmlnZ2Vycy5zdWNjZWVkZWQ/XG4gICAgICAgIGVsc2VcbiAgICAgICAgICBjb25zb2xlLmxvZyBlcnJcbiAgICAgICAgICAjIGRpYWxvZy5zaG93TWVzc2FnZUJveCBAYnJvd3NlcldpbmRvdyxcbiAgICAgICAgICAjICAgdHlwZTogJ2Vycm9yJ1xuICAgICAgICAgICMgICBidXR0b25zOiBbJ09LJ11cbiAgICAgICAgICAjICAgdGl0bGU6ICdNYXJwJ1xuICAgICAgICAgICMgICBtZXNzYWdlOiBcIk1hcnAgY2Fubm90IHdyaXRlIHRoZSBmaWxlIHRvICN7ZmlsZU5hbWV9LlwiXG4gICAgICAgICAgIyAgIGRldGFpbDogZXJyLnRvU3RyaW5nKClcblxuICAgICAgICAgIE1kc1dpbmRvdy5hcHBXaWxsUXVpdCA9IGZhbHNlXG4gICAgICAgICAgQHRyaWdnZXIgdHJpZ2dlcnMuZmFpbGVkLCBlcnIgaWYgdHJpZ2dlcnMuZmFpbGVkP1xuXG4gICAgICAgIEB0cmlnZ2VyIHRyaWdnZXJzLmZpbmFsaXplZCBpZiB0cmlnZ2Vycy5maW5hbGl6ZWQ/XG5cbiAgICBmb3JjZUNsb3NlOiAtPiBAYnJvd3NlcldpbmRvdy5kZXN0cm95KClcblxuICAgIGV4cG9ydFBkZkRpYWxvZzogLT5cbiAgICAgIHJldHVybiBpZiBAZnJlZXplXG4gICAgICBkaWFsb2cuc2hvd1NhdmVEaWFsb2cgQGJyb3dzZXJXaW5kb3csXG4gICAgICAgIHRpdGxlOiAnRXhwb3J0IHRvIFBERi4uLidcbiAgICAgICAgZmlsdGVyczogW3sgbmFtZTogJ1BERiBmaWxlJywgZXh0ZW5zaW9uczogWydwZGYnXSB9XVxuICAgICAgLCAoZm5hbWUpID0+XG4gICAgICAgIHJldHVybiB1bmxlc3MgZm5hbWU/XG4gICAgICAgIEBmcmVlemUgPSB0cnVlXG4gICAgICAgIEBzZW5kICdwdWJsaXNoUGRmJywgZm5hbWVcblxuICAgIGluaXRpYWxpemVTdGF0ZTogKGZpbGVQYXRoID0gbnVsbCwgY2hhbmdlZCA9IGZhbHNlKSAtPlxuICAgICAgQHBhdGggPSBmaWxlUGF0aFxuICAgICAgQHRyaWdnZXIgJ3NldENoYW5nZWRTdGF0dXMnLCBjaGFuZ2VkXG5cbiAgICAgIGRpciA9IGlmIGZpbGVQYXRoIHRoZW4gXCIje1BhdGguZGlybmFtZShmaWxlUGF0aCl9I3tQYXRoLnNlcH1cIiBlbHNlIG51bGxcbiAgICAgIEBzZW5kICdzZXRJbWFnZURpcmVjdG9yeScsIGRpclxuXG4gICAgICBAbWVudS51cGRhdGVNZW51KClcblxuICAgIHNldENoYW5nZWRTdGF0dXM6IChjaGFuZ2VkKSAtPlxuICAgICAgQGNoYW5nZWQgPSAhIWNoYW5nZWRcbiAgICAgIEByZWZyZXNoVGl0bGUoKVxuXG4gICAgdmlld01vZGU6IChtb2RlKSAtPlxuICAgICAgZ2xvYmFsLm1hcnAuY29uZmlnLnNldCgndmlld01vZGUnLCBtb2RlKVxuICAgICAgZ2xvYmFsLm1hcnAuY29uZmlnLnNhdmUoKVxuXG4gICAgICBAc2VuZCAndmlld01vZGUnLCBtb2RlXG5cbiAgICAgIEBtZW51LnN0YXRlcy52aWV3TW9kZSA9IG1vZGVcbiAgICAgIEBtZW51LnVwZGF0ZU1lbnUoKVxuXG4gICAgdGhlbWVDaGFuZ2VkOiAodGhlbWUpIC0+XG4gICAgICBAbWVudS5zdGF0ZXMudGhlbWUgPSB0aGVtZVxuICAgICAgQG1lbnUudXBkYXRlTWVudSgpXG5cbiAgICB1bmZyZWV6ZTogLT5cbiAgICAgIEBmcmVlemUgPSBmYWxzZVxuICAgICAgQHNlbmQgJ3VuZnJlZXplZCdcblxuICByZWZyZXNoVGl0bGU6ID0+XG4gICAgaWYgcHJvY2Vzcy5wbGF0Zm9ybSA9PSAnZGFyd2luJ1xuICAgICAgQGJyb3dzZXJXaW5kb3c/LnNldFRpdGxlIFwiI3tAZ2V0U2hvcnRQYXRoKCl9I3tpZiBAY2hhbmdlZCB0aGVuICcgKicgZWxzZSAnJ31cIlxuICAgICAgQGJyb3dzZXJXaW5kb3c/LnNldFJlcHJlc2VudGVkRmlsZW5hbWUgQHBhdGggfHwgJydcbiAgICAgIEBicm93c2VyV2luZG93Py5zZXREb2N1bWVudEVkaXRlZCBAY2hhbmdlZFxuICAgIGVsc2VcbiAgICAgIEBicm93c2VyV2luZG93Py5zZXRUaXRsZSBcIiN7QG9wdGlvbnM/LnRpdGxlIHx8ICdNYXJwJ30gLSAje0BnZXRTaG9ydFBhdGgoKX0je2lmIEBjaGFuZ2VkIHRoZW4gJyAqJyBlbHNlICcnfVwiXG5cbiAgZ2V0U2hvcnRQYXRoOiA9PlxuICAgIHJldHVybiAnKHVudGl0bGVkKScgdW5sZXNzIEBwYXRoP1xuICAgIEBwYXRoLnJlcGxhY2UoL1xcXFwvZywgJy8nKS5yZXBsYWNlKC8uKlxcLy8sICcnKVxuXG4gIHVwZGF0ZVJlc291cmNlU3RhdGU6ID0+XG4gICAgbmV3U3RhdGUgPSBpZiBAX3dhdGNoaW5nUmVzb3VyY2VzLnNpemUgPD0gMCB0aGVuICdsb2FkZWQnIGVsc2UgJ2xvYWRpbmcnXG4gICAgQHNlbmQgJ3Jlc291cmNlU3RhdGUnLCBuZXdTdGF0ZSBpZiBAcmVzb3VyY2VTdGF0ZSBpc250IG5ld1N0YXRlXG5cbiAgICBAcmVzb3VyY2VTdGF0ZSA9IG5ld1N0YXRlXG5cbiAgaXNPcGVuOiA9PiBAX2lzT3BlblxuICBfc2V0SXNPcGVuOiAoc3RhdGUpID0+XG4gICAgQF9pc09wZW4gPSAhIXN0YXRlXG5cbiAgICBpZiBAX2lzT3BlblxuICAgICAgTWRzTWFuYWdlci5hZGRXaW5kb3cgQF93aW5kb3dfaWQsIEBcbiAgICBlbHNlXG4gICAgICBNZHNNYW5hZ2VyLnJlbW92ZVdpbmRvdyBAX3dpbmRvd19pZFxuXG4gICAgcmV0dXJuIEBfaXNPcGVuXG5cbiAgaXNCdWZmZXJFbXB0eTogPT4gIUBwYXRoIGFuZCBub3QgQGNoYW5nZWRcblxuICBzZW5kOiAoZXZ0LCBhcmdzLi4uKSA9PlxuICAgIHJldHVybiBmYWxzZSB1bmxlc3MgQF93aW5kb3dMb2FkZWQgYW5kIEBicm93c2VyV2luZG93P1xuICAgIEBicm93c2VyV2luZG93LndlYkNvbnRlbnRzLnNlbmQgJ01kc01hbmFnZXJTZW5kRXZlbnQnLCBldnQsIHsgZnJvbTogbnVsbCwgdG86IEBfd2luZG93X2lkIH0sIGFyZ3NcbiJdfQ==
