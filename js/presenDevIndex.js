var MdsMenu, MdsRenderer, MickrClient, PresenDevStates, clsMdsRenderer, ipc, ref, shell, webFrame,
  bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  slice = [].slice;

ipc = require('electron').ipcRenderer;

ref = require('electron'), shell = ref.shell, webFrame = ref.webFrame;

MdsMenu = require('./js/classes/mds_menu');

clsMdsRenderer = require('./js/classes/mds_renderer');

MdsRenderer = new clsMdsRenderer;

MickrClient = require('./modules/MickrClient');

MdsRenderer.requestAccept();

PresenDevStates = (function() {
  PresenDevStates.prototype.currentPage = null;

  PresenDevStates.prototype.previewInitialized = false;

  PresenDevStates.prototype.lastRendered = {};

  PresenDevStates.prototype._lockChangedStatus = false;

  PresenDevStates.prototype._imageDirectory = null;

  function PresenDevStates(preview) {
    this.preview = preview;
    this.initializeStopWatch = bind(this.initializeStopWatch, this);
    this.openLink = bind(this.openLink, this);
    this.initializePreview = bind(this.initializePreview, this);
    this.initializePreview();
  }

  PresenDevStates.prototype.initializePreview = function() {
    return $(this.preview).on('dom-ready', (function(_this) {
      return function() {
        return $(_this.preview.shadowRoot).append('<style>object{min-width:0;min-height:0;}</style>');
      };
    })(this)).on('ipc-message', (function(_this) {
      return function(ev) {
        var e;
        e = ev.originalEvent;
        switch (e.channel) {
          case 'rulerChanged':
            return _this.refreshPage(e.args[0]);
          case 'linkTo':
            return _this.openLink(e.args[0]);
          case 'rendered':
            _this.lastRendered = e.args[0];
            if (!_this.previewInitialized) {
              MdsRenderer.sendToMain('previewInitialized');
              _this.previewInitialized = true;
              return $('body').addClass('initialized-slide');
            }
            break;
          default:
            return MdsRenderer._call_event.apply(MdsRenderer, [e.channel].concat(slice.call(e.args)));
        }
      };
    })(this)).on('new-window', (function(_this) {
      return function(e) {
        e.preventDefault();
        return _this.openLink(e.originalEvent.url);
      };
    })(this)).on('did-finish-load', (function(_this) {
      return function(e) {
        _this.preview.send('currentPage', 1);
        _this.preview.send('setImageDirectory', _this._imageDirectory);
        return _this.preview.send('render', "");
      };
    })(this));
  };

  PresenDevStates.prototype.openLink = function(link) {
    if (/^https?:\/\/.+/.test(link)) {
      return shell.openExternal(link);
    }
  };

  PresenDevStates.prototype.initializeStopWatch = function() {
    var count, counter, mid, min, min_time, now, reset, sec, sec_time, start, stop, time, toggle;
    time = 0;
    mid = 0;
    min_time = 0;
    sec_time = 0;
    now = null;
    count = null;
    min = $("#min");
    sec = $("#sec");
    start = $("#start");
    stop = $("#stop");
    reset = $("#reset");
    start.click(function() {
      now = new Date();
      count = setInterval(counter, 10);
      toggle();
      return reset.css("color", "#FF9194");
    });
    stop.click(function() {
      mid += (new Date() - now) / 1000;
      clearInterval(count);
      toggle();
      return reset.css("color", "red");
    });
    reset.click(function() {
      mid = 0;
      min.html("0");
      sec.html("00.00");
      reset.css("color", "gray");
      return reset.prop("disabled", true);
    });
    counter = function() {
      time = mid + ((new Date() - now) / 1000);
      if (time > 60) {
        mid = 0;
        min_time++;
        now = new Date();
        time = 0;
        sec.html();
      }
      if (time < 10) {
        sec.html("0" + time.toFixed(2));
      } else {
        sec.html(time.toFixed(2));
      }
      return min.html(min_time);
    };
    return toggle = function() {
      if (!start.prop("disabled")) {
        start.prop("disabled", true);
        stop.prop("disabled", false);
        return reset.prop("disabled", true);
      } else {
        start.prop("disabled", false);
        stop.prop("disabled", true);
        return reset.prop("disabled", false);
      }
    };
  };

  return PresenDevStates;

})();

