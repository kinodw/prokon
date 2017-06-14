var MdsFileHistory, MdsMainMenu, MdsMenu, app, dialog, extend, path, ref, shell,
  bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

ref = require('electron'), app = ref.app, dialog = ref.dialog, shell = ref.shell;

extend = require('extend');

path = require('path');

MdsMenu = require('./mds_menu');

MdsFileHistory = require('./mds_file_history');

module.exports = MdsMainMenu = (function() {
  MdsMainMenu.prototype.states = {};

  MdsMainMenu.prototype.window = null;

  MdsMainMenu.prototype.menu = null;

  MdsMainMenu.useAppMenu = process.platform === 'darwin';

  MdsMainMenu.instances = new Map;

  MdsMainMenu.currentMenuId = null;

  function MdsMainMenu(states) {
    var ref1, ref2;
    this.states = states;
    this.updateMenu = bind(this.updateMenu, this);
    this.applyMenu = bind(this.applyMenu, this);
    this.listenWindow = bind(this.listenWindow, this);
    this.mdsWindow = require('./mds_window');
    this.window = ((ref1 = this.states) != null ? ref1.window : void 0) || null;
    this.window_id = ((ref2 = this.window) != null ? ref2.id : void 0) || null;
    MdsMainMenu.instances.set(this.window_id, this);
    this.listenWindow();
    this.updateMenu();
  }

  MdsMainMenu.prototype.listenWindow = function() {
    var resetAppMenu;
    if (this.window == null) {
      return false;
    }
    resetAppMenu = function() {
      MdsMainMenu.currentMenuId = null;
      if (MdsMainMenu.useAppMenu) {
        return MdsMainMenu.instances.get(null).applyMenu();
      }
    };
    this.window.on('focus', (function(_this) {
      return function() {
        MdsMainMenu.currentMenuId = _this.window_id;
        if (MdsMainMenu.useAppMenu) {
          return _this.applyMenu();
        }
      };
    })(this));
    this.window.on('blur', resetAppMenu);
    return this.window.on('closed', (function(_this) {
      return function() {
        MdsMainMenu.instances["delete"](_this.window_id);
        return resetAppMenu();
      };
    })(this));
  };

  MdsMainMenu.prototype.applyMenu = function() {
    if (MdsMainMenu.useAppMenu) {
      if (this.window_id === MdsMainMenu.currentMenuId) {
        return this.menu.object.setAppMenu(this.menu.options);
      }
    } else {
      if (this.window != null) {
        return this.menu.object.setMenu(this.window, this.menu.options);
      }
    }
  };

  MdsMainMenu.updateMenuToAll = function() {
    return MdsMainMenu.instances.forEach(function(m) {
      return m.updateMenu();
    });
  };

  MdsMainMenu.prototype.updateMenu = function() {
    var MdsWindow, ref1, ref2;
    MdsWindow = this.mdsWindow;
    this.menu = {
      object: new MdsMenu([
        {
          label: app.getName(),
          platform: 'darwin',
          submenu: [
            {
              label: 'About',
              role: 'about'
            }, {
              type: 'separator'
            }, {
              label: 'Services',
              role: 'services',
              submenu: []
            }, {
              type: 'separator'
            }, {
              label: 'Hide',
              accelerator: 'Command+H',
              role: 'hide'
            }, {
              label: 'Hide Others',
              accelerator: 'Command+Alt+H',
              role: 'hideothers'
            }, {
              label: 'Show All',
              role: 'unhide'
            }, {
              type: 'separator'
            }, {
              label: 'Quit',
              role: 'quit'
            }
          ]
        }, {
          label: '&File',
          submenu: [
            {
              label: '&New file',
              accelerator: 'CmdOrCtrl+N',
              click: function() {
                return new MdsWindow;
              }
            }, {
              type: 'separator'
            }, {
              label: '&Open...',
              accelerator: 'CmdOrCtrl+O',
              click: function(item, w) {
                var args, ref1;
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
                    return MdsWindow.loadFromFile(fnames[0], w != null ? w.mdsWindow : void 0);
                  }
                ];
                if ((w != null ? (ref1 = w.mdsWindow) != null ? ref1.browserWindow : void 0 : void 0) != null) {
                  args.unshift(w.mdsWindow.browserWindow);
                }
                return dialog.showOpenDialog.apply(this, args);
              }
            }, {
              label: 'Open &Recent',
              submenu: [
                {
                  replacement: 'fileHistory'
                }
              ]
            }, {
              label: 'Reopen with Encoding',
              enabled: !!((ref1 = this.window) != null ? (ref2 = ref1.mdsWindow) != null ? ref2.path : void 0 : void 0),
              submenu: [
                {
                  replacement: 'encodings'
                }
              ]
            }, {
              label: '&Save',
              enabled: this.window != null,
              accelerator: 'CmdOrCtrl+S',
              click: (function(_this) {
                return function() {
                  return _this.window.mdsWindow.trigger('save');
                };
              })(this)
            }, {
              label: 'Save &As...',
              enabled: this.window != null,
              click: (function(_this) {
                return function() {
                  return _this.window.mdsWindow.trigger('saveAs');
                };
              })(this)
            }, {
              type: 'separator'
            }, {
              label: '&Export Slides as PDF...',
              enabled: this.window != null,
              accelerator: 'CmdOrCtrl+Shift+E',
              click: (function(_this) {
                return function() {
                  return _this.window.mdsWindow.trigger('exportPdfDialog');
                };
              })(this)
            }, {
              type: 'separator',
              platform: '!darwin'
            }, {
              label: 'Close',
              role: 'close',
              platform: '!darwin'
            }
          ]
        }, {
          label: '&Edit',
          submenu: [
            {
              label: '&Undo',
              enabled: this.window != null,
              accelerator: 'CmdOrCtrl+Z',
              click: (function(_this) {
                return function() {
                  if (!_this.window.mdsWindow.freeze) {
                    return _this.window.mdsWindow.send('editCommand', 'undo');
                  }
                };
              })(this)
            }, {
              label: '&Redo',
              enabled: this.window != null,
              accelerator: (function() {
                if (process.platform === 'win32') {
                  return 'Control+Y';
                } else {
                  return 'Shift+CmdOrCtrl+Z';
                }
              })(),
              click: (function(_this) {
                return function() {
                  if (!_this.window.mdsWindow.freeze) {
                    return _this.window.mdsWindow.send('editCommand', 'redo');
                  }
                };
              })(this)
            }, {
              type: 'separator'
            }, {
              label: 'Cu&t',
              accelerator: 'CmdOrCtrl+X',
              role: 'cut'
            }, {
              label: '&Copy',
              accelerator: 'CmdOrCtrl+C',
              role: 'copy'
            }, {
              label: '&Paste',
              accelerator: 'CmdOrCtrl+V',
              role: 'paste'
            }, {
              label: '&Delete',
              role: 'delete'
            }, {
              label: 'Select &All',
              enabled: this.window != null,
              accelerator: 'CmdOrCtrl+A',
              click: (function(_this) {
                return function() {
                  if (!_this.window.mdsWindow.freeze) {
                    return _this.window.mdsWindow.send('editCommand', 'selectAll');
                  }
                };
              })(this)
            }
          ]
        }, {
          label: '&View',
          submenu: [
            {
              label: '&Preview Style',
              enabled: this.window != null,
              submenu: [
                {
                  replacement: 'slideViews'
                }
              ]
            }, {
              type: 'separator'
            }, {
              label: 'Toggle &Full Screen',
              accelerator: (function() {
                if (process.platform === 'darwin') {
                  return 'Ctrl+Command+F';
                } else {
                  return 'F11';
                }
              })(),
              role: 'togglefullscreen'
            }, {
              label: 'Presentation',
              click: (function(_this) {
                return function() {
                  console.log('send presentation');
                  return _this.window.mdsWindow.browserWindow.webContents.send('presentation');
                };
              })(this)
            }
          ]
        }, {
          label: 'Window',
          role: 'window',
          platform: 'darwin',
          submenu: [
            {
              label: 'Minimize',
              accelerator: 'CmdOrCtrl+M',
              role: 'minimize'
            }, {
              label: 'Close',
              accelerator: 'CmdOrCtrl+W',
              role: 'close'
            }, {
              type: 'separator'
            }
          ]
        }, {
          label: '&Help',
          role: 'help',
          submenu: []
        }, {
          label: '&Dev',
          visible: (this.states.development != null) && !!this.states.development,
          submenu: [
            {
              label: 'Toggle &Dev Tools',
              enabled: this.window != null,
              accelerator: 'Alt+Ctrl+I',
              click: (function(_this) {
                return function() {
                  return _this.window.toggleDevTools();
                };
              })(this)
            }, {
              label: 'Toggle &Markdown Dev Tools',
              enabled: this.window != null,
              accelerator: 'Alt+Ctrl+Shift+I',
              click: (function(_this) {
                return function() {
                  return _this.window.mdsWindow.send('openDevTool');
                };
              })(this)
            }
          ]
        }
      ]),
      options: {
        replacements: {
          fileHistory: (function(_this) {
            return function() {
              var historyMenu;
              historyMenu = MdsFileHistory.generateMenuItemTemplate(MdsWindow);
              if (historyMenu.length > 0) {
                historyMenu.push({
                  type: 'separator'
                });
              }
              historyMenu.push({
                label: '&Clear Menu',
                enabled: historyMenu.length > 0,
                click: function() {
                  MdsFileHistory.clear();
                  MdsMainMenu.updateMenuToAll();
                  return _this.applyMenu();
                }
              });
              return historyMenu;
            };
          })(this)(),
          slideViews: [
            {
              label: '&Markdown',
              enabled: this.window != null,
              type: this.window != null ? 'radio' : 'normal',
              checked: this.states.viewMode === 'markdown',
              click: (function(_this) {
                return function() {
                  return _this.window.mdsWindow.trigger('viewMode', 'markdown');
                };
              })(this)
            }, {
              label: '1:1 &Slide',
              enabled: this.window != null,
              type: this.window != null ? 'radio' : 'normal',
              checked: this.states.viewMode === 'screen',
              click: (function(_this) {
                return function() {
                  return _this.window.mdsWindow.trigger('viewMode', 'screen');
                };
              })(this)
            }, {
              label: 'Slide &List',
              enabled: this.window != null,
              type: this.window != null ? 'radio' : 'normal',
              checked: this.states.viewMode === 'list',
              click: (function(_this) {
                return function() {
                  return _this.window.mdsWindow.trigger('viewMode', 'list');
                };
              })(this)
            }
          ]
        }
      }
    };
    return this.applyMenu();
  };

  return MdsMainMenu;

})();

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xhc3Nlcy9tZHNfbWFpbl9tZW51LmpzIiwic291cmNlcyI6WyJjbGFzc2VzL21kc19tYWluX21lbnUuY29mZmVlIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLElBQUEsMkVBQUE7RUFBQTs7QUFBQSxNQUF3QixPQUFBLENBQVEsVUFBUixDQUF4QixFQUFDLGFBQUQsRUFBTSxtQkFBTixFQUFjOztBQUNkLE1BQUEsR0FBd0IsT0FBQSxDQUFRLFFBQVI7O0FBQ3hCLElBQUEsR0FBd0IsT0FBQSxDQUFRLE1BQVI7O0FBQ3hCLE9BQUEsR0FBd0IsT0FBQSxDQUFRLFlBQVI7O0FBQ3hCLGNBQUEsR0FBd0IsT0FBQSxDQUFRLG9CQUFSOztBQUV4QixNQUFNLENBQUMsT0FBUCxHQUF1Qjt3QkFDckIsTUFBQSxHQUFROzt3QkFDUixNQUFBLEdBQVE7O3dCQUNSLElBQUEsR0FBTTs7RUFFTixXQUFDLENBQUEsVUFBRCxHQUFhLE9BQU8sQ0FBQyxRQUFSLEtBQW9COztFQUVqQyxXQUFDLENBQUEsU0FBRCxHQUFZLElBQUk7O0VBQ2hCLFdBQUMsQ0FBQSxhQUFELEdBQWdCOztFQUVILHFCQUFDLE1BQUQ7QUFDWCxRQUFBO0lBRFksSUFBQyxDQUFBLFNBQUQ7Ozs7SUFDWixJQUFDLENBQUEsU0FBRCxHQUFhLE9BQUEsQ0FBUSxjQUFSO0lBQ2IsSUFBQyxDQUFBLE1BQUQsdUNBQW9CLENBQUUsZ0JBQVQsSUFBbUI7SUFDaEMsSUFBQyxDQUFBLFNBQUQsdUNBQW9CLENBQUUsWUFBVCxJQUFlO0lBRTVCLFdBQVcsQ0FBQyxTQUFTLENBQUMsR0FBdEIsQ0FBMEIsSUFBQyxDQUFBLFNBQTNCLEVBQXNDLElBQXRDO0lBQ0EsSUFBQyxDQUFBLFlBQUQsQ0FBQTtJQUNBLElBQUMsQ0FBQSxVQUFELENBQUE7RUFQVzs7d0JBU2IsWUFBQSxHQUFjLFNBQUE7QUFDWixRQUFBO0lBQUEsSUFBb0IsbUJBQXBCO0FBQUEsYUFBTyxNQUFQOztJQUVBLFlBQUEsR0FBZSxTQUFBO01BQ2Is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b0IsUUFKL0I7Y0FLRSxLQUFBLEVBQU8sQ0FBQSxTQUFBLEtBQUE7dUJBQUEsU0FBQTt5QkFBRyxLQUFDLENBQUEsTUFBTSxDQUFDLFNBQVMsQ0FBQyxPQUFsQixDQUEwQixVQUExQixFQUFzQyxRQUF0QztnQkFBSDtjQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FMVDthQVJVLEVBZVY7Y0FDRSxLQUFBLEVBQU8sYUFEVDtjQUVFLE9BQUEsRUFBUyxtQkFGWDtjQUdFLElBQUEsRUFBUyxtQkFBSCxHQUFpQixPQUFqQixHQUE4QixRQUh0QztjQUlFLE9BQUEsRUFBUyxJQUFDLENBQUEsTUFBTSxDQUFDLFFBQVIsS0FBb0IsTUFKL0I7Y0FLRSxLQUFBLEVBQU8sQ0FBQSxTQUFBLEtBQUE7dUJBQUEsU0FBQTt5QkFBRyxLQUFDLENBQUEsTUFBTSxDQUFDLFNBQVMsQ0FBQyxPQUFsQixDQUEwQixVQUExQixFQUFzQyxNQUF0QztnQkFBSDtjQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FMVDthQWZVO1dBYlo7U0FERjtPQXhLRjs7V0ErVkYsSUFBQyxDQUFBLFNBQUQsQ0FBQTtFQWxXVSIsInNvdXJjZXNDb250ZW50IjpbInthcHAsIGRpYWxvZywgc2hlbGx9ICA9IHJlcXVpcmUgJ2VsZWN0cm9uJ1xuZXh0ZW5kICAgICAgICAgICAgICAgID0gcmVxdWlyZSAnZXh0ZW5kJ1xucGF0aCAgICAgICAgICAgICAgICAgID0gcmVxdWlyZSAncGF0aCdcbk1kc01lbnUgICAgICAgICAgICAgICA9IHJlcXVpcmUgJy4vbWRzX21lbnUnXG5NZHNGaWxlSGlzdG9yeSAgICAgICAgPSByZXF1aXJlICcuL21kc19maWxlX2hpc3RvcnknXG5cbm1vZHVsZS5leHBvcnRzID0gY2xhc3MgTWRzTWFpbk1lbnVcbiAgc3RhdGVzOiB7fVxuICB3aW5kb3c6IG51bGxcbiAgbWVudTogbnVsbFxuXG4gIEB1c2VBcHBNZW51OiBwcm9jZXNzLnBsYXRmb3JtIGlzICdkYXJ3aW4nXG4gICMg44Km44Kk44Oz44OJ44Km44GU44Go44Gu44Oh44OL44Ol44O844KS566h55CGXG4gIEBpbnN0YW5jZXM6IG5ldyBNYXBcbiAgQGN1cnJlbnRNZW51SWQ6IG51bGxcblxuICBjb25zdHJ1Y3RvcjogKEBzdGF0ZXMpIC0+XG4gICAgQG1kc1dpbmRvdyA9IHJlcXVpcmUgJy4vbWRzX3dpbmRvdydcbiAgICBAd2luZG93ICAgID0gQHN0YXRlcz8ud2luZG93IHx8IG51bGxcbiAgICBAd2luZG93X2lkID0gQHdpbmRvdz8uaWQgfHwgbnVsbFxuXG4gICAgTWRzTWFpbk1lbnUuaW5zdGFuY2VzLnNldCBAd2luZG93X2lkLCBAXG4gICAgQGxpc3RlbldpbmRvdygpXG4gICAgQHVwZGF0ZU1lbnUoKVxuXG4gIGxpc3RlbldpbmRvdzogKCkgPT5cbiAgICByZXR1cm4gZmFsc2UgdW5sZXNzIEB3aW5kb3c/XG5cbiAgICByZXNldEFwcE1lbnUgPSAtPlxuICAgICAgTWRzTWFpbk1lbnUuY3VycmVudE1lbnVJZCA9IG51bGxcbiAgICAgIE1kc01haW5NZW51Lmluc3RhbmNlcy5nZXQobnVsbCkuYXBwbHlNZW51KCkgaWYgTWRzTWFpbk1lbnUudXNlQXBwTWVudVxuXG4gICAgQHdpbmRvdy5vbiAnZm9jdXMnLCA9PlxuICAgICAgTWRzTWFpbk1lbnUuY3VycmVudE1lbnVJZCA9IEB3aW5kb3dfaWRcbiAgICAgIEBhcHBseU1lbnUoKSBpZiBNZHNNYWluTWVudS51c2VBcHBNZW51XG5cbiAgICAjIOOCpuOCo+ODs+ODieOCpuOBruODleOCqeODvOOCq+OCueOBjOWkluOCjOOBn+WgtOWQiFxuICAgIEB3aW5kb3cub24gJ2JsdXInLCByZXNldEFwcE1lbnVcblxuICAgIEB3aW5kb3cub24gJ2Nsb3NlZCcsID0+XG4gICAgICBNZHNNYWluTWVudS5pbnN0YW5jZXMuZGVsZXRlKEB3aW5kb3dfaWQpXG4gICAgICByZXNldEFwcE1lbnUoKVxuXG4gIGFwcGx5TWVudTogKCkgPT5cbiAgICBpZiBNZHNNYWluTWVudS51c2VBcHBNZW51ICMgbWFj44Gg44Gj44Gf44KJXG4gICAgICAjIOOBk+OBruOCpOODs+OCueOCv+ODs+OCueOBruOCpuOCpOODs+ODieOCpklE44GM54++5Zyo5L2/55So44GV44KM44Gm44GE44KL44Km44Kk44Oz44OJ44Km44GuSUTjgafjgYLjgaPjgZ/jgolcbiAgICAgIGlmIEB3aW5kb3dfaWQgPT0gTWRzTWFpbk1lbnUuY3VycmVudE1lbnVJZFxuICAgICAgICBAbWVudS5vYmplY3Quc2V0QXBwTWVudShAbWVudS5vcHRpb25zKVxuICAgIGVsc2VcbiAgICAgIEBtZW51Lm9iamVjdC5zZXRNZW51KEB3aW5kb3csIEBtZW51Lm9wdGlvbnMpIGlmIEB3aW5kb3c/XG5cbiAgIyDjgZnjgbnjgabjga7jgqbjgqTjg7Pjg4njgqbjga7jg6Hjg4vjg6Xjg7zjgpLmm7TmlrBcbiAgQHVwZGF0ZU1lbnVUb0FsbDogKCkgPT5cbiAgICBAaW5zdGFuY2VzLmZvckVhY2ggKG0pIC0+IG0udXBkYXRlTWVudSgpXG5cbiAgdXBkYXRlTWVudTogKCkgPT5cbiAgICBNZHNXaW5kb3cgPSBAbWRzV2luZG93XG4gICAgQG1lbnUgPVxuICAgICAgb2JqZWN0OiBuZXcgTWRzTWVudSBbXG4gICAgICAgIHtcbiAgICAgICAgICBsYWJlbDogYXBwLmdldE5hbWUoKVxuICAgICAgICAgIHBsYXRmb3JtOiAnZGFyd2luJ1xuICAgICAgICAgIHN1Ym1lbnU6IFtcbiAgICAgICAgICAgIHsgbGFiZWw6ICdBYm91dCcsIHJvbGU6ICdhYm91dCcgfVxuICAgICAgICAgICAgeyB0eXBlOiAnc2VwYXJhdG9yJyB9XG4gICAgICAgICAgICB7IGxhYmVsOiAnU2VydmljZXMnLCByb2xlOiAnc2VydmljZXMnLCBzdWJtZW51OiBbXSB9XG4gICAgICAgICAgICB7IHR5cGU6ICdzZXBhcmF0b3InIH1cbiAgICAgICAgICAgIHsgbGFiZWw6ICdIaWRlJywgYWNjZWxlcmF0b3I6ICdDb21tYW5kK0gnLCByb2xlOiAnaGlkZScgfVxuICAgICAgICAgICAgeyBsYWJlbDogJ0hpZGUgT3RoZXJzJywgYWNjZWxlcmF0b3I6ICdDb21tYW5kK0FsdCtIJywgcm9sZTogJ2hpZGVvdGhlcnMnIH1cbiAgICAgICAgICAgIHsgbGFiZWw6ICdTaG93IEFsbCcsIHJvbGU6ICd1bmhpZGUnIH1cbiAgICAgICAgICAgIHsgdHlwZTogJ3NlcGFyYXRvcicgfVxuICAgICAgICAgICAgeyBsYWJlbDogJ1F1aXQnLCByb2xlOiAncXVpdCcgfVxuICAgICAgICAgIF1cbiAgICAgICAgfVxuICAgICAgICB7XG4gICAgICAgICAgbGFiZWw6ICcmRmlsZSdcbiAgICAgICAgICBzdWJtZW51OiBbXG4gICAgICAgICAgICB7IGxhYmVsOiAnJk5ldyBmaWxlJywgYWNjZWxlcmF0b3I6ICdDbWRPckN0cmwrTicsIGNsaWNrOiAtPiBuZXcgTWRzV2luZG93IH1cbiAgICAgICAgICAgIHsgdHlwZTogJ3NlcGFyYXRvcicgfVxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBsYWJlbDogJyZPcGVuLi4uJ1xuICAgICAgICAgICAgICBhY2NlbGVyYXRvcjogJ0NtZE9yQ3RybCtPJ1xuICAgICAgICAgICAgICBjbGljazogKGl0ZW0sIHcpIC0+XG4gICAgICAgICAgICAgICAgYXJncyA9IFtcbiAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGl0bGU6ICdPcGVuJ1xuICAgICAgICAgICAgICAgICAgICBmaWx0ZXJzOiBbXG4gICAgICAgICAgICAgICAgICAgICAgeyBuYW1lOiAnTWFya2Rvd24gZmlsZXMnLCBleHRlbnNpb25zOiBbJ21kJywgJ21kb3duJ10gfVxuICAgICAgICAgICAgICAgICAgICAgIHsgbmFtZTogJ1RleHQgZmlsZScsIGV4dGVuc2lvbnM6IFsndHh0J10gfVxuICAgICAgICAgICAgICAgICAgICAgIHsgbmFtZTogJ0FsbCBmaWxlcycsIGV4dGVuc2lvbnM6IFsnKiddIH1cbiAgICAgICAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiBbJ29wZW5GaWxlJywgJ2NyZWF0ZURpcmVjdG9yeSddXG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAoZm5hbWVzKSAtPlxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdW5sZXNzIGZuYW1lcz9cbiAgICAgICAgICAgICAgICAgICAgTWRzV2luZG93LmxvYWRGcm9tRmlsZSBmbmFtZXNbMF0sIHc/Lm1kc1dpbmRvd1xuICAgICAgICAgICAgICAgIF1cbiAgICAgICAgICAgICAgICBhcmdzLnVuc2hpZnQgdy5tZHNXaW5kb3cuYnJvd3NlcldpbmRvdyBpZiB3Py5tZHNXaW5kb3c/LmJyb3dzZXJXaW5kb3c/XG4gICAgICAgICAgICAgICAgZGlhbG9nLnNob3dPcGVuRGlhbG9nLmFwcGx5IEAsIGFyZ3NcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgbGFiZWw6ICdPcGVuICZSZWNlbnQnXG4gICAgICAgICAgICAgIHN1Ym1lbnU6IFt7IHJlcGxhY2VtZW50OiAnZmlsZUhpc3RvcnknIH1dXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIGxhYmVsOiAnUmVvcGVuIHdpdGggRW5jb2RpbmcnXG4gICAgICAgICAgICAgIGVuYWJsZWQ6ICEhQHdpbmRvdz8ubWRzV2luZG93Py5wYXRoXG4gICAgICAgICAgICAgIHN1Ym1lbnU6IFt7IHJlcGxhY2VtZW50OiAnZW5jb2RpbmdzJyB9XVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgeyBsYWJlbDogJyZTYXZlJywgZW5hYmxlZDogQHdpbmRvdz8sIGFjY2VsZXJhdG9yOiAnQ21kT3JDdHJsK1MnLCBjbGljazogPT4gQHdpbmRvdy5tZHNXaW5kb3cudHJpZ2dlciAnc2F2ZScgfVxuICAgICAgICAgICAgeyBsYWJlbDogJ1NhdmUgJkFzLi4uJywgZW5hYmxlZDogQHdpbmRvdz8sIGNsaWNrOiA9PiBAd2luZG93Lm1kc1dpbmRvdy50cmlnZ2VyICdzYXZlQXMnIH1cbiAgICAgICAgICAgIHsgdHlwZTogJ3NlcGFyYXRvcicgfVxuICAgICAgICAgICAgeyBsYWJlbDogJyZFeHBvcnQgU2xpZGVzIGFzIFBERi4uLicsIGVuYWJsZWQ6IEB3aW5kb3c/LCBhY2NlbGVyYXRvcjogJ0NtZE9yQ3RybCtTaGlmdCtFJywgY2xpY2s6ID0+IEB3aW5kb3cubWRzV2luZG93LnRyaWdnZXIgJ2V4cG9ydFBkZkRpYWxvZycgfVxuICAgICAgICAgICAgeyB0eXBlOiAnc2VwYXJhdG9yJywgcGxhdGZvcm06ICchZGFyd2luJyB9XG4gICAgICAgICAgICB7IGxhYmVsOiAnQ2xvc2UnLCByb2xlOiAnY2xvc2UnLCBwbGF0Zm9ybTogJyFkYXJ3aW4nIH1cbiAgICAgICAgICBdXG4gICAgICAgIH1cbiAgICAgICAge1xuICAgICAgICAgIGxhYmVsOiAnJkVkaXQnXG4gICAgICAgICAgc3VibWVudTogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBsYWJlbDogJyZVbmRvJ1xuICAgICAgICAgICAgICBlbmFibGVkOiBAd2luZG93P1xuICAgICAgICAgICAgICBhY2NlbGVyYXRvcjogJ0NtZE9yQ3RybCtaJ1xuICAgICAgICAgICAgICBjbGljazogPT4gQHdpbmRvdy5tZHNXaW5kb3cuc2VuZCAnZWRpdENvbW1hbmQnLCAndW5kbycgdW5sZXNzIEB3aW5kb3cubWRzV2luZG93LmZyZWV6ZVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBsYWJlbDogJyZSZWRvJ1xuICAgICAgICAgICAgICBlbmFibGVkOiBAd2luZG93P1xuICAgICAgICAgICAgICBhY2NlbGVyYXRvcjogZG8gLT4gaWYgcHJvY2Vzcy5wbGF0Zm9ybSBpcyAnd2luMzInIHRoZW4gJ0NvbnRyb2wrWScgZWxzZSAnU2hpZnQrQ21kT3JDdHJsK1onXG4gICAgICAgICAgICAgIGNsaWNrOiA9PiBAd2luZG93Lm1kc1dpbmRvdy5zZW5kICdlZGl0Q29tbWFuZCcsICdyZWRvJyB1bmxlc3MgQHdpbmRvdy5tZHNXaW5kb3cuZnJlZXplXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB7IHR5cGU6ICdzZXBhcmF0b3InIH1cbiAgICAgICAgICAgIHsgbGFiZWw6ICdDdSZ0JywgYWNjZWxlcmF0b3I6ICdDbWRPckN0cmwrWCcsIHJvbGU6ICdjdXQnIH1cbiAgICAgICAgICAgIHsgbGFiZWw6ICcmQ29weScsIGFjY2VsZXJhdG9yOiAnQ21kT3JDdHJsK0MnLCByb2xlOiAnY29weScgfVxuICAgICAgICAgICAgeyBsYWJlbDogJyZQYXN0ZScsIGFjY2VsZXJhdG9yOiAnQ21kT3JDdHJsK1YnLCByb2xlOiAncGFzdGUnIH1cbiAgICAgICAgICAgIHsgbGFiZWw6ICcmRGVsZXRlJywgcm9sZTogJ2RlbGV0ZScgfVxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBsYWJlbDogJ1NlbGVjdCAmQWxsJ1xuICAgICAgICAgICAgICBlbmFibGVkOiBAd2luZG93P1xuICAgICAgICAgICAgICBhY2NlbGVyYXRvcjogJ0NtZE9yQ3RybCtBJ1xuICAgICAgICAgICAgICBjbGljazogPT4gQHdpbmRvdy5tZHNXaW5kb3cuc2VuZCAnZWRpdENvbW1hbmQnLCAnc2VsZWN0QWxsJyB1bmxlc3MgQHdpbmRvdy5tZHNXaW5kb3cuZnJlZXplXG4gICAgICAgICAgICB9XG4gICAgICAgICAgXVxuICAgICAgICB9XG4gICAgICAgIHtcbiAgICAgICAgICBsYWJlbDogJyZWaWV3J1xuICAgICAgICAgIHN1Ym1lbnU6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgbGFiZWw6ICcmUHJldmlldyBTdHlsZSdcbiAgICAgICAgICAgICAgZW5hYmxlZDogQHdpbmRvdz9cbiAgICAgICAgICAgICAgc3VibWVudTogW3sgcmVwbGFjZW1lbnQ6ICdzbGlkZVZpZXdzJyB9XVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgIyB7XG4gICAgICAgICAgICAjICAgbGFiZWw6ICcmVGhlbWUnXG4gICAgICAgICAgICAjICAgZW5hYmxlZDogQHdpbmRvdz9cbiAgICAgICAgICAgICMgICBzdWJtZW51OiBbeyByZXBsYWNlbWVudDogJ3RoZW1lcycgfV1cbiAgICAgICAgICAgICMgfVxuICAgICAgICAgICAgeyB0eXBlOiAnc2VwYXJhdG9yJyB9XG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIGxhYmVsOiAnVG9nZ2xlICZGdWxsIFNjcmVlbidcbiAgICAgICAgICAgICAgYWNjZWxlcmF0b3I6IGRvIC0+IGlmIHByb2Nlc3MucGxhdGZvcm0gPT0gJ2RhcndpbicgdGhlbiAnQ3RybCtDb21tYW5kK0YnIGVsc2UgJ0YxMSdcbiAgICAgICAgICAgICAgcm9sZTogJ3RvZ2dsZWZ1bGxzY3JlZW4nXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIGxhYmVsOiAnUHJlc2VudGF0aW9uJ1xuICAgICAgICAgICAgICBjbGljazogPT5cbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyAnc2VuZCBwcmVzZW50YXRpb24nXG4gICAgICAgICAgICAgICAgQHdpbmRvdy5tZHNXaW5kb3cuYnJvd3NlcldpbmRvdy53ZWJDb250ZW50cy5zZW5kKCdwcmVzZW50YXRpb24nKTtcblxuICAgICAgICAgICAgfVxuICAgICAgICAgIF1cbiAgICAgICAgfVxuICAgICAgICB7XG4gICAgICAgICAgbGFiZWw6ICdXaW5kb3cnXG4gICAgICAgICAgcm9sZTogJ3dpbmRvdydcbiAgICAgICAgICBwbGF0Zm9ybTogJ2RhcndpbidcbiAgICAgICAgICBzdWJtZW51OiBbXG4gICAgICAgICAgICB7IGxhYmVsOiAnTWluaW1pemUnLCBhY2NlbGVyYXRvcjogJ0NtZE9yQ3RybCtNJywgcm9sZTogJ21pbmltaXplJyB9XG4gICAgICAgICAgICB7IGxhYmVsOiAnQ2xvc2UnLCBhY2NlbGVyYXRvcjogJ0NtZE9yQ3RybCtXJywgcm9sZTogJ2Nsb3NlJyB9XG4gICAgICAgICAgICB7IHR5cGU6ICdzZXBhcmF0b3InIH1cbiAgICAgICAgICAgICMgeyBsYWJlbDogJ0JyaW5nIEFsbCB0byBGcm9udCcsIHJvbGU6ICdmcm9udCcgfVxuICAgICAgICAgIF1cbiAgICAgICAgfVxuICAgICAgICB7XG4gICAgICAgICAgbGFiZWw6ICcmSGVscCdcbiAgICAgICAgICByb2xlOiAnaGVscCdcbiAgICAgICAgICBzdWJtZW51OiBbXG4gICAgICAgICAgICAjIHsgbGFiZWw6ICdWaXNpdCBNYXJwICZXZWJzaXRlJywgY2xpY2s6IC0+IHNoZWxsLm9wZW5FeHRlcm5hbCgnaHR0cHM6Ly95aGF0dC5naXRodWIuaW8vbWFycC8nKSB9XG4gICAgICAgICAgICAjIHsgbGFiZWw6ICcmUmVsZWFzZSBOb3RlcycsIGNsaWNrOiAtPiBzaGVsbC5vcGVuRXh0ZXJuYWwoJ2h0dHBzOi8vZ2l0aHViLmNvbS95aGF0dC9tYXJwL3JlbGVhc2VzJykgfVxuICAgICAgICAgICAgIyB7IHR5cGU6ICdzZXBhcmF0b3InIH1cbiAgICAgICAgICAgICMge1xuICAgICAgICAgICAgIyAgIGxhYmVsOiAnT3BlbiAmRXhhbXBsZXMnXG4gICAgICAgICAgICAjICAgc3VibWVudTogW1xuICAgICAgICAgICAgIyAgICAge1xuICAgICAgICAgICAgIyAgICAgICBsYWJlbDogJyZNYXJwIGJhc2ljIGV4YW1wbGUnLFxuICAgICAgICAgICAgIyAgICAgICBjbGljazogKGl0ZW0sIHcpIC0+XG4gICAgICAgICAgICAjICAgICAgICAgTWRzV2luZG93LmxvYWRGcm9tRmlsZShcbiAgICAgICAgICAgICMgICAgICAgICAgIHBhdGguam9pbihfX2Rpcm5hbWUsICcuLi8uLi9leGFtcGxlLm1kJyksXG4gICAgICAgICAgICAjICAgICAgICAgICB3Py5tZHNXaW5kb3csIHsgaWdub3JlUmVjZW50OiB0cnVlIH1cbiAgICAgICAgICAgICMgICAgICAgICApXG4gICAgICAgICAgICAjICAgICB9XG4gICAgICAgICAgICAjICAgICB7IHR5cGU6ICdzZXBhcmF0b3InIH1cbiAgICAgICAgICAgICMgICAgIHtcbiAgICAgICAgICAgICMgICAgICAgbGFiZWw6ICcmR2FpYSB0aGVtZScsXG4gICAgICAgICAgICAjICAgICAgIGNsaWNrOiAoaXRlbSwgdykgLT5cbiAgICAgICAgICAgICMgICAgICAgICBNZHNXaW5kb3cubG9hZEZyb21GaWxlKFxuICAgICAgICAgICAgIyAgICAgICAgICAgcGF0aC5qb2luKF9fZGlybmFtZSwgJy4uLy4uL2V4YW1wbGVzL2dhaWEubWQnKSxcbiAgICAgICAgICAgICMgICAgICAgICAgIHc/Lm1kc1dpbmRvdywgeyBpZ25vcmVSZWNlbnQ6IHRydWUgfVxuICAgICAgICAgICAgIyAgICAgICAgIClcbiAgICAgICAgICAgICMgICAgIH1cbiAgICAgICAgICAgICMgICBdXG4gICAgICAgICAgICAjIH1cbiAgICAgICAgICBdXG4gICAgICAgIH1cbiAgICAgICAge1xuICAgICAgICAgIGxhYmVsOiAnJkRldidcbiAgICAgICAgICB2aXNpYmxlOiBAc3RhdGVzLmRldmVsb3BtZW50PyBhbmQgISFAc3RhdGVzLmRldmVsb3BtZW50XG4gICAgICAgICAgc3VibWVudTogW1xuICAgICAgICAgICAgeyBsYWJlbDogJ1RvZ2dsZSAmRGV2IFRvb2xzJywgZW5hYmxlZDogQHdpbmRvdz8sIGFjY2VsZXJhdG9yOiAnQWx0K0N0cmwrSScsIGNsaWNrOiA9PiBAd2luZG93LnRvZ2dsZURldlRvb2xzKCkgfVxuICAgICAgICAgICAgeyBsYWJlbDogJ1RvZ2dsZSAmTWFya2Rvd24gRGV2IFRvb2xzJywgZW5hYmxlZDogQHdpbmRvdz8sIGFjY2VsZXJhdG9yOiAnQWx0K0N0cmwrU2hpZnQrSScsIGNsaWNrOiA9PiBAd2luZG93Lm1kc1dpbmRvdy5zZW5kICdvcGVuRGV2VG9vbCcgfVxuICAgICAgICAgIF1cbiAgICAgICAgfVxuICAgICAgXVxuXG4gICAgICBvcHRpb25zOlxuICAgICAgICByZXBsYWNlbWVudHM6XG4gICAgICAgICAgZmlsZUhpc3Rvcnk6IGRvID0+XG4gICAgICAgICAgICBoaXN0b3J5TWVudSA9IE1kc0ZpbGVIaXN0b3J5LmdlbmVyYXRlTWVudUl0ZW1UZW1wbGF0ZShNZHNXaW5kb3cpXG4gICAgICAgICAgICBoaXN0b3J5TWVudS5wdXNoIHsgdHlwZTogJ3NlcGFyYXRvcicgfSBpZiBoaXN0b3J5TWVudS5sZW5ndGggPiAwXG4gICAgICAgICAgICBoaXN0b3J5TWVudS5wdXNoXG4gICAgICAgICAgICAgIGxhYmVsOiAnJkNsZWFyIE1lbnUnXG4gICAgICAgICAgICAgIGVuYWJsZWQ6IGhpc3RvcnlNZW51Lmxlbmd0aCA+IDBcbiAgICAgICAgICAgICAgY2xpY2s6ID0+XG4gICAgICAgICAgICAgICAgTWRzRmlsZUhpc3RvcnkuY2xlYXIoKVxuICAgICAgICAgICAgICAgIE1kc01haW5NZW51LnVwZGF0ZU1lbnVUb0FsbCgpXG4gICAgICAgICAgICAgICAgQGFwcGx5TWVudSgpXG5cbiAgICAgICAgICAgIHJldHVybiBoaXN0b3J5TWVudVxuXG4gICAgICAgICAgc2xpZGVWaWV3czogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBsYWJlbDogJyZNYXJrZG93bidcbiAgICAgICAgICAgICAgZW5hYmxlZDogQHdpbmRvdz9cbiAgICAgICAgICAgICAgdHlwZTogaWYgQHdpbmRvdz8gdGhlbiAncmFkaW8nIGVsc2UgJ25vcm1hbCdcbiAgICAgICAgICAgICAgY2hlY2tlZDogQHN0YXRlcy52aWV3TW9kZSA9PSAnbWFya2Rvd24nXG4gICAgICAgICAgICAgIGNsaWNrOiA9PiBAd2luZG93Lm1kc1dpbmRvdy50cmlnZ2VyICd2aWV3TW9kZScsICdtYXJrZG93bidcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgbGFiZWw6ICcxOjEgJlNsaWRlJ1xuICAgICAgICAgICAgICBlbmFibGVkOiBAd2luZG93P1xuICAgICAgICAgICAgICB0eXBlOiBpZiBAd2luZG93PyB0aGVuICdyYWRpbycgZWxzZSAnbm9ybWFsJ1xuICAgICAgICAgICAgICBjaGVja2VkOiBAc3RhdGVzLnZpZXdNb2RlID09ICdzY3JlZW4nXG4gICAgICAgICAgICAgIGNsaWNrOiA9PiBAd2luZG93Lm1kc1dpbmRvdy50cmlnZ2VyICd2aWV3TW9kZScsICdzY3JlZW4nXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIGxhYmVsOiAnU2xpZGUgJkxpc3QnXG4gICAgICAgICAgICAgIGVuYWJsZWQ6IEB3aW5kb3c/XG4gICAgICAgICAgICAgIHR5cGU6IGlmIEB3aW5kb3c/IHRoZW4gJ3JhZGlvJyBlbHNlICdub3JtYWwnXG4gICAgICAgICAgICAgIGNoZWNrZWQ6IEBzdGF0ZXMudmlld01vZGUgPT0gJ2xpc3QnXG4gICAgICAgICAgICAgIGNsaWNrOiA9PiBAd2luZG93Lm1kc1dpbmRvdy50cmlnZ2VyICd2aWV3TW9kZScsICdsaXN0J1xuICAgICAgICAgICAgfVxuICAgICAgICAgIF1cblxuICAgICAgICAgICMgdGhlbWVzOiBbXG4gICAgICAgICAgIyAgIHtcbiAgICAgICAgICAjICAgICBsYWJlbDogJyZEZWZhdWx0J1xuICAgICAgICAgICMgICAgIGVuYWJsZWQ6IEB3aW5kb3c/XG4gICAgICAgICAgIyAgICAgdHlwZTogaWYgQHdpbmRvdz8gdGhlbiAncmFkaW8nIGVsc2UgJ25vcm1hbCdcbiAgICAgICAgICAjICAgICBjaGVja2VkOiAhQHN0YXRlcz8udGhlbWUgfHwgQHN0YXRlcy50aGVtZSA9PSAnZGVmYXVsdCdcbiAgICAgICAgICAjICAgICBjbGljazogPT4gQHdpbmRvdy5tZHNXaW5kb3cuc2VuZCAnc2V0VGhlbWUnLCAnZGVmYXVsdCcgdW5sZXNzIEB3aW5kb3cubWRzV2luZG93LmZyZWV6ZVxuICAgICAgICAgICMgICB9XG4gICAgICAgICAgIyAgIHtcbiAgICAgICAgICAjICAgICBsYWJlbDogJyZHYWlhJ1xuICAgICAgICAgICMgICAgIGVuYWJsZWQ6IEB3aW5kb3c/XG4gICAgICAgICAgIyAgICAgdHlwZTogaWYgQHdpbmRvdz8gdGhlbiAncmFkaW8nIGVsc2UgJ25vcm1hbCdcbiAgICAgICAgICAjICAgICBjaGVja2VkOiBAc3RhdGVzLnRoZW1lID09ICdnYWlhJ1xuICAgICAgICAgICMgICAgIGNsaWNrOiA9PiBAd2luZG93Lm1kc1dpbmRvdy5zZW5kICdzZXRUaGVtZScsICdnYWlhJyB1bmxlc3MgQHdpbmRvdy5tZHNXaW5kb3cuZnJlZXplXG4gICAgICAgICAgIyAgIH1cbiAgICAgICAgICAjIF1cblxuICAgICAgICAgICMgZW5jb2RpbmdzOiBkbyA9PlxuICAgICAgICAgICMgICBpbmplY3RBbGwgPSAoaXRlbXMpID0+XG4gICAgICAgICAgIyAgICAgaW5qZWN0ID0gKGl0ZW0pID0+XG4gICAgICAgICAgIyAgICAgICBpdGVtLmVuYWJsZWQgPSAhIUB3aW5kb3c/Lm1kc1dpbmRvdz8ucGF0aFxuXG4gICAgICAgICAgIyAgICAgICBpZiBpdGVtLmVuY29kaW5nP1xuICAgICAgICAgICMgICAgICAgICBpdGVtLmNsaWNrID0gPT4gQHdpbmRvdy5tZHNXaW5kb3cudHJpZ2dlciAncmVvcGVuJywgeyBlbmNvZGluZzogaXRlbS5lbmNvZGluZyB9XG5cbiAgICAgICAgICAjICAgICAgIGluamVjdEFsbChpdGVtLnN1Ym1lbnUpIGlmIGl0ZW0uc3VibWVudT9cbiAgICAgICAgICAjICAgICAgIGl0ZW1cblxuICAgICAgICAgICMgICAgIGluamVjdChpKSBmb3IgaSBpbiBpdGVtc1xuXG4gICAgICAgICAgIyAgIGluamVjdEFsbCBbXG4gICAgICAgICAgIyAgICAgeyBsYWJlbDogJ1VURi04IChEZWZhdWx0KScsIGVuY29kaW5nOiAndXRmOCcgfVxuICAgICAgICAgICMgICAgIHsgbGFiZWw6ICdVVEYtMTZMRScsIGVuY29kaW5nOiAndXRmMTZsZScgfVxuICAgICAgICAgICMgICAgIHsgbGFiZWw6ICdVVEYtMTZCRScsIGVuY29kaW5nOiAndXRmMTZiZScgfVxuICAgICAgICAgICMgICAgIHsgdHlwZTogJ3NlcGFyYXRvcicgfVxuICAgICAgICAgICMgICAgIHtcbiAgICAgICAgICAjICAgICAgIGxhYmVsOiAnV2VzdGVybidcbiAgICAgICAgICAjICAgICAgIHN1Ym1lbnU6IFtcbiAgICAgICAgICAjICAgICAgICAgeyBsYWJlbDogJ1dpbmRvd3MgMTI1MicsIGVuY29kaW5nOiAnd2luZG93czEyNTInIH1cbiAgICAgICAgICAjICAgICAgICAgeyBsYWJlbDogJ0lTTyA4ODU5LTEnLCBlbmNvZGluZzogJ2lzbzg4NTkxJyB9XG4gICAgICAgICAgIyAgICAgICAgIHsgbGFiZWw6ICdJU08gODg1OS0zJywgZW5jb2Rpbmc6ICdpc284ODU5MycgfVxuICAgICAgICAgICMgICAgICAgICB7IGxhYmVsOiAnSVNPIDg4NTktMTUnLCBlbmNvZGluZzogJ2lzbzg4NTkxNScgfVxuICAgICAgICAgICMgICAgICAgICB7IGxhYmVsOiAnTWFjIFJvbWFuJywgZW5jb2Rpbmc6ICdtYWNyb21hbicgfVxuICAgICAgICAgICMgICAgICAgXVxuICAgICAgICAgICMgICAgIH1cbiAgICAgICAgICAjICAgICB7XG4gICAgICAgICAgIyAgICAgICBsYWJlbDogJ0FyYWJpYydcbiAgICAgICAgICAjICAgICAgIHN1Ym1lbnU6IFtcbiAgICAgICAgICAjICAgICAgICAgeyBsYWJlbDogJ1dpbmRvd3MgMTI1NicsIGVuY29kaW5nOiAnd2luZG93czEyNTYnIH1cbiAgICAgICAgICAjICAgICAgICAgeyBsYWJlbDogJ0lTTyA4ODU5LTYnLCBlbmNvZGluZzogJ2lzbzg4NTk2JyB9XG4gICAgICAgICAgIyAgICAgICBdXG4gICAgICAgICAgIyAgICAgfVxuICAgICAgICAgICMgICAgIHtcbiAgICAgICAgICAjICAgICAgIGxhYmVsOiAnQmFsdGljJ1xuICAgICAgICAgICMgICAgICAgc3VibWVudTogW1xuICAgICAgICAgICMgICAgICAgICB7IGxhYmVsOiAnV2luZG93cyAxMjU3JywgZW5jb2Rpbmc6ICd3aW5kb3dzMTI1NycgfVxuICAgICAgICAgICMgICAgICAgICB7IGxhYmVsOiAnSVNPIDg4NTktNCcsIGVuY29kaW5nOiAnaXNvODg1OTQnIH1cbiAgICAgICAgICAjICAgICAgIF1cbiAgICAgICAgICAjICAgICB9XG4gICAgICAgICAgIyAgICAge1xuICAgICAgICAgICMgICAgICAgbGFiZWw6ICdDZWx0aWMnXG4gICAgICAgICAgIyAgICAgICBzdWJtZW51OiBbeyBsYWJlbDogJ0lTTyA4ODU5LTE0JywgZW5jb2Rpbmc6ICdpc284ODU5MTQnIH1dXG4gICAgICAgICAgIyAgICAgfVxuICAgICAgICAgICMgICAgIHtcbiAgICAgICAgICAjICAgICAgIGxhYmVsOiAnQ2VudHJhbCBFdXJvcGVhbidcbiAgICAgICAgICAjICAgICAgIHN1Ym1lbnU6IFtcbiAgICAgICAgICAjICAgICAgICAgeyBsYWJlbDogJ1dpbmRvd3MgMTI1MCcsIGVuY29kaW5nOiAnd2luZG93czEyNTAnIH1cbiAgICAgICAgICAjICAgICAgICAgeyBsYWJlbDogJ0lTTyA4ODU5LTInLCBlbmNvZGluZzogJ2lzbzg4NTkyJyB9XG4gICAgICAgICAgIyAgICAgICBdXG4gICAgICAgICAgIyAgICAgfVxuICAgICAgICAgICMgICAgIHtcbiAgICAgICAgICAjICAgICAgIGxhYmVsOiAnQ3lyaWxsaWMnXG4gICAgICAgICAgIyAgICAgICBzdWJtZW51OiBbXG4gICAgICAgICAgIyAgICAgICAgIHsgbGFiZWw6ICdXaW5kb3dzIDEyNTEnLCBlbmNvZGluZzogJ3dpbmRvd3MxMjUxJyB9XG4gICAgICAgICAgIyAgICAgICAgIHsgbGFiZWw6ICdDUCA4NjYnLCBlbmNvZGluZzogJ2NwODY2JyB9XG4gICAgICAgICAgIyAgICAgICAgIHsgbGFiZWw6ICdJU08gODg1OS01JywgZW5jb2Rpbmc6ICdpc284ODU5NScgfVxuICAgICAgICAgICMgICAgICAgICB7IGxhYmVsOiAnS09JOC1SJywgZW5jb2Rpbmc6ICdrb2k4cicgfVxuICAgICAgICAgICMgICAgICAgICB7IGxhYmVsOiAnS09JOC1VJywgZW5jb2Rpbmc6ICdrb2k4dScgfVxuICAgICAgICAgICMgICAgICAgXVxuICAgICAgICAgICMgICAgIH1cbiAgICAgICAgICAjICAgICB7XG4gICAgICAgICAgIyAgICAgICBsYWJlbDogJ0VzdG9uaWFuJ1xuICAgICAgICAgICMgICAgICAgc3VibWVudTogW3sgbGFiZWw6ICdJU08gODg1OS0xMycsIGVuY29kaW5nOiAnaXNvODg1OTEzJyB9XVxuICAgICAgICAgICMgICAgIH1cbiAgICAgICAgICAjICAgICB7XG4gICAgICAgICAgIyAgICAgICBsYWJlbDogJ0dyZWVrJ1xuICAgICAgICAgICMgICAgICAgc3VibWVudTogW1xuICAgICAgICAgICMgICAgICAgICB7IGxhYmVsOiAnV2luZG93cyAxMjUzJywgZW5jb2Rpbmc6ICd3aW5kb3dzMTI1MycgfVxuICAgICAgICAgICMgICAgICAgICB7IGxhYmVsOiAnSVNPIDg4NTktNycsIGVuY29kaW5nOiAnaXNvODg1OTcnIH1cbiAgICAgICAgICAjICAgICAgIF1cbiAgICAgICAgICAjICAgICB9XG4gICAgICAgICAgIyAgICAge1xuICAgICAgICAgICMgICAgICAgbGFiZWw6ICdIZWJyZXcnXG4gICAgICAgICAgIyAgICAgICBzdWJtZW51OiBbXG4gICAgICAgICAgIyAgICAgICAgIHsgbGFiZWw6ICdXaW5kb3dzIDEyNTUnLCBlbmNvZGluZzogJ3dpbmRvd3MxMjU1JyB9XG4gICAgICAgICAgIyAgICAgICAgIHsgbGFiZWw6ICdJU08gODg1OS04JywgZW5jb2Rpbmc6ICdpc284ODU5OCcgfVxuICAgICAgICAgICMgICAgICAgXVxuICAgICAgICAgICMgICAgIH1cbiAgICAgICAgICAjICAgICB7XG4gICAgICAgICAgIyAgICAgICBsYWJlbDogJ05vcmRpYydcbiAgICAgICAgICAjICAgICAgIHN1Ym1lbnU6IFt7IGxhYmVsOiAnSVNPIDg4NTktMTAnLCBlbmNvZGluZzogJ2lzbzg4NTkxMCcgfV1cbiAgICAgICAgICAjICAgICB9XG4gICAgICAgICAgIyAgICAge1xuICAgICAgICAgICMgICAgICAgbGFiZWw6ICdSb21hbmlhbidcbiAgICAgICAgICAjICAgICAgIHN1Ym1lbnU6IFt7IGxhYmVsOiAnSVNPIDg4NTktMTYnLCBlbmNvZGluZzogJ2lzbzg4NTkxNicgfV1cbiAgICAgICAgICAjICAgICB9XG4gICAgICAgICAgIyAgICAge1xuICAgICAgICAgICMgICAgICAgbGFiZWw6ICdUdXJraXNoJ1xuICAgICAgICAgICMgICAgICAgc3VibWVudTogW1xuICAgICAgICAgICMgICAgICAgICB7IGxhYmVsOiAnV2luZG93cyAxMjU0JywgZW5jb2Rpbmc6ICd3aW5kb3dzMTI1NCcgfVxuICAgICAgICAgICMgICAgICAgICB7IGxhYmVsOiAnSVNPIDg4NTktOScsIGVuY29kaW5nOiAnaXNvODg1OTknIH1cbiAgICAgICAgICAjICAgICAgIF1cbiAgICAgICAgICAjICAgICB9XG4gICAgICAgICAgIyAgICAge1xuICAgICAgICAgICMgICAgICAgbGFiZWw6ICdWaWV0bmFtZXNlJ1xuICAgICAgICAgICMgICAgICAgc3VibWVudTogW3sgbGFiZWw6ICdXaW5kb3dzIDEyNTQnLCBlbmNvZGluZzogJ3dpbmRvd3MxMjU4JyB9XVxuICAgICAgICAgICMgICAgIH1cbiAgICAgICAgICAjICAgICB7XG4gICAgICAgICAgIyAgICAgICBsYWJlbDogJ0NoaW5lc2UnXG4gICAgICAgICAgIyAgICAgICBzdWJtZW51OiBbXG4gICAgICAgICAgIyAgICAgICAgIHsgbGFiZWw6ICdHQksnLCBlbmNvZGluZzogJ2diaycgfVxuICAgICAgICAgICMgICAgICAgICB7IGxhYmVsOiAnR0IxODAzMCcsIGVuY29kaW5nOiAnZ2IxODAzMCcgfVxuICAgICAgICAgICMgICAgICAgICB7IHR5cGU6ICdzZXBhcmF0b3InIH1cbiAgICAgICAgICAjICAgICAgICAgeyBsYWJlbDogJ0JpZzUnLCBlbmNvZGluZzogJ2NwOTUwJyB9XG4gICAgICAgICAgIyAgICAgICAgIHsgbGFiZWw6ICdCaWc1LUhLU0NTJywgZW5jb2Rpbmc6ICdiaWc1aGtzY3MnIH1cbiAgICAgICAgICAjICAgICAgIF1cbiAgICAgICAgICAjICAgICB9XG4gICAgICAgICAgIyAgICAge1xuICAgICAgICAgICMgICAgICAgbGFiZWw6ICdKYXBhbmVzZSdcbiAgICAgICAgICAjICAgICAgIHN1Ym1lbnU6IFtcbiAgICAgICAgICAjICAgICAgICAgeyBsYWJlbDogJ1NoaWZ0IEpJUycsIGVuY29kaW5nOiAnc2hpZnRqaXMnIH1cbiAgICAgICAgICAjICAgICAgICAgeyBsYWJlbDogJ0VVQy1KUCcsIGVuY29kaW5nOiAnZXVjanAnIH1cbiAgICAgICAgICAjICAgICAgICAgeyBsYWJlbDogJ0NQIDkzMicsIGVuY29kaW5nOiAnY3A5MzInIH1cbiAgICAgICAgICAjICAgICAgIF1cbiAgICAgICAgICAjICAgICB9XG4gICAgICAgICAgIyAgICAge1xuICAgICAgICAgICMgICAgICAgbGFiZWw6ICdLb3JlYW4nXG4gICAgICAgICAgIyAgICAgICBzdWJtZW51OiBbeyBsYWJlbDogJ0VVQy1LUicsIGVuY29kaW5nOiAnZXVja3InIH1dXG4gICAgICAgICAgIyAgICAgfVxuICAgICAgICAgICMgICAgIHtcbiAgICAgICAgICAjICAgICAgIGxhYmVsOiAnT3RoZXInXG4gICAgICAgICAgIyAgICAgICBzdWJtZW51OiBbeyBsYWJlbDogJ0NQIDQzNyAoRE9TKScsIGVuY29kaW5nOiAnY3A0MzcnIH1dXG4gICAgICAgICAgIyAgICAgfVxuICAgICAgICAgICMgICBdXG5cbiAgICBAYXBwbHlNZW51KClcbiJdfQ==
