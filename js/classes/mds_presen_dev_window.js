var BrowserWindow, MdsFileHistory, MdsMainMenu, MdsManager, MdsMenu, MdsPresenDevWindow, MdsWindow, Path, dialog, electron, extend, fs, iconv_lite, ipc, jschardet, ref,
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

module.exports = MdsPresenDevWindow = (function(superClass) {
  extend1(MdsPresenDevWindow, superClass);

  function MdsPresenDevWindow(fileOpts, options, slideHTML) {
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
        bw.loadURL("file://" + __dirname + "/../../presenDevIndex.html");
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

  return MdsPresenDevWindow;

})(MdsWindow);

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xhc3Nlcy9tZHNfcHJlc2VuX2Rldl93aW5kb3cuanMiLCJzb3VyY2VzIjpbImNsYXNzZXMvbWRzX3ByZXNlbl9kZXZfd2luZG93LmNvZmZlZSJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxJQUFBLG1LQUFBO0VBQUE7OztBQUFBLFNBQUEsR0FBWSxPQUFBLENBQVEsY0FBUjs7QUFDWixNQUEwQixPQUFBLENBQVEsVUFBUixDQUExQixFQUFDLGlDQUFELEVBQWdCOztBQUVoQixVQUFBLEdBQWlCLE9BQUEsQ0FBUSxlQUFSOztBQUNqQixPQUFBLEdBQWlCLE9BQUEsQ0FBUSxZQUFSOztBQUNqQixXQUFBLEdBQWlCLE9BQUEsQ0FBUSxpQkFBUjs7QUFDakIsY0FBQSxHQUFpQixPQUFBLENBQVEsb0JBQVI7O0FBQ2pCLE1BQUEsR0FBaUIsT0FBQSxDQUFRLFFBQVI7O0FBQ2pCLEVBQUEsR0FBaUIsT0FBQSxDQUFRLElBQVI7O0FBQ2pCLFNBQUEsR0FBaUIsT0FBQSxDQUFRLFdBQVI7O0FBQ2pCLFVBQUEsR0FBaUIsT0FBQSxDQUFRLFlBQVI7O0FBQ2pCLElBQUEsR0FBaUIsT0FBQSxDQUFRLE1BQVI7O0FBQ2pCLFFBQUEsR0FBaUIsT0FBQSxDQUFRLFVBQVI7O0FBQ2pCLEdBQUEsR0FBYSxRQUFRLENBQUM7O0FBRXRCLE1BQU0sQ0FBQyxPQUFQLEdBQXVCOzs7RUFDTiw0QkFBQyxRQUFELEVBQWdCLE9BQWhCLEVBQStCLFNBQS9CO0FBQ1QsUUFBQTs7TUFEVSxXQUFXOztJQUFJLElBQUMsQ0FBQSw0QkFBRCxVQUFXO0lBQ3BDLElBQUMsQ0FBQSxJQUFELHVCQUFRLFFBQVEsQ0FBRSxjQUFWLElBQWtCO0lBQzFCLEtBQUEsR0FBUTtJQUlSLElBQUMsQ0FBQSxRQUFELEdBQVk7SUFFWixJQUFDLENBQUEsYUFBRCxHQUFvQixDQUFBLFNBQUEsS0FBQTthQUFBLFNBQUE7QUFFbEIsWUFBQTtRQUFBLEVBQUEsR0FBSyxJQUFJLGFBQUosQ0FBa0IsTUFBQSxDQUFP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O1FBRHFCO1FBSXZCLEVBQUUsQ0FBQyxFQUFILENBQU0sTUFBTixFQUFjLG9CQUFkO1FBQ0EsRUFBRSxDQUFDLEVBQUgsQ0FBTSxRQUFOLEVBQWdCLG9CQUFoQjtRQUNBLEVBQUUsQ0FBQyxFQUFILENBQU0sVUFBTixFQUFrQixvQkFBbEI7UUFDQSxFQUFFLENBQUMsRUFBSCxDQUFNLFlBQU4sRUFBb0Isb0JBQXBCO1FBRUEsRUFBRSxDQUFDLFNBQUgsR0FBZTtlQUNmO01BN0RrQjtJQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBSCxDQUFBO0lBK0RqQixJQUFDLENBQUEsVUFBRCxDQUFZLElBQVo7RUF2RVM7Ozs7R0FEaUMiLCJzb3VyY2VzQ29udGVudCI6WyJNZHNXaW5kb3cgPSByZXF1aXJlICcuL21kc193aW5kb3cnXG57QnJvd3NlcldpbmRvdywgZGlhbG9nfSA9IHJlcXVpcmUgJ2VsZWN0cm9uJ1xuXG5NZHNNYW5hZ2VyICAgICA9IHJlcXVpcmUgJy4vbWRzX21hbmFnZXInXG5NZHNNZW51ICAgICAgICA9IHJlcXVpcmUgJy4vbWRzX21lbnUnXG5NZHNNYWluTWVudSAgICA9IHJlcXVpcmUgJy4vbWRzX21haW5fbWVudSdcbk1kc0ZpbGVIaXN0b3J5ID0gcmVxdWlyZSAnLi9tZHNfZmlsZV9oaXN0b3J5J1xuZXh0ZW5kICAgICAgICAgPSByZXF1aXJlICdleHRlbmQnXG5mcyAgICAgICAgICAgICA9IHJlcXVpcmUgJ2ZzJ1xuanNjaGFyZGV0ICAgICAgPSByZXF1aXJlICdqc2NoYXJkZXQnXG5pY29udl9saXRlICAgICA9IHJlcXVpcmUgJ2ljb252LWxpdGUnXG5QYXRoICAgICAgICAgICA9IHJlcXVpcmUgJ3BhdGgnXG5lbGVjdHJvbiAgICAgICA9IHJlcXVpcmUgJ2VsZWN0cm9uJ1xuaXBjICAgICAgICA9IGVsZWN0cm9uLmlwY01haW5cblxubW9kdWxlLmV4cG9ydHMgPSBjbGFzcyBNZHNQcmVzZW5EZXZXaW5kb3cgZXh0ZW5kcyBNZHNXaW5kb3dcbiAgICBjb25zdHJ1Y3RvcjogKGZpbGVPcHRzID0ge30sIEBvcHRpb25zID0ge30sIHNsaWRlSFRNTCkgLT5cbiAgICAgICAgQHBhdGggPSBmaWxlT3B0cz8ucGF0aCB8fCBudWxsXG4gICAgICAgIHNsaWRlID0gc2xpZGVIVE1MXG5cbiAgICAgICAgI0B2aWV3TW9kZSA9IGdsb2JhbC5tYXJwLmNvbmZpZy5nZXQoJ3ZpZXdNb2RlJylcblxuICAgICAgICBAdmlld01vZGUgPSAncHJlc2VuLWRldidcblxuICAgICAgICBAYnJvd3NlcldpbmRvdyA9IGRvID0+XG4gICAgICAgICAgIyDliJ3mnJ/oqK3lrppvcHRpb25zIOOBqCBAb3B0aW9ucyDjgpLjg57jg7zjgrjjgZfjgabliJ3mnJ/ljJbjgIHjgqbjgqTjg7Pjg4njgqZJROioreWumlxuICAgICAgICAgIGJ3ID0gbmV3IEJyb3dzZXJXaW5kb3cgZXh0ZW5kKHRydWUsIHt9LCBNZHNXaW5kb3cuZGVmT3B0aW9ucygpLCBAb3B0aW9ucylcbiAgICAgICAgICBAX3dpbmRvd19pZCA9IGJ3LmlkXG5cbiAgICAgICAgICBsb2FkQ21wID0gKGRldGFpbHMpID0+XG4gICAgICAgICAgICBzZXRUaW1lb3V0ID0+XG4gICAgICAgICAgICAgIEBfd2F0Y2hpbmdSZXNvdXJjZXMuZGVsZXRlKGRldGFpbHMuaWQpXG4gICAgICAgICAgICAgIEB1cGRhdGVSZXNvdXJjZVN0YXRlKClcbiAgICAgICAgICAgICwgNTAwXG4gICAgICAgICAgIyBhYm91dCB3ZWJSZXF1ZXN0XG4gICAgICAgICAgIyBkZXRhaWxzIG9iamVjdCBkZXNjcmliZXMgcmVxdWVzdFxuICAgICAgICAgICMgVGhlIGZpbHRlciBvYmplY3QgaGFzIGEgdXJscyBwcm9wZXJ0eSB3aGljaCBpcyBhbiBBcnJheSBvZiBVUkwgcGF0dGVybnMtXG4gICAgICAgICAgIyAtdGhhdCB3aWxsIGJlIHVzZWQgdG8gZmlsdGVyIG91dCB0aGUgcmVxdWVzdHMgdGhhdCBkbyBub3QgbWF0Y2ggdGhlIFVSTCBwYXR0ZXJucy5cbiAgICAgICAgICAjIElmIHRoZSBmaWx0ZXIgaXMgb21pdHRlZCB0aGVuIGFsbCByZXF1ZXN0cyB3aWxsIGJlIG1hdGNoZWQuXG4gICAgICAgICAgYncud2ViQ29udGVudHMuc2Vzc2lvbi53ZWJSZXF1ZXN0Lm9uQ29tcGxldGVkIGxvYWRDbXBcbiAgICAgICAgICBidy53ZWJDb250ZW50cy5zZXNzaW9uLndlYlJlcXVlc3Qub25FcnJvck9jY3VycmVkIGxvYWRDbXBcbiAgICAgICAgICBidy53ZWJDb250ZW50cy5zZXNzaW9uLndlYlJlcXVlc3Qub25CZWZvcmVSZXF1ZXN0IChkZXRhaWxzLCBjYWxsYmFjaykgPT5cbiAgICAgICAgICAgIEBfd2F0Y2hpbmdSZXNvdXJjZXMuYWRkKGRldGFpbHMuaWQpXG4gICAgICAgICAgICBAdXBkYXRlUmVzb3VyY2VTdGF0ZSgpXG4gICAgICAgICAgICBjYWxsYmFjayh7fSlcblxuICAgICAgICAgIEBtZW51ID0gbmV3IE1kc01haW5NZW51XG4gICAgICAgICAgICB3aW5kb3c6IGJ3XG4gICAgICAgICAgICBkZXZlbG9wbWVudDogZ2xvYmFsLm1hcnAuZGV2ZWxvcG1lbnRcbiAgICAgICAgICAgIHZpZXdNb2RlOiBAdmlld01vZGVcblxuICAgICAgICAgIGJ3Lm1heGltaXplKCkgaWYgZ2xvYmFsLm1hcnAuY29uZmlnLmdldCAnd2luZG93UG9zaXRpb24ubWF4aW1pemVkJ1xuXG4gICAgICAgICAgYncubG9hZFVSTCBcImZpbGU6Ly8je19fZGlybmFtZX0vLi4vLi4vcHJlc2VuRGV2SW5kZXguaHRtbFwiXG5cbiAgICAgICAgICBidy53ZWJDb250ZW50cy5vbiAnZGlkLWZpbmlzaC1sb2FkJywgPT5cbiAgICAgICAgICAgIEBfd2luZG93TG9hZGVkID0gdHJ1ZVxuICAgICAgICAgICAgI0BzZW5kICdzZXRTcGxpdHRlcicsIGdsb2JhbC5tYXJwLmNvbmZpZy5nZXQoJ3NwbGl0dGVyUG9zaXRpb24nKVxuICAgICAgICAgICAgQHNlbmQgJ3NldFNwbGl0dGVyJywgMC42NVxuICAgICAgICAgICAgQHNlbmQgJ3NldEVkaXRvckNvbmZpZycsIGdsb2JhbC5tYXJwLmNvbmZpZy5nZXQoJ2VkaXRvcicpXG4gICAgICAgICAgICBAdHJpZ2dlciAnbG9hZCcsIGZpbGVPcHRzPy5idWZmZXIgfHwgJycsIEBwYXRoXG4gICAgICAgICAgICBidy53ZWJDb250ZW50cy5zZW5kICdwcmVzZW5EZXZJbml0aWFsaXplJywgc2xpZGVcblxuXG4gICAgICAgICAgYncub25jZSAncmVhZHktdG8tc2hvdycsID0+IGJ3LnNob3coKVxuXG4gICAgICAgICAgYncub24gJ2Nsb3NlJywgKGUpID0+XG4gICAgICAgICAgICBpZiBAZnJlZXplXG4gICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKVxuICAgICAgICAgICAgICBNZHNXaW5kb3cuYXBwV2lsbFF1aXQgPSBmYWxzZVxuICAgICAgICAgICAgICByZXR1cm5cbiAgICAgICAgICBidy5vbiAnY2xvc2VkJywgPT5cbiAgICAgICAgICAgIEBicm93c2VyV2luZG93ID0gbnVsbFxuICAgICAgICAgICAgQF9zZXRJc09wZW4gZmFsc2VcblxuICAgICAgICAgIHVwZGF0ZVdpbmRvd1Bvc2l0aW9uID0gKGUpID0+XG4gICAgICAgICAgICB1bmxlc3MgZ2xvYmFsLm1hcnAuY29uZmlnLnNldCgnd2luZG93UG9zaXRpb24ubWF4aW1pemVkJywgYncuaXNNYXhpbWl6ZWQoKSlcbiAgICAgICAgICAgICAgZ2xvYmFsLm1hcnAuY29uZmlnLm1lcmdlIHsgd2luZG93UG9zaXRpb246IGJ3LmdldEJvdW5kcygpIH1cblxuICAgICAgICAgIGJ3Lm9uICdtb3ZlJywgdXBkYXRlV2luZG93UG9zaXRpb25cbiAgICAgICAgICBidy5vbiAncmVzaXplJywgdXBkYXRlV2luZG93UG9zaXRpb25cbiAgICAgICAgICBidy5vbiAnbWF4aW1pemUnLCB1cGRhdGVXaW5kb3dQb3NpdGlvblxuICAgICAgICAgIGJ3Lm9uICd1bm1heGltaXplJywgdXBkYXRlV2luZG93UG9zaXRpb25cblxuICAgICAgICAgIGJ3Lm1kc1dpbmRvdyA9IEBcbiAgICAgICAgICBid1xuXG4gICAgICAgIEBfc2V0SXNPcGVuIHRydWUiXX0=
