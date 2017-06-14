var BrowserWindow, MdsFileHistory, MdsMainMenu, MdsManager, MdsMenu, MdsPresenWindow, MdsWindow, Path, dialog, electron, extend, fs, iconv_lite, ipc, jschardet, ref,
  extend1 = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

MdsWindow = require('./mds_window');

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

electron = require('electron');

ipc = electron.ipcMain;

module.exports = MdsPresenWindow = (function(superClass) {
  extend1(MdsPresenWindow, superClass);

  function MdsPresenWindow(fileOpts, options, slideHTML) {
    var slide;
    if (fileOpts == null) {
      fileOpts = {};
    }
    this.options = options != null ? options : {};
    this.path = (fileOpts != null ? fileOpts.path : void 0) || null;
    slide = slideHTML;
    this.viewMode = 'presen-dev';
    this.browserWindow = (function(_this) {
      return function() {
        var bw, loadCmp, updateWindowPosition;
        bw = new BrowserWindow(extend(true, {}, MdsWindow.defOptions(), _this.options));
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
        bw.loadURL("file://" + __dirname + "/../../presen.html");
        bw.webContents.on('did-finish-load', function() {
          _this._windowLoaded = true;
          _this.send('setSplitter', 0.65);
          _this.send('setEditorConfig', global.marp.config.get('editor'));
          _this.trigger('load', (fileOpts != null ? fileOpts.buffer : void 0) || '', _this.path);
          return bw.webContents.send('presenDevInitialize', slide);
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

  return MdsPresenWindow;

})(MdsWindow);

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xhc3Nlcy9tZHNfcHJlc2VuX3dpbmRvdy5qcyIsInNvdXJjZXMiOlsiY2xhc3Nlcy9tZHNfcHJlc2VuX3dpbmRvdy5jb2ZmZWUiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsSUFBQSxnS0FBQTtFQUFBOzs7QUFBQSxTQUFBLEdBQVksT0FBQSxDQUFRLGNBQVI7O0FBQ1osTUFBMEIsT0FBQSxDQUFRLFVBQVIsQ0FBMUIsRUFBQyxpQ0FBRCxFQUFnQjs7QUFFaEIsVUFBQSxHQUFpQixPQUFBLENBQVEsZUFBUjs7QUFDakIsT0FBQSxHQUFpQixPQUFBLENBQVEsWUFBUjs7QUFDakIsV0FBQSxHQUFpQixPQUFBLENBQVEsaUJBQVI7O0FBQ2pCLGNBQUEsR0FBaUIsT0FBQSxDQUFRLG9CQUFSOztBQUNqQixNQUFBLEdBQWlCLE9BQUEsQ0FBUSxRQUFSOztBQUNqQixFQUFBLEdBQWlCLE9BQUEsQ0FBUSxJQUFSOztBQUNqQixTQUFBLEdBQWlCLE9BQUEsQ0FBUSxXQUFSOztBQUNqQixVQUFBLEdBQWlCLE9BQUEsQ0FBUSxZQUFSOztBQUNqQixJQUFBLEdBQWlCLE9BQUEsQ0FBUSxNQUFSOztBQUNqQixRQUFBLEdBQWlCLE9BQUEsQ0FBUSxVQUFSOztBQUNqQixHQUFBLEdBQWEsUUFBUSxDQUFDOztBQUV0QixNQUFNLENBQUMsT0FBUCxHQUF1Qjs7O0VBQ04seUJBQUMsUUFBRCxFQUFnQixPQUFoQixFQUErQixTQUEvQjtBQUNULFFBQUE7O01BRFUsV0FBVzs7SUFBSSxJQUFDLENBQUEsNEJBQUQsVUFBVztJQUNwQyxJQUFDLENBQUEsSUFBRCx1QkFBUSxRQUFRLENBQUUsY0FBVixJQUFrQjtJQUMxQixLQUFBLEdBQVE7SUFJUixJQUFDLENBQUEsUUFBRCxHQUFZO0lBRVosSUFBQyxDQUFBLGFBQUQsR0FBb0IsQ0FBQSxTQUFBLEtBQUE7YUFBQSxTQUFBO0FBRWxCLFlBQUE7UUFBQSxFQUFBLEdBQUssSUFBSSxhQUFKLENBQWtCLE1BQUEsQ0FBTyxJQUFQLEVB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QUl2QixFQUFFLENBQUMsRUFBSCxDQUFNLE1BQU4sRUFBYyxvQkFBZDtRQUNBLEVBQUUsQ0FBQyxFQUFILENBQU0sUUFBTixFQUFnQixvQkFBaEI7UUFDQSxFQUFFLENBQUMsRUFBSCxDQUFNLFVBQU4sRUFBa0Isb0JBQWxCO1FBQ0EsRUFBRSxDQUFDLEVBQUgsQ0FBTSxZQUFOLEVBQW9CLG9CQUFwQjtRQUVBLEVBQUUsQ0FBQyxTQUFILEdBQWU7ZUFDZjtNQTdEa0I7SUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBQUgsQ0FBQTtJQStEakIsSUFBQyxDQUFBLFVBQUQsQ0FBWSxJQUFaO0VBdkVTOzs7O0dBRDhCIiwic291cmNlc0NvbnRlbnQiOlsiTWRzV2luZG93ID0gcmVxdWlyZSAnLi9tZHNfd2luZG93J1xue0Jyb3dzZXJXaW5kb3csIGRpYWxvZ30gPSByZXF1aXJlICdlbGVjdHJvbidcblxuTWRzTWFuYWdlciAgICAgPSByZXF1aXJlICcuL21kc19tYW5hZ2VyJ1xuTWRzTWVudSAgICAgICAgPSByZXF1aXJlICcuL21kc19tZW51J1xuTWRzTWFpbk1lbnUgICAgPSByZXF1aXJlICcuL21kc19tYWluX21lbnUnXG5NZHNGaWxlSGlzdG9yeSA9IHJlcXVpcmUgJy4vbWRzX2ZpbGVfaGlzdG9yeSdcbmV4dGVuZCAgICAgICAgID0gcmVxdWlyZSAnZXh0ZW5kJ1xuZnMgICAgICAgICAgICAgPSByZXF1aXJlICdmcydcbmpzY2hhcmRldCAgICAgID0gcmVxdWlyZSAnanNjaGFyZGV0J1xuaWNvbnZfbGl0ZSAgICAgPSByZXF1aXJlICdpY29udi1saXRlJ1xuUGF0aCAgICAgICAgICAgPSByZXF1aXJlICdwYXRoJ1xuZWxlY3Ryb24gICAgICAgPSByZXF1aXJlICdlbGVjdHJvbidcbmlwYyAgICAgICAgPSBlbGVjdHJvbi5pcGNNYWluXG5cbm1vZHVsZS5leHBvcnRzID0gY2xhc3MgTWRzUHJlc2VuV2luZG93IGV4dGVuZHMgTWRzV2luZG93XG4gICAgY29uc3RydWN0b3I6IChmaWxlT3B0cyA9IHt9LCBAb3B0aW9ucyA9IHt9LCBzbGlkZUhUTUwpIC0+XG4gICAgICAgIEBwYXRoID0gZmlsZU9wdHM/LnBhdGggfHwgbnVsbFxuICAgICAgICBzbGlkZSA9IHNsaWRlSFRNTFxuXG4gICAgICAgICNAdmlld01vZGUgPSBnbG9iYWwubWFycC5jb25maWcuZ2V0KCd2aWV3TW9kZScpXG5cbiAgICAgICAgQHZpZXdNb2RlID0gJ3ByZXNlbi1kZXYnXG5cbiAgICAgICAgQGJyb3dzZXJXaW5kb3cgPSBkbyA9PlxuICAgICAgICAgICMg5Yid5pyf6Kit5a6ab3B0aW9ucyDjgaggQG9wdGlvbnMg44KS44Oe44O844K444GX44Gm5Yid5pyf5YyW44CB44Km44Kk44Oz44OJ44KmSUToqK3lrppcbiAgICAgICAgICBidyA9IG5ldyBCcm93c2VyV2luZG93IGV4dGVuZCh0cnVlLCB7fSwgTWRzV2luZG93LmRlZk9wdGlvbnMoKSwgQG9wdGlvbnMpXG4gICAgICAgICAgQF93aW5kb3dfaWQgPSBidy5pZFxuXG4gICAgICAgICAgbG9hZENtcCA9IChkZXRhaWxzKSA9PlxuICAgICAgICAgICAgc2V0VGltZW91dCA9PlxuICAgICAgICAgICAgICBAX3dhdGNoaW5nUmVzb3VyY2VzLmRlbGV0ZShkZXRhaWxzLmlkKVxuICAgICAgICAgICAgICBAdXBkYXRlUmVzb3VyY2VTdGF0ZSgpXG4gICAgICAgICAgICAsIDUwMFxuICAgICAgICAgICMgYWJvdXQgd2ViUmVxdWVzdFxuICAgICAgICAgICMgZGV0YWlscyBvYmplY3QgZGVzY3JpYmVzIHJlcXVlc3RcbiAgICAgICAgICAjIFRoZSBmaWx0ZXIgb2JqZWN0IGhhcyBhIHVybHMgcHJvcGVydHkgd2hpY2ggaXMgYW4gQXJyYXkgb2YgVVJMIHBhdHRlcm5zLVxuICAgICAgICAgICMgLXRoYXQgd2lsbCBiZSB1c2VkIHRvIGZpbHRlciBvdXQgdGhlIHJlcXVlc3RzIHRoYXQgZG8gbm90IG1hdGNoIHRoZSBVUkwgcGF0dGVybnMuXG4gICAgICAgICAgIyBJZiB0aGUgZmlsdGVyIGlzIG9taXR0ZWQgdGhlbiBhbGwgcmVxdWVzdHMgd2lsbCBiZSBtYXRjaGVkLlxuICAgICAgICAgIGJ3LndlYkNvbnRlbnRzLnNlc3Npb24ud2ViUmVxdWVzdC5vbkNvbXBsZXRlZCBsb2FkQ21wXG4gICAgICAgICAgYncud2ViQ29udGVudHMuc2Vzc2lvbi53ZWJSZXF1ZXN0Lm9uRXJyb3JPY2N1cnJlZCBsb2FkQ21wXG4gICAgICAgICAgYncud2ViQ29udGVudHMuc2Vzc2lvbi53ZWJSZXF1ZXN0Lm9uQmVmb3JlUmVxdWVzdCAoZGV0YWlscywgY2FsbGJhY2spID0+XG4gICAgICAgICAgICBAX3dhdGNoaW5nUmVzb3VyY2VzLmFkZChkZXRhaWxzLmlkKVxuICAgICAgICAgICAgQHVwZGF0ZVJlc291cmNlU3RhdGUoKVxuICAgICAgICAgICAgY2FsbGJhY2soe30pXG5cbiAgICAgICAgICBAbWVudSA9IG5ldyBNZHNNYWluTWVudVxuICAgICAgICAgICAgd2luZG93OiBid1xuICAgICAgICAgICAgZGV2ZWxvcG1lbnQ6IGdsb2JhbC5tYXJwLmRldmVsb3BtZW50XG4gICAgICAgICAgICB2aWV3TW9kZTogQHZpZXdNb2RlXG5cbiAgICAgICAgICBidy5tYXhpbWl6ZSgpIGlmIGdsb2JhbC5tYXJwLmNvbmZpZy5nZXQgJ3dpbmRvd1Bvc2l0aW9uLm1heGltaXplZCdcblxuICAgICAgICAgIGJ3LmxvYWRVUkwgXCJmaWxlOi8vI3tfX2Rpcm5hbWV9Ly4uLy4uL3ByZXNlbi5odG1sXCJcblxuICAgICAgICAgIGJ3LndlYkNvbnRlbnRzLm9uICdkaWQtZmluaXNoLWxvYWQnLCA9PlxuICAgICAgICAgICAgQF93aW5kb3dMb2FkZWQgPSB0cnVlXG4gICAgICAgICAgICAjQHNlbmQgJ3NldFNwbGl0dGVyJywgZ2xvYmFsLm1hcnAuY29uZmlnLmdldCgnc3BsaXR0ZXJQb3NpdGlvbicpXG4gICAgICAgICAgICBAc2VuZCAnc2V0U3BsaXR0ZXInLCAwLjY1XG4gICAgICAgICAgICBAc2VuZCAnc2V0RWRpdG9yQ29uZmlnJywgZ2xvYmFsLm1hcnAuY29uZmlnLmdldCgnZWRpdG9yJylcbiAgICAgICAgICAgIEB0cmlnZ2VyICdsb2FkJywgZmlsZU9wdHM/LmJ1ZmZlciB8fCAnJywgQHBhdGhcbiAgICAgICAgICAgIGJ3LndlYkNvbnRlbnRzLnNlbmQgJ3ByZXNlbkRldkluaXRpYWxpemUnLCBzbGlkZVxuXG5cbiAgICAgICAgICBidy5vbmNlICdyZWFkeS10by1zaG93JywgPT4gYncuc2hvdygpXG5cbiAgICAgICAgICBidy5vbiAnY2xvc2UnLCAoZSkgPT5cbiAgICAgICAgICAgIGlmIEBmcmVlemVcbiAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpXG4gICAgICAgICAgICAgIE1kc1dpbmRvdy5hcHBXaWxsUXVpdCA9IGZhbHNlXG4gICAgICAgICAgICAgIHJldHVyblxuICAgICAgICAgIGJ3Lm9uICdjbG9zZWQnLCA9PlxuICAgICAgICAgICAgQGJyb3dzZXJXaW5kb3cgPSBudWxsXG4gICAgICAgICAgICBAX3NldElzT3BlbiBmYWxzZVxuXG4gICAgICAgICAgdXBkYXRlV2luZG93UG9zaXRpb24gPSAoZSkgPT5cbiAgICAgICAgICAgIHVubGVzcyBnbG9iYWwubWFycC5jb25maWcuc2V0KCd3aW5kb3dQb3NpdGlvbi5tYXhpbWl6ZWQnLCBidy5pc01heGltaXplZCgpKVxuICAgICAgICAgICAgICBnbG9iYWwubWFycC5jb25maWcubWVyZ2UgeyB3aW5kb3dQb3NpdGlvbjogYncuZ2V0Qm91bmRzKCkgfVxuXG4gICAgICAgICAgYncub24gJ21vdmUnLCB1cGRhdGVXaW5kb3dQb3NpdGlvblxuICAgICAgICAgIGJ3Lm9uICdyZXNpemUnLCB1cGRhdGVXaW5kb3dQb3NpdGlvblxuICAgICAgICAgIGJ3Lm9uICdtYXhpbWl6ZScsIHVwZGF0ZVdpbmRvd1Bvc2l0aW9uXG4gICAgICAgICAgYncub24gJ3VubWF4aW1pemUnLCB1cGRhdGVXaW5kb3dQb3NpdGlvblxuXG4gICAgICAgICAgYncubWRzV2luZG93ID0gQFxuICAgICAgICAgIGJ3XG5cbiAgICAgICAgQF9zZXRJc09wZW4gdHJ1ZSJdfQ==
