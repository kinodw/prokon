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
  var comment;

  comment = [];

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
  var client, draggingSplitPosition, draggingSplitter, presenDevStates, responsePdfOpts, setSplitter, setting, slideHTML, webview;
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
  setting = {
    "id": "presenDevIndex",
    "url": "ws://apps.wisdomweb.net:64260/ws/mik",
    "site": "test",
    "token": "Pad:9948"
  };
  client = new MickrClient(setting);
  client.on("sendComment", (function(_this) {
    return function(e, data) {
      _this.comment = [].concat(data.body.content);
      return console.log(_this.comment);
    };
  })(this));
  client.send("canReceiveComment", {
    "to": "index",
    "body": {
      "content": ""
    }
  });
  client.on("changeComment", (function(_this) {
    return function(e, data) {
      var id;
      id = data.body.content;
      return $('#comment').text(comment[id - 1]);
    };
  })(this));
  webview = document.querySelector('#preview');
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJlc2VuRGV2SW5kZXguanMiLCJzb3VyY2VzIjpbInByZXNlbkRldkluZGV4LmNvZmZlZSJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxJQUFBLDZGQUFBO0VBQUE7OztBQUFBLEdBQUEsR0FBTSxPQUFBLENBQVEsVUFBUixDQUFtQixDQUFDOztBQUMxQixNQUFvQixPQUFBLENBQVEsVUFBUixDQUFwQixFQUFDLGlCQUFELEVBQVE7O0FBQ1IsT0FBQSxHQUFvQixPQUFBLENBQVEsdUJBQVI7O0FBQ3BCLGNBQUEsR0FBb0IsT0FBQSxDQUFRLDJCQUFSOztBQUNwQixXQUFBLEdBQW9CLElBQUk7O0FBQ3hCLFdBQUEsR0FBb0IsT0FBQSxDQUFRLHVCQUFSOztBQUVwQixXQUFXLENBQUMsYUFBWixDQUFBOztBQUdNO0FBQ0osTUFBQTs7RUFBQSxPQUFBLEdBQVU7OzRCQUNWLFdBQUEsR0FBYTs7NEJBQ2Isa0JBQUEsR0FBb0I7OzRCQUNwQixZQUFBLEdBQWM7OzRCQUVkLGtCQUFBLEdBQW9COzs0QkFDcEIsZUFBQSxHQUFpQjs7RUFFSix5QkFBQyxPQUFEO0lBQUMsSUFBQyxDQUFBLFVBQUQ7Ozs7SUFDWixJQUFDLENBQUEsaUJBQUQsQ0FBQTtFQURXOzs0QkFLYixpQkFBQSxHQUFtQixTQUFBO1dBQ2pCLENBQUEsQ0FBRSxJQUFDLENBQUEsT0FBSCxDQUNFLENBQUMsRUFESCxDQUNNLFdBRE4sRUFDbUIsQ0FBQSxTQUFBLEtBQUE7YUFBQSxTQUFBO2VBR2YsQ0FBQSxDQUFFLEtBQUMsQ0FBQSxPQUFPLENBQUMsVUFBWCxDQUFzQixDQUFDLE1BQXZCLENBQThCLGtEQUE5QjtNQUhlO0lBQUEsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQURuQixDQU9FLENBQUMsRUFQSCxDQU9NLGFBUE4sRUFPcUIsQ0FBQSxTQUFBLEtBQUE7YUFBQSxTQUFDLEVBQUQ7QUFDakIsWUFBQTtRQUFBLENBQUEsR0FBSSxFQUFFLENBQUM7QUFFUCxnQkFBTyxDQUFDLENBQUMsT0FBVDtB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Q0FBSCxDQUFBIiwic291cmNlc0NvbnRlbnQiOlsiaXBjID0gcmVxdWlyZSgnZWxlY3Ryb24nKS5pcGNSZW5kZXJlclxue3NoZWxsLCB3ZWJGcmFtZX0gPSByZXF1aXJlICdlbGVjdHJvbidcbk1kc01lbnUgICAgICAgICAgID0gcmVxdWlyZSAnLi9qcy9jbGFzc2VzL21kc19tZW51J1xuY2xzTWRzUmVuZGVyZXIgICAgPSByZXF1aXJlICcuL2pzL2NsYXNzZXMvbWRzX3JlbmRlcmVyJ1xuTWRzUmVuZGVyZXIgICAgICAgPSBuZXcgY2xzTWRzUmVuZGVyZXJcbk1pY2tyQ2xpZW50ICAgICAgID0gcmVxdWlyZSAnLi9tb2R1bGVzL01pY2tyQ2xpZW50J1xuXG5NZHNSZW5kZXJlci5yZXF1ZXN0QWNjZXB0KClcbiN3ZWJGcmFtZS5zZXRab29tTGV2ZWxMaW1pdHMoMSwgMSlcblxuY2xhc3MgUHJlc2VuRGV2U3RhdGVzXG4gIGNvbW1lbnQgPSBbXVxuICBjdXJyZW50UGFnZTogbnVsbFxuICBwcmV2aWV3SW5pdGlhbGl6ZWQ6IGZhbHNlXG4gIGxhc3RSZW5kZXJlZDoge31cblxuICBfbG9ja0NoYW5nZWRTdGF0dXM6IGZhbHNlXG4gIF9pbWFnZURpcmVjdG9yeTogbnVsbFxuXG4gIGNvbnN0cnVjdG9yOiAoQHByZXZpZXcpIC0+XG4gICAgQGluaXRpYWxpemVQcmV2aWV3KClcbiAgICAjIEBpbml0aWFsaXplU3RvcFdhdGNoKClcblxuXG4gIGluaXRpYWxpemVQcmV2aWV3OiA9PlxuICAgICQoQHByZXZpZXcpXG4gICAgICAub24gJ2RvbS1yZWFkeScsID0+XG4gICAgICAgICMgRml4IG1pbmltaXplZCBwcmV2aWV3ICgjMjApXG4gICAgICAgICMgW05vdGVdIGh0dHBzOi8vZ2l0aHViLmNvbS9lbGVjdHJvbi9lbGVjdHJvbi9pc3N1ZXMvNDg4MlxuICAgICAgICAkKEBwcmV2aWV3LnNoYWRvd1Jvb3QpLmFwcGVuZCgnPHN0eWxlPm9iamVjdHttaW4td2lkdGg6MDttaW4taGVpZ2h0OjA7fTwvc3R5bGU+JylcblxuICAgICAgIyB3ZWJ2aWV3IOOBi+OCieOBrumAmuS/oeOCkuWPl+OBkeWPluOCiyAnaXBjLW1lc3NhZ2UnXG4gICAgICAub24gJ2lwYy1tZXNzYWdlJywgKGV2KSA9PlxuICAgICAgICBlID0gZXYub3JpZ2luYWxFdmVudFxuXG4gICAgICAgIHN3aXRjaCBlLmNoYW5uZWxcbiAgICAgICAgICB3aGVuICdydWxlckNoYW5nZWQnXG4gICAgICAgICAgICBAcmVmcmVzaFBhZ2UgZS5hcmdzWzBdXG4gICAgICAgICAgd2hlbiAnbGlua1RvJ1xuICAgICAgICAgICAgQG9wZW5MaW5rIGUuYXJnc1swXVxuICAgICAgICAgIHdoZW4gJ3JlbmRlcmVkJ1xuICAgICAgICAgICAgQGxhc3RSZW5kZXJlZCA9IGUuYXJnc1swXVxuICAgICAgICAgICAgdW5sZXNzIEBwcmV2aWV3SW5pdGlhbGl6ZWRcbiAgICAgICAgICAgICAgTWRzUmVuZGVyZXIuc2VuZFRvTWFpbiAncHJldmlld0luaXRpYWxpemVkJ1xuXG4gICAgICAgICAgICAgIEBwcmV2aWV3SW5pdGlhbGl6ZWQgPSB0cnVlXG4gICAgICAgICAgICAgICQoJ2JvZHknKS5hZGRDbGFzcyAnaW5pdGlhbGl6ZWQtc2xpZGUnXG4gICAgICAgICAgZWxzZVxuICAgICAgICAgICAgTWRzUmVuZGVyZXIuX2NhbGxfZXZlbnQgZS5jaGFubmVsLCBlLmFyZ3MuLi5cbiAgICAgICMgdXJs44KS44Kv44Oq44OD44Kv44GX44Gm5paw44GX44GE44Km44Kk44Oz44OJ44Km44GM6ZaL44GL44KM44KL5pmCXG4gICAgICAub24gJ25ldy13aW5kb3cnLCAoZSkgPT5cbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpXG4gICAgICAgIEBvcGVuTGluayBlLm9yaWdpbmFsRXZlbnQudXJsXG5cbiAgICAgIC5vbiAnZGlkLWZpbmlzaC1sb2FkJywgKGUpID0+XG4gICAgICAgIEBwcmV2aWV3LnNlbmQgJ2N1cnJlbnRQYWdlJywgMVxuICAgICAgICBAcHJldmlldy5zZW5kICdzZXRJbWFnZURpcmVjdG9yeScsIEBfaW1hZ2VEaXJlY3RvcnlcbiAgICAgICAgQHByZXZpZXcuc2VuZCAncmVuZGVyJywgXCJcIlxuXG4gIG9wZW5MaW5rOiAobGluaykgPT5cbiAgICBzaGVsbC5vcGVuRXh0ZXJuYWwgbGluayBpZiAvXmh0dHBzPzpcXC9cXC8uKy8udGVzdChsaW5rKVxuXG4gIGluaXRpYWxpemVTdG9wV2F0Y2g6ID0+XG5cbiAgICB0aW1lID0gMFxuICAgIG1pZCA9IDBcblxuICAgIG1pbl90aW1lID0gMFxuICAgIHNlY190aW1lID0gMFxuXG4gICAgbm93ID0gbnVsbFxuICAgIGNvdW50ID0gbnVsbFxuXG4gICAgbWluID0gJChcIiNtaW5cIilcbiAgICBzZWMgPSAkKFwiI3NlY1wiKVxuXG4gICAgc3RhcnQgPSAkKFwiI3N0YXJ0XCIpXG4gICAgc3RvcCA9ICQoXCIjc3RvcFwiKVxuICAgIHJlc2V0ID0gJChcIiNyZXNldFwiKVxuXG4gICAgI3N0YXJ044Oc44K/44Oz44GM5oq844GV44KM44Gf5pmC44Gu5Yem55CGXG4gICAgc3RhcnQuY2xpY2sgKCkgLT5cbiAgICAgICAgbm93ID0gbmV3IERhdGUoKSAj54++5Zyo5pmC5Yi7XG4gICAgICAgIGNvdW50ID0gc2V0SW50ZXJ2YWwoY291bnRlciwgMTApXG4gICAgICAgIHRvZ2dsZSgpXG4gICAgICAgIHJlc2V0LmNzcyhcImNvbG9yXCIsIFwiI0ZGOTE5NFwiKVxuXG4gICAgI3N0b3Djg5zjgr/jg7PjgYzmirzjgZXjgozjgZ/mmYLjga7lh6bnkIZcbiAgICBzdG9wLmNsaWNrICgpIC0+XG4gICAgICAgIG1pZCArPSAobmV3IERhdGUoKSAtIG5vdykvMTAwMFxuICAgICAgICBjbGVhckludGVydmFsKGNvdW50KVxuICAgICAgICB0b2dnbGUoKVxuICAgICAgICByZXNldC5jc3MoXCJjb2xvclwiLCBcInJlZFwiKVxuXG5cbiAgICAjcmVzZXTjg5zjgr/jg7PjgYzmirzjgZXjgozjgZ/mmYLjga7lh6bnkIZcbiAgICByZXNldC5jbGljayAoKSAtPlxuICAgICAgICBtaWQgPSAwXG4gICAgICAgIG1pbi5odG1sKFwiMFwiKVxuICAgICAgICBzZWMuaHRtbChcIjAwLjAwXCIpXG4gICAgICAgIHJlc2V0LmNzcyhcImNvbG9yXCIsIFwiZ3JheVwiKVxuICAgICAgICByZXNldC5wcm9wKFwiZGlzYWJsZWRcIiwgdHJ1ZSlcblxuICAgICPmmYLplpPjga7oqIjnrpdcbiAgICBjb3VudGVyID0gKCktPlxuICAgICAgICB0aW1lID0gbWlkICsgKChuZXcgRGF0ZSgpIC0gbm93KS8xMDAwKVxuXG4gICAgICAgICM2MOenkue1jOmBjuOBl+OBn+aZguOBruWHpueQhlxuICAgICAgICBpZih0aW1lID4gNjApXG4gICAgICAgICAgICBtaWQgPSAwXG4gICAgICAgICAgICBtaW5fdGltZSsrXG4gICAgICAgICAgICBub3cgPSBuZXcgRGF0ZSgpXG4gICAgICAgICAgICB0aW1lID0gMFxuICAgICAgICAgICAgc2VjLmh0bWwoKVxuXG5cbiAgICAgICAgI+enkuaVsOOBjDEw56eS44KI44KK5bCP44GV44GL44Gj44Gf44KJMDEsIDAy44Gu44KI44GG44Gr44GZ44KLXG4gICAgICAgIGlmKHRpbWUgPCAxMClcbiAgICAgICAgICAgIHNlYy5odG1sKFwiMFwiK3RpbWUudG9GaXhlZCgyKSlcbiAgICAgICAgZWxzZVxuICAgICAgICAgICAgc2VjLmh0bWwodGltZS50b0ZpeGVkKDIpKVxuICAgICAgICBtaW4uaHRtbChtaW5fdGltZSk7XG5cblxuICAgICPjg5zjgr/jg7Pjga7liIfjgormm7/jgYhcbiAgICB0b2dnbGUgPSAoKSAtPlxuICAgICAgICBpZighc3RhcnQucHJvcChcImRpc2FibGVkXCIpKVxuICAgICAgICAgICAgc3RhcnQucHJvcChcImRpc2FibGVkXCIsIHRydWUpO1xuICAgICAgICAgICAgc3RvcC5wcm9wKFwiZGlzYWJsZWRcIiwgZmFsc2UpO1xuICAgICAgICAgICAgcmVzZXQucHJvcChcImRpc2FibGVkXCIsIHRydWUpO1xuICAgICAgICBlbHNlXG4gICAgICAgICAgICBzdGFydC5wcm9wKFwiZGlzYWJsZWRcIiwgZmFsc2UpO1xuICAgICAgICAgICAgc3RvcC5wcm9wKFwiZGlzYWJsZWRcIiwgdHJ1ZSk7XG4gICAgICAgICAgICByZXNldC5wcm9wKFwiZGlzYWJsZWRcIiwgZmFsc2UpO1xuXG5kbyAtPlxuXG4gIHNsaWRlSFRNTCA9IFwiXCJcbiAgcHJlc2VuRGV2U3RhdGVzID0gbmV3IFByZXNlbkRldlN0YXRlcyhcbiAgICAkKCcjcHJldmlldycpWzBdXG4gIClcblxuICAjIFNwbGl0dGVyXG4gIGRyYWdnaW5nU3BsaXR0ZXIgICAgICA9IGZhbHNlXG4gIGRyYWdnaW5nU3BsaXRQb3NpdGlvbiA9IHVuZGVmaW5lZFxuXG4gIHNldFNwbGl0dGVyID0gKHNwbGl0UG9pbnQpIC0+XG4gICAgc3BsaXRQb2ludCA9IE1hdGgubWluKDAuOCwgTWF0aC5tYXgoMC4yLCBwYXJzZUZsb2F0KHNwbGl0UG9pbnQpKSlcblxuICAgICQoJy5wYW5lLm1hcmtkb3duJykuY3NzKCdmbGV4LWdyb3cnLCBzcGxpdFBvaW50ICogMTAwKVxuICAgICQoJy5wYW5lLnByZXZpZXcnKS5jc3MoJ2ZsZXgtZ3JvdycsICgxIC0gc3BsaXRQb2ludCkgKiAxMDApXG5cbiAgICByZXR1cm4gc3BsaXRQb2ludFxuXG4gICQoJy5wYW5lLXNwbGl0dGVyJylcbiAgICAubW91c2Vkb3duIC0+XG4gICAgICBkcmFnZ2luZ1NwbGl0dGVyID0gdHJ1ZVxuICAgICAgZHJhZ2dpbmdTcGxpdFBvc2l0aW9uID0gdW5kZWZpbmVkXG5cbiAgICAuZGJsY2xpY2sgLT5cbiAgICAgIE1kc1JlbmRlcmVyLnNlbmRUb01haW4gJ3NldENvbmZpZycsICdzcGxpdHRlclBvc2l0aW9uJywgc2V0U3BsaXR0ZXIoMC41KVxuXG4gIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyICdtb3VzZW1vdmUnLCAoZSkgLT5cbiAgICBpZiBkcmFnZ2luZ1NwbGl0dGVyXG4gICAgICBkcmFnZ2luZ1NwbGl0UG9zaXRpb24gPSBzZXRTcGxpdHRlciBNYXRoLm1pbihNYXRoLm1heCgwLCBlLmNsaWVudFgpLCBkb2N1bWVudC5ib2R5LmNsaWVudFdpZHRoKSAvIGRvY3VtZW50LmJvZHkuY2xpZW50V2lkdGhcbiAgLCBmYWxzZVxuXG4gIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyICdtb3VzZXVwJywgKGUpIC0+XG4gICAgZHJhZ2dpbmdTcGxpdHRlciA9IGZhbHNlXG4gICAgTWRzUmVuZGVyZXIuc2VuZFRvTWFpbiAnc2V0Q29uZmlnJywgJ3NwbGl0dGVyUG9zaXRpb24nLCBkcmFnZ2luZ1NwbGl0UG9zaXRpb24gaWYgZHJhZ2dpbmdTcGxpdFBvc2l0aW9uP1xuICAsIGZhbHNlXG5cbiAgcmVzcG9uc2VQZGZPcHRzID0gbnVsbFxuXG4gICMgRXZlbnRzXG4gIE1kc1JlbmRlcmVyXG4gICAgLm9uICd2aWV3TW9kZScsIChtb2RlKSAtPlxuICAgICAgc3dpdGNoIG1vZGVcbiAgICAgICAgd2hlbiAnbWFya2Rvd24nXG4gICAgICAgICAgcHJlc2VuRGV2U3RhdGVzLnByZXZpZXcuc2VuZCAnc2V0Q2xhc3MnLCAnJ1xuICAgICAgICB3aGVuICdzY3JlZW4nXG4gICAgICAgICAgcHJlc2VuRGV2U3RhdGVzLnByZXZpZXcuc2VuZCAnc2V0Q2xhc3MnLCAnc2xpZGUtdmlldyBzY3JlZW4nXG4gICAgICAgIHdoZW4gJ2xpc3QnXG4gICAgICAgICAgcHJlc2VuRGV2U3RhdGVzLnByZXZpZXcuc2VuZCAnc2V0Q2xhc3MnLCAnc2xpZGUtdmlldyBsaXN0J1xuICAgICAgICB3aGVuICdwcmVzZW4tZGV2J1xuICAgICAgICAgIHByZXNlbkRldlN0YXRlcy5wcmV2aWV3LnNlbmQgJ3NldENsYXNzJywgJ3NsaWRlLXZpZXcgcHJlc2VuLWRldidcblxuICAgICAgJCgnI3ByZXZpZXctbW9kZXMnKS5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKVxuICAgICAgJCgnLnZpZXdtb2RlLWJ0bltkYXRhLXZpZXdtb2RlXScpLnJlbW92ZUNsYXNzKCdhY3RpdmUnKVxuICAgICAgICAuZmlsdGVyKFwiW2RhdGEtdmlld21vZGU9JyN7bW9kZX0nXVwiKS5hZGRDbGFzcygnYWN0aXZlJylcblxuICAgIC5vbiAnb3BlbkRldlRvb2wnLCAtPlxuICAgICAgaWYgcHJlc2VuRGV2U3RhdGVzLnByZXZpZXcuaXNEZXZUb29sc09wZW5lZCgpXG4gICAgICAgIHByZXNlbkRldlN0YXRlcy5wcmV2aWV3LmNsb3NlRGV2VG9vbHMoKVxuICAgICAgZWxzZVxuICAgICAgICBwcmVzZW5EZXZTdGF0ZXMucHJldmlldy5vcGVuRGV2VG9vbHMoKVxuXG4gICAgLm9uICdzZXRTcGxpdHRlcicsIChzcGxpaXRlclBvcykgLT4gc2V0U3BsaXR0ZXIgc3BsaWl0ZXJQb3NcbiAgICAub24gJ3NldFRoZW1lJywgKHRoZW1lKSAtPiBwcmVzZW5EZXZTdGF0ZXMudXBkYXRlR2xvYmFsU2V0dGluZyAnJHRoZW1lJywgdGhlbWVcbiAgICAub24gJ3Jlc291cmNlU3RhdGUnLCAoc3RhdGUpIC0+IGxvYWRpbmdTdGF0ZSA9IHN0YXRlXG4jIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuICBzZXR0aW5nID1cbiAgICBcImlkXCI6IFwicHJlc2VuRGV2SW5kZXhcIlxuICAgIFwidXJsXCI6IFwid3M6Ly9hcHBzLndpc2RvbXdlYi5uZXQ6NjQyNjAvd3MvbWlrXCJcbiAgICBcInNpdGVcIjogXCJ0ZXN0XCJcbiAgICBcInRva2VuXCI6IFwiUGFkOjk5NDhcIlxuICBjbGllbnQgPSBuZXcgTWlja3JDbGllbnQoc2V0dGluZylcbiAgICAjIOOCs+ODoeODs+ODiOWPl+S/oVxuICBjbGllbnQub24gXCJzZW5kQ29tbWVudFwiLCAoZSwgZGF0YSkgPT5cbiAgICBAY29tbWVudCA9IFtdLmNvbmNhdChkYXRhLmJvZHkuY29udGVudClcbiAgICBjb25zb2xlLmxvZyBAY29tbWVudFxuXG4gIGNsaWVudC5zZW5kIFwiY2FuUmVjZWl2ZUNvbW1lbnRcIiwge1xuICAgIFwidG9cIjogXCJpbmRleFwiXG4gICAgXCJib2R5XCI6XG4gICAgICBcImNvbnRlbnRcIjogXCJcIlxuICAgIH1cbiAgY2xpZW50Lm9uIFwiY2hhbmdlQ29tbWVudFwiLCAoZSxkYXRhKSA9PlxuICAgIGlkID0gZGF0YS5ib2R5LmNvbnRlbnRcbiAgICAkKCcjY29tbWVudCcpLnRleHQoY29tbWVudFtpZC0xXSlcblxuXG5cbiAgd2VidmlldyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNwcmV2aWV3JylcblxuICB3ZWJ2aWV3LmFkZEV2ZW50TGlzdGVuZXIgJ2lwYy1tZXNzYWdlJywgKGV2ZW50KSA9PlxuICAgICBzd2l0Y2ggZXZlbnQuY2hhbm5lbFxuICAgICAgIHdoZW4gXCJzZW5kU2xpZGVJbmZvXCIgICAjIHdlYnZpZXcg44GL44KJ44K544Op44Kk44OJ5oOF5aCx44KS5Y+X5L+hXG4gICAgICAgIHNsaWRlSW5mbyA9IGV2ZW50LmFyZ3NbMF1cbiAgICAgICAgY29uc29sZS5sb2cgJ3JlY2VpdmUgc2VuZFNsaWRlSW5mbydcbiAgICAgICAgY29uc29sZS5sb2cgc2xpZGVJbmZvXG4gICAgICAgIGlwYy5zZW5kICd0ZXh0U2VuZCcsIHNsaWRlSW5mb1xuICAgICAgICBjb25zb2xlLmxvZyAnc2VuZCB0ZXh0U2VuZCdcbiAgICAgICAgYnJlYWtcbiAgICAgICB3aGVuIFwicmVxdWVzdFNsaWRlSFRNTFwiXG4gICAgICAgIHdlYnZpZXcuc2VuZCAnc2V0U2xpZGUnLCBzbGlkZUhUTUxcbiAgICAgICAgY29uc29sZS5sb2cgJ3NlbmQgc2V0U2xpZGUnXG4gICAgICAgIGJyZWFrXG4gICAgICAgd2hlbiBcImdvVG9QYWdlXCJcbiAgICAgICAgcGFnZSA9IGV2ZW50LmFyZ3NbMF1cbiAgICAgICAgY29uc29sZS5sb2cgcGFnZVxuICAgICAgICBpcGMuc2VuZCAnZ29Ub1BhZ2UnLCBwYWdlXG5cbiAgaXBjLm9uICdwcmVzZW5EZXZJbml0aWFsaXplJywgKGUsIHRleHQpID0+XG4gICAgICBjb25zb2xlLmxvZyAncmVjZWl2ZSBwcmVzZW5EZXZJbml0aWFsaXplJ1xuICAgICAgY29uc29sZS5sb2cgdGV4dFxuICAgICAgc2xpZGVIVE1MID0gdGV4dFxuIl19
