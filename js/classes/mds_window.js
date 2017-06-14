var BrowserWindow, MdsFileHistory, MdsMainMenu, MdsManager, MdsMenu, MdsWindow, Path, dialog, extend, fs, iconv_lite, jschardet, ref,
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

module.exports = MdsWindow = (function() {
  MdsWindow.appWillQuit = false;

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
        title: 'Marp',
        message: 'Are you sure?',
        detail: 'You will lose your changes on Marp. Reopen anyway?'
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
            dialog.showMessageBox(_this.browserWindow, {
              type: 'error',
              buttons: ['OK'],
              title: 'Marp',
              message: "Marp cannot write the file to " + fileName + ".",
              detail: err.toString()
            });
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xhc3Nlcy9tZHNfd2luZG93LmpzIiwic291cmNlcyI6WyJjbGFzc2VzL21kc193aW5kb3cuY29mZmVlIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLElBQUEsZ0lBQUE7RUFBQTs7O0FBQUEsTUFBMEIsT0FBQSxDQUFRLFVBQVIsQ0FBMUIsRUFBQyxpQ0FBRCxFQUFnQjs7QUFFaEIsVUFBQSxHQUFpQixPQUFBLENBQVEsZUFBUjs7QUFDakIsT0FBQSxHQUFpQixPQUFBLENBQVEsWUFBUjs7QUFDakIsV0FBQSxHQUFpQixPQUFBLENBQVEsaUJBQVI7O0FBQ2pCLGNBQUEsR0FBaUIsT0FBQSxDQUFRLG9CQUFSOztBQUNqQixNQUFBLEdBQWlCLE9BQUEsQ0FBUSxRQUFSOztBQUNqQixFQUFBLEdBQWlCLE9BQUEsQ0FBUSxJQUFSOztBQUNqQixTQUFBLEdBQWlCLE9BQUEsQ0FBUSxXQUFSOztBQUNqQixVQUFBLEdBQWlCLE9BQUEsQ0FBUSxZQUFSOztBQUNqQixJQUFBLEdBQWlCLE9BQUEsQ0FBUSxNQUFSOztBQUVqQixNQUFNLENBQUMsT0FBUCxHQUF1QjtFQUNyQixTQUFDLENBQUEsV0FBRCxHQUFjOztFQUVkLFNBQUMsQ0FBQSxVQUFELEdBQWEsU0FBQTtXQUNYO01BQUEsS0FBQSxFQUFRLFVBQVI7TUFDQSxJQUFBLEVBQVEsS0FEUjtNQUVBLENBQUEsRUFBUSxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFuQixDQUF1QixrQkFBdkIsQ0FGUjtNQUdBLENBQUEsRUFBUSxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFuQixDQUF1QixrQkFBdkIsQ0FIUjtNQUlBLEtBQUEsRUFBUSxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFuQixDQUF1QixzQkFBdkIsQ0FKUjtNQUtBLE1BQUEsRUFBUSxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFuQixDQUF1Qix1QkFBdkIsQ0FMUjs7RUFEVzs7c0JBU2IsYUFB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LFNBQUE7V0FBRyxJQUFDLENBQUE7RUFBSjs7c0JBQ1IsVUFBQSxHQUFZLFNBQUMsS0FBRDtJQUNWLElBQUMsQ0FBQSxPQUFELEdBQVcsQ0FBQyxDQUFDO0lBRWIsSUFBRyxJQUFDLENBQUEsT0FBSjtNQUNFLFVBQVUsQ0FBQyxTQUFYLENBQXFCLElBQUMsQ0FBQSxVQUF0QixFQUFrQyxJQUFsQyxFQURGO0tBQUEsTUFBQTtNQUdFLFVBQVUsQ0FBQyxZQUFYLENBQXdCLElBQUMsQ0FBQSxVQUF6QixFQUhGOztBQUtBLFdBQU8sSUFBQyxDQUFBO0VBUkU7O3NCQVVaLGFBQUEsR0FBZSxTQUFBO1dBQUcsQ0FBQyxJQUFDLENBQUEsSUFBRixJQUFXLENBQUksSUFBQyxDQUFBO0VBQW5COztzQkFFZixJQUFBLEdBQU0sU0FBQTtBQUNKLFFBQUE7SUFESyxvQkFBSztJQUNWLElBQUEsQ0FBQSxDQUFvQixJQUFDLENBQUEsYUFBRCxJQUFtQiw0QkFBdkMsQ0FBQTtBQUFBLGFBQU8sTUFBUDs7V0FDQSxJQUFDLENBQUEsYUFBYSxDQUFDLFdBQVcsQ0FBQyxJQUEzQixDQUFnQyxxQkFBaEMsRUFBdUQsR0FBdkQsRUFBNEQ7TUFBRSxJQUFBLEVBQU0sSUFBUjtNQUFjLEVBQUEsRUFBSSxJQUFDLENBQUEsVUFBbkI7S0FBNUQsRUFBNkYsSUFBN0Y7RUFGSSIsInNvdXJjZXNDb250ZW50IjpbIntCcm93c2VyV2luZG93LCBkaWFsb2d9ID0gcmVxdWlyZSAnZWxlY3Ryb24nXG5cbk1kc01hbmFnZXIgICAgID0gcmVxdWlyZSAnLi9tZHNfbWFuYWdlcidcbk1kc01lbnUgICAgICAgID0gcmVxdWlyZSAnLi9tZHNfbWVudSdcbk1kc01haW5NZW51ICAgID0gcmVxdWlyZSAnLi9tZHNfbWFpbl9tZW51J1xuTWRzRmlsZUhpc3RvcnkgPSByZXF1aXJlICcuL21kc19maWxlX2hpc3RvcnknXG5leHRlbmQgICAgICAgICA9IHJlcXVpcmUgJ2V4dGVuZCdcbmZzICAgICAgICAgICAgID0gcmVxdWlyZSAnZnMnXG5qc2NoYXJkZXQgICAgICA9IHJlcXVpcmUgJ2pzY2hhcmRldCdcbmljb252X2xpdGUgICAgID0gcmVxdWlyZSAnaWNvbnYtbGl0ZSdcblBhdGggICAgICAgICAgID0gcmVxdWlyZSAncGF0aCdcblxubW9kdWxlLmV4cG9ydHMgPSBjbGFzcyBNZHNXaW5kb3dcbiAgQGFwcFdpbGxRdWl0OiBmYWxzZVxuXG4gIEBkZWZPcHRpb25zOiAoKSAtPlxuICAgIHRpdGxlOiAgJ0VsZWN0cm9uJ1xuICAgIHNob3c6ICAgZmFsc2VcbiAgICB4OiAgICAgIGdsb2JhbC5tYXJwLmNvbmZpZy5nZXQgJ3dpbmRvd1Bvc2l0aW9uLngnXG4gICAgeTogICAgICBnbG9iYWwubWFycC5jb25maWcuZ2V0ICd3aW5kb3dQb3NpdGlvbi55J1xuICAgIHdpZHRoOiAgZ2xvYmFsLm1hcnAuY29uZmlnLmdldCAnd2luZG93UG9zaXRpb24ud2lkdGgnXG4gICAgaGVpZ2h0OiBnbG9iYWwubWFycC5jb25maWcuZ2V0ICd3aW5kb3dQb3NpdGlvbi5oZWlnaHQnXG4gICAgIyBpY29uOiAgIFBhdGguam9pbihfX2Rpcm5hbWUsICcvLi4vLi4vaW1hZ2VzL21hcnAucG5nJylcblxuICBicm93c2VyV2luZG93OiBudWxsXG4gIHBhdGg6IG51bGxcbiAgY2hhbmdlZDogZmFsc2VcbiAgZnJlZXplOiBmYWxzZVxuICByZXNvdXJjZVN0YXRlOiBudWxsXG5cbiAgX2Nsb3NlQ29uZmlybWVkOiBmYWxzZVxuICBfd2F0Y2hpbmdSZXNvdXJjZXM6IG5ldyBTZXRcblxuICB2aWV3TW9kZTogbnVsbFxuXG4gIGNvbnN0cnVjdG9yOiAoZmlsZU9wdHMgPSB7fSwgQG9wdGlvbnMgPSB7fSkgLT5cbiAgICBAcGF0aCA9IGZpbGVPcHRzPy5wYXRoIHx8IG51bGxcblxuICAgICMgQHZpZXdNb2RlID0gZ2xvYmFsLm1hcnAuY29uZmlnLmdldCgndmlld01vZGUnKVxuICAgIEB2aWV3TW9kZSA9ICdzY3JlZW4nXG5cbiAgICBAYnJvd3NlcldpbmRvdyA9IGRvID0+XG4gICAgICAjIOWIneacn+ioreWumm9wdGlvbnMg44GoIEBvcHRpb25zIOOCkuODnuODvOOCuOOBl+OBpuWIneacn+WMluOAgeOCpuOCpOODs+ODieOCpklE6Kit5a6aXG4gICAgICBidyA9IG5ldyBCcm93c2VyV2luZG93IGV4dGVuZCh0cnVlLCB7fSwgTWRzV2luZG93LmRlZk9wdGlvbnMoKSwgQG9wdGlvbnMsXG4gICAgICB7XG4gICAgICAndGl0bGVCYXJTdHlsZSc6ICdoaWRkZW4nLCAj44OY44OD44OA44O844OQ44O844KS6YCP5piO44Gr44GX44CB44Oc44K/44Oz44Gg44GR6KGo56S6XG4gICAgICAnYWNjZXB0Rmlyc3RNb3VzZSc6IHRydWVcbiAgICAgIH0pXG4gICAgICBAX3dpbmRvd19pZCA9IGJ3LmlkXG5cbiAgICAgIGxvYWRDbXAgPSAoZGV0YWlscykgPT5cbiAgICAgICAgc2V0VGltZW91dCA9PlxuICAgICAgICAgIEBfd2F0Y2hpbmdSZXNvdXJjZXMuZGVsZXRlKGRldGFpbHMuaWQpXG4gICAgICAgICAgQHVwZGF0ZVJlc291cmNlU3RhdGUoKVxuICAgICAgICAsIDUwMFxuICAgICAgIyBhYm91dCB3ZWJSZXF1ZXN0XG4gICAgICAjIGRldGFpbHMgb2JqZWN0IGRlc2NyaWJlcyByZXF1ZXN0XG4gICAgICAjIFRoZSBmaWx0ZXIgb2JqZWN0IGhhcyBhIHVybHMgcHJvcGVydHkgd2hpY2ggaXMgYW4gQXJyYXkgb2YgVVJMIHBhdHRlcm5zLVxuICAgICAgIyAtdGhhdCB3aWxsIGJlIHVzZWQgdG8gZmlsdGVyIG91dCB0aGUgcmVxdWVzdHMgdGhhdCBkbyBub3QgbWF0Y2ggdGhlIFVSTCBwYXR0ZXJucy5cbiAgICAgICMgSWYgdGhlIGZpbHRlciBpcyBvbWl0dGVkIHRoZW4gYWxsIHJlcXVlc3RzIHdpbGwgYmUgbWF0Y2hlZC5cbiAgICAgIGJ3LndlYkNvbnRlbnRzLnNlc3Npb24ud2ViUmVxdWVzdC5vbkNvbXBsZXRlZCBsb2FkQ21wXG4gICAgICBidy53ZWJDb250ZW50cy5zZXNzaW9uLndlYlJlcXVlc3Qub25FcnJvck9jY3VycmVkIGxvYWRDbXBcbiAgICAgIGJ3LndlYkNvbnRlbnRzLnNlc3Npb24ud2ViUmVxdWVzdC5vbkJlZm9yZVJlcXVlc3QgKGRldGFpbHMsIGNhbGxiYWNrKSA9PlxuICAgICAgICBAX3dhdGNoaW5nUmVzb3VyY2VzLmFkZChkZXRhaWxzLmlkKVxuICAgICAgICBAdXBkYXRlUmVzb3VyY2VTdGF0ZSgpXG4gICAgICAgIGNhbGxiYWNrKHt9KVxuXG4gICAgICBAbWVudSA9IG5ldyBNZHNNYWluTWVudVxuICAgICAgICB3aW5kb3c6IGJ3XG4gICAgICAgIGRldmVsb3BtZW50OiBnbG9iYWwubWFycC5kZXZlbG9wbWVudFxuICAgICAgICB2aWV3TW9kZTogQHZpZXdNb2RlXG5cbiAgICAgIGJ3Lm1heGltaXplKCkgaWYgZ2xvYmFsLm1hcnAuY29uZmlnLmdldCAnd2luZG93UG9zaXRpb24ubWF4aW1pemVkJ1xuXG4gICAgICBidy5sb2FkVVJMIFwiZmlsZTovLyN7X19kaXJuYW1lfS8uLi8uLi9pbmRleC5odG1sIyN7QF93aW5kb3dfaWR9XCJcblxuICAgICAgYncud2ViQ29udGVudHMub24gJ2RpZC1maW5pc2gtbG9hZCcsID0+XG4gICAgICAgIEBfd2luZG93TG9hZGVkID0gdHJ1ZVxuICAgICAgICBAc2VuZCAnc2V0U3BsaXR0ZXInLCBnbG9iYWwubWFycC5jb25maWcuZ2V0KCdzcGxpdHRlclBvc2l0aW9uJylcbiAgICAgICAgQHNlbmQgJ3NldEVkaXRvckNvbmZpZycsIGdsb2JhbC5tYXJwLmNvbmZpZy5nZXQoJ2VkaXRvcicpXG4gICAgICAgIEB0cmlnZ2VyICdsb2FkJywgZmlsZU9wdHM/LmJ1ZmZlciB8fCAnJywgQHBhdGhcblxuICAgICAgYncub25jZSAncmVhZHktdG8tc2hvdycsID0+IGJ3LnNob3coKVxuXG4gICAgICBidy5vbiAnY2xvc2UnLCAoZSkgPT5cbiAgICAgICAgaWYgQGZyZWV6ZVxuICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKVxuICAgICAgICAgIE1kc1dpbmRvdy5hcHBXaWxsUXVpdCA9IGZhbHNlXG4gICAgICAgICAgcmV0dXJuXG5cbiAgICAgICAgIyB3aGVuIGNsb3NlIHdpbmRvdywgd2F3cm5pbmcgZGlhbG9nIGlzIHNob3duXG4gICAgICAgICMgaWYgQGNoYW5nZWRcbiAgICAgICAgIyAgIGUucHJldmVudERlZmF1bHQoKVxuICAgICAgICAjICAgZGlhbG9nLnNob3dNZXNzYWdlQm94IEBicm93c2VyV2luZG93LFxuICAgICAgICAjICAgICB0eXBlOiAncXVlc3Rpb24nXG4gICAgICAgICMgICAgIGJ1dHRvbnM6IFsnWWVzJywgJ05vJywgJ0NhbmNlbCddXG4gICAgICAgICMgICAgIHRpdGxlOiAnTWFycCdcbiAgICAgICAgIyAgICAgbWVzc2FnZTogJ0FyZSB5b3Ugc3VyZT8nXG4gICAgICAgICMgICAgIGRldGFpbDogXCIje0BnZXRTaG9ydFBhdGgoKX0gaGFzIGJlZW4gbW9kaWZpZWQuIERvIHlvdSB3YW50IHRvIHNhdmUgdGhlIGNoYW5nZXM/XCJcbiAgICAgICAgIyAgICAgY2FuY2VsSWQ6IDJcbiAgICAgICAgIyAgICwgKHJlc3VsdCkgPT5cbiAgICAgICAgIyAgICAgIyBXcmFwIGJ5IHNldFRpbWVvdXQgdG8gYXZvaWQgYXBwIHRlcm1pbmF0aW9uIHVuZXhwZWN0ZWRseSBvbiBMaW51eC5cbiAgICAgICAgIyAgICAgc3dpdGNoIHJlc3VsdFxuICAgICAgICAjICAgICAgIHdoZW4gMCB0aGVuIHNldFRpbWVvdXQgKD0+IEB0cmlnZ2VyICdzYXZlJywgJ2ZvcmNlQ2xvc2UnKSwgMFxuICAgICAgICAjICAgICAgIHdoZW4gMSB0aGVuIHNldFRpbWVvdXQgKD0+IEB0cmlnZ2VyICdmb3JjZUNsb3NlJyksIDBcbiAgICAgICAgIyAgICAgICBlbHNlXG4gICAgICAgICMgICAgICAgICBNZHNXaW5kb3cuYXBwV2lsbFF1aXQgPSBmYWxzZVxuXG4gICAgICBidy5vbiAnY2xvc2VkJywgPT5cbiAgICAgICAgQGJyb3dzZXJXaW5kb3cgPSBudWxsXG4gICAgICAgIEBfc2V0SXNPcGVuIGZhbHNlXG5cbiAgICAgIHVwZGF0ZVdpbmRvd1Bvc2l0aW9uID0gKGUpID0+XG4gICAgICAgIHVubGVzcyBnbG9iYWwubWFycC5jb25maWcuc2V0KCd3aW5kb3dQb3NpdGlvbi5tYXhpbWl6ZWQnLCBidy5pc01heGltaXplZCgpKVxuICAgICAgICAgIGdsb2JhbC5tYXJwLmNvbmZpZy5tZXJnZSB7IHdpbmRvd1Bvc2l0aW9uOiBidy5nZXRCb3VuZHMoKSB9XG5cbiAgICAgIGJ3Lm9uICdtb3ZlJywgdXBkYXRlV2luZG93UG9zaXRpb25cbiAgICAgIGJ3Lm9uICdyZXNpemUnLCB1cGRhdGVXaW5kb3dQb3NpdGlvblxuICAgICAgYncub24gJ21heGltaXplJywgdXBkYXRlV2luZG93UG9zaXRpb25cbiAgICAgIGJ3Lm9uICd1bm1heGltaXplJywgdXBkYXRlV2luZG93UG9zaXRpb25cblxuXG5cblxuICAgICAgYncubWRzV2luZG93ID0gQFxuICAgICAgYndcblxuICAgIEBfc2V0SXNPcGVuIHRydWVcblxuICBAbG9hZEZyb21GaWxlOiAoZm5hbWUsIG1kc1dpbmRvdywgb3B0aW9ucyA9IHt9KSAtPlxuICAgIGZzLnJlYWRGaWxlIGZuYW1lLCAoZXJyLCB0eHQpID0+XG4gICAgICByZXR1cm4gaWYgZXJyXG5cbiAgICAgIGVuY29kaW5nID0gb3B0aW9ucz8uZW5jb2RpbmcgfHwganNjaGFyZGV0LmRldGVjdCh0eHQpPy5lbmNvZGluZ1xuICAgICAgYnVmID0gaWYgZW5jb2RpbmcgaXNudCAnVVRGLTgnIGFuZCBlbmNvZGluZyBpc250ICdhc2NpaScgYW5kIGljb252X2xpdGUuZW5jb2RpbmdFeGlzdHMoZW5jb2RpbmcpXG4gICAgICAgIGljb252X2xpdGUuZGVjb2RlKHR4dCwgZW5jb2RpbmcpXG4gICAgICBlbHNlXG4gICAgICAgIHR4dC50b1N0cmluZygpXG5cbiAgICAgICMgaWdub3Jl44GX44Gq44GE5aC05ZCIIGZpbGVOYW1lIOOCkiBmaWxlSGlzdHJ544CA44GrcHVzaOOBl+OAgeOBmeOBueOBpuOBruOCpuOCpOODs+ODieOCpuOBruODoeODi+ODpeODvOabtOaWsFxuICAgICAgdW5sZXNzIG9wdGlvbnM/Lmlnbm9yZVJlY2VudFxuICAgICAgICBNZHNGaWxlSGlzdG9yeS5wdXNoIGZuYW1lXG4gICAgICAgIE1kc01haW5NZW51LnVwZGF0ZU1lbnVUb0FsbCgpXG5cbiAgICAgICMg44Km44Kk44Oz44OJ44Km44GM5a2Y5Zyo44GX44CB44GL44Gk44CBb3ZlcnJpZGXjgb7jgZ/jga/jgqbjgqTjg7Pjg4njgqbjga7jg5Djg4Pjg5XjgqHjgYznqbrjgIHjgafjgYLjgovjgajjgY1cbiAgICAgIGlmIG1kc1dpbmRvdz8gYW5kIChvcHRpb25zPy5vdmVycmlkZSBvciBtZHNXaW5kb3cuaXNCdWZmZXJFbXB0eSgpKVxuICAgICAgICBtZHNXaW5kb3cudHJpZ2dlciAnbG9hZCcsIGJ1ZiwgZm5hbWVcblxuICAgICAgIyDjgqbjgqTjg7Pjg4njgqbliJ3mnJ/ljJbjgIBwYXJhbSA9IGZpbGVPcHRz44CA44GnIGZpbGVPcHRzID0geyBwYXRoOiBmbmFtZSwgYnVmZmVyOiBidWYgfVxuICAgICAgIyDnrKzkuozlvJXmlbDjga/jgarjgZcgLT4gQG9wdGlvbnMgPSB7fVxuICAgICAgZWxzZVxuICAgICAgICBuZXcgTWRzV2luZG93IHsgcGF0aDogZm5hbWUsIGJ1ZmZlcjogYnVmIH1cblxuICBsb2FkRnJvbUZpbGU6IChmbmFtZSwgb3B0aW9ucyA9IHt9KSA9PiBNZHNXaW5kb3cubG9hZEZyb21GaWxlIGZuYW1lLCBALCBvcHRpb25zXG5cbiAgdHJpZ2dlcjogKGV2dCwgYXJncy4uLikgPT5cbiAgICBAZXZlbnRzW2V2dF0/LmFwcGx5KEAsIGFyZ3MpICMg5ZG844Gw44KM44KL6Zai5pWw5YaF44GudGhpc+OCkuesrOS4gOW8leaVsOOBp+aMh+WumuOBl+OBn+OCguOBruOBq+WkieOBiOOBpuOBhOOCiyjjgZ3jgozjgZ7jgozjga5NZHNXaW5kb3cpXG5cblxuICBldmVudHM6XG4gICAgcHJldmlld0luaXRpYWxpemVkOiAtPlxuICAgICAgQHRyaWdnZXIgJ3ZpZXdNb2RlJywgQHZpZXdNb2RlXG5cbiAgICBzZXRDb25maWc6IChuYW1lLCB2YWx1ZSwgaXNTYXZlID0gdHJ1ZSkgLT5cbiAgICAgIGdsb2JhbC5tYXJwLmNvbmZpZy5zZXQgbmFtZSwgdmFsdWVcbiAgICAgIGdsb2JhbC5tYXJwLmNvbmZpZy5zYXZlKCkgaWYgaXNTYXZlXG5cbiAgICBsb2FkOiAoYnVmZmVyID0gJycsIHBhdGggPSBudWxsKSAtPlxuICAgICAgQHRyaWdnZXIgJ2luaXRpYWxpemVTdGF0ZScsIHBhdGhcbiAgICAgIEBzZW5kICdsb2FkVGV4dCcsIGJ1ZmZlclxuXG4gICAgbG9hZEZyb21GaWxlOiAoZm5hbWUsIG9wdGlvbnMgPSB7fSkgLT4gQGxvYWRGcm9tRmlsZSBmbmFtZSwgb3B0aW9uc1xuXG4gICAgcmVvcGVuOiAob3B0aW9ucyA9IHt9KSAtPlxuICAgICAgcmV0dXJuIGlmIEBmcmVlemUgb3IgIUBwYXRoXG4gICAgICByZXR1cm4gaWYgQGNoYW5nZWQgYW5kIGRpYWxvZy5zaG93TWVzc2FnZUJveChAYnJvd3NlcldpbmRvdyxcbiAgICAgICAgdHlwZTogJ3F1ZXN0aW9uJ1xuICAgICAgICBidXR0b25zOiBbJ09LJywgJ0NhbmNlbCddXG4gICAgICAgIHRpdGxlOiAnTWFycCdcbiAgICAgICAgbWVzc2FnZTogJ0FyZSB5b3Ugc3VyZT8nXG4gICAgICAgIGRldGFpbDogJ1lvdSB3aWxsIGxvc2UgeW91ciBjaGFuZ2VzIG9uIE1hcnAuIFJlb3BlbiBhbnl3YXk/JylcblxuICAgICAgQGxvYWRGcm9tRmlsZSBAcGF0aCwgZXh0ZW5kKHsgb3ZlcnJpZGU6IHRydWUgfSwgb3B0aW9ucylcblxuICAgIHNhdmU6ICh0cmlnZ2VycyA9IHt9KSAtPlxuICAgICAgaWYgQHBhdGggdGhlbiBAc2VuZCgnc2F2ZScsIEBwYXRoLCB0cmlnZ2VycykgZWxzZSBAdHJpZ2dlcignc2F2ZUFzJywgdHJpZ2dlcnMpXG5cbiAgICBzYXZlQXM6ICh0cmlnZ2VycyA9IHt9KSAtPlxuICAgICAgZGlhbG9nLnNob3dTYXZlRGlhbG9nIEBicm93c2VyV2luZG93LFxuICAgICAgICB0aXRsZTogJ1NhdmUgYXMuLi4nXG4gICAgICAgIGZpbHRlcnM6IFt7IG5hbWU6ICdNYXJrZG93biBmaWxlJywgZXh0ZW5zaW9uczogWydtZCddIH1dXG4gICAgICAsIChmbmFtZSkgPT5cbiAgICAgICAgaWYgZm5hbWU/XG4gICAgICAgICAgQHNlbmQgJ3NhdmUnLCBmbmFtZSwgdHJpZ2dlcnNcbiAgICAgICAgZWxzZVxuICAgICAgICAgIE1kc1dpbmRvdy5hcHBXaWxsUXVpdCA9IGZhbHNlXG5cbiAgICB3cml0ZUZpbGU6IChmaWxlTmFtZSwgZGF0YSwgdHJpZ2dlcnMgPSB7fSkgLT5cbiAgICAgIGZzLndyaXRlRmlsZSBmaWxlTmFtZSwgZGF0YSwgKGVycikgPT5cbiAgICAgICAgdW5sZXNzIGVyclxuICAgICAgICAgIGNvbnNvbGUubG9nIFwiV3JpdGUgZmlsZSB0byAje2ZpbGVOYW1lfS5cIlxuICAgICAgICAgIEB0cmlnZ2VyIHRyaWdnZXJzLnN1Y2NlZWRlZCBpZiB0cmlnZ2Vycy5zdWNjZWVkZWQ/XG4gICAgICAgIGVsc2VcbiAgICAgICAgICBjb25zb2xlLmxvZyBlcnJcbiAgICAgICAgICBkaWFsb2cuc2hvd01lc3NhZ2VCb3ggQGJyb3dzZXJXaW5kb3csXG4gICAgICAgICAgICB0eXBlOiAnZXJyb3InXG4gICAgICAgICAgICBidXR0b25zOiBbJ09LJ11cbiAgICAgICAgICAgIHRpdGxlOiAnTWFycCdcbiAgICAgICAgICAgIG1lc3NhZ2U6IFwiTWFycCBjYW5ub3Qgd3JpdGUgdGhlIGZpbGUgdG8gI3tmaWxlTmFtZX0uXCJcbiAgICAgICAgICAgIGRldGFpbDogZXJyLnRvU3RyaW5nKClcblxuICAgICAgICAgIE1kc1dpbmRvdy5hcHBXaWxsUXVpdCA9IGZhbHNlXG4gICAgICAgICAgQHRyaWdnZXIgdHJpZ2dlcnMuZmFpbGVkLCBlcnIgaWYgdHJpZ2dlcnMuZmFpbGVkP1xuXG4gICAgICAgIEB0cmlnZ2VyIHRyaWdnZXJzLmZpbmFsaXplZCBpZiB0cmlnZ2Vycy5maW5hbGl6ZWQ/XG5cbiAgICBmb3JjZUNsb3NlOiAtPiBAYnJvd3NlcldpbmRvdy5kZXN0cm95KClcblxuICAgIGV4cG9ydFBkZkRpYWxvZzogLT5cbiAgICAgIHJldHVybiBpZiBAZnJlZXplXG4gICAgICBkaWFsb2cuc2hvd1NhdmVEaWFsb2cgQGJyb3dzZXJXaW5kb3csXG4gICAgICAgIHRpdGxlOiAnRXhwb3J0IHRvIFBERi4uLidcbiAgICAgICAgZmlsdGVyczogW3sgbmFtZTogJ1BERiBmaWxlJywgZXh0ZW5zaW9uczogWydwZGYnXSB9XVxuICAgICAgLCAoZm5hbWUpID0+XG4gICAgICAgIHJldHVybiB1bmxlc3MgZm5hbWU/XG4gICAgICAgIEBmcmVlemUgPSB0cnVlXG4gICAgICAgIEBzZW5kICdwdWJsaXNoUGRmJywgZm5hbWVcblxuICAgIGluaXRpYWxpemVTdGF0ZTogKGZpbGVQYXRoID0gbnVsbCwgY2hhbmdlZCA9IGZhbHNlKSAtPlxuICAgICAgQHBhdGggPSBmaWxlUGF0aFxuICAgICAgQHRyaWdnZXIgJ3NldENoYW5nZWRTdGF0dXMnLCBjaGFuZ2VkXG5cbiAgICAgIGRpciA9IGlmIGZpbGVQYXRoIHRoZW4gXCIje1BhdGguZGlybmFtZShmaWxlUGF0aCl9I3tQYXRoLnNlcH1cIiBlbHNlIG51bGxcbiAgICAgIEBzZW5kICdzZXRJbWFnZURpcmVjdG9yeScsIGRpclxuXG4gICAgICBAbWVudS51cGRhdGVNZW51KClcblxuICAgIHNldENoYW5nZWRTdGF0dXM6IChjaGFuZ2VkKSAtPlxuICAgICAgQGNoYW5nZWQgPSAhIWNoYW5nZWRcbiAgICAgIEByZWZyZXNoVGl0bGUoKVxuXG4gICAgdmlld01vZGU6IChtb2RlKSAtPlxuICAgICAgZ2xvYmFsLm1hcnAuY29uZmlnLnNldCgndmlld01vZGUnLCBtb2RlKVxuICAgICAgZ2xvYmFsLm1hcnAuY29uZmlnLnNhdmUoKVxuXG4gICAgICBAc2VuZCAndmlld01vZGUnLCBtb2RlXG5cbiAgICAgIEBtZW51LnN0YXRlcy52aWV3TW9kZSA9IG1vZGVcbiAgICAgIEBtZW51LnVwZGF0ZU1lbnUoKVxuXG4gICAgdGhlbWVDaGFuZ2VkOiAodGhlbWUpIC0+XG4gICAgICBAbWVudS5zdGF0ZXMudGhlbWUgPSB0aGVtZVxuICAgICAgQG1lbnUudXBkYXRlTWVudSgpXG5cbiAgICB1bmZyZWV6ZTogLT5cbiAgICAgIEBmcmVlemUgPSBmYWxzZVxuICAgICAgQHNlbmQgJ3VuZnJlZXplZCdcblxuICByZWZyZXNoVGl0bGU6ID0+XG4gICAgaWYgcHJvY2Vzcy5wbGF0Zm9ybSA9PSAnZGFyd2luJ1xuICAgICAgQGJyb3dzZXJXaW5kb3c/LnNldFRpdGxlIFwiI3tAZ2V0U2hvcnRQYXRoKCl9I3tpZiBAY2hhbmdlZCB0aGVuICcgKicgZWxzZSAnJ31cIlxuICAgICAgQGJyb3dzZXJXaW5kb3c/LnNldFJlcHJlc2VudGVkRmlsZW5hbWUgQHBhdGggfHwgJydcbiAgICAgIEBicm93c2VyV2luZG93Py5zZXREb2N1bWVudEVkaXRlZCBAY2hhbmdlZFxuICAgIGVsc2VcbiAgICAgIEBicm93c2VyV2luZG93Py5zZXRUaXRsZSBcIiN7QG9wdGlvbnM/LnRpdGxlIHx8ICdNYXJwJ30gLSAje0BnZXRTaG9ydFBhdGgoKX0je2lmIEBjaGFuZ2VkIHRoZW4gJyAqJyBlbHNlICcnfVwiXG5cbiAgZ2V0U2hvcnRQYXRoOiA9PlxuICAgIHJldHVybiAnKHVudGl0bGVkKScgdW5sZXNzIEBwYXRoP1xuICAgIEBwYXRoLnJlcGxhY2UoL1xcXFwvZywgJy8nKS5yZXBsYWNlKC8uKlxcLy8sICcnKVxuXG4gIHVwZGF0ZVJlc291cmNlU3RhdGU6ID0+XG4gICAgbmV3U3RhdGUgPSBpZiBAX3dhdGNoaW5nUmVzb3VyY2VzLnNpemUgPD0gMCB0aGVuICdsb2FkZWQnIGVsc2UgJ2xvYWRpbmcnXG4gICAgQHNlbmQgJ3Jlc291cmNlU3RhdGUnLCBuZXdTdGF0ZSBpZiBAcmVzb3VyY2VTdGF0ZSBpc250IG5ld1N0YXRlXG5cbiAgICBAcmVzb3VyY2VTdGF0ZSA9IG5ld1N0YXRlXG5cbiAgaXNPcGVuOiA9PiBAX2lzT3BlblxuICBfc2V0SXNPcGVuOiAoc3RhdGUpID0+XG4gICAgQF9pc09wZW4gPSAhIXN0YXRlXG5cbiAgICBpZiBAX2lzT3BlblxuICAgICAgTWRzTWFuYWdlci5hZGRXaW5kb3cgQF93aW5kb3dfaWQsIEBcbiAgICBlbHNlXG4gICAgICBNZHNNYW5hZ2VyLnJlbW92ZVdpbmRvdyBAX3dpbmRvd19pZFxuXG4gICAgcmV0dXJuIEBfaXNPcGVuXG5cbiAgaXNCdWZmZXJFbXB0eTogPT4gIUBwYXRoIGFuZCBub3QgQGNoYW5nZWRcblxuICBzZW5kOiAoZXZ0LCBhcmdzLi4uKSA9PlxuICAgIHJldHVybiBmYWxzZSB1bmxlc3MgQF93aW5kb3dMb2FkZWQgYW5kIEBicm93c2VyV2luZG93P1xuICAgIEBicm93c2VyV2luZG93LndlYkNvbnRlbnRzLnNlbmQgJ01kc01hbmFnZXJTZW5kRXZlbnQnLCBldnQsIHsgZnJvbTogbnVsbCwgdG86IEBfd2luZG93X2lkIH0sIGFyZ3NcbiJdfQ==