(function() {
  var draggingSplitPosition, draggingSplitter, presenDevStates, responsePdfOpts, setSplitter, slideHTML, webview;
  document.addEventListener("DOMContentLoaded", (function(_this) {
    return function(event) {
      var client, setting;
      setting = {
        "id": "presenIndex",
        "url": "ws://apps.wisdomweb.net:64260/ws/mik",
        "site": "test",
        "token": "Pad:9948"
      };
      client = new MickrClient(setting);
      client.send("canReceiveComment", {
        "to": "index",
        "body": {
          "content": ""
        }
      });
      return client.on("sendComment", function(e, data) {
        return console.log(data.body.content);
      });
    };
  })(this));
  slideHTML = "";
  presenDevStates = new PresenDevStates($('#preview')[0]);
  draggingSplitter = false;
  draggingSplitPosition = void 0;
  setSplitter = function(splitPoint) {
    splitPoint = Math.min(0.8, Math.max(0.2, parseFloat(splitPoint)));
    $('.pane.markdown').css('flex-grow', splitPoint * 100);
    $('.pane.preview').css('flex-grow', (1 - splitPoint) * 100);
    return splitPoint;
  };
  $('.pane-splitter').mousedown(function() {
    draggingSplitter = true;
    return draggingSplitPosition = void 0;
  }).dblclick(function() {
    return MdsRenderer.sendToMain('setConfig', 'splitterPosition', setSplitter(0.5));
  });
  window.addEventListener('mousemove', function(e) {
    if (draggingSplitter) {
      return draggingSplitPosition = setSplitter(Math.min(Math.max(0, e.clientX), document.body.clientWidth) / document.body.clientWidth);
    }
  }, false);
  window.addEventListener('mouseup', function(e) {
    draggingSplitter = false;
    if (draggingSplitPosition != null) {
      return MdsRenderer.sendToMain('setConfig', 'splitterPosition', draggingSplitPosition);
    }
  }, false);
  responsePdfOpts = null;
  MdsRenderer.on('viewMode', function(mode) {
    switch (mode) {
      case 'markdown':
        presenDevStates.preview.send('setClass', '');
        break;
      case 'screen':
        presenDevStates.preview.send('setClass', 'slide-view screen');
        break;
      case 'list':
        presenDevStates.preview.send('setClass', 'slide-view list');
        break;
      case 'presen-dev':
        presenDevStates.preview.send('setClass', 'slide-view presen-dev');
    }
    $('#preview-modes').removeClass('disabled');
    return $('.viewmode-btn[data-viewmode]').removeClass('active').filter("[data-viewmode='" + mode + "']").addClass('active');
  }).on('openDevTool', function() {
    if (presenDevStates.preview.isDevToolsOpened()) {
      return presenDevStates.preview.closeDevTools();
    } else {
      return presenDevStates.preview.openDevTools();
    }
  }).on('setSplitter', function(spliiterPos) {
    return setSplitter(spliiterPos);
  }).on('setTheme', function(theme) {
    return presenDevStates.updateGlobalSetting('$theme', theme);
  }).on('resourceState', function(state) {
    var loadingState;
    return loadingState = state;
  });
  webview = document.querySelector('#preview');
  $('#presentation').on('click', (function(_this) {
    return function() {
      webview.send('requestSlideInfo');
      return console.log('send requestSlideInfo');
    };
  })(this));
  webview.addEventListener('ipc-message', (function(_this) {
    return function(event) {
      var page, slideInfo;
      switch (event.channel) {
        case "sendSlideInfo":
          slideInfo = event.args[0];
          console.log('receive sendSlideInfo');
          console.log(slideInfo);
          ipc.send('textSend', slideInfo);
          console.log('send textSend');
          break;
        case "requestSlideHTML":
          webview.send('setSlide', slideHTML);
          console.log('send setSlide');
          break;
        case "goToPage":
          page = event.args[0];
          console.log(page);
          return ipc.send('goToPage', page);
      }
    };
  })(this));
  return ipc.on('presenDevInitialize', (function(_this) {
    return function(e, text) {
      console.log('receive presenDevInitialize');
      console.log(text);
      return slideHTML = text;
    };
  })(this));
})();

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJlc2VuRGV2SW5kZXguanMiLCJzb3VyY2VzIjpbInByZXNlbkRldkluZGV4LmNvZmZlZSJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxJQUFBLDZGQUFBO0VBQUE7OztBQUFBLEdBQUEsR0FBTSxPQUFBLENBQVEsVUFBUixDQUFtQixDQUFDOztBQUMxQixNQUFvQixPQUFBLENBQVEsVUFBUixDQUFwQixFQUFDLGlCQUFELEVBQVE7O0FBQ1IsT0FBQSxHQUFvQixPQUFBLENBQVEsdUJBQVI7O0FBQ3BCLGNBQUEsR0FBb0IsT0FBQSxDQUFRLDJCQUFSOztBQUNwQixXQUFBLEdBQW9CLElBQUk7O0FBQ3hCLFdBQUEsR0FBb0IsT0FBQSxDQUFRLHVCQUFSOztBQUVwQixXQUFXLENBQUMsYUFBWixDQUFBOztBQUdNOzRCQUNKLFdBQUEsR0FBYTs7NEJBQ2Isa0JBQUEsR0FBb0I7OzRCQUNwQixZQUFBLEdBQWM7OzRCQUVkLGtCQUFBLEdBQW9COzs0QkFDcEIsZUFBQSxHQUFpQjs7RUFFSix5QkFBQyxPQUFEO0lBQUMsSUFBQyxDQUFBLFVBQUQ7Ozs7SUFDWixJQUFDLENBQUEsaUJBQUQsQ0FBQTtFQURXOzs0QkFLYixpQkFBQSxHQUFtQixTQUFBO1dBQ2pCLENBQUEsQ0FBRSxJQUFDLENBQUEsT0FBSCxDQUNFLENBQUMsRUFESCxDQUNNLFdBRE4sRUFDbUIsQ0FBQSxTQUFBLEtBQUE7YUFBQSxTQUFBO2VBR2YsQ0FBQSxDQUFFLEtBQUMsQ0FBQSxPQUFPLENBQUMsVUFBWCxDQUFzQixDQUFDLE1BQXZCLENBQThCLGtEQUE5QjtNQUhlO0lBQUEsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQURuQixDQU9FLENBQUMsRUFQSCxDQU9NLGFBUE4sRUFPcUIsQ0FBQSxTQUFBLEtBQUE7YUFBQSxTQUFDLEVBQUQ7QUFDakIsWUFBQTtRQUFBLENBQUEsR0FBSSxFQUFFLENBQUM7QUFFUCxnQkFBTyxDQUFDLENBQUMsT0FBVDtBQUFBLGVBQ08sY0FEUDttQkFFSSxLQUFDLENB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cmVyXG57c2hlbGwsIHdlYkZyYW1lfSA9IHJlcXVpcmUgJ2VsZWN0cm9uJ1xuTWRzTWVudSAgICAgICAgICAgPSByZXF1aXJlICcuL2pzL2NsYXNzZXMvbWRzX21lbnUnXG5jbHNNZHNSZW5kZXJlciAgICA9IHJlcXVpcmUgJy4vanMvY2xhc3Nlcy9tZHNfcmVuZGVyZXInXG5NZHNSZW5kZXJlciAgICAgICA9IG5ldyBjbHNNZHNSZW5kZXJlclxuTWlja3JDbGllbnQgICAgICAgPSByZXF1aXJlICcuL21vZHVsZXMvTWlja3JDbGllbnQnXG5cbk1kc1JlbmRlcmVyLnJlcXVlc3RBY2NlcHQoKVxuI3dlYkZyYW1lLnNldFpvb21MZXZlbExpbWl0cygxLCAxKVxuXG5jbGFzcyBQcmVzZW5EZXZTdGF0ZXNcbiAgY3VycmVudFBhZ2U6IG51bGxcbiAgcHJldmlld0luaXRpYWxpemVkOiBmYWxzZVxuICBsYXN0UmVuZGVyZWQ6IHt9XG5cbiAgX2xvY2tDaGFuZ2VkU3RhdHVzOiBmYWxzZVxuICBfaW1hZ2VEaXJlY3Rvcnk6IG51bGxcblxuICBjb25zdHJ1Y3RvcjogKEBwcmV2aWV3KSAtPlxuICAgIEBpbml0aWFsaXplUHJldmlldygpXG4gICAgIyBAaW5pdGlhbGl6ZVN0b3BXYXRjaCgpXG5cblxuICBpbml0aWFsaXplUHJldmlldzogPT5cbiAgICAkKEBwcmV2aWV3KVxuICAgICAgLm9uICdkb20tcmVhZHknLCA9PlxuICAgICAgICAjIEZpeCBtaW5pbWl6ZWQgcHJldmlldyAoIzIwKVxuICAgICAgICAjIFtOb3RlXSBodHRwczovL2dpdGh1Yi5jb20vZWxlY3Ryb24vZWxlY3Ryb24vaXNzdWVzLzQ4ODJcbiAgICAgICAgJChAcHJldmlldy5zaGFkb3dSb290KS5hcHBlbmQoJzxzdHlsZT5vYmplY3R7bWluLXdpZHRoOjA7bWluLWhlaWdodDowO308L3N0eWxlPicpXG5cbiAgICAgICMgd2VidmlldyDjgYvjgonjga7pgJrkv6HjgpLlj5fjgZHlj5bjgosgJ2lwYy1tZXNzYWdlJ1xuICAgICAgLm9uICdpcGMtbWVzc2FnZScsIChldikgPT5cbiAgICAgICAgZSA9IGV2Lm9yaWdpbmFsRXZlbnRcblxuICAgICAgICBzd2l0Y2ggZS5jaGFubmVsXG4gICAgICAgICAgd2hlbiAncnVsZXJDaGFuZ2VkJ1xuICAgICAgICAgICAgQHJlZnJlc2hQYWdlIGUuYXJnc1swXVxuICAgICAgICAgIHdoZW4gJ2xpbmtUbydcbiAgICAgICAgICAgIEBvcGVuTGluayBlLmFyZ3NbMF1cbiAgICAgICAgICB3aGVuICdyZW5kZXJlZCdcbiAgICAgICAgICAgIEBsYXN0UmVuZGVyZWQgPSBlLmFyZ3NbMF1cbiAgICAgICAgICAgIHVubGVzcyBAcHJldmlld0luaXRpYWxpemVkXG4gICAgICAgICAgICAgIE1kc1JlbmRlcmVyLnNlbmRUb01haW4gJ3ByZXZpZXdJbml0aWFsaXplZCdcblxuICAgICAgICAgICAgICBAcHJldmlld0luaXRpYWxpemVkID0gdHJ1ZVxuICAgICAgICAgICAgICAkKCdib2R5JykuYWRkQ2xhc3MgJ2luaXRpYWxpemVkLXNsaWRlJ1xuICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgIE1kc1JlbmRlcmVyLl9jYWxsX2V2ZW50IGUuY2hhbm5lbCwgZS5hcmdzLi4uXG4gICAgICAjIHVybOOCkuOCr+ODquODg+OCr+OBl+OBpuaWsOOBl+OBhOOCpuOCpOODs+ODieOCpuOBjOmWi+OBi+OCjOOCi+aZglxuICAgICAgLm9uICduZXctd2luZG93JywgKGUpID0+XG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKVxuICAgICAgICBAb3BlbkxpbmsgZS5vcmlnaW5hbEV2ZW50LnVybFxuXG4gICAgICAub24gJ2RpZC1maW5pc2gtbG9hZCcsIChlKSA9PlxuICAgICAgICBAcHJldmlldy5zZW5kICdjdXJyZW50UGFnZScsIDFcbiAgICAgICAgQHByZXZpZXcuc2VuZCAnc2V0SW1hZ2VEaXJlY3RvcnknLCBAX2ltYWdlRGlyZWN0b3J5XG4gICAgICAgIEBwcmV2aWV3LnNlbmQgJ3JlbmRlcicsIFwiXCJcblxuICBvcGVuTGluazogKGxpbmspID0+XG4gICAgc2hlbGwub3BlbkV4dGVybmFsIGxpbmsgaWYgL15odHRwcz86XFwvXFwvLisvLnRlc3QobGluaylcblxuICBpbml0aWFsaXplU3RvcFdhdGNoOiA9PlxuXG4gICAgdGltZSA9IDBcbiAgICBtaWQgPSAwXG5cbiAgICBtaW5fdGltZSA9IDBcbiAgICBzZWNfdGltZSA9IDBcblxuICAgIG5vdyA9IG51bGxcbiAgICBjb3VudCA9IG51bGxcblxuICAgIG1pbiA9ICQoXCIjbWluXCIpXG4gICAgc2VjID0gJChcIiNzZWNcIilcblxuICAgIHN0YXJ0ID0gJChcIiNzdGFydFwiKVxuICAgIHN0b3AgPSAkKFwiI3N0b3BcIilcbiAgICByZXNldCA9ICQoXCIjcmVzZXRcIilcblxuICAgICNzdGFydOODnOOCv+ODs+OBjOaKvOOBleOCjOOBn+aZguOBruWHpueQhlxuICAgIHN0YXJ0LmNsaWNrICgpIC0+XG4gICAgICAgIG5vdyA9IG5ldyBEYXRlKCkgI+ePvuWcqOaZguWIu1xuICAgICAgICBjb3VudCA9IHNldEludGVydmFsKGNvdW50ZXIsIDEwKVxuICAgICAgICB0b2dnbGUoKVxuICAgICAgICByZXNldC5jc3MoXCJjb2xvclwiLCBcIiNGRjkxOTRcIilcblxuICAgICNzdG9w44Oc44K/44Oz44GM5oq844GV44KM44Gf5pmC44Gu5Yem55CGXG4gICAgc3RvcC5jbGljayAoKSAtPlxuICAgICAgICBtaWQgKz0gKG5ldyBEYXRlKCkgLSBub3cpLzEwMDBcbiAgICAgICAgY2xlYXJJbnRlcnZhbChjb3VudClcbiAgICAgICAgdG9nZ2xlKClcbiAgICAgICAgcmVzZXQuY3NzKFwiY29sb3JcIiwgXCJyZWRcIilcblxuXG4gICAgI3Jlc2V044Oc44K/44Oz44GM5oq844GV44KM44Gf5pmC44Gu5Yem55CGXG4gICAgcmVzZXQuY2xpY2sgKCkgLT5cbiAgICAgICAgbWlkID0gMFxuICAgICAgICBtaW4uaHRtbChcIjBcIilcbiAgICAgICAgc2VjLmh0bWwoXCIwMC4wMFwiKVxuICAgICAgICByZXNldC5jc3MoXCJjb2xvclwiLCBcImdyYXlcIilcbiAgICAgICAgcmVzZXQucHJvcChcImRpc2FibGVkXCIsIHRydWUpXG5cbiAgICAj5pmC6ZaT44Gu6KiI566XXG4gICAgY291bnRlciA9ICgpLT5cbiAgICAgICAgdGltZSA9IG1pZCArICgobmV3IERhdGUoKSAtIG5vdykvMTAwMClcblxuICAgICAgICAjNjDnp5LntYzpgY7jgZfjgZ/mmYLjga7lh6bnkIZcbiAgICAgICAgaWYodGltZSA+IDYwKVxuICAgICAgICAgICAgbWlkID0gMFxuICAgICAgICAgICAgbWluX3RpbWUrK1xuICAgICAgICAgICAgbm93ID0gbmV3IERhdGUoKVxuICAgICAgICAgICAgdGltZSA9IDBcbiAgICAgICAgICAgIHNlYy5odG1sKClcblxuXG4gICAgICAgICPnp5LmlbDjgYwxMOenkuOCiOOCiuWwj+OBleOBi+OBo+OBn+OCiTAxLCAwMuOBruOCiOOBhuOBq+OBmeOCi1xuICAgICAgICBpZih0aW1lIDwgMTApXG4gICAgICAgICAgICBzZWMuaHRtbChcIjBcIit0aW1lLnRvRml4ZWQoMikpXG4gICAgICAgIGVsc2VcbiAgICAgICAgICAgIHNlYy5odG1sKHRpbWUudG9GaXhlZCgyKSlcbiAgICAgICAgbWluLmh0bWwobWluX3RpbWUpO1xuXG5cbiAgICAj44Oc44K/44Oz44Gu5YiH44KK5pu/44GIXG4gICAgdG9nZ2xlID0gKCkgLT5cbiAgICAgICAgaWYoIXN0YXJ0LnByb3AoXCJkaXNhYmxlZFwiKSlcbiAgICAgICAgICAgIHN0YXJ0LnByb3AoXCJkaXNhYmxlZFwiLCB0cnVlKTtcbiAgICAgICAgICAgIHN0b3AucHJvcChcImRpc2FibGVkXCIsIGZhbHNlKTtcbiAgICAgICAgICAgIHJlc2V0LnByb3AoXCJkaXNhYmxlZFwiLCB0cnVlKTtcbiAgICAgICAgZWxzZVxuICAgICAgICAgICAgc3RhcnQucHJvcChcImRpc2FibGVkXCIsIGZhbHNlKTtcbiAgICAgICAgICAgIHN0b3AucHJvcChcImRpc2FibGVkXCIsIHRydWUpO1xuICAgICAgICAgICAgcmVzZXQucHJvcChcImRpc2FibGVkXCIsIGZhbHNlKTtcblxuZG8gLT5cbiAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lciBcIkRPTUNvbnRlbnRMb2FkZWRcIiwgKGV2ZW50KT0+XG4gICAgc2V0dGluZyA9XG4gICAgICBcImlkXCI6IFwicHJlc2VuSW5kZXhcIlxuICAgICAgXCJ1cmxcIjogXCJ3czovL2FwcHMud2lzZG9td2ViLm5ldDo2NDI2MC93cy9taWtcIlxuICAgICAgXCJzaXRlXCI6IFwidGVzdFwiXG4gICAgICBcInRva2VuXCI6IFwiUGFkOjk5NDhcIlxuICAgIGNsaWVudCA9IG5ldyBNaWNrckNsaWVudChzZXR0aW5nKVxuICAgIGNsaWVudC5zZW5kIFwiY2FuUmVjZWl2ZUNvbW1lbnRcIiwge1xuICAgICAgXCJ0b1wiOiBcImluZGV4XCJcbiAgICAgIFwiYm9keVwiOlxuICAgICAgICBcImNvbnRlbnRcIjogXCJcIlxuICAgIH1cbiAgICAjIOOCs+ODoeODs+ODiOWPl+S/oVxuICAgIGNsaWVudC5vbiBcInNlbmRDb21tZW50XCIsIChlLCBkYXRhKSA9PlxuICAgICAgY29uc29sZS5sb2cgZGF0YS5ib2R5LmNvbnRlbnRcblxuXG4gIHNsaWRlSFRNTCA9IFwiXCJcbiAgcHJlc2VuRGV2U3RhdGVzID0gbmV3IFByZXNlbkRldlN0YXRlcyhcbiAgICAkKCcjcHJldmlldycpWzBdXG4gIClcblxuICAjIFNwbGl0dGVyXG4gIGRyYWdnaW5nU3BsaXR0ZXIgICAgICA9IGZhbHNlXG4gIGRyYWdnaW5nU3BsaXRQb3NpdGlvbiA9IHVuZGVmaW5lZFxuXG4gIHNldFNwbGl0dGVyID0gKHNwbGl0UG9pbnQpIC0+XG4gICAgc3BsaXRQb2ludCA9IE1hdGgubWluKDAuOCwgTWF0aC5tYXgoMC4yLCBwYXJzZUZsb2F0KHNwbGl0UG9pbnQpKSlcblxuICAgICQoJy5wYW5lLm1hcmtkb3duJykuY3NzKCdmbGV4LWdyb3cnLCBzcGxpdFBvaW50ICogMTAwKVxuICAgICQoJy5wYW5lLnByZXZpZXcnKS5jc3MoJ2ZsZXgtZ3JvdycsICgxIC0gc3BsaXRQb2ludCkgKiAxMDApXG5cbiAgICByZXR1cm4gc3BsaXRQb2ludFxuXG4gICQoJy5wYW5lLXNwbGl0dGVyJylcbiAgICAubW91c2Vkb3duIC0+XG4gICAgICBkcmFnZ2luZ1NwbGl0dGVyID0gdHJ1ZVxuICAgICAgZHJhZ2dpbmdTcGxpdFBvc2l0aW9uID0gdW5kZWZpbmVkXG5cbiAgICAuZGJsY2xpY2sgLT5cbiAgICAgIE1kc1JlbmRlcmVyLnNlbmRUb01haW4gJ3NldENvbmZpZycsICdzcGxpdHRlclBvc2l0aW9uJywgc2V0U3BsaXR0ZXIoMC41KVxuXG4gIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyICdtb3VzZW1vdmUnLCAoZSkgLT5cbiAgICBpZiBkcmFnZ2luZ1NwbGl0dGVyXG4gICAgICBkcmFnZ2luZ1NwbGl0UG9zaXRpb24gPSBzZXRTcGxpdHRlciBNYXRoLm1pbihNYXRoLm1heCgwLCBlLmNsaWVudFgpLCBkb2N1bWVudC5ib2R5LmNsaWVudFdpZHRoKSAvIGRvY3VtZW50LmJvZHkuY2xpZW50V2lkdGhcbiAgLCBmYWxzZVxuXG4gIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyICdtb3VzZXVwJywgKGUpIC0+XG4gICAgZHJhZ2dpbmdTcGxpdHRlciA9IGZhbHNlXG4gICAgTWRzUmVuZGVyZXIuc2VuZFRvTWFpbiAnc2V0Q29uZmlnJywgJ3NwbGl0dGVyUG9zaXRpb24nLCBkcmFnZ2luZ1NwbGl0UG9zaXRpb24gaWYgZHJhZ2dpbmdTcGxpdFBvc2l0aW9uP1xuICAsIGZhbHNlXG5cbiAgcmVzcG9uc2VQZGZPcHRzID0gbnVsbFxuXG4gICMgRXZlbnRzXG4gIE1kc1JlbmRlcmVyXG4gICAgLm9uICd2aWV3TW9kZScsIChtb2RlKSAtPlxuICAgICAgc3dpdGNoIG1vZGVcbiAgICAgICAgd2hlbiAnbWFya2Rvd24nXG4gICAgICAgICAgcHJlc2VuRGV2U3RhdGVzLnByZXZpZXcuc2VuZCAnc2V0Q2xhc3MnLCAnJ1xuICAgICAgICB3aGVuICdzY3JlZW4nXG4gICAgICAgICAgcHJlc2VuRGV2U3RhdGVzLnByZXZpZXcuc2VuZCAnc2V0Q2xhc3MnLCAnc2xpZGUtdmlldyBzY3JlZW4nXG4gICAgICAgIHdoZW4gJ2xpc3QnXG4gICAgICAgICAgcHJlc2VuRGV2U3RhdGVzLnByZXZpZXcuc2VuZCAnc2V0Q2xhc3MnLCAnc2xpZGUtdmlldyBsaXN0J1xuICAgICAgICB3aGVuICdwcmVzZW4tZGV2J1xuICAgICAgICAgIHByZXNlbkRldlN0YXRlcy5wcmV2aWV3LnNlbmQgJ3NldENsYXNzJywgJ3NsaWRlLXZpZXcgcHJlc2VuLWRldidcblxuICAgICAgJCgnI3ByZXZpZXctbW9kZXMnKS5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKVxuICAgICAgJCgnLnZpZXdtb2RlLWJ0bltkYXRhLXZpZXdtb2RlXScpLnJlbW92ZUNsYXNzKCdhY3RpdmUnKVxuICAgICAgICAuZmlsdGVyKFwiW2RhdGEtdmlld21vZGU9JyN7bW9kZX0nXVwiKS5hZGRDbGFzcygnYWN0aXZlJylcblxuICAgIC5vbiAnb3BlbkRldlRvb2wnLCAtPlxuICAgICAgaWYgcHJlc2VuRGV2U3RhdGVzLnByZXZpZXcuaXNEZXZUb29sc09wZW5lZCgpXG4gICAgICAgIHByZXNlbkRldlN0YXRlcy5wcmV2aWV3LmNsb3NlRGV2VG9vbHMoKVxuICAgICAgZWxzZVxuICAgICAgICBwcmVzZW5EZXZTdGF0ZXMucHJldmlldy5vcGVuRGV2VG9vbHMoKVxuXG4gICAgLm9uICdzZXRTcGxpdHRlcicsIChzcGxpaXRlclBvcykgLT4gc2V0U3BsaXR0ZXIgc3BsaWl0ZXJQb3NcbiAgICAub24gJ3NldFRoZW1lJywgKHRoZW1lKSAtPiBwcmVzZW5EZXZTdGF0ZXMudXBkYXRlR2xvYmFsU2V0dGluZyAnJHRoZW1lJywgdGhlbWVcbiAgICAub24gJ3Jlc291cmNlU3RhdGUnLCAoc3RhdGUpIC0+IGxvYWRpbmdTdGF0ZSA9IHN0YXRlXG4jIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuICB3ZWJ2aWV3ID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI3ByZXZpZXcnKVxuICAjIHNpbXBsZSBwcmVzZW50YXRpb24gbW9kZSBvbiFcbiAgIyAkKCcjcHJlc2VudGF0aW9uJykub24gJ2NsaWNrJywgKCkgPT5cbiAgIyAgIHdlYnZpZXcud2Via2l0UmVxdWVzdEZ1bGxTY3JlZW4oKVxuXG4gICMgJCgnI3ByZXNlbnRhdGlvbicpLm9uICdjbGljaycsICgpID0+XG4gICMgICAkKCcucGFuZS5tYXJrZG93bicpLnRvZ2dsZSgpXG4gICMgICBpcGMuc2VuZCgnUHJlc2VudGF0aW9uJylcblxuICAjIGlwYy5vbiAnaW5pdGlhbGl6ZScgKCkgPT5cblxuICAjIGlwYy5vbiBcInByZXNlbnRhdGlvblwiLCAoKSAtPlxuICAjICAgY29uc29sZS5sb2cgXCJyZWNpZXZlIHByZXNlbnRhdGlvblwiXG4gICMgICBpcGMuc2VuZCBcInRleHRTZW5kXCIsIHByZXNlbkRldlN0YXRlcy5jb2RlTWlycm9yLmdldFZhbHVlKClcbiAgIyAgIGNvbnNvbGUubG9nICdzZW5kIHRleHRTZW5kJ1xuXG4gICQoJyNwcmVzZW50YXRpb24nKS5vbiAnY2xpY2snLCAoKSA9PlxuICAgICMgJCgnLnBhbmUubWFya2Rvd24nKS50b2dnbGUoKVxuICAgIHdlYnZpZXcuc2VuZCAncmVxdWVzdFNsaWRlSW5mbydcbiAgICBjb25zb2xlLmxvZyAnc2VuZCByZXF1ZXN0U2xpZGVJbmZvJ1xuXG4gIHdlYnZpZXcuYWRkRXZlbnRMaXN0ZW5lciAnaXBjLW1lc3NhZ2UnLCAoZXZlbnQpID0+XG4gICAgIHN3aXRjaCBldmVudC5jaGFubmVsXG4gICAgICAgd2hlbiBcInNlbmRTbGlkZUluZm9cIiAgICMgd2VidmlldyDjgYvjgonjgrnjg6njgqTjg4nmg4XloLHjgpLlj5fkv6FcbiAgICAgICAgc2xpZGVJbmZvID0gZXZlbnQuYXJnc1swXVxuICAgICAgICBjb25zb2xlLmxvZyAncmVjZWl2ZSBzZW5kU2xpZGVJbmZvJ1xuICAgICAgICBjb25zb2xlLmxvZyBzbGlkZUluZm9cbiAgICAgICAgaXBjLnNlbmQgJ3RleHRTZW5kJywgc2xpZGVJbmZvXG4gICAgICAgIGNvbnNvbGUubG9nICdzZW5kIHRleHRTZW5kJ1xuICAgICAgICBicmVha1xuICAgICAgIHdoZW4gXCJyZXF1ZXN0U2xpZGVIVE1MXCJcbiAgICAgICAgd2Vidmlldy5zZW5kICdzZXRTbGlkZScsIHNsaWRlSFRNTFxuICAgICAgICBjb25zb2xlLmxvZyAnc2VuZCBzZXRTbGlkZSdcbiAgICAgICAgYnJlYWtcbiAgICAgICB3aGVuIFwiZ29Ub1BhZ2VcIlxuICAgICAgICBwYWdlID0gZXZlbnQuYXJnc1swXVxuICAgICAgICBjb25zb2xlLmxvZyBwYWdlXG4gICAgICAgIGlwYy5zZW5kICdnb1RvUGFnZScsIHBhZ2VcblxuICBpcGMub24gJ3ByZXNlbkRldkluaXRpYWxpemUnLCAoZSwgdGV4dCkgPT5cbiAgICAgIGNvbnNvbGUubG9nICdyZWNlaXZlIHByZXNlbkRldkluaXRpYWxpemUnXG4gICAgICBjb25zb2xlLmxvZyB0ZXh0XG4gICAgICBzbGlkZUhUTUwgPSB0ZXh0XG5cbiAgICAgICMgd2VidmlldyDjga7mupblgpnjgYzjgafjgY3jgabjgarjgYRcbiAgICAgICMgd2Vidmlldy5zZW5kICdzZXRTbGlkZScsIHRleHRcbiAgICAgICMgY29uc29sZS5sb2cgJ3NlbmQgc2V0U2xpZGUnXG4gICMgaXBjLm9uICdpbml0aWFsaXplJywgKCkgPT5cbiAgIyAgICQoJy5wYW5lLm1hcmtkb3duJykuaHRtbCgpXG4jIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcblxuICAjIEluaXRpYWxpemUiXX0=
