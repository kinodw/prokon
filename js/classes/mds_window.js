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
          var dataString, file, fileNameList, input, py, spawn, tmp;
          if (!err) {
            console.log("Write file to " + fileName + ".");
            tmp = data;
            tmp = tmp.replace(/---/g, '');
            tmp = tmp.replace(/\n/g, '');
            tmp = tmp.replace(/^######/g, '');
            tmp = tmp.replace(/^#####/g, '');
            tmp = tmp.replace(/^####/g, '');
            tmp = tmp.replace(/^###/g, '');
            tmp = tmp.replace(/^##/g, '');
            tmp = tmp.replace(/^#/g, '');
            input = [];
            input.push(tmp);
            console.log(input);
            fileNameList = fileName.split('/');
            file = fileNameList[fileNameList.length - 1];
            console.log(file);
            spawn = require('child_process').spawn;
            py = spawn('python', [__dirname + "/../../compute_input.py"]);
            dataString = '';
            py.stdout.on('data', function(data) {
              return dataString += data.toString();
            });
            py.stdout.on('end', function() {
              var filepath;
              dataString = dataString.slice(2);
              console.log(dataString);
              dataString = dataString.slice(0, dataString.length - 3);
              console.log(dataString);
              filepath = Path.join("/Users/hikaru/Desktop", "slide", dataString, file);
              return fs.writeFile(filepath, data, function(err) {
                if (err) {
                  console.log(err);
                }
                if (!err) {
                  console.log("Write file to " + filepath);
                  return _this.client.send('show', {
                    "to": "land",
                    "body": {
                      "content": dataString
                    }
                  });
                }
              });
            });
            py.stdin.write(JSON.stringify(input));
            py.stdin.end();
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xhc3Nlcy9tZHNfd2luZG93LmpzIiwic291cmNlcyI6WyJjbGFzc2VzL21kc193aW5kb3cuY29mZmVlIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLElBQUEsNklBQUE7RUFBQTs7O0FBQUEsTUFBMEIsT0FBQSxDQUFRLFVBQVIsQ0FBMUIsRUFBQyxpQ0FBRCxFQUFnQjs7QUFFaEIsVUFBQSxHQUFpQixPQUFBLENBQVEsZUFBUjs7QUFDakIsT0FBQSxHQUFpQixPQUFBLENBQVEsWUFBUjs7QUFDakIsV0FBQSxHQUFpQixPQUFBLENBQVEsaUJBQVI7O0FBQ2pCLGNBQUEsR0FBaUIsT0FBQSxDQUFRLG9CQUFSOztBQUNqQixNQUFBLEdBQWlCLE9BQUEsQ0FBUSxRQUFSOztBQUNqQixFQUFBLEdBQWlCLE9BQUEsQ0FBUSxJQUFSOztBQUNqQixTQUFBLEdBQWlCLE9BQUEsQ0FBUSxXQUFSOztBQUNqQixVQUFBLEdBQWlCLE9BQUEsQ0FBUSxZQUFSOztBQUNqQixJQUFBLEdBQWlCLE9BQUEsQ0FBUSxNQUFSOztBQUNqQixXQUFBLEdBQWlCLE9BQUEsQ0FBUSwyQkFBUjs7QUFFakIsTUFBTSxDQUFDLE9BQVAsR0FBdUI7RUFDckIsU0FBQyxDQUFBLFdBQUQsR0FBYzs7RUFDZCxTQUFDLENBQUEsTUFBRCxHQUFVOztFQUVWLFNBQUMsQ0FBQSxVQUFELEdBQWEsU0FBQTtXQUNYO01BQUEsS0FBQSxFQUFRLFVBQVI7TUFDQSxJQUFBLEVBQVEsS0FEUjtNQUVBLENBQUEsRUFBUSxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFuQixDQUF1QixrQkFBdkIsQ0FGUjtNQUdBLENBQUEsRUFBUSxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFuQixDQUF1QixrQkFBdkIsQ0FIUjtNQUlBLEtBQUEsRUFBUSxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFuQixDQUF1QixzQkFBdkIsQ0FKUjtNQUtBLE1BQUEsRUFBUSxNQUFNLENBQUMs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QUE7TUFHRSxVQUFVLENBQUMsWUFBWCxDQUF3QixJQUFDLENBQUEsVUFBekIsRUFIRjs7QUFLQSxXQUFPLElBQUMsQ0FBQTtFQVJFOztzQkFVWixhQUFBLEdBQWUsU0FBQTtXQUFHLENBQUMsSUFBQyxDQUFBLElBQUYsSUFBVyxDQUFJLElBQUMsQ0FBQTtFQUFuQjs7c0JBRWYsSUFBQSxHQUFNLFNBQUE7QUFDSixRQUFBO0lBREssb0JBQUs7SUFDVixJQUFBLENBQUEsQ0FBb0IsSUFBQyxDQUFBLGFBQUQsSUFBbUIsNEJBQXZDLENBQUE7QUFBQSxhQUFPLE1BQVA7O1dBQ0EsSUFBQyxDQUFBLGFBQWEsQ0FBQyxXQUFXLENBQUMsSUFBM0IsQ0FBZ0MscUJBQWhDLEVBQXVELEdBQXZELEVBQTREO01BQUUsSUFBQSxFQUFNLElBQVI7TUFBYyxFQUFBLEVBQUksSUFBQyxDQUFBLFVBQW5CO0tBQTVELEVBQTZGLElBQTdGO0VBRkkiLCJzb3VyY2VzQ29udGVudCI6WyJ7QnJvd3NlcldpbmRvdywgZGlhbG9nfSA9IHJlcXVpcmUgJ2VsZWN0cm9uJ1xuXG5NZHNNYW5hZ2VyICAgICA9IHJlcXVpcmUgJy4vbWRzX21hbmFnZXInXG5NZHNNZW51ICAgICAgICA9IHJlcXVpcmUgJy4vbWRzX21lbnUnXG5NZHNNYWluTWVudSAgICA9IHJlcXVpcmUgJy4vbWRzX21haW5fbWVudSdcbk1kc0ZpbGVIaXN0b3J5ID0gcmVxdWlyZSAnLi9tZHNfZmlsZV9oaXN0b3J5J1xuZXh0ZW5kICAgICAgICAgPSByZXF1aXJlICdleHRlbmQnXG5mcyAgICAgICAgICAgICA9IHJlcXVpcmUgJ2ZzJ1xuanNjaGFyZGV0ICAgICAgPSByZXF1aXJlICdqc2NoYXJkZXQnXG5pY29udl9saXRlICAgICA9IHJlcXVpcmUgJ2ljb252LWxpdGUnXG5QYXRoICAgICAgICAgICA9IHJlcXVpcmUgJ3BhdGgnXG5NaWNrckNsaWVudCAgICA9IHJlcXVpcmUgJy4uLy4uL21vZHVsZXMvTWlja3JDbGllbnQnXG5cbm1vZHVsZS5leHBvcnRzID0gY2xhc3MgTWRzV2luZG93XG4gIEBhcHBXaWxsUXVpdDogZmFsc2VcbiAgQGNsaWVudCA9IG51bGxcblxuICBAZGVmT3B0aW9uczogKCkgLT5cbiAgICB0aXRsZTogICdFbGVjdHJvbidcbiAgICBzaG93OiAgIGZhbHNlXG4gICAgeDogICAgICBnbG9iYWwubWFycC5jb25maWcuZ2V0ICd3aW5kb3dQb3NpdGlvbi54J1xuICAgIHk6ICAgICAgZ2xvYmFsLm1hcnAuY29uZmlnLmdldCAnd2luZG93UG9zaXRpb24ueSdcbiAgICB3aWR0aDogIGdsb2JhbC5tYXJwLmNvbmZpZy5nZXQgJ3dpbmRvd1Bvc2l0aW9uLndpZHRoJ1xuICAgIGhlaWdodDogZ2xvYmFsLm1hcnAuY29uZmlnLmdldCAnd2luZG93UG9zaXRpb24uaGVpZ2h0J1xuICAgICMgaWNvbjogICBQYXRoLmpvaW4oX19kaXJuYW1lLCAnLy4uLy4uL2ltYWdlcy9tYXJwLnBuZycpXG5cbiAgYnJvd3NlcldpbmRvdzogbnVsbFxuICBwYXRoOiBudWxsXG4gIGNoYW5nZWQ6IGZhbHNlXG4gIGZyZWV6ZTogZmFsc2VcbiAgcmVzb3VyY2VTdGF0ZTogbnVsbFxuXG4gIF9jbG9zZUNvbmZpcm1lZDogZmFsc2VcbiAgX3dhdGNoaW5nUmVzb3VyY2VzOiBuZXcgU2V0XG5cbiAgdmlld01vZGU6IG51bGxcblxuICBjb25zdHJ1Y3RvcjogKGZpbGVPcHRzID0ge30sIEBvcHRpb25zID0ge30pIC0+XG4gICAgc2V0dGluZyA9XG4gICAgICBcImlkXCI6IFwid2luZG93XCJcbiAgICAgIFwidXJsXCI6IFwid3M6Ly9hcHBzLndpc2RvbXdlYi5uZXQ6NjQyNjAvd3MvbWlrXCJcbiAgICAgIFwic2l0ZVwiOiBcInRlc3RcIlxuICAgICAgXCJ0b2tlblwiOiBcIlBhZDo5OTQ4XCJcbiAgICBAY2xpZW50ID0gbmV3IE1pY2tyQ2xpZW50KHNldHRpbmcpXG5cbiAgICBAcGF0aCA9IGZpbGVPcHRzPy5wYXRoIHx8IG51bGxcblxuICAgICMgQHZpZXdNb2RlID0gZ2xvYmFsLm1hcnAuY29uZmlnLmdldCgndmlld01vZGUnKVxuICAgIEB2aWV3TW9kZSA9ICdzY3JlZW4nXG5cbiAgICBAYnJvd3NlcldpbmRvdyA9IGRvID0+XG4gICAgICAjIOWIneacn+ioreWumm9wdGlvbnMg44GoIEBvcHRpb25zIOOCkuODnuODvOOCuOOBl+OBpuWIneacn+WMluOAgeOCpuOCpOODs+ODieOCpklE6Kit5a6aXG4gICAgICBidyA9IG5ldyBCcm93c2VyV2luZG93IGV4dGVuZCh0cnVlLCB7fSwgTWRzV2luZG93LmRlZk9wdGlvbnMoKSwgQG9wdGlvbnMsXG4gICAgICB7XG4gICAgICAndGl0bGVCYXJTdHlsZSc6ICdoaWRkZW4nLCAj44OY44OD44OA44O844OQ44O844KS6YCP5piO44Gr44GX44CB44Oc44K/44Oz44Gg44GR6KGo56S6XG4gICAgICAnYWNjZXB0Rmlyc3RNb3VzZSc6IHRydWVcbiAgICAgIH0pXG4gICAgICBAX3dpbmRvd19pZCA9IGJ3LmlkXG5cbiAgICAgIGxvYWRDbXAgPSAoZGV0YWlscykgPT5cbiAgICAgICAgc2V0VGltZW91dCA9PlxuICAgICAgICAgIEBfd2F0Y2hpbmdSZXNvdXJjZXMuZGVsZXRlKGRldGFpbHMuaWQpXG4gICAgICAgICAgQHVwZGF0ZVJlc291cmNlU3RhdGUoKVxuICAgICAgICAsIDUwMFxuICAgICAgIyBhYm91dCB3ZWJSZXF1ZXN0XG4gICAgICAjIGRldGFpbHMgb2JqZWN0IGRlc2NyaWJlcyByZXF1ZXN0XG4gICAgICAjIFRoZSBmaWx0ZXIgb2JqZWN0IGhhcyBhIHVybHMgcHJvcGVydHkgd2hpY2ggaXMgYW4gQXJyYXkgb2YgVVJMIHBhdHRlcm5zLVxuICAgICAgIyAtdGhhdCB3aWxsIGJlIHVzZWQgdG8gZmlsdGVyIG91dCB0aGUgcmVxdWVzdHMgdGhhdCBkbyBub3QgbWF0Y2ggdGhlIFVSTCBwYXR0ZXJucy5cbiAgICAgICMgSWYgdGhlIGZpbHRlciBpcyBvbWl0dGVkIHRoZW4gYWxsIHJlcXVlc3RzIHdpbGwgYmUgbWF0Y2hlZC5cbiAgICAgIGJ3LndlYkNvbnRlbnRzLnNlc3Npb24ud2ViUmVxdWVzdC5vbkNvbXBsZXRlZCBsb2FkQ21wXG4gICAgICBidy53ZWJDb250ZW50cy5zZXNzaW9uLndlYlJlcXVlc3Qub25FcnJvck9jY3VycmVkIGxvYWRDbXBcbiAgICAgIGJ3LndlYkNvbnRlbnRzLnNlc3Npb24ud2ViUmVxdWVzdC5vbkJlZm9yZVJlcXVlc3QgKGRldGFpbHMsIGNhbGxiYWNrKSA9PlxuICAgICAgICBAX3dhdGNoaW5nUmVzb3VyY2VzLmFkZChkZXRhaWxzLmlkKVxuICAgICAgICBAdXBkYXRlUmVzb3VyY2VTdGF0ZSgpXG4gICAgICAgIGNhbGxiYWNrKHt9KVxuXG4gICAgICBAbWVudSA9IG5ldyBNZHNNYWluTWVudVxuICAgICAgICB3aW5kb3c6IGJ3XG4gICAgICAgIGRldmVsb3BtZW50OiBnbG9iYWwubWFycC5kZXZlbG9wbWVudFxuICAgICAgICB2aWV3TW9kZTogQHZpZXdNb2RlXG5cbiAgICAgIGJ3Lm1heGltaXplKCkgaWYgZ2xvYmFsLm1hcnAuY29uZmlnLmdldCAnd2luZG93UG9zaXRpb24ubWF4aW1pemVkJ1xuXG4gICAgICBidy5sb2FkVVJMIFwiZmlsZTovLyN7X19kaXJuYW1lfS8uLi8uLi9pbmRleC5odG1sIyN7QF93aW5kb3dfaWR9XCJcblxuICAgICAgYncud2ViQ29udGVudHMub24gJ2RpZC1maW5pc2gtbG9hZCcsID0+XG4gICAgICAgIEBfd2luZG93TG9hZGVkID0gdHJ1ZVxuICAgICAgICBAc2VuZCAnc2V0U3BsaXR0ZXInLCBnbG9iYWwubWFycC5jb25maWcuZ2V0KCdzcGxpdHRlclBvc2l0aW9uJylcbiAgICAgICAgQHNlbmQgJ3NldEVkaXRvckNvbmZpZycsIGdsb2JhbC5tYXJwLmNvbmZpZy5nZXQoJ2VkaXRvcicpXG4gICAgICAgIEB0cmlnZ2VyICdsb2FkJywgZmlsZU9wdHM/LmJ1ZmZlciB8fCAnJywgQHBhdGhcblxuICAgICAgYncub25jZSAncmVhZHktdG8tc2hvdycsID0+IGJ3LnNob3coKVxuXG4gICAgICBidy5vbiAnY2xvc2UnLCAoZSkgPT5cbiAgICAgICAgaWYgQGZyZWV6ZVxuICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKVxuICAgICAgICAgIE1kc1dpbmRvdy5hcHBXaWxsUXVpdCA9IGZhbHNlXG4gICAgICAgICAgcmV0dXJuXG5cbiAgICAgICAgIyB3aGVuIGNsb3NlIHdpbmRvdywgd2F3cm5pbmcgZGlhbG9nIGlzIHNob3duXG4gICAgICAgICMgaWYgQGNoYW5nZWRcbiAgICAgICAgIyAgIGUucHJldmVudERlZmF1bHQoKVxuICAgICAgICAjICAgZGlhbG9nLnNob3dNZXNzYWdlQm94IEBicm93c2VyV2luZG93LFxuICAgICAgICAjICAgICB0eXBlOiAncXVlc3Rpb24nXG4gICAgICAgICMgICAgIGJ1dHRvbnM6IFsnWWVzJywgJ05vJywgJ0NhbmNlbCddXG4gICAgICAgICMgICAgIHRpdGxlOiAnTWFycCdcbiAgICAgICAgIyAgICAgbWVzc2FnZTogJ0FyZSB5b3Ugc3VyZT8nXG4gICAgICAgICMgICAgIGRldGFpbDogXCIje0BnZXRTaG9ydFBhdGgoKX0gaGFzIGJlZW4gbW9kaWZpZWQuIERvIHlvdSB3YW50IHRvIHNhdmUgdGhlIGNoYW5nZXM/XCJcbiAgICAgICAgIyAgICAgY2FuY2VsSWQ6IDJcbiAgICAgICAgIyAgICwgKHJlc3VsdCkgPT5cbiAgICAgICAgIyAgICAgIyBXcmFwIGJ5IHNldFRpbWVvdXQgdG8gYXZvaWQgYXBwIHRlcm1pbmF0aW9uIHVuZXhwZWN0ZWRseSBvbiBMaW51eC5cbiAgICAgICAgIyAgICAgc3dpdGNoIHJlc3VsdFxuICAgICAgICAjICAgICAgIHdoZW4gMCB0aGVuIHNldFRpbWVvdXQgKD0+IEB0cmlnZ2VyICdzYXZlJywgJ2ZvcmNlQ2xvc2UnKSwgMFxuICAgICAgICAjICAgICAgIHdoZW4gMSB0aGVuIHNldFRpbWVvdXQgKD0+IEB0cmlnZ2VyICdmb3JjZUNsb3NlJyksIDBcbiAgICAgICAgIyAgICAgICBlbHNlXG4gICAgICAgICMgICAgICAgICBNZHNXaW5kb3cuYXBwV2lsbFF1aXQgPSBmYWxzZVxuXG4gICAgICBidy5vbiAnY2xvc2VkJywgPT5cbiAgICAgICAgQGJyb3dzZXJXaW5kb3cgPSBudWxsXG4gICAgICAgIEBfc2V0SXNPcGVuIGZhbHNlXG5cbiAgICAgIHVwZGF0ZVdpbmRvd1Bvc2l0aW9uID0gKGUpID0+XG4gICAgICAgIHVubGVzcyBnbG9iYWwubWFycC5jb25maWcuc2V0KCd3aW5kb3dQb3NpdGlvbi5tYXhpbWl6ZWQnLCBidy5pc01heGltaXplZCgpKVxuICAgICAgICAgIGdsb2JhbC5tYXJwLmNvbmZpZy5tZXJnZSB7IHdpbmRvd1Bvc2l0aW9uOiBidy5nZXRCb3VuZHMoKSB9XG5cbiAgICAgIGJ3Lm9uICdtb3ZlJywgdXBkYXRlV2luZG93UG9zaXRpb25cbiAgICAgIGJ3Lm9uICdyZXNpemUnLCB1cGRhdGVXaW5kb3dQb3NpdGlvblxuICAgICAgYncub24gJ21heGltaXplJywgdXBkYXRlV2luZG93UG9zaXRpb25cbiAgICAgIGJ3Lm9uICd1bm1heGltaXplJywgdXBkYXRlV2luZG93UG9zaXRpb25cblxuXG5cblxuICAgICAgYncubWRzV2luZG93ID0gQFxuICAgICAgYndcblxuICAgIEBfc2V0SXNPcGVuIHRydWVcblxuICBAbG9hZEZyb21GaWxlOiAoZm5hbWUsIG1kc1dpbmRvdywgb3B0aW9ucyA9IHt9KSAtPlxuICAgIGZzLnJlYWRGaWxlIGZuYW1lLCAoZXJyLCB0eHQpID0+XG4gICAgICByZXR1cm4gaWYgZXJyXG5cbiAgICAgIGVuY29kaW5nID0gb3B0aW9ucz8uZW5jb2RpbmcgfHwganNjaGFyZGV0LmRldGVjdCh0eHQpPy5lbmNvZGluZ1xuICAgICAgYnVmID0gaWYgZW5jb2RpbmcgaXNudCAnVVRGLTgnIGFuZCBlbmNvZGluZyBpc250ICdhc2NpaScgYW5kIGljb252X2xpdGUuZW5jb2RpbmdFeGlzdHMoZW5jb2RpbmcpXG4gICAgICAgIGljb252X2xpdGUuZGVjb2RlKHR4dCwgZW5jb2RpbmcpXG4gICAgICBlbHNlXG4gICAgICAgIHR4dC50b1N0cmluZygpXG5cbiAgICAgICMgaWdub3Jl44GX44Gq44GE5aC05ZCIIGZpbGVOYW1lIOOCkiBmaWxlSGlzdHJ544CA44GrcHVzaOOBl+OAgeOBmeOBueOBpuOBruOCpuOCpOODs+ODieOCpuOBruODoeODi+ODpeODvOabtOaWsFxuICAgICAgdW5sZXNzIG9wdGlvbnM/Lmlnbm9yZVJlY2VudFxuICAgICAgICBNZHNGaWxlSGlzdG9yeS5wdXNoIGZuYW1lXG4gICAgICAgIE1kc01haW5NZW51LnVwZGF0ZU1lbnVUb0FsbCgpXG5cbiAgICAgICMg44Km44Kk44Oz44OJ44Km44GM5a2Y5Zyo44GX44CB44GL44Gk44CBb3ZlcnJpZGXjgb7jgZ/jga/jgqbjgqTjg7Pjg4njgqbjga7jg5Djg4Pjg5XjgqHjgYznqbrjgIHjgafjgYLjgovjgajjgY1cbiAgICAgIGlmIG1kc1dpbmRvdz8gYW5kIChvcHRpb25zPy5vdmVycmlkZSBvciBtZHNXaW5kb3cuaXNCdWZmZXJFbXB0eSgpKVxuICAgICAgICBtZHNXaW5kb3cudHJpZ2dlciAnbG9hZCcsIGJ1ZiwgZm5hbWVcblxuICAgICAgIyDjgqbjgqTjg7Pjg4njgqbliJ3mnJ/ljJbjgIBwYXJhbSA9IGZpbGVPcHRz44CA44GnIGZpbGVPcHRzID0geyBwYXRoOiBmbmFtZSwgYnVmZmVyOiBidWYgfVxuICAgICAgIyDnrKzkuozlvJXmlbDjga/jgarjgZcgLT4gQG9wdGlvbnMgPSB7fVxuICAgICAgZWxzZVxuICAgICAgICBuZXcgTWRzV2luZG93IHsgcGF0aDogZm5hbWUsIGJ1ZmZlcjogYnVmIH1cblxuICBsb2FkRnJvbUZpbGU6IChmbmFtZSwgb3B0aW9ucyA9IHt9KSA9PiBNZHNXaW5kb3cubG9hZEZyb21GaWxlIGZuYW1lLCBALCBvcHRpb25zXG5cbiAgdHJpZ2dlcjogKGV2dCwgYXJncy4uLikgPT5cbiAgICBAZXZlbnRzW2V2dF0/LmFwcGx5KEAsIGFyZ3MpICMg5ZG844Gw44KM44KL6Zai5pWw5YaF44GudGhpc+OCkuesrOS4gOW8leaVsOOBp+aMh+WumuOBl+OBn+OCguOBruOBq+WkieOBiOOBpuOBhOOCiyjjgZ3jgozjgZ7jgozjga5NZHNXaW5kb3cpXG5cblxuICBldmVudHM6XG4gICAgcHJldmlld0luaXRpYWxpemVkOiAtPlxuICAgICAgQHRyaWdnZXIgJ3ZpZXdNb2RlJywgQHZpZXdNb2RlXG5cbiAgICBzZXRDb25maWc6IChuYW1lLCB2YWx1ZSwgaXNTYXZlID0gdHJ1ZSkgLT5cbiAgICAgIGdsb2JhbC5tYXJwLmNvbmZpZy5zZXQgbmFtZSwgdmFsdWVcbiAgICAgIGdsb2JhbC5tYXJwLmNvbmZpZy5zYXZlKCkgaWYgaXNTYXZlXG5cbiAgICBsb2FkOiAoYnVmZmVyID0gJycsIHBhdGggPSBudWxsKSAtPlxuICAgICAgQHRyaWdnZXIgJ2luaXRpYWxpemVTdGF0ZScsIHBhdGhcbiAgICAgIEBzZW5kICdsb2FkVGV4dCcsIGJ1ZmZlclxuXG4gICAgbG9hZEZyb21GaWxlOiAoZm5hbWUsIG9wdGlvbnMgPSB7fSkgLT4gQGxvYWRGcm9tRmlsZSBmbmFtZSwgb3B0aW9uc1xuXG4gICAgcmVvcGVuOiAob3B0aW9ucyA9IHt9KSAtPlxuICAgICAgcmV0dXJuIGlmIEBmcmVlemUgb3IgIUBwYXRoXG4gICAgICByZXR1cm4gaWYgQGNoYW5nZWQgYW5kIGRpYWxvZy5zaG93TWVzc2FnZUJveChAYnJvd3NlcldpbmRvdyxcbiAgICAgICAgdHlwZTogJ3F1ZXN0aW9uJ1xuICAgICAgICBidXR0b25zOiBbJ09LJywgJ0NhbmNlbCddXG4gICAgICAgIHRpdGxlOiAnJ1xuICAgICAgICBtZXNzYWdlOiAnQXJlIHlvdSBzdXJlPydcbiAgICAgICAgZGV0YWlsOiAnWW91IHdpbGwgbG9zZSB5b3VyIGNoYW5nZXMuIFJlb3BlbiBhbnl3YXk/JylcblxuICAgICAgQGxvYWRGcm9tRmlsZSBAcGF0aCwgZXh0ZW5kKHsgb3ZlcnJpZGU6IHRydWUgfSwgb3B0aW9ucylcblxuICAgIHNhdmU6ICh0cmlnZ2VycyA9IHt9KSAtPlxuICAgICAgaWYgQHBhdGggdGhlbiBAc2VuZCgnc2F2ZScsIEBwYXRoLCB0cmlnZ2VycykgZWxzZSBAdHJpZ2dlcignc2F2ZUFzJywgdHJpZ2dlcnMpXG5cbiAgICBzYXZlQXM6ICh0cmlnZ2VycyA9IHt9KSAtPlxuICAgICAgZGlhbG9nLnNob3dTYXZlRGlhbG9nIEBicm93c2VyV2luZG93LFxuICAgICAgICB0aXRsZTogJ1NhdmUgYXMuLi4nXG4gICAgICAgIGZpbHRlcnM6IFt7IG5hbWU6ICdNYXJrZG93biBmaWxlJywgZXh0ZW5zaW9uczogWydtZCddIH1dXG4gICAgICAsIChmbmFtZSkgPT5cbiAgICAgICAgaWYgZm5hbWU/XG4gICAgICAgICAgQHNlbmQgJ3NhdmUnLCBmbmFtZSwgdHJpZ2dlcnNcbiAgICAgICAgZWxzZVxuICAgICAgICAgIE1kc1dpbmRvdy5hcHBXaWxsUXVpdCA9IGZhbHNlXG5cbiAgICB3cml0ZUZpbGU6IChmaWxlTmFtZSwgZGF0YSwgdHJpZ2dlcnMgPSB7fSkgLT5cbiAgICAgIGZzLndyaXRlRmlsZSBmaWxlTmFtZSwgZGF0YSwgKGVycikgPT5cbiAgICAgICAgdW5sZXNzIGVyclxuICAgICAgICAgIGNvbnNvbGUubG9nIFwiV3JpdGUgZmlsZSB0byAje2ZpbGVOYW1lfS5cIlxuICAgICAgICAgICMgZGVsZXRlIG1hcmtkb3duICMgYW5kIC0tLVxuICAgICAgICAgIHRtcCAgPSBkYXRhXG4gICAgICAgICAgdG1wID0gdG1wLnJlcGxhY2UoLy0tLS9nLCAnJylcbiAgICAgICAgICB0bXAgPSB0bXAucmVwbGFjZSgvXFxuL2csICcnKVxuICAgICAgICAgIHRtcCA9IHRtcC5yZXBsYWNlKC9eIyMjIyMjL2csJycpXG4gICAgICAgICAgdG1wID0gdG1wLnJlcGxhY2UoL14jIyMjIy9nLCcnKVxuICAgICAgICAgIHRtcCA9IHRtcC5yZXBsYWNlKC9eIyMjIy9nLCcnKVxuICAgICAgICAgIHRtcCA9IHRtcC5yZXBsYWNlKC9eIyMjL2csJycpXG4gICAgICAgICAgdG1wID0gdG1wLnJlcGxhY2UoL14jIy9nLCcnKVxuICAgICAgICAgIHRtcCA9IHRtcC5yZXBsYWNlKC9eIy9nLCcnKVxuICAgICAgICAgIGlucHV0ID0gW11cbiAgICAgICAgICBpbnB1dC5wdXNoKHRtcClcbiAgICAgICAgICBjb25zb2xlLmxvZyBpbnB1dFxuICAgICAgICAgIGZpbGVOYW1lTGlzdCA9IGZpbGVOYW1lLnNwbGl0KCcvJylcbiAgICAgICAgICBmaWxlID0gZmlsZU5hbWVMaXN0W2ZpbGVOYW1lTGlzdC5sZW5ndGgtMV1cbiAgICAgICAgICBjb25zb2xlLmxvZyBmaWxlXG5cbiAgICAgICAgICAjIHB5dGhvbiDjg5fjg63jgrvjgrnnlJ/miJDjgIHjgZ3jgZfjgabntZDmnpzjgpLlj5fjgZHlj5bjgotcbiAgICAgICAgICBzcGF3biA9IHJlcXVpcmUoJ2NoaWxkX3Byb2Nlc3MnKS5zcGF3blxuICAgICAgICAgIHB5ICAgID0gc3Bhd24oJ3B5dGhvbicsIFtcIiN7X19kaXJuYW1lfS8uLi8uLi9jb21wdXRlX2lucHV0LnB5XCJdKVxuICAgICAgICAgIGRhdGFTdHJpbmcgPSAnJ1xuXG4gICAgICAgICAgcHkuc3Rkb3V0Lm9uICdkYXRhJywgKGRhdGEpID0+XG4gICAgICAgICAgICBkYXRhU3RyaW5nICs9IGRhdGEudG9TdHJpbmcoKVxuXG4gICAgICAgICAgcHkuc3Rkb3V0Lm9uICdlbmQnLCAoKSA9PlxuICAgICAgICAgICAgZGF0YVN0cmluZyA9IGRhdGFTdHJpbmcuc2xpY2UoMilcbiAgICAgICAgICAgIGNvbnNvbGUubG9nIGRhdGFTdHJpbmdcbiAgICAgICAgICAgIGRhdGFTdHJpbmcgPSBkYXRhU3RyaW5nLnNsaWNlKDAsZGF0YVN0cmluZy5sZW5ndGgtMylcbiAgICAgICAgICAgIGNvbnNvbGUubG9nIGRhdGFTdHJpbmdcbiAgICAgICAgICAgIGZpbGVwYXRoID0gUGF0aC5qb2luIFwiL1VzZXJzL2hpa2FydS9EZXNrdG9wXCIsIFwic2xpZGVcIiwgZGF0YVN0cmluZywgZmlsZVxuICAgICAgICAgICAgZnMud3JpdGVGaWxlIGZpbGVwYXRoLCBkYXRhLCAoZXJyKSA9PlxuICAgICAgICAgICAgICBpZiBlcnJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyBlcnJcbiAgICAgICAgICAgICAgdW5sZXNzIGVyclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nIFwiV3JpdGUgZmlsZSB0byAje2ZpbGVwYXRofVwiXG4gICAgICAgICAgICAgICAgIyDliIbpoZ7ntZDmnpwg6Zuy44Gn6KGo56S6XG4gICAgICAgICAgICAgICAgQGNsaWVudC5zZW5kICdzaG93Jywge1xuICAgICAgICAgICAgICAgICAgXCJ0b1wiOiBcImxhbmRcIlxuICAgICAgICAgICAgICAgICAgXCJib2R5XCI6XG4gICAgICAgICAgICAgICAgICAgIFwiY29udGVudFwiOiBkYXRhU3RyaW5nXG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgcHkuc3RkaW4ud3JpdGUoSlNPTi5zdHJpbmdpZnkoaW5wdXQpKTtcbiAgICAgICAgICBweS5zdGRpbi5lbmQoKVxuXG4gICAgICAgICAgQHRyaWdnZXIgdHJpZ2dlcnMuc3VjY2VlZGVkIGlmIHRyaWdnZXJzLnN1Y2NlZWRlZD9cbiAgICAgICAgZWxzZVxuICAgICAgICAgIGNvbnNvbGUubG9nIGVyclxuICAgICAgICAgICMgZGlhbG9nLnNob3dNZXNzYWdlQm94IEBicm93c2VyV2luZG93LFxuICAgICAgICAgICMgICB0eXBlOiAnZXJyb3InXG4gICAgICAgICAgIyAgIGJ1dHRvbnM6IFsnT0snXVxuICAgICAgICAgICMgICB0aXRsZTogJ01hcnAnXG4gICAgICAgICAgIyAgIG1lc3NhZ2U6IFwiTWFycCBjYW5ub3Qgd3JpdGUgdGhlIGZpbGUgdG8gI3tmaWxlTmFtZX0uXCJcbiAgICAgICAgICAjICAgZGV0YWlsOiBlcnIudG9TdHJpbmcoKVxuXG4gICAgICAgICAgTWRzV2luZG93LmFwcFdpbGxRdWl0ID0gZmFsc2VcbiAgICAgICAgICBAdHJpZ2dlciB0cmlnZ2Vycy5mYWlsZWQsIGVyciBpZiB0cmlnZ2Vycy5mYWlsZWQ/XG5cbiAgICAgICAgQHRyaWdnZXIgdHJpZ2dlcnMuZmluYWxpemVkIGlmIHRyaWdnZXJzLmZpbmFsaXplZD9cblxuICAgIGZvcmNlQ2xvc2U6IC0+IEBicm93c2VyV2luZG93LmRlc3Ryb3koKVxuXG4gICAgZXhwb3J0UGRmRGlhbG9nOiAtPlxuICAgICAgcmV0dXJuIGlmIEBmcmVlemVcbiAgICAgIGRpYWxvZy5zaG93U2F2ZURpYWxvZyBAYnJvd3NlcldpbmRvdyxcbiAgICAgICAgdGl0bGU6ICdFeHBvcnQgdG8gUERGLi4uJ1xuICAgICAgICBmaWx0ZXJzOiBbeyBuYW1lOiAnUERGIGZpbGUnLCBleHRlbnNpb25zOiBbJ3BkZiddIH1dXG4gICAgICAsIChmbmFtZSkgPT5cbiAgICAgICAgcmV0dXJuIHVubGVzcyBmbmFtZT9cbiAgICAgICAgQGZyZWV6ZSA9IHRydWVcbiAgICAgICAgQHNlbmQgJ3B1Ymxpc2hQZGYnLCBmbmFtZVxuXG4gICAgaW5pdGlhbGl6ZVN0YXRlOiAoZmlsZVBhdGggPSBudWxsLCBjaGFuZ2VkID0gZmFsc2UpIC0+XG4gICAgICBAcGF0aCA9IGZpbGVQYXRoXG4gICAgICBAdHJpZ2dlciAnc2V0Q2hhbmdlZFN0YXR1cycsIGNoYW5nZWRcblxuICAgICAgZGlyID0gaWYgZmlsZVBhdGggdGhlbiBcIiN7UGF0aC5kaXJuYW1lKGZpbGVQYXRoKX0je1BhdGguc2VwfVwiIGVsc2UgbnVsbFxuICAgICAgQHNlbmQgJ3NldEltYWdlRGlyZWN0b3J5JywgZGlyXG5cbiAgICAgIEBtZW51LnVwZGF0ZU1lbnUoKVxuXG4gICAgc2V0Q2hhbmdlZFN0YXR1czogKGNoYW5nZWQpIC0+XG4gICAgICBAY2hhbmdlZCA9ICEhY2hhbmdlZFxuICAgICAgQHJlZnJlc2hUaXRsZSgpXG5cbiAgICB2aWV3TW9kZTogKG1vZGUpIC0+XG4gICAgICBnbG9iYWwubWFycC5jb25maWcuc2V0KCd2aWV3TW9kZScsIG1vZGUpXG4gICAgICBnbG9iYWwubWFycC5jb25maWcuc2F2ZSgpXG5cbiAgICAgIEBzZW5kICd2aWV3TW9kZScsIG1vZGVcblxuICAgICAgQG1lbnUuc3RhdGVzLnZpZXdNb2RlID0gbW9kZVxuICAgICAgQG1lbnUudXBkYXRlTWVudSgpXG5cbiAgICB0aGVtZUNoYW5nZWQ6ICh0aGVtZSkgLT5cbiAgICAgIEBtZW51LnN0YXRlcy50aGVtZSA9IHRoZW1lXG4gICAgICBAbWVudS51cGRhdGVNZW51KClcblxuICAgIHVuZnJlZXplOiAtPlxuICAgICAgQGZyZWV6ZSA9IGZhbHNlXG4gICAgICBAc2VuZCAndW5mcmVlemVkJ1xuXG4gIHJlZnJlc2hUaXRsZTogPT5cbiAgICBpZiBwcm9jZXNzLnBsYXRmb3JtID09ICdkYXJ3aW4nXG4gICAgICBAYnJvd3NlcldpbmRvdz8uc2V0VGl0bGUgXCIje0BnZXRTaG9ydFBhdGgoKX0je2lmIEBjaGFuZ2VkIHRoZW4gJyAqJyBlbHNlICcnfVwiXG4gICAgICBAYnJvd3NlcldpbmRvdz8uc2V0UmVwcmVzZW50ZWRGaWxlbmFtZSBAcGF0aCB8fCAnJ1xuICAgICAgQGJyb3dzZXJXaW5kb3c/LnNldERvY3VtZW50RWRpdGVkIEBjaGFuZ2VkXG4gICAgZWxzZVxuICAgICAgQGJyb3dzZXJXaW5kb3c/LnNldFRpdGxlIFwiI3tAb3B0aW9ucz8udGl0bGUgfHwgJ01hcnAnfSAtICN7QGdldFNob3J0UGF0aCgpfSN7aWYgQGNoYW5nZWQgdGhlbiAnIConIGVsc2UgJyd9XCJcblxuICBnZXRTaG9ydFBhdGg6ID0+XG4gICAgcmV0dXJuICcodW50aXRsZWQpJyB1bmxlc3MgQHBhdGg/XG4gICAgQHBhdGgucmVwbGFjZSgvXFxcXC9nLCAnLycpLnJlcGxhY2UoLy4qXFwvLywgJycpXG5cbiAgdXBkYXRlUmVzb3VyY2VTdGF0ZTogPT5cbiAgICBuZXdTdGF0ZSA9IGlmIEBfd2F0Y2hpbmdSZXNvdXJjZXMuc2l6ZSA8PSAwIHRoZW4gJ2xvYWRlZCcgZWxzZSAnbG9hZGluZydcbiAgICBAc2VuZCAncmVzb3VyY2VTdGF0ZScsIG5ld1N0YXRlIGlmIEByZXNvdXJjZVN0YXRlIGlzbnQgbmV3U3RhdGVcblxuICAgIEByZXNvdXJjZVN0YXRlID0gbmV3U3RhdGVcblxuICBpc09wZW46ID0+IEBfaXNPcGVuXG4gIF9zZXRJc09wZW46IChzdGF0ZSkgPT5cbiAgICBAX2lzT3BlbiA9ICEhc3RhdGVcblxuICAgIGlmIEBfaXNPcGVuXG4gICAgICBNZHNNYW5hZ2VyLmFkZFdpbmRvdyBAX3dpbmRvd19pZCwgQFxuICAgIGVsc2VcbiAgICAgIE1kc01hbmFnZXIucmVtb3ZlV2luZG93IEBfd2luZG93X2lkXG5cbiAgICByZXR1cm4gQF9pc09wZW5cblxuICBpc0J1ZmZlckVtcHR5OiA9PiAhQHBhdGggYW5kIG5vdCBAY2hhbmdlZFxuXG4gIHNlbmQ6IChldnQsIGFyZ3MuLi4pID0+XG4gICAgcmV0dXJuIGZhbHNlIHVubGVzcyBAX3dpbmRvd0xvYWRlZCBhbmQgQGJyb3dzZXJXaW5kb3c/XG4gICAgQGJyb3dzZXJXaW5kb3cud2ViQ29udGVudHMuc2VuZCAnTWRzTWFuYWdlclNlbmRFdmVudCcsIGV2dCwgeyBmcm9tOiBudWxsLCB0bzogQF93aW5kb3dfaWQgfSwgYXJnc1xuIl19
