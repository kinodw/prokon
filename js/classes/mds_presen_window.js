var BrowserWindow, MdsFileHistory, MdsMainMenu, MdsManager, MdsMenu, MdsWindow, Path, PresenWindow, dialog, electron, extend, fs, iconv_lite, ipc, jschardet, ref,
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

module.exports = PresenWindow = (function(superClass) {
  extend1(PresenWindow, superClass);

  function PresenWindow(fileOpts, options, slideHTML) {
    var slide;
    if (fileOpts == null) {
      fileOpts = {};
    }
    this.options = options != null ? options : {};
    this.path = (fileOpts != null ? fileOpts.path : void 0) || null;
    slide = slideHTML;
    console.log("@options = " + JSON.stringify(this.options, null, ' '));
    this.viewMode = 'screen';
    this.browserWindow = (function(_this) {
      return function() {
        var bw, loadCmp, updateWindowPosition;
        bw = new BrowserWindow(extend(true, {}, MdsWindow.defOptions(), _this.options, {
          "titleBarStyle": "hidden"
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
        bw.loadURL("file://" + __dirname + "/../../presenIndex.html");
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

  return PresenWindow;

})(MdsWindow);

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xhc3Nlcy9tZHNfcHJlc2VuX3dpbmRvdy5qcyIsInNvdXJjZXMiOlsiY2xhc3Nlcy9tZHNfcHJlc2VuX3dpbmRvdy5jb2ZmZWUiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsSUFBQSw2SkFBQTtFQUFBOzs7QUFBQSxTQUFBLEdBQVksT0FBQSxDQUFRLGNBQVI7O0FBQ1osTUFBMEIsT0FBQSxDQUFRLFVBQVIsQ0FBMUIsRUFBQyxpQ0FBRCxFQUFnQjs7QUFFaEIsVUFBQSxHQUFpQixPQUFBLENBQVEsZUFBUjs7QUFDakIsT0FBQSxHQUFpQixPQUFBLENBQVEsWUFBUjs7QUFDakIsV0FBQSxHQUFpQixPQUFBLENBQVEsaUJBQVI7O0FBQ2pCLGNBQUEsR0FBaUIsT0FBQSxDQUFRLG9CQUFSOztBQUNqQixNQUFBLEdBQWlCLE9BQUEsQ0FBUSxRQUFSOztBQUNqQixFQUFBLEdBQWlCLE9BQUEsQ0FBUSxJQUFSOztBQUNqQixTQUFBLEdBQWlCLE9BQUEsQ0FBUSxXQUFSOztBQUNqQixVQUFBLEdBQWlCLE9BQUEsQ0FBUSxZQUFSOztBQUNqQixJQUFBLEdBQWlCLE9BQUEsQ0FBUSxNQUFSOztBQUNqQixRQUFBLEdBQWlCLE9BQUEsQ0FBUSxVQUFSOztBQUNqQixHQUFBLEdBQWEsUUFBUSxDQUFDOztBQUd0QixNQUFNLENBQUMsT0FBUCxHQUF1Qjs7O0VBQ1Isc0JBQUMsUUFBRCxFQUFnQixPQUFoQixFQUErQixTQUEvQjtBQUNQLFFBQUE7O01BRFEsV0FBVzs7SUFBSSxJQUFDLENBQUEsNEJBQUQsVUFBVztJQUNsQyxJQUFDLENBQUEsSUFBRCx1QkFBUSxRQUFRLENBQUUsY0FBVixJQUFrQjtJQUMxQixLQUFBLEdBQVE7SUFDUixPQUFPLENBQUMsR0FBUixDQUFZLGFBQUEsR0FBZ0IsSUFBSSxDQUFDLFNBQUwsQ0FBZSxJQUFDLENBQUEsT0FBaEIsRUFBeUIsSUFBekIsRUFBK0IsR0FBL0IsQ0FBNUI7SUFJQSxJQUFDLENBQUEsUUFBRCxHQUFZO0lBRVosSUFB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LENBQUMsV0FBSCxDQUFBLENBQW5ELENBQVA7bUJBQ0UsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBbkIsQ0FBeUI7Y0FBRSxjQUFBLEVBQWdCLEVBQUUsQ0FBQyxTQUFILENBQUEsQ0FBbEI7YUFBekIsRUFERjs7UUFEcUI7UUFJdkIsRUFBRSxDQUFDLEVBQUgsQ0FBTSxNQUFOLEVBQWMsb0JBQWQ7UUFDQSxFQUFFLENBQUMsRUFBSCxDQUFNLFFBQU4sRUFBZ0Isb0JBQWhCO1FBQ0EsRUFBRSxDQUFDLEVBQUgsQ0FBTSxVQUFOLEVBQWtCLG9CQUFsQjtRQUNBLEVBQUUsQ0FBQyxFQUFILENBQU0sWUFBTixFQUFvQixvQkFBcEI7UUFFQSxFQUFFLENBQUMsU0FBSCxHQUFlO2VBQ2Y7TUE3RGtCO0lBQUEsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQUFILENBQUE7SUErRGpCLElBQUMsQ0FBQSxVQUFELENBQVksSUFBWjtFQXhFTzs7OztHQUQ2QiIsInNvdXJjZXNDb250ZW50IjpbIk1kc1dpbmRvdyA9IHJlcXVpcmUgJy4vbWRzX3dpbmRvdydcbntCcm93c2VyV2luZG93LCBkaWFsb2d9ID0gcmVxdWlyZSAnZWxlY3Ryb24nXG5cbk1kc01hbmFnZXIgICAgID0gcmVxdWlyZSAnLi9tZHNfbWFuYWdlcidcbk1kc01lbnUgICAgICAgID0gcmVxdWlyZSAnLi9tZHNfbWVudSdcbk1kc01haW5NZW51ICAgID0gcmVxdWlyZSAnLi9tZHNfbWFpbl9tZW51J1xuTWRzRmlsZUhpc3RvcnkgPSByZXF1aXJlICcuL21kc19maWxlX2hpc3RvcnknXG5leHRlbmQgICAgICAgICA9IHJlcXVpcmUgJ2V4dGVuZCdcbmZzICAgICAgICAgICAgID0gcmVxdWlyZSAnZnMnXG5qc2NoYXJkZXQgICAgICA9IHJlcXVpcmUgJ2pzY2hhcmRldCdcbmljb252X2xpdGUgICAgID0gcmVxdWlyZSAnaWNvbnYtbGl0ZSdcblBhdGggICAgICAgICAgID0gcmVxdWlyZSAncGF0aCdcbmVsZWN0cm9uICAgICAgID0gcmVxdWlyZSAnZWxlY3Ryb24nXG5pcGMgICAgICAgID0gZWxlY3Ryb24uaXBjTWFpblxuXG5cbm1vZHVsZS5leHBvcnRzID0gY2xhc3MgUHJlc2VuV2luZG93IGV4dGVuZHMgTWRzV2luZG93XG4gIGNvbnN0cnVjdG9yOiAoZmlsZU9wdHMgPSB7fSwgQG9wdGlvbnMgPSB7fSwgc2xpZGVIVE1MKSAtPlxuICAgICAgICBAcGF0aCA9IGZpbGVPcHRzPy5wYXRoIHx8IG51bGxcbiAgICAgICAgc2xpZGUgPSBzbGlkZUhUTUxcbiAgICAgICAgY29uc29sZS5sb2cgXCJAb3B0aW9ucyA9IFwiICsgSlNPTi5zdHJpbmdpZnkoQG9wdGlvbnMsIG51bGwsICcgJylcblxuICAgICAgICAjQHZpZXdNb2RlID0gZ2xvYmFsLm1hcnAuY29uZmlnLmdldCgndmlld01vZGUnKVxuXG4gICAgICAgIEB2aWV3TW9kZSA9ICdzY3JlZW4nXG5cbiAgICAgICAgQGJyb3dzZXJXaW5kb3cgPSBkbyA9PlxuICAgICAgICAgICMg5Yid5pyf6Kit5a6ab3B0aW9ucyDjgaggQG9wdGlvbnMg44KS44Oe44O844K444GX44Gm5Yid5pyf5YyW44CB44Km44Kk44Oz44OJ44KmSUToqK3lrppcbiAgICAgICAgICBidyA9IG5ldyBCcm93c2VyV2luZG93IGV4dGVuZCh0cnVlLCB7fSwgTWRzV2luZG93LmRlZk9wdGlvbnMoKSwgQG9wdGlvbnMsXG4gICAgICAgICAgICBcInRpdGxlQmFyU3R5bGVcIjogXCJoaWRkZW5cIilcbiAgICAgICAgICBAX3dpbmRvd19pZCA9IGJ3LmlkXG5cbiAgICAgICAgICBsb2FkQ21wID0gKGRldGFpbHMpID0+XG4gICAgICAgICAgICBzZXRUaW1lb3V0ID0+XG4gICAgICAgICAgICAgIEBfd2F0Y2hpbmdSZXNvdXJjZXMuZGVsZXRlKGRldGFpbHMuaWQpXG4gICAgICAgICAgICAgIEB1cGRhdGVSZXNvdXJjZVN0YXRlKClcbiAgICAgICAgICAgICwgNTAwXG4gICAgICAgICAgIyBhYm91dCB3ZWJSZXF1ZXN0XG4gICAgICAgICAgIyBkZXRhaWxzIG9iamVjdCBkZXNjcmliZXMgcmVxdWVzdFxuICAgICAgICAgICMgVGhlIGZpbHRlciBvYmplY3QgaGFzIGEgdXJscyBwcm9wZXJ0eSB3aGljaCBpcyBhbiBBcnJheSBvZiBVUkwgcGF0dGVybnMtXG4gICAgICAgICAgIyAtdGhhdCB3aWxsIGJlIHVzZWQgdG8gZmlsdGVyIG91dCB0aGUgcmVxdWVzdHMgdGhhdCBkbyBub3QgbWF0Y2ggdGhlIFVSTCBwYXR0ZXJucy5cbiAgICAgICAgICAjIElmIHRoZSBmaWx0ZXIgaXMgb21pdHRlZCB0aGVuIGFsbCByZXF1ZXN0cyB3aWxsIGJlIG1hdGNoZWQuXG4gICAgICAgICAgYncud2ViQ29udGVudHMuc2Vzc2lvbi53ZWJSZXF1ZXN0Lm9uQ29tcGxldGVkIGxvYWRDbXBcbiAgICAgICAgICBidy53ZWJDb250ZW50cy5zZXNzaW9uLndlYlJlcXVlc3Qub25FcnJvck9jY3VycmVkIGxvYWRDbXBcbiAgICAgICAgICBidy53ZWJDb250ZW50cy5zZXNzaW9uLndlYlJlcXVlc3Qub25CZWZvcmVSZXF1ZXN0IChkZXRhaWxzLCBjYWxsYmFjaykgPT5cbiAgICAgICAgICAgIEBfd2F0Y2hpbmdSZXNvdXJjZXMuYWRkKGRldGFpbHMuaWQpXG4gICAgICAgICAgICBAdXBkYXRlUmVzb3VyY2VTdGF0ZSgpXG4gICAgICAgICAgICBjYWxsYmFjayh7fSlcblxuICAgICAgICAgIEBtZW51ID0gbmV3IE1kc01haW5NZW51XG4gICAgICAgICAgICB3aW5kb3c6IGJ3XG4gICAgICAgICAgICBkZXZlbG9wbWVudDogZ2xvYmFsLm1hcnAuZGV2ZWxvcG1lbnRcbiAgICAgICAgICAgIHZpZXdNb2RlOiBAdmlld01vZGVcblxuICAgICAgICAgIGJ3Lm1heGltaXplKCkgaWYgZ2xvYmFsLm1hcnAuY29uZmlnLmdldCAnd2luZG93UG9zaXRpb24ubWF4aW1pemVkJ1xuXG4gICAgICAgICAgYncubG9hZFVSTCBcImZpbGU6Ly8je19fZGlybmFtZX0vLi4vLi4vcHJlc2VuSW5kZXguaHRtbFwiXG5cbiAgICAgICAgICBidy53ZWJDb250ZW50cy5vbiAnZGlkLWZpbmlzaC1sb2FkJywgPT5cbiAgICAgICAgICAgIEBfd2luZG93TG9hZGVkID0gdHJ1ZVxuICAgICAgICAgICAgI0BzZW5kICdzZXRTcGxpdHRlcicsIGdsb2JhbC5tYXJwLmNvbmZpZy5nZXQoJ3NwbGl0dGVyUG9zaXRpb24nKVxuICAgICAgICAgICAgQHNlbmQgJ3NldFNwbGl0dGVyJywgMC42NVxuICAgICAgICAgICAgQHNlbmQgJ3NldEVkaXRvckNvbmZpZycsIGdsb2JhbC5tYXJwLmNvbmZpZy5nZXQoJ2VkaXRvcicpXG4gICAgICAgICAgICBAdHJpZ2dlciAnbG9hZCcsIGZpbGVPcHRzPy5idWZmZXIgfHwgJycsIEBwYXRoXG4gICAgICAgICAgICBidy53ZWJDb250ZW50cy5zZW5kICdwcmVzZW5EZXZJbml0aWFsaXplJywgc2xpZGVcblxuICAgICAgICAgIGJ3Lm9uY2UgJ3JlYWR5LXRvLXNob3cnLCA9PiBidy5zaG93KClcblxuICAgICAgICAgIGJ3Lm9uICdjbG9zZScsIChlKSA9PlxuICAgICAgICAgICAgaWYgQGZyZWV6ZVxuICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KClcbiAgICAgICAgICAgICAgTWRzV2luZG93LmFwcFdpbGxRdWl0ID0gZmFsc2VcbiAgICAgICAgICAgICAgcmV0dXJuXG4gICAgICAgICAgYncub24gJ2Nsb3NlZCcsID0+XG4gICAgICAgICAgICBAYnJvd3NlcldpbmRvdyA9IG51bGxcbiAgICAgICAgICAgIEBfc2V0SXNPcGVuIGZhbHNlXG5cbiAgICAgICAgICB1cGRhdGVXaW5kb3dQb3NpdGlvbiA9IChlKSA9PlxuICAgICAgICAgICAgdW5sZXNzIGdsb2JhbC5tYXJwLmNvbmZpZy5zZXQoJ3dpbmRvd1Bvc2l0aW9uLm1heGltaXplZCcsIGJ3LmlzTWF4aW1pemVkKCkpXG4gICAgICAgICAgICAgIGdsb2JhbC5tYXJwLmNvbmZpZy5tZXJnZSB7IHdpbmRvd1Bvc2l0aW9uOiBidy5nZXRCb3VuZHMoKSB9XG5cbiAgICAgICAgICBidy5vbiAnbW92ZScsIHVwZGF0ZVdpbmRvd1Bvc2l0aW9uXG4gICAgICAgICAgYncub24gJ3Jlc2l6ZScsIHVwZGF0ZVdpbmRvd1Bvc2l0aW9uXG4gICAgICAgICAgYncub24gJ21heGltaXplJywgdXBkYXRlV2luZG93UG9zaXRpb25cbiAgICAgICAgICBidy5vbiAndW5tYXhpbWl6ZScsIHVwZGF0ZVdpbmRvd1Bvc2l0aW9uXG5cbiAgICAgICAgICBidy5tZHNXaW5kb3cgPSBAXG4gICAgICAgICAgYndcblxuICAgICAgICBAX3NldElzT3BlbiB0cnVlIl19
