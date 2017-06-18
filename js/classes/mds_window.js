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
            if (typeof data === 'string') {
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
            }
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xhc3Nlcy9tZHNfd2luZG93LmpzIiwic291cmNlcyI6WyJjbGFzc2VzL21kc193aW5kb3cuY29mZmVlIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLElBQUEsNklBQUE7RUFBQTs7O0FBQUEsTUFBMEIsT0FBQSxDQUFRLFVBQVIsQ0FBMUIsRUFBQyxpQ0FBRCxFQUFnQjs7QUFFaEIsVUFBQSxHQUFpQixPQUFBLENBQVEsZUFBUjs7QUFDakIsT0FBQSxHQUFpQixPQUFBLENBQVEsWUFBUjs7QUFDakIsV0FBQSxHQUFpQixPQUFBLENBQVEsaUJBQVI7O0FBQ2pCLGNBQUEsR0FBaUIsT0FBQSxDQUFRLG9CQUFSOztBQUNqQixNQUFBLEdBQWlCLE9BQUEsQ0FBUSxRQUFSOztBQUNqQixFQUFBLEdBQWlCLE9BQUEsQ0FBUSxJQUFSOztBQUNqQixTQUFBLEdBQWlCLE9BQUEsQ0FBUSxXQUFSOztBQUNqQixVQUFBLEdBQWlCLE9BQUEsQ0FBUSxZQUFSOztBQUNqQixJQUFBLEdBQWlCLE9BQUEsQ0FBUSxNQUFSOztBQUNqQixXQUFBLEdBQWlCLE9BQUEsQ0FBUSwyQkFBUjs7QUFFakIsTUFBTSxDQUFDLE9BQVAsR0FBdUI7RUFDckIsU0FBQyxDQUFBLFdBQUQsR0FBYzs7RUFDZCxTQUFDLENBQUEsTUFBRCxHQUFVOztFQUVWLFNBQUMsQ0FBQSxVQUFELEdBQWEsU0FBQTtXQUNYO01BQUEsS0FBQSxFQUFRLFVBQVI7TUFDQSxJQUFBLEVBQVEsS0FEUjtNQUVBLENBQUEsRUFBUSxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFuQixDQUF1QixrQkFBdkIsQ0FGUjtNQUdBLENBQUEsRUFBUSxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFuQixDQUF1QixrQkFBdkIsQ0FIUjtNQUlBLEtBQUEsRUFBUSxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFuQixDQUF1QixzQkFBdkIsQ0FKUjtNQUtBLE1BQUEsRUFBUSxNQUFNLENBQUMs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QUFxQixJQUFDLENBQUEsVUFBdEIsRUFBa0MsSUFBbEMsRUFERjtLQUFBLE1BQUE7TUFHRSxVQUFVLENBQUMsWUFBWCxDQUF3QixJQUFDLENBQUEsVUFBekIsRUFIRjs7QUFLQSxXQUFPLElBQUMsQ0FBQTtFQVJFOztzQkFVWixhQUFBLEdBQWUsU0FBQTtXQUFHLENBQUMsSUFBQyxDQUFBLElBQUYsSUFBVyxDQUFJLElBQUMsQ0FBQTtFQUFuQjs7c0JBRWYsSUFBQSxHQUFNLFNBQUE7QUFDSixRQUFBO0lBREssb0JBQUs7SUFDVixJQUFBLENBQUEsQ0FBb0IsSUFBQyxDQUFBLGFBQUQsSUFBbUIsNEJBQXZDLENBQUE7QUFBQSxhQUFPLE1BQVA7O1dBQ0EsSUFBQyxDQUFBLGFBQWEsQ0FBQyxXQUFXLENBQUMsSUFBM0IsQ0FBZ0MscUJBQWhDLEVBQXVELEdBQXZELEVBQTREO01BQUUsSUFBQSxFQUFNLElBQVI7TUFBYyxFQUFBLEVBQUksSUFBQyxDQUFBLFVBQW5CO0tBQTVELEVBQTZGLElBQTdGO0VBRkkiLCJzb3VyY2VzQ29udGVudCI6WyJ7QnJvd3NlcldpbmRvdywgZGlhbG9nfSA9IHJlcXVpcmUgJ2VsZWN0cm9uJ1xuXG5NZHNNYW5hZ2VyICAgICA9IHJlcXVpcmUgJy4vbWRzX21hbmFnZXInXG5NZHNNZW51ICAgICAgICA9IHJlcXVpcmUgJy4vbWRzX21lbnUnXG5NZHNNYWluTWVudSAgICA9IHJlcXVpcmUgJy4vbWRzX21haW5fbWVudSdcbk1kc0ZpbGVIaXN0b3J5ID0gcmVxdWlyZSAnLi9tZHNfZmlsZV9oaXN0b3J5J1xuZXh0ZW5kICAgICAgICAgPSByZXF1aXJlICdleHRlbmQnXG5mcyAgICAgICAgICAgICA9IHJlcXVpcmUgJ2ZzJ1xuanNjaGFyZGV0ICAgICAgPSByZXF1aXJlICdqc2NoYXJkZXQnXG5pY29udl9saXRlICAgICA9IHJlcXVpcmUgJ2ljb252LWxpdGUnXG5QYXRoICAgICAgICAgICA9IHJlcXVpcmUgJ3BhdGgnXG5NaWNrckNsaWVudCAgICA9IHJlcXVpcmUgJy4uLy4uL21vZHVsZXMvTWlja3JDbGllbnQnXG5cbm1vZHVsZS5leHBvcnRzID0gY2xhc3MgTWRzV2luZG93XG4gIEBhcHBXaWxsUXVpdDogZmFsc2VcbiAgQGNsaWVudCA9IG51bGxcblxuICBAZGVmT3B0aW9uczogKCkgLT5cbiAgICB0aXRsZTogICdFbGVjdHJvbidcbiAgICBzaG93OiAgIGZhbHNlXG4gICAgeDogICAgICBnbG9iYWwubWFycC5jb25maWcuZ2V0ICd3aW5kb3dQb3NpdGlvbi54J1xuICAgIHk6ICAgICAgZ2xvYmFsLm1hcnAuY29uZmlnLmdldCAnd2luZG93UG9zaXRpb24ueSdcbiAgICB3aWR0aDogIGdsb2JhbC5tYXJwLmNvbmZpZy5nZXQgJ3dpbmRvd1Bvc2l0aW9uLndpZHRoJ1xuICAgIGhlaWdodDogZ2xvYmFsLm1hcnAuY29uZmlnLmdldCAnd2luZG93UG9zaXRpb24uaGVpZ2h0J1xuICAgICMgaWNvbjogICBQYXRoLmpvaW4oX19kaXJuYW1lLCAnLy4uLy4uL2ltYWdlcy9tYXJwLnBuZycpXG5cbiAgYnJvd3NlcldpbmRvdzogbnVsbFxuICBwYXRoOiBudWxsXG4gIGNoYW5nZWQ6IGZhbHNlXG4gIGZyZWV6ZTogZmFsc2VcbiAgcmVzb3VyY2VTdGF0ZTogbnVsbFxuXG4gIF9jbG9zZUNvbmZpcm1lZDogZmFsc2VcbiAgX3dhdGNoaW5nUmVzb3VyY2VzOiBuZXcgU2V0XG5cbiAgdmlld01vZGU6IG51bGxcblxuICBjb25zdHJ1Y3RvcjogKGZpbGVPcHRzID0ge30sIEBvcHRpb25zID0ge30pIC0+XG4gICAgc2V0dGluZyA9XG4gICAgICBcImlkXCI6IFwid2luZG93XCJcbiAgICAgIFwidXJsXCI6IFwid3M6Ly9hcHBzLndpc2RvbXdlYi5uZXQ6NjQyNjAvd3MvbWlrXCJcbiAgICAgIFwic2l0ZVwiOiBcInRlc3RcIlxuICAgICAgXCJ0b2tlblwiOiBcIlBhZDo5OTQ4XCJcbiAgICBAY2xpZW50ID0gbmV3IE1pY2tyQ2xpZW50KHNldHRpbmcpXG5cbiAgICBAcGF0aCA9IGZpbGVPcHRzPy5wYXRoIHx8IG51bGxcblxuICAgICMgQHZpZXdNb2RlID0gZ2xvYmFsLm1hcnAuY29uZmlnLmdldCgndmlld01vZGUnKVxuICAgIEB2aWV3TW9kZSA9ICdzY3JlZW4nXG5cbiAgICBAYnJvd3NlcldpbmRvdyA9IGRvID0+XG4gICAgICAjIOWIneacn+ioreWumm9wdGlvbnMg44GoIEBvcHRpb25zIOOCkuODnuODvOOCuOOBl+OBpuWIneacn+WMluOAgeOCpuOCpOODs+ODieOCpklE6Kit5a6aXG4gICAgICBidyA9IG5ldyBCcm93c2VyV2luZG93IGV4dGVuZCh0cnVlLCB7fSwgTWRzV2luZG93LmRlZk9wdGlvbnMoKSwgQG9wdGlvbnMsXG4gICAgICB7XG4gICAgICAndGl0bGVCYXJTdHlsZSc6ICdoaWRkZW4nLCAj44OY44OD44OA44O844OQ44O844KS6YCP5piO44Gr44GX44CB44Oc44K/44Oz44Gg44GR6KGo56S6XG4gICAgICAnYWNjZXB0Rmlyc3RNb3VzZSc6IHRydWVcbiAgICAgIH0pXG4gICAgICBAX3dpbmRvd19pZCA9IGJ3LmlkXG5cblxuICAgICAgbG9hZENtcCA9IChkZXRhaWxzKSA9PlxuICAgICAgICBzZXRUaW1lb3V0ID0+XG4gICAgICAgICAgQF93YXRjaGluZ1Jlc291cmNlcy5kZWxldGUoZGV0YWlscy5pZClcbiAgICAgICAgICBAdXBkYXRlUmVzb3VyY2VTdGF0ZSgpXG4gICAgICAgICwgNTAwXG4gICAgICAjIGFib3V0IHdlYlJlcXVlc3RcbiAgICAgICMgZGV0YWlscyBvYmplY3QgZGVzY3JpYmVzIHJlcXVlc3RcbiAgICAgICMgVGhlIGZpbHRlciBvYmplY3QgaGFzIGEgdXJscyBwcm9wZXJ0eSB3aGljaCBpcyBhbiBBcnJheSBvZiBVUkwgcGF0dGVybnMtXG4gICAgICAjIC10aGF0IHdpbGwgYmUgdXNlZCB0byBmaWx0ZXIgb3V0IHRoZSByZXF1ZXN0cyB0aGF0IGRvIG5vdCBtYXRjaCB0aGUgVVJMIHBhdHRlcm5zLlxuICAgICAgIyBJZiB0aGUgZmlsdGVyIGlzIG9taXR0ZWQgdGhlbiBhbGwgcmVxdWVzdHMgd2lsbCBiZSBtYXRjaGVkLlxuICAgICAgYncud2ViQ29udGVudHMuc2Vzc2lvbi53ZWJSZXF1ZXN0Lm9uQ29tcGxldGVkIGxvYWRDbXBcbiAgICAgIGJ3LndlYkNvbnRlbnRzLnNlc3Npb24ud2ViUmVxdWVzdC5vbkVycm9yT2NjdXJyZWQgbG9hZENtcFxuICAgICAgYncud2ViQ29udGVudHMuc2Vzc2lvbi53ZWJSZXF1ZXN0Lm9uQmVmb3JlUmVxdWVzdCAoZGV0YWlscywgY2FsbGJhY2spID0+XG4gICAgICAgIEBfd2F0Y2hpbmdSZXNvdXJjZXMuYWRkKGRldGFpbHMuaWQpXG4gICAgICAgIEB1cGRhdGVSZXNvdXJjZVN0YXRlKClcbiAgICAgICAgY2FsbGJhY2soe30pXG5cbiAgICAgIEBtZW51ID0gbmV3IE1kc01haW5NZW51XG4gICAgICAgIHdpbmRvdzogYndcbiAgICAgICAgZGV2ZWxvcG1lbnQ6IGdsb2JhbC5tYXJwLmRldmVsb3BtZW50XG4gICAgICAgIHZpZXdNb2RlOiBAdmlld01vZGVcblxuICAgICAgYncubWF4aW1pemUoKSBpZiBnbG9iYWwubWFycC5jb25maWcuZ2V0ICd3aW5kb3dQb3NpdGlvbi5tYXhpbWl6ZWQnXG5cbiAgICAgIGJ3LmxvYWRVUkwgXCJmaWxlOi8vI3tfX2Rpcm5hbWV9Ly4uLy4uL2luZGV4Lmh0bWwjI3tAX3dpbmRvd19pZH1cIlxuXG4gICAgICBidy53ZWJDb250ZW50cy5vbiAnZGlkLWZpbmlzaC1sb2FkJywgPT5cbiAgICAgICAgQF93aW5kb3dMb2FkZWQgPSB0cnVlXG4gICAgICAgIEBzZW5kICdzZXRTcGxpdHRlcicsIGdsb2JhbC5tYXJwLmNvbmZpZy5nZXQoJ3NwbGl0dGVyUG9zaXRpb24nKVxuICAgICAgICBAc2VuZCAnc2V0RWRpdG9yQ29uZmlnJywgZ2xvYmFsLm1hcnAuY29uZmlnLmdldCgnZWRpdG9yJylcbiAgICAgICAgQHRyaWdnZXIgJ2xvYWQnLCBmaWxlT3B0cz8uYnVmZmVyIHx8ICcnLCBAcGF0aFxuXG4gICAgICBidy5vbmNlICdyZWFkeS10by1zaG93JywgPT4gYncuc2hvdygpXG5cbiAgICAgIGJ3Lm9uICdjbG9zZScsIChlKSA9PlxuICAgICAgICBpZiBAZnJlZXplXG4gICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpXG4gICAgICAgICAgTWRzV2luZG93LmFwcFdpbGxRdWl0ID0gZmFsc2VcbiAgICAgICAgICByZXR1cm5cblxuICAgICAgICAjIHdoZW4gY2xvc2Ugd2luZG93LCB3YXdybmluZyBkaWFsb2cgaXMgc2hvd25cbiAgICAgICAgIyBpZiBAY2hhbmdlZFxuICAgICAgICAjICAgZS5wcmV2ZW50RGVmYXVsdCgpXG4gICAgICAgICMgICBkaWFsb2cuc2hvd01lc3NhZ2VCb3ggQGJyb3dzZXJXaW5kb3csXG4gICAgICAgICMgICAgIHR5cGU6ICdxdWVzdGlvbidcbiAgICAgICAgIyAgICAgYnV0dG9uczogWydZZXMnLCAnTm8nLCAnQ2FuY2VsJ11cbiAgICAgICAgIyAgICAgdGl0bGU6ICdNYXJwJ1xuICAgICAgICAjICAgICBtZXNzYWdlOiAnQXJlIHlvdSBzdXJlPydcbiAgICAgICAgIyAgICAgZGV0YWlsOiBcIiN7QGdldFNob3J0UGF0aCgpfSBoYXMgYmVlbiBtb2RpZmllZC4gRG8geW91IHdhbnQgdG8gc2F2ZSB0aGUgY2hhbmdlcz9cIlxuICAgICAgICAjICAgICBjYW5jZWxJZDogMlxuICAgICAgICAjICAgLCAocmVzdWx0KSA9PlxuICAgICAgICAjICAgICAjIFdyYXAgYnkgc2V0VGltZW91dCB0byBhdm9pZCBhcHAgdGVybWluYXRpb24gdW5leHBlY3RlZGx5IG9uIExpbnV4LlxuICAgICAgICAjICAgICBzd2l0Y2ggcmVzdWx0XG4gICAgICAgICMgICAgICAgd2hlbiAwIHRoZW4gc2V0VGltZW91dCAoPT4gQHRyaWdnZXIgJ3NhdmUnLCAnZm9yY2VDbG9zZScpLCAwXG4gICAgICAgICMgICAgICAgd2hlbiAxIHRoZW4gc2V0VGltZW91dCAoPT4gQHRyaWdnZXIgJ2ZvcmNlQ2xvc2UnKSwgMFxuICAgICAgICAjICAgICAgIGVsc2VcbiAgICAgICAgIyAgICAgICAgIE1kc1dpbmRvdy5hcHBXaWxsUXVpdCA9IGZhbHNlXG5cbiAgICAgIGJ3Lm9uICdjbG9zZWQnLCA9PlxuICAgICAgICBAYnJvd3NlcldpbmRvdyA9IG51bGxcbiAgICAgICAgQF9zZXRJc09wZW4gZmFsc2VcblxuICAgICAgdXBkYXRlV2luZG93UG9zaXRpb24gPSAoZSkgPT5cbiAgICAgICAgdW5sZXNzIGdsb2JhbC5tYXJwLmNvbmZpZy5zZXQoJ3dpbmRvd1Bvc2l0aW9uLm1heGltaXplZCcsIGJ3LmlzTWF4aW1pemVkKCkpXG4gICAgICAgICAgZ2xvYmFsLm1hcnAuY29uZmlnLm1lcmdlIHsgd2luZG93UG9zaXRpb246IGJ3LmdldEJvdW5kcygpIH1cblxuICAgICAgYncub24gJ21vdmUnLCB1cGRhdGVXaW5kb3dQb3NpdGlvblxuICAgICAgYncub24gJ3Jlc2l6ZScsIHVwZGF0ZVdpbmRvd1Bvc2l0aW9uXG4gICAgICBidy5vbiAnbWF4aW1pemUnLCB1cGRhdGVXaW5kb3dQb3NpdGlvblxuICAgICAgYncub24gJ3VubWF4aW1pemUnLCB1cGRhdGVXaW5kb3dQb3NpdGlvblxuXG5cblxuXG4gICAgICBidy5tZHNXaW5kb3cgPSBAXG4gICAgICBid1xuXG4gICAgQF9zZXRJc09wZW4gdHJ1ZVxuXG4gIEBsb2FkRnJvbUZpbGU6IChmbmFtZSwgbWRzV2luZG93LCBvcHRpb25zID0ge30pIC0+XG4gICAgZnMucmVhZEZpbGUgZm5hbWUsIChlcnIsIHR4dCkgPT5cbiAgICAgIHJldHVybiBpZiBlcnJcblxuICAgICAgZW5jb2RpbmcgPSBvcHRpb25zPy5lbmNvZGluZyB8fCBqc2NoYXJkZXQuZGV0ZWN0KHR4dCk/LmVuY29kaW5nXG4gICAgICBidWYgPSBpZiBlbmNvZGluZyBpc250ICdVVEYtOCcgYW5kIGVuY29kaW5nIGlzbnQgJ2FzY2lpJyBhbmQgaWNvbnZfbGl0ZS5lbmNvZGluZ0V4aXN0cyhlbmNvZGluZylcbiAgICAgICAgaWNvbnZfbGl0ZS5kZWNvZGUodHh0LCBlbmNvZGluZylcbiAgICAgIGVsc2VcbiAgICAgICAgdHh0LnRvU3RyaW5nKClcblxuICAgICAgIyBpZ25vcmXjgZfjgarjgYTloLTlkIggZmlsZU5hbWUg44KSIGZpbGVIaXN0cnnjgIDjgatwdXNo44GX44CB44GZ44G544Gm44Gu44Km44Kk44Oz44OJ44Km44Gu44Oh44OL44Ol44O85pu05pawXG4gICAgICB1bmxlc3Mgb3B0aW9ucz8uaWdub3JlUmVjZW50XG4gICAgICAgIE1kc0ZpbGVIaXN0b3J5LnB1c2ggZm5hbWVcbiAgICAgICAgTWRzTWFpbk1lbnUudXBkYXRlTWVudVRvQWxsKClcblxuICAgICAgIyDjgqbjgqTjg7Pjg4njgqbjgYzlrZjlnKjjgZfjgIHjgYvjgaTjgIFvdmVycmlkZeOBvuOBn+OBr+OCpuOCpOODs+ODieOCpuOBruODkOODg+ODleOCoeOBjOepuuOAgeOBp+OBguOCi+OBqOOBjVxuICAgICAgaWYgbWRzV2luZG93PyBhbmQgKG9wdGlvbnM/Lm92ZXJyaWRlIG9yIG1kc1dpbmRvdy5pc0J1ZmZlckVtcHR5KCkpXG4gICAgICAgIG1kc1dpbmRvdy50cmlnZ2VyICdsb2FkJywgYnVmLCBmbmFtZVxuXG4gICAgICAjIOOCpuOCpOODs+ODieOCpuWIneacn+WMluOAgHBhcmFtID0gZmlsZU9wdHPjgIDjgacgZmlsZU9wdHMgPSB7IHBhdGg6IGZuYW1lLCBidWZmZXI6IGJ1ZiB9XG4gICAgICAjIOesrOS6jOW8leaVsOOBr+OBquOBlyAtPiBAb3B0aW9ucyA9IHt9XG4gICAgICBlbHNlXG4gICAgICAgIG5ldyBNZHNXaW5kb3cgeyBwYXRoOiBmbmFtZSwgYnVmZmVyOiBidWYgfVxuXG4gIGxvYWRGcm9tRmlsZTogKGZuYW1lLCBvcHRpb25zID0ge30pID0+IE1kc1dpbmRvdy5sb2FkRnJvbUZpbGUgZm5hbWUsIEAsIG9wdGlvbnNcblxuICB0cmlnZ2VyOiAoZXZ0LCBhcmdzLi4uKSA9PlxuICAgIEBldmVudHNbZXZ0XT8uYXBwbHkoQCwgYXJncykgIyDlkbzjgbDjgozjgovplqLmlbDlhoXjga50aGlz44KS56ys5LiA5byV5pWw44Gn5oyH5a6a44GX44Gf44KC44Gu44Gr5aSJ44GI44Gm44GE44KLKOOBneOCjOOBnuOCjOOBrk1kc1dpbmRvdylcblxuXG4gIGV2ZW50czpcbiAgICBwcmV2aWV3SW5pdGlhbGl6ZWQ6IC0+XG4gICAgICBAdHJpZ2dlciAndmlld01vZGUnLCBAdmlld01vZGVcblxuICAgIHNldENvbmZpZzogKG5hbWUsIHZhbHVlLCBpc1NhdmUgPSB0cnVlKSAtPlxuICAgICAgZ2xvYmFsLm1hcnAuY29uZmlnLnNldCBuYW1lLCB2YWx1ZVxuICAgICAgZ2xvYmFsLm1hcnAuY29uZmlnLnNhdmUoKSBpZiBpc1NhdmVcblxuICAgIGxvYWQ6IChidWZmZXIgPSAnJywgcGF0aCA9IG51bGwpIC0+XG4gICAgICBAdHJpZ2dlciAnaW5pdGlhbGl6ZVN0YXRlJywgcGF0aFxuICAgICAgQHNlbmQgJ2xvYWRUZXh0JywgYnVmZmVyXG5cbiAgICBsb2FkRnJvbUZpbGU6IChmbmFtZSwgb3B0aW9ucyA9IHt9KSAtPiBAbG9hZEZyb21GaWxlIGZuYW1lLCBvcHRpb25zXG5cbiAgICByZW9wZW46IChvcHRpb25zID0ge30pIC0+XG4gICAgICByZXR1cm4gaWYgQGZyZWV6ZSBvciAhQHBhdGhcbiAgICAgIHJldHVybiBpZiBAY2hhbmdlZCBhbmQgZGlhbG9nLnNob3dNZXNzYWdlQm94KEBicm93c2VyV2luZG93LFxuICAgICAgICB0eXBlOiAncXVlc3Rpb24nXG4gICAgICAgIGJ1dHRvbnM6IFsnT0snLCAnQ2FuY2VsJ11cbiAgICAgICAgdGl0bGU6ICcnXG4gICAgICAgIG1lc3NhZ2U6ICdBcmUgeW91IHN1cmU/J1xuICAgICAgICBkZXRhaWw6ICdZb3Ugd2lsbCBsb3NlIHlvdXIgY2hhbmdlcy4gUmVvcGVuIGFueXdheT8nKVxuXG4gICAgICBAbG9hZEZyb21GaWxlIEBwYXRoLCBleHRlbmQoeyBvdmVycmlkZTogdHJ1ZSB9LCBvcHRpb25zKVxuXG4gICAgc2F2ZTogKHRyaWdnZXJzID0ge30pIC0+XG4gICAgICBpZiBAcGF0aCB0aGVuIEBzZW5kKCdzYXZlJywgQHBhdGgsIHRyaWdnZXJzKSBlbHNlIEB0cmlnZ2VyKCdzYXZlQXMnLCB0cmlnZ2VycylcblxuICAgIHNhdmVBczogKHRyaWdnZXJzID0ge30pIC0+XG4gICAgICBkaWFsb2cuc2hvd1NhdmVEaWFsb2cgQGJyb3dzZXJXaW5kb3csXG4gICAgICAgIHRpdGxlOiAnU2F2ZSBhcy4uLidcbiAgICAgICAgZmlsdGVyczogW3sgbmFtZTogJ01hcmtkb3duIGZpbGUnLCBleHRlbnNpb25zOiBbJ21kJ10gfV1cbiAgICAgICwgKGZuYW1lKSA9PlxuICAgICAgICBpZiBmbmFtZT9cbiAgICAgICAgICBAc2VuZCAnc2F2ZScsIGZuYW1lLCB0cmlnZ2Vyc1xuICAgICAgICBlbHNlXG4gICAgICAgICAgTWRzV2luZG93LmFwcFdpbGxRdWl0ID0gZmFsc2VcblxuICAgIHdyaXRlRmlsZTogKGZpbGVOYW1lLCBkYXRhLCB0cmlnZ2VycyA9IHt9KSAtPlxuICAgICAgZnMud3JpdGVGaWxlIGZpbGVOYW1lLCBkYXRhLCAoZXJyKSA9PlxuICAgICAgICB1bmxlc3MgZXJyXG4gICAgICAgICAgY29uc29sZS5sb2cgXCJXcml0ZSBmaWxlIHRvICN7ZmlsZU5hbWV9LlwiXG4gICAgICAgICAgIyBkZWxldGUgbWFya2Rvd24gIyBhbmQgLS0tXG4gICAgICAgICAgaWYodHlwZW9mIGRhdGEgPT0gJ3N0cmluZycpXG4gICAgICAgICAgICB0bXAgID0gZGF0YVxuICAgICAgICAgICAgdG1wID0gdG1wLnJlcGxhY2UoLy0tLS9nLCAnJylcbiAgICAgICAgICAgIHRtcCA9IHRtcC5yZXBsYWNlKC9cXG4vZywgJycpXG4gICAgICAgICAgICB0bXAgPSB0bXAucmVwbGFjZSgvXiMjIyMjIy9nLCcnKVxuICAgICAgICAgICAgdG1wID0gdG1wLnJlcGxhY2UoL14jIyMjIy9nLCcnKVxuICAgICAgICAgICAgdG1wID0gdG1wLnJlcGxhY2UoL14jIyMjL2csJycpXG4gICAgICAgICAgICB0bXAgPSB0bXAucmVwbGFjZSgvXiMjIy9nLCcnKVxuICAgICAgICAgICAgdG1wID0gdG1wLnJlcGxhY2UoL14jIy9nLCcnKVxuICAgICAgICAgICAgdG1wID0gdG1wLnJlcGxhY2UoL14jL2csJycpXG4gICAgICAgICAgICBpbnB1dCA9IFtdXG4gICAgICAgICAgICBpbnB1dC5wdXNoKHRtcClcbiAgICAgICAgICAgIGNvbnNvbGUubG9nIGlucHV0XG4gICAgICAgICAgICBmaWxlTmFtZUxpc3QgPSBmaWxlTmFtZS5zcGxpdCgnLycpXG4gICAgICAgICAgICBmaWxlID0gZmlsZU5hbWVMaXN0W2ZpbGVOYW1lTGlzdC5sZW5ndGgtMV1cbiAgICAgICAgICAgIGNvbnNvbGUubG9nIGZpbGVcblxuICAgICAgICAgICAgIyBweXRob24g44OX44Ot44K744K555Sf5oiQ44CB44Gd44GX44Gm57WQ5p6c44KS5Y+X44GR5Y+W44KLXG4gICAgICAgICAgICBzcGF3biA9IHJlcXVpcmUoJ2NoaWxkX3Byb2Nlc3MnKS5zcGF3blxuICAgICAgICAgICAgcHkgICAgPSBzcGF3bigncHl0aG9uJywgW1wiI3tfX2Rpcm5hbWV9Ly4uLy4uL2NvbXB1dGVfaW5wdXQucHlcIl0pXG4gICAgICAgICAgICBkYXRhU3RyaW5nID0gJydcblxuICAgICAgICAgICAgcHkuc3Rkb3V0Lm9uICdkYXRhJywgKGRhdGEpID0+XG4gICAgICAgICAgICAgIGRhdGFTdHJpbmcgKz0gZGF0YS50b1N0cmluZygpXG5cbiAgICAgICAgICAgIHB5LnN0ZG91dC5vbiAnZW5kJywgKCkgPT5cbiAgICAgICAgICAgICAgZGF0YVN0cmluZyA9IGRhdGFTdHJpbmcuc2xpY2UoMilcbiAgICAgICAgICAgICAgY29uc29sZS5sb2cgZGF0YVN0cmluZ1xuICAgICAgICAgICAgICBkYXRhU3RyaW5nID0gZGF0YVN0cmluZy5zbGljZSgwLGRhdGFTdHJpbmcubGVuZ3RoLTMpXG4gICAgICAgICAgICAgIGNvbnNvbGUubG9nIGRhdGFTdHJpbmdcbiAgICAgICAgICAgICAgZmlsZXBhdGggPSBQYXRoLmpvaW4gXCIvVXNlcnMvaGlrYXJ1L0Rlc2t0b3BcIiwgXCJzbGlkZVwiLCBkYXRhU3RyaW5nLCBmaWxlXG4gICAgICAgICAgICAgIGZzLndyaXRlRmlsZSBmaWxlcGF0aCwgZGF0YSwgKGVycikgPT5cbiAgICAgICAgICAgICAgICBpZiBlcnJcbiAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nIGVyclxuICAgICAgICAgICAgICAgIHVubGVzcyBlcnJcbiAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nIFwiV3JpdGUgZmlsZSB0byAje2ZpbGVwYXRofVwiXG4gICAgICAgICAgICAgICAgICAjIOWIhumhnue1kOaenCDpm7LjgafooajnpLpcbiAgICAgICAgICAgICAgICAgIEBjbGllbnQuc2VuZCAnc2hvdycsIHtcbiAgICAgICAgICAgICAgICAgICAgXCJ0b1wiOiBcImxhbmRcIlxuICAgICAgICAgICAgICAgICAgICBcImJvZHlcIjpcbiAgICAgICAgICAgICAgICAgICAgICBcImNvbnRlbnRcIjogZGF0YVN0cmluZ1xuICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBweS5zdGRpbi53cml0ZShKU09OLnN0cmluZ2lmeShpbnB1dCkpO1xuICAgICAgICAgICAgcHkuc3RkaW4uZW5kKClcblxuICAgICAgICAgIEB0cmlnZ2VyIHRyaWdnZXJzLnN1Y2NlZWRlZCBpZiB0cmlnZ2Vycy5zdWNjZWVkZWQ/XG4gICAgICAgIGVsc2VcbiAgICAgICAgICBjb25zb2xlLmxvZyBlcnJcbiAgICAgICAgICAjIGRpYWxvZy5zaG93TWVzc2FnZUJveCBAYnJvd3NlcldpbmRvdyxcbiAgICAgICAgICAjICAgdHlwZTogJ2Vycm9yJ1xuICAgICAgICAgICMgICBidXR0b25zOiBbJ09LJ11cbiAgICAgICAgICAjICAgdGl0bGU6ICdNYXJwJ1xuICAgICAgICAgICMgICBtZXNzYWdlOiBcIk1hcnAgY2Fubm90IHdyaXRlIHRoZSBmaWxlIHRvICN7ZmlsZU5hbWV9LlwiXG4gICAgICAgICAgIyAgIGRldGFpbDogZXJyLnRvU3RyaW5nKClcblxuICAgICAgICAgIE1kc1dpbmRvdy5hcHBXaWxsUXVpdCA9IGZhbHNlXG4gICAgICAgICAgQHRyaWdnZXIgdHJpZ2dlcnMuZmFpbGVkLCBlcnIgaWYgdHJpZ2dlcnMuZmFpbGVkP1xuXG4gICAgICAgIEB0cmlnZ2VyIHRyaWdnZXJzLmZpbmFsaXplZCBpZiB0cmlnZ2Vycy5maW5hbGl6ZWQ/XG5cbiAgICBmb3JjZUNsb3NlOiAtPiBAYnJvd3NlcldpbmRvdy5kZXN0cm95KClcblxuICAgIGV4cG9ydFBkZkRpYWxvZzogLT5cbiAgICAgIHJldHVybiBpZiBAZnJlZXplXG4gICAgICBkaWFsb2cuc2hvd1NhdmVEaWFsb2cgQGJyb3dzZXJXaW5kb3csXG4gICAgICAgIHRpdGxlOiAnRXhwb3J0IHRvIFBERi4uLidcbiAgICAgICAgZmlsdGVyczogW3sgbmFtZTogJ1BERiBmaWxlJywgZXh0ZW5zaW9uczogWydwZGYnXSB9XVxuICAgICAgLCAoZm5hbWUpID0+XG4gICAgICAgIHJldHVybiB1bmxlc3MgZm5hbWU/XG4gICAgICAgIEBmcmVlemUgPSB0cnVlXG4gICAgICAgIEBzZW5kICdwdWJsaXNoUGRmJywgZm5hbWVcblxuICAgIGluaXRpYWxpemVTdGF0ZTogKGZpbGVQYXRoID0gbnVsbCwgY2hhbmdlZCA9IGZhbHNlKSAtPlxuICAgICAgQHBhdGggPSBmaWxlUGF0aFxuICAgICAgQHRyaWdnZXIgJ3NldENoYW5nZWRTdGF0dXMnLCBjaGFuZ2VkXG5cbiAgICAgIGRpciA9IGlmIGZpbGVQYXRoIHRoZW4gXCIje1BhdGguZGlybmFtZShmaWxlUGF0aCl9I3tQYXRoLnNlcH1cIiBlbHNlIG51bGxcbiAgICAgIEBzZW5kICdzZXRJbWFnZURpcmVjdG9yeScsIGRpclxuXG4gICAgICBAbWVudS51cGRhdGVNZW51KClcblxuICAgIHNldENoYW5nZWRTdGF0dXM6IChjaGFuZ2VkKSAtPlxuICAgICAgQGNoYW5nZWQgPSAhIWNoYW5nZWRcbiAgICAgIEByZWZyZXNoVGl0bGUoKVxuXG4gICAgdmlld01vZGU6IChtb2RlKSAtPlxuICAgICAgZ2xvYmFsLm1hcnAuY29uZmlnLnNldCgndmlld01vZGUnLCBtb2RlKVxuICAgICAgZ2xvYmFsLm1hcnAuY29uZmlnLnNhdmUoKVxuXG4gICAgICBAc2VuZCAndmlld01vZGUnLCBtb2RlXG5cbiAgICAgIEBtZW51LnN0YXRlcy52aWV3TW9kZSA9IG1vZGVcbiAgICAgIEBtZW51LnVwZGF0ZU1lbnUoKVxuXG4gICAgdGhlbWVDaGFuZ2VkOiAodGhlbWUpIC0+XG4gICAgICBAbWVudS5zdGF0ZXMudGhlbWUgPSB0aGVtZVxuICAgICAgQG1lbnUudXBkYXRlTWVudSgpXG5cbiAgICB1bmZyZWV6ZTogLT5cbiAgICAgIEBmcmVlemUgPSBmYWxzZVxuICAgICAgQHNlbmQgJ3VuZnJlZXplZCdcblxuICByZWZyZXNoVGl0bGU6ID0+XG4gICAgaWYgcHJvY2Vzcy5wbGF0Zm9ybSA9PSAnZGFyd2luJ1xuICAgICAgQGJyb3dzZXJXaW5kb3c/LnNldFRpdGxlIFwiI3tAZ2V0U2hvcnRQYXRoKCl9I3tpZiBAY2hhbmdlZCB0aGVuICcgKicgZWxzZSAnJ31cIlxuICAgICAgQGJyb3dzZXJXaW5kb3c/LnNldFJlcHJlc2VudGVkRmlsZW5hbWUgQHBhdGggfHwgJydcbiAgICAgIEBicm93c2VyV2luZG93Py5zZXREb2N1bWVudEVkaXRlZCBAY2hhbmdlZFxuICAgIGVsc2VcbiAgICAgIEBicm93c2VyV2luZG93Py5zZXRUaXRsZSBcIiN7QG9wdGlvbnM/LnRpdGxlIHx8ICdNYXJwJ30gLSAje0BnZXRTaG9ydFBhdGgoKX0je2lmIEBjaGFuZ2VkIHRoZW4gJyAqJyBlbHNlICcnfVwiXG5cbiAgZ2V0U2hvcnRQYXRoOiA9PlxuICAgIHJldHVybiAnKHVudGl0bGVkKScgdW5sZXNzIEBwYXRoP1xuICAgIEBwYXRoLnJlcGxhY2UoL1xcXFwvZywgJy8nKS5yZXBsYWNlKC8uKlxcLy8sICcnKVxuXG4gIHVwZGF0ZVJlc291cmNlU3RhdGU6ID0+XG4gICAgbmV3U3RhdGUgPSBpZiBAX3dhdGNoaW5nUmVzb3VyY2VzLnNpemUgPD0gMCB0aGVuICdsb2FkZWQnIGVsc2UgJ2xvYWRpbmcnXG4gICAgQHNlbmQgJ3Jlc291cmNlU3RhdGUnLCBuZXdTdGF0ZSBpZiBAcmVzb3VyY2VTdGF0ZSBpc250IG5ld1N0YXRlXG5cbiAgICBAcmVzb3VyY2VTdGF0ZSA9IG5ld1N0YXRlXG5cbiAgaXNPcGVuOiA9PiBAX2lzT3BlblxuICBfc2V0SXNPcGVuOiAoc3RhdGUpID0+XG4gICAgQF9pc09wZW4gPSAhIXN0YXRlXG5cbiAgICBpZiBAX2lzT3BlblxuICAgICAgTWRzTWFuYWdlci5hZGRXaW5kb3cgQF93aW5kb3dfaWQsIEBcbiAgICBlbHNlXG4gICAgICBNZHNNYW5hZ2VyLnJlbW92ZVdpbmRvdyBAX3dpbmRvd19pZFxuXG4gICAgcmV0dXJuIEBfaXNPcGVuXG5cbiAgaXNCdWZmZXJFbXB0eTogPT4gIUBwYXRoIGFuZCBub3QgQGNoYW5nZWRcblxuICBzZW5kOiAoZXZ0LCBhcmdzLi4uKSA9PlxuICAgIHJldHVybiBmYWxzZSB1bmxlc3MgQF93aW5kb3dMb2FkZWQgYW5kIEBicm93c2VyV2luZG93P1xuICAgIEBicm93c2VyV2luZG93LndlYkNvbnRlbnRzLnNlbmQgJ01kc01hbmFnZXJTZW5kRXZlbnQnLCBldnQsIHsgZnJvbTogbnVsbCwgdG86IEBfd2luZG93X2lkIH0sIGFyZ3NcbiJdfQ==
