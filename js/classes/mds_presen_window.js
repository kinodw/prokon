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
    this.viewMode = 'screen';
    this.browserWindow = (function(_this) {
      return function() {
        var bw, loadCmp, updateWindowPosition;
        bw = new BrowserWindow(extend(true, {}, MdsWindow.defOptions(), _this.options, {
          'titleBarStyle': 'hidden'
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xhc3Nlcy9tZHNfcHJlc2VuX3dpbmRvdy5qcyIsInNvdXJjZXMiOlsiY2xhc3Nlcy9tZHNfcHJlc2VuX3dpbmRvdy5jb2ZmZWUiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsSUFBQSw2SkFBQTtFQUFBOzs7QUFBQSxTQUFBLEdBQVksT0FBQSxDQUFRLGNBQVI7O0FBQ1osTUFBMEIsT0FBQSxDQUFRLFVBQVIsQ0FBMUIsRUFBQyxpQ0FBRCxFQUFnQjs7QUFFaEIsVUFBQSxHQUFpQixPQUFBLENBQVEsZUFBUjs7QUFDakIsT0FBQSxHQUFpQixPQUFBLENBQVEsWUFBUjs7QUFDakIsV0FBQSxHQUFpQixPQUFBLENBQVEsaUJBQVI7O0FBQ2pCLGNBQUEsR0FBaUIsT0FBQSxDQUFRLG9CQUFSOztBQUNqQixNQUFBLEdBQWlCLE9BQUEsQ0FBUSxRQUFSOztBQUNqQixFQUFBLEdBQWlCLE9BQUEsQ0FBUSxJQUFSOztBQUNqQixTQUFBLEdBQWlCLE9BQUEsQ0FBUSxXQUFSOztBQUNqQixVQUFBLEdBQWlCLE9BQUEsQ0FBUSxZQUFSOztBQUNqQixJQUFBLEdBQWlCLE9BQUEsQ0FBUSxNQUFSOztBQUNqQixRQUFBLEdBQWlCLE9BQUEsQ0FBUSxVQUFSOztBQUNqQixHQUFBLEdBQWEsUUFBUSxDQUFDOztBQUd0QixNQUFNLENBQUMsT0FBUCxHQUF1Qjs7O0VBQ1Isc0JBQUMsUUFBRCxFQUFnQixPQUFoQixFQUErQixTQUEvQjtBQUNQLFFBQUE7O01BRFEsV0FBVzs7SUFBSSxJQUFDLENBQUEsNEJBQUQsVUFBVztJQUNsQyxJQUFDLENBQUEsSUFBRCx1QkFBUSxRQUFRLENBQUUsY0FBVixJQUFrQjtJQUMxQixLQUFBLEdBQVE7SUFJUixJQUFDLENBQUEsUUFBRCxHQUFZO0lBRVosSUFBQyxDQUFBLGFBQUQsR0FBb0IsQ0FBQSxTQUFBLEtBQUE7YUFBQSxTQUFBO0FBRWxCLFlBQUE7UUFBQSxFQUFBLEdBQUssSUFBSSxhQUFKLENBQWtCLE1BQUEsQ0FBTyxJQUFQLEVBQWEsRUFBYixFQUFpQixTQUFTLENBQUMsVUFBVixDQUFBLENBQWpCLEVBQXlDLEtBQUMsQ0FBQSxPQUExQyxFQUFrRDtVQUNuRSxlQUFBLEVBQWlCLFFBRGtEO1NBQWxELENBQWxCO1FBR0wsS0FBQyxDQUFBLFVBQUQsR0FBYyxFQUFFLENBQUM7UUFFakIsT0FBQSxHQUFVLFNBQUMsT0FBRDtpQkFDUixVQUFBLENBQVcsU0FBQTtZQUNULEtBQUMsQ0FBQSxrQkFBa0IsRUFBQyxNQUFELEVBQW5CLENBQTJCLE9BQU8sQ0FBQyxFQUFuQzttQkFDQSxLQUFDLENBQUEsbUJBQUQsQ0FBQTtVQUZTLENBQVgsRUFHRSxHQUhGO1FBRFE7UUFVVixFQUFFLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsV0FBbEMsQ0FBOEMsT0FBOUM7UUFDQSxFQUFFLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsZUFBbEMsQ0FBa0QsT0FBbEQ7UUFDQSxFQUFFLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsZUFBbEMsQ0FBa0QsU0FBQyxPQUFELEVBQVUsUUFBVjtVQUNoRCxLQUFDLENBQUEsa0JBQWtCLENBQUMsR0FBcEIsQ0FBd0IsT0FBTyxDQUFDLEVBQWhDO1VBQ0EsS0FBQyxDQUFBLG1CQUFELENBQUE7aUJBQ0EsUUFBQSxDQUFTLEVBQVQ7UUFIZ0QsQ0FBbEQ7UUFLQSxLQUFDLENBQUEsSUFBRCxHQUFRLElBQUksV0FBSixDQUNOO1VBQUEsTUFBQSxFQUFRLEVBQVI7VUFDQSxXQUFBLEVBQWEsTUFBTSxDQUFDLElBQUksQ0FBQyxXQUR6QjtVQUVBLFFBQUEsRUFBVSxLQUFDLENBQUEsUUFGWDtTQURNO1FBS1IsSUFBaUIsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBbkIsQ0FBdUIsMEJBQXZCLENBQWpCO1VBQUEsRUFBRSxDQUFDLFFBQUgsQ0FBQSxFQUFBOztRQUVBLEVBQUUsQ0FBQyxPQUFILENBQVcsU0FBQSxHQUFVLFNBQVYsR0FBb0IseUJBQS9CO1FBRUEsRUFBRSxDQUFDLFdBQVcsQ0FBQyxFQUFmLENBQWtCLGlCQUFsQixFQUFxQyxTQUFBO1VBQ25DLEtBQUMsQ0FBQSxhQUFELEdBQWlCO1VBRWpCLEtBQUMsQ0FBQSxJQUFELENBQU0sYUFBTixFQUFxQixJQUFyQjtVQUNBLEtBQUMsQ0FBQSxJQUFELENBQU0saUJBQU4sRUFBeUIsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBbkIsQ0FBdUIsUUFBdkIsQ0FBekI7VUFDQSxLQUFDLENBQUEsT0FBRCxDQUFTLE1BQVQsc0JBQWlCLFFBQVEsQ0FBRSxnQkFBVixJQUFvQixFQUFyQyxFQUF5QyxLQUFDLENBQUEsSUFBMUM7aUJBQ0EsRUFBRSxDQUFDLFdBQVcsQ0FBQyxJQUFmLENBQW9CLHFCQUFwQixFQUEyQyxLQUEzQztRQU5tQyxDQUFyQztRQVNBLEVBQUUsQ0FBQyxJQUFILENBQVEsZUFBUixFQUF5QixTQUFBO2lCQUFHLEVBQUUsQ0FBQyxJQUFILENBQUE7UUFBSCxDQUF6QjtRQUVBLEVBQUUsQ0FBQyxFQUFILENBQU0sT0FBTixFQUFlLFNBQUMsQ0FBRDtVQUNiLElBQUcsS0FBQyxDQUFBLE1BQUo7WUFDRSxDQUFDLENBQUMsY0FBRixDQUFBO1lBQ0EsU0FBUyxDQUFDLFdBQVYsR0FBd0IsTUFGMUI7O1FBRGEsQ0FBZjtRQUtBLEVBQUUsQ0FBQyxFQUFILENBQU0sUUFBTixFQUFnQixTQUFBO1VBQ2QsS0FBQyxDQUFBLGFBQUQsR0FBaUI7aUJBQ2pCLEtBQUMsQ0FBQSxVQUFELENBQVksS0FBWjtRQUZjLENBQWhCO1FBSUEsb0JBQUEsR0FBdUIsU0FBQyxDQUFEO1VBQ3JCLElBQUEsQ0FBTyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFuQixDQUF1QiwwQkFBdkIsRUFBbUQsRUFBRSxDQUFDLFdBQUgsQ0FBQSxDQUFuRCxDQUFQO21CQUNFLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQW5CLENBQXlCO2NBQUUsY0FBQSxFQUFnQixFQUFFLENBQUMsU0FBSCxDQUFBLENBQWxCO2FBQXpCLEVBREY7O1FBRHFCO1FBSXZCLEVBQUUsQ0FBQyxFQUFILENBQU0sTUFBTixFQUFjLG9CQUFkO1FBQ0EsRUFBRSxDQUFDLEVBQUgsQ0FBTSxRQUFOLEVBQWdCLG9CQUFoQjtRQUNBLEVBQUUsQ0FBQyxFQUFILENBQU0sVUFBTixFQUFrQixvQkFBbEI7UUFDQSxFQUFFLENBQUMsRUFBSCxDQUFNLFlBQU4sRUFBb0Isb0JBQXBCO1FBRUEsRUFBRSxDQUFDLFNBQUgsR0FBZTtlQUNmO01BL0RrQjtJQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBSCxDQUFBO0lBaUVqQixJQUFDLENBQUEsVUFBRCxDQUFZLElBQVo7RUF6RU87Ozs7R0FENkIiLCJzb3VyY2VzQ29udGVudCI6WyJNZHNXaW5kb3cgPSByZXF1aXJlICcuL21kc193aW5kb3cnXG57QnJvd3NlcldpbmRvdywgZGlhbG9nfSA9IHJlcXVpcmUgJ2VsZWN0cm9uJ1xuXG5NZHNNYW5hZ2VyICAgICA9IHJlcXVpcmUgJy4vbWRzX21hbmFnZXInXG5NZHNNZW51ICAgICAgICA9IHJlcXVpcmUgJy4vbWRzX21lbnUnXG5NZHNNYWluTWVudSAgICA9IHJlcXVpcmUgJy4vbWRzX21haW5fbWVudSdcbk1kc0ZpbGVIaXN0b3J5ID0gcmVxdWlyZSAnLi9tZHNfZmlsZV9oaXN0b3J5J1xuZXh0ZW5kICAgICAgICAgPSByZXF1aXJlICdleHRlbmQnXG5mcyAgICAgICAgICAgICA9IHJlcXVpcmUgJ2ZzJ1xuanNjaGFyZGV0ICAgICAgPSByZXF1aXJlICdqc2NoYXJkZXQnXG5pY29udl9saXRlICAgICA9IHJlcXVpcmUgJ2ljb252LWxpdGUnXG5QYXRoICAgICAgICAgICA9IHJlcXVpcmUgJ3BhdGgnXG5lbGVjdHJvbiAgICAgICA9IHJlcXVpcmUgJ2VsZWN0cm9uJ1xuaXBjICAgICAgICA9IGVsZWN0cm9uLmlwY01haW5cblxuXG5tb2R1bGUuZXhwb3J0cyA9IGNsYXNzIFByZXNlbldpbmRvdyBleHRlbmRzIE1kc1dpbmRvd1xuICBjb25zdHJ1Y3RvcjogKGZpbGVPcHRzID0ge30sIEBvcHRpb25zID0ge30sIHNsaWRlSFRNTCkgLT5cbiAgICAgICAgQHBhdGggPSBmaWxlT3B0cz8ucGF0aCB8fCBudWxsXG4gICAgICAgIHNsaWRlID0gc2xpZGVIVE1MXG5cbiAgICAgICAgI0B2aWV3TW9kZSA9IGdsb2JhbC5tYXJwLmNvbmZpZy5nZXQoJ3ZpZXdNb2RlJylcblxuICAgICAgICBAdmlld01vZGUgPSAnc2NyZWVuJ1xuXG4gICAgICAgIEBicm93c2VyV2luZG93ID0gZG8gPT5cbiAgICAgICAgICAjIOWIneacn+ioreWumm9wdGlvbnMg44GoIEBvcHRpb25zIOOCkuODnuODvOOCuOOBl+OBpuWIneacn+WMluOAgeOCpuOCpOODs+ODieOCpklE6Kit5a6aXG4gICAgICAgICAgYncgPSBuZXcgQnJvd3NlcldpbmRvdyBleHRlbmQodHJ1ZSwge30sIE1kc1dpbmRvdy5kZWZPcHRpb25zKCksIEBvcHRpb25zLHtcbiAgICAgICAgICAgICAgICAndGl0bGVCYXJTdHlsZSc6ICdoaWRkZW4nXG4gICAgICAgICAgICB9KVxuICAgICAgICAgIEBfd2luZG93X2lkID0gYncuaWRcblxuICAgICAgICAgIGxvYWRDbXAgPSAoZGV0YWlscykgPT5cbiAgICAgICAgICAgIHNldFRpbWVvdXQgPT5cbiAgICAgICAgICAgICAgQF93YXRjaGluZ1Jlc291cmNlcy5kZWxldGUoZGV0YWlscy5pZClcbiAgICAgICAgICAgICAgQHVwZGF0ZVJlc291cmNlU3RhdGUoKVxuICAgICAgICAgICAgLCA1MDBcbiAgICAgICAgICAjIGFib3V0IHdlYlJlcXVlc3RcbiAgICAgICAgICAjIGRldGFpbHMgb2JqZWN0IGRlc2NyaWJlcyByZXF1ZXN0XG4gICAgICAgICAgIyBUaGUgZmlsdGVyIG9iamVjdCBoYXMgYSB1cmxzIHByb3BlcnR5IHdoaWNoIGlzIGFuIEFycmF5IG9mIFVSTCBwYXR0ZXJucy1cbiAgICAgICAgICAjIC10aGF0IHdpbGwgYmUgdXNlZCB0byBmaWx0ZXIgb3V0IHRoZSByZXF1ZXN0cyB0aGF0IGRvIG5vdCBtYXRjaCB0aGUgVVJMIHBhdHRlcm5zLlxuICAgICAgICAgICMgSWYgdGhlIGZpbHRlciBpcyBvbWl0dGVkIHRoZW4gYWxsIHJlcXVlc3RzIHdpbGwgYmUgbWF0Y2hlZC5cbiAgICAgICAgICBidy53ZWJDb250ZW50cy5zZXNzaW9uLndlYlJlcXVlc3Qub25Db21wbGV0ZWQgbG9hZENtcFxuICAgICAgICAgIGJ3LndlYkNvbnRlbnRzLnNlc3Npb24ud2ViUmVxdWVzdC5vbkVycm9yT2NjdXJyZWQgbG9hZENtcFxuICAgICAgICAgIGJ3LndlYkNvbnRlbnRzLnNlc3Npb24ud2ViUmVxdWVzdC5vbkJlZm9yZVJlcXVlc3QgKGRldGFpbHMsIGNhbGxiYWNrKSA9PlxuICAgICAgICAgICAgQF93YXRjaGluZ1Jlc291cmNlcy5hZGQoZGV0YWlscy5pZClcbiAgICAgICAgICAgIEB1cGRhdGVSZXNvdXJjZVN0YXRlKClcbiAgICAgICAgICAgIGNhbGxiYWNrKHt9KVxuXG4gICAgICAgICAgQG1lbnUgPSBuZXcgTWRzTWFpbk1lbnVcbiAgICAgICAgICAgIHdpbmRvdzogYndcbiAgICAgICAgICAgIGRldmVsb3BtZW50OiBnbG9iYWwubWFycC5kZXZlbG9wbWVudFxuICAgICAgICAgICAgdmlld01vZGU6IEB2aWV3TW9kZVxuXG4gICAgICAgICAgYncubWF4aW1pemUoKSBpZiBnbG9iYWwubWFycC5jb25maWcuZ2V0ICd3aW5kb3dQb3NpdGlvbi5tYXhpbWl6ZWQnXG5cbiAgICAgICAgICBidy5sb2FkVVJMIFwiZmlsZTovLyN7X19kaXJuYW1lfS8uLi8uLi9wcmVzZW5JbmRleC5odG1sXCJcblxuICAgICAgICAgIGJ3LndlYkNvbnRlbnRzLm9uICdkaWQtZmluaXNoLWxvYWQnLCA9PlxuICAgICAgICAgICAgQF93aW5kb3dMb2FkZWQgPSB0cnVlXG4gICAgICAgICAgICAjQHNlbmQgJ3NldFNwbGl0dGVyJywgZ2xvYmFsLm1hcnAuY29uZmlnLmdldCgnc3BsaXR0ZXJQb3NpdGlvbicpXG4gICAgICAgICAgICBAc2VuZCAnc2V0U3BsaXR0ZXInLCAwLjY1XG4gICAgICAgICAgICBAc2VuZCAnc2V0RWRpdG9yQ29uZmlnJywgZ2xvYmFsLm1hcnAuY29uZmlnLmdldCgnZWRpdG9yJylcbiAgICAgICAgICAgIEB0cmlnZ2VyICdsb2FkJywgZmlsZU9wdHM/LmJ1ZmZlciB8fCAnJywgQHBhdGhcbiAgICAgICAgICAgIGJ3LndlYkNvbnRlbnRzLnNlbmQgJ3ByZXNlbkRldkluaXRpYWxpemUnLCBzbGlkZVxuXG5cbiAgICAgICAgICBidy5vbmNlICdyZWFkeS10by1zaG93JywgPT4gYncuc2hvdygpXG5cbiAgICAgICAgICBidy5vbiAnY2xvc2UnLCAoZSkgPT5cbiAgICAgICAgICAgIGlmIEBmcmVlemVcbiAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpXG4gICAgICAgICAgICAgIE1kc1dpbmRvdy5hcHBXaWxsUXVpdCA9IGZhbHNlXG4gICAgICAgICAgICAgIHJldHVyblxuICAgICAgICAgIGJ3Lm9uICdjbG9zZWQnLCA9PlxuICAgICAgICAgICAgQGJyb3dzZXJXaW5kb3cgPSBudWxsXG4gICAgICAgICAgICBAX3NldElzT3BlbiBmYWxzZVxuXG4gICAgICAgICAgdXBkYXRlV2luZG93UG9zaXRpb24gPSAoZSkgPT5cbiAgICAgICAgICAgIHVubGVzcyBnbG9iYWwubWFycC5jb25maWcuc2V0KCd3aW5kb3dQb3NpdGlvbi5tYXhpbWl6ZWQnLCBidy5pc01heGltaXplZCgpKVxuICAgICAgICAgICAgICBnbG9iYWwubWFycC5jb25maWcubWVyZ2UgeyB3aW5kb3dQb3NpdGlvbjogYncuZ2V0Qm91bmRzKCkgfVxuXG4gICAgICAgICAgYncub24gJ21vdmUnLCB1cGRhdGVXaW5kb3dQb3NpdGlvblxuICAgICAgICAgIGJ3Lm9uICdyZXNpemUnLCB1cGRhdGVXaW5kb3dQb3NpdGlvblxuICAgICAgICAgIGJ3Lm9uICdtYXhpbWl6ZScsIHVwZGF0ZVdpbmRvd1Bvc2l0aW9uXG4gICAgICAgICAgYncub24gJ3VubWF4aW1pemUnLCB1cGRhdGVXaW5kb3dQb3NpdGlvblxuXG4gICAgICAgICAgYncubWRzV2luZG93ID0gQFxuICAgICAgICAgIGJ3XG5cbiAgICAgICAgQF9zZXRJc09wZW4gdHJ1ZSJdfQ==
