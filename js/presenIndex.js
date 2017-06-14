var MdsMenu, MdsRenderer, PresenStates, clsMdsRenderer, ipc, ref, shell, webFrame,
  bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  slice = [].slice;

ipc = require('electron').ipcRenderer;

ref = require('electron'), shell = ref.shell, webFrame = ref.webFrame;

MdsMenu = require('./js/classes/mds_menu');

clsMdsRenderer = require('./js/classes/mds_renderer');

MdsRenderer = new clsMdsRenderer;

MdsRenderer.requestAccept();

webFrame.setZoomLevelLimits(1, 1);

PresenStates = (function() {
  PresenStates.prototype.currentPage = null;

  PresenStates.prototype.previewInitialized = false;

  PresenStates.prototype.lastRendered = {};

  PresenStates.prototype._lockChangedStatus = false;

  PresenStates.prototype._imageDirectory = null;

  function PresenStates(preview) {
    this.preview = preview;
    this.initializeStopWatch = bind(this.initializeStopWatch, this);
    this.openLink = bind(this.openLink, this);
    this.initializePreview = bind(this.initializePreview, this);
    this.initializePreview();
  }

  PresenStates.prototype.initializePreview = function() {
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

  PresenStates.prototype.openLink = function(link) {
    if (/^https?:\/\/.+/.test(link)) {
      return shell.openExternal(link);
    }
  };

  PresenStates.prototype.initializeStopWatch = function() {
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

  return PresenStates;

})();

(function() {
  var draggingSplitPosition, draggingSplitter, presenStates, responsePdfOpts, setSplitter, slideHTML, webview;
  slideHTML = "";
  presenStates = new PresenStates($('#preview')[0]);
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
        presenStates.preview.send('setClass', '');
        break;
      case 'screen':
        presenStates.preview.send('setClass', 'slide-view screen');
        break;
      case 'list':
        presenStates.preview.send('setClass', 'slide-view list');
        break;
      case 'presen-dev':
        presenStates.preview.send('setClass', 'slide-view presen-dev');
    }
    $('#preview-modes').removeClass('disabled');
    return $('.viewmode-btn[data-viewmode]').removeClass('active').filter("[data-viewmode='" + mode + "']").addClass('active');
  }).on('openDevTool', function() {
    if (presenStates.preview.isDevToolsOpened()) {
      return presenStates.preview.closeDevTools();
    } else {
      return presenStates.preview.openDevTools();
    }
  }).on('setSplitter', function(spliiterPos) {
    return setSplitter(spliiterPos);
  }).on('setTheme', function(theme) {
    return presenStates.updateGlobalSetting('$theme', theme);
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJlc2VuSW5kZXguanMiLCJzb3VyY2VzIjpbInByZXNlbkluZGV4LmNvZmZlZSJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxJQUFBLDZFQUFBO0VBQUE7OztBQUFBLEdBQUEsR0FBTSxPQUFBLENBQVEsVUFBUixDQUFtQixDQUFDOztBQUMxQixNQUFvQixPQUFBLENBQVEsVUFBUixDQUFwQixFQUFDLGlCQUFELEVBQVE7O0FBQ1IsT0FBQSxHQUFvQixPQUFBLENBQVEsdUJBQVI7O0FBQ3BCLGNBQUEsR0FBb0IsT0FBQSxDQUFRLDJCQUFSOztBQUNwQixXQUFBLEdBQW9CLElBQUk7O0FBQ3hCLFdBQVcsQ0FBQyxhQUFaLENBQUE7O0FBRUEsUUFBUSxDQUFDLGtCQUFULENBQTRCLENBQTVCLEVBQStCLENBQS9COztBQUVNO3lCQUNKLFdBQUEsR0FBYTs7eUJBQ2Isa0JBQUEsR0FBb0I7O3lCQUNwQixZQUFBLEdBQWM7O3lCQUVkLGtCQUFBLEdBQW9COzt5QkFDcEIsZUFBQSxHQUFpQjs7RUFFSixzQkFBQyxPQUFEO0lBQUMsSUFBQyxDQUFBLFVBQUQ7Ozs7SUFDWixJQUFDLENBQUEsaUJBQUQsQ0FBQTtFQURXOzt5QkFLYixpQkFBQSxHQUFtQixTQUFBO1dBQ2pCLENBQUEsQ0FBRSxJQUFDLENBQUEsT0FBSCxDQUNFLENBQUMsRUFESCxDQUNNLFdBRE4sRUFDbUIsQ0FBQSxTQUFBLEtBQUE7YUFBQSxTQUFBO2VBR2YsQ0FBQSxDQUFFLEtBQUMsQ0FBQSxPQUFPLENBQUMsVUFBWCxDQUFzQixDQUFDLE1BQXZCLENBQThCLGtEQUE5QjtNQUhlO0lBQUEsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQURuQixDQU9FLENBQUMsRUFQSCxDQU9NLGFBUE4sRUFPcUIsQ0FBQSxTQUFBLEtBQUE7YUFBQSxTQUFDLEVBQUQ7QUFDakIsWUFBQTtRQUFBLENBQUEsR0FBSSxFQUFFLENBQUM7QUFFUCxnQkFBTyxDQUFDLENBQUMsT0FBVDtBQUFBLGVBQ08sY0FEUDttQkFFSSxL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VUFhRyxJQUFBLEdBQU8sS0FBSyxDQUFDLElBQUssQ0FBQSxDQUFBO1VBQ2xCLE9BQU8sQ0FBQyxHQUFSLENBQVksSUFBWjtpQkFDQSxHQUFHLENBQUMsSUFBSixDQUFTLFVBQVQsRUFBcUIsSUFBckI7QUFmSDtJQURxQztFQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBeEM7U0FrQkEsR0FBRyxDQUFDLEVBQUosQ0FBTyxxQkFBUCxFQUE4QixDQUFBLFNBQUEsS0FBQTtXQUFBLFNBQUMsQ0FBRCxFQUFJLElBQUo7TUFDMUIsT0FBTyxDQUFDLEdBQVIsQ0FBWSw2QkFBWjtNQUNBLE9BQU8sQ0FBQyxHQUFSLENBQVksSUFBWjthQUNBLFNBQUEsR0FBWTtJQUhjO0VBQUEsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQUE5QjtBQXhHQyxDQUFBLENBQUgsQ0FBQSIsInNvdXJjZXNDb250ZW50IjpbImlwYyA9IHJlcXVpcmUoJ2VsZWN0cm9uJykuaXBjUmVuZGVyZXJcbntzaGVsbCwgd2ViRnJhbWV9ID0gcmVxdWlyZSAnZWxlY3Ryb24nXG5NZHNNZW51ICAgICAgICAgICA9IHJlcXVpcmUgJy4vanMvY2xhc3Nlcy9tZHNfbWVudSdcbmNsc01kc1JlbmRlcmVyICAgID0gcmVxdWlyZSAnLi9qcy9jbGFzc2VzL21kc19yZW5kZXJlcidcbk1kc1JlbmRlcmVyICAgICAgID0gbmV3IGNsc01kc1JlbmRlcmVyXG5NZHNSZW5kZXJlci5yZXF1ZXN0QWNjZXB0KClcblxud2ViRnJhbWUuc2V0Wm9vbUxldmVsTGltaXRzKDEsIDEpXG5cbmNsYXNzIFByZXNlblN0YXRlc1xuICBjdXJyZW50UGFnZTogbnVsbFxuICBwcmV2aWV3SW5pdGlhbGl6ZWQ6IGZhbHNlXG4gIGxhc3RSZW5kZXJlZDoge31cblxuICBfbG9ja0NoYW5nZWRTdGF0dXM6IGZhbHNlXG4gIF9pbWFnZURpcmVjdG9yeTogbnVsbFxuXG4gIGNvbnN0cnVjdG9yOiAoQHByZXZpZXcpIC0+XG4gICAgQGluaXRpYWxpemVQcmV2aWV3KClcbiAgICAjIEBpbml0aWFsaXplU3RvcFdhdGNoKClcblxuXG4gIGluaXRpYWxpemVQcmV2aWV3OiA9PlxuICAgICQoQHByZXZpZXcpXG4gICAgICAub24gJ2RvbS1yZWFkeScsID0+XG4gICAgICAgICMgRml4IG1pbmltaXplZCBwcmV2aWV3ICgjMjApXG4gICAgICAgICMgW05vdGVdIGh0dHBzOi8vZ2l0aHViLmNvbS9lbGVjdHJvbi9lbGVjdHJvbi9pc3N1ZXMvNDg4MlxuICAgICAgICAkKEBwcmV2aWV3LnNoYWRvd1Jvb3QpLmFwcGVuZCgnPHN0eWxlPm9iamVjdHttaW4td2lkdGg6MDttaW4taGVpZ2h0OjA7fTwvc3R5bGU+JylcblxuICAgICAgIyB3ZWJ2aWV3IOOBi+OCieOBrumAmuS/oeOCkuWPl+OBkeWPluOCiyAnaXBjLW1lc3NhZ2UnXG4gICAgICAub24gJ2lwYy1tZXNzYWdlJywgKGV2KSA9PlxuICAgICAgICBlID0gZXYub3JpZ2luYWxFdmVudFxuXG4gICAgICAgIHN3aXRjaCBlLmNoYW5uZWxcbiAgICAgICAgICB3aGVuICdydWxlckNoYW5nZWQnXG4gICAgICAgICAgICBAcmVmcmVzaFBhZ2UgZS5hcmdzWzBdXG4gICAgICAgICAgd2hlbiAnbGlua1RvJ1xuICAgICAgICAgICAgQG9wZW5MaW5rIGUuYXJnc1swXVxuICAgICAgICAgIHdoZW4gJ3JlbmRlcmVkJ1xuICAgICAgICAgICAgQGxhc3RSZW5kZXJlZCA9IGUuYXJnc1swXVxuICAgICAgICAgICAgdW5sZXNzIEBwcmV2aWV3SW5pdGlhbGl6ZWRcbiAgICAgICAgICAgICAgTWRzUmVuZGVyZXIuc2VuZFRvTWFpbiAncHJldmlld0luaXRpYWxpemVkJ1xuXG4gICAgICAgICAgICAgIEBwcmV2aWV3SW5pdGlhbGl6ZWQgPSB0cnVlXG4gICAgICAgICAgICAgICQoJ2JvZHknKS5hZGRDbGFzcyAnaW5pdGlhbGl6ZWQtc2xpZGUnXG4gICAgICAgICAgZWxzZVxuICAgICAgICAgICAgTWRzUmVuZGVyZXIuX2NhbGxfZXZlbnQgZS5jaGFubmVsLCBlLmFyZ3MuLi5cbiAgICAgICMgdXJs44KS44Kv44Oq44OD44Kv44GX44Gm5paw44GX44GE44Km44Kk44Oz44OJ44Km44GM6ZaL44GL44KM44KL5pmCXG4gICAgICAub24gJ25ldy13aW5kb3cnLCAoZSkgPT5cbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpXG4gICAgICAgIEBvcGVuTGluayBlLm9yaWdpbmFsRXZlbnQudXJsXG5cbiAgICAgIC5vbiAnZGlkLWZpbmlzaC1sb2FkJywgKGUpID0+XG4gICAgICAgIEBwcmV2aWV3LnNlbmQgJ2N1cnJlbnRQYWdlJywgMVxuICAgICAgICBAcHJldmlldy5zZW5kICdzZXRJbWFnZURpcmVjdG9yeScsIEBfaW1hZ2VEaXJlY3RvcnlcbiAgICAgICAgQHByZXZpZXcuc2VuZCAncmVuZGVyJywgXCJcIlxuXG4gIG9wZW5MaW5rOiAobGluaykgPT5cbiAgICBzaGVsbC5vcGVuRXh0ZXJuYWwgbGluayBpZiAvXmh0dHBzPzpcXC9cXC8uKy8udGVzdChsaW5rKVxuXG4gIGluaXRpYWxpemVTdG9wV2F0Y2g6ID0+XG5cbiAgICB0aW1lID0gMFxuICAgIG1pZCA9IDBcblxuICAgIG1pbl90aW1lID0gMFxuICAgIHNlY190aW1lID0gMFxuXG4gICAgbm93ID0gbnVsbFxuICAgIGNvdW50ID0gbnVsbFxuXG4gICAgbWluID0gJChcIiNtaW5cIilcbiAgICBzZWMgPSAkKFwiI3NlY1wiKVxuXG4gICAgc3RhcnQgPSAkKFwiI3N0YXJ0XCIpXG4gICAgc3RvcCA9ICQoXCIjc3RvcFwiKVxuICAgIHJlc2V0ID0gJChcIiNyZXNldFwiKVxuXG4gICAgI3N0YXJ044Oc44K/44Oz44GM5oq844GV44KM44Gf5pmC44Gu5Yem55CGXG4gICAgc3RhcnQuY2xpY2sgKCkgLT5cbiAgICAgICAgbm93ID0gbmV3IERhdGUoKSAj54++5Zyo5pmC5Yi7XG4gICAgICAgIGNvdW50ID0gc2V0SW50ZXJ2YWwoY291bnRlciwgMTApXG4gICAgICAgIHRvZ2dsZSgpXG4gICAgICAgIHJlc2V0LmNzcyhcImNvbG9yXCIsIFwiI0ZGOTE5NFwiKVxuXG4gICAgI3N0b3Djg5zjgr/jg7PjgYzmirzjgZXjgozjgZ/mmYLjga7lh6bnkIZcbiAgICBzdG9wLmNsaWNrICgpIC0+XG4gICAgICAgIG1pZCArPSAobmV3IERhdGUoKSAtIG5vdykvMTAwMFxuICAgICAgICBjbGVhckludGVydmFsKGNvdW50KVxuICAgICAgICB0b2dnbGUoKVxuICAgICAgICByZXNldC5jc3MoXCJjb2xvclwiLCBcInJlZFwiKVxuXG5cbiAgICAjcmVzZXTjg5zjgr/jg7PjgYzmirzjgZXjgozjgZ/mmYLjga7lh6bnkIZcbiAgICByZXNldC5jbGljayAoKSAtPlxuICAgICAgICBtaWQgPSAwXG4gICAgICAgIG1pbi5odG1sKFwiMFwiKVxuICAgICAgICBzZWMuaHRtbChcIjAwLjAwXCIpXG4gICAgICAgIHJlc2V0LmNzcyhcImNvbG9yXCIsIFwiZ3JheVwiKVxuICAgICAgICByZXNldC5wcm9wKFwiZGlzYWJsZWRcIiwgdHJ1ZSlcblxuICAgICPmmYLplpPjga7oqIjnrpdcbiAgICBjb3VudGVyID0gKCktPlxuICAgICAgICB0aW1lID0gbWlkICsgKChuZXcgRGF0ZSgpIC0gbm93KS8xMDAwKVxuXG4gICAgICAgICM2MOenkue1jOmBjuOBl+OBn+aZguOBruWHpueQhlxuICAgICAgICBpZih0aW1lID4gNjApXG4gICAgICAgICAgICBtaWQgPSAwXG4gICAgICAgICAgICBtaW5fdGltZSsrXG4gICAgICAgICAgICBub3cgPSBuZXcgRGF0ZSgpXG4gICAgICAgICAgICB0aW1lID0gMFxuICAgICAgICAgICAgc2VjLmh0bWwoKVxuXG5cbiAgICAgICAgI+enkuaVsOOBjDEw56eS44KI44KK5bCP44GV44GL44Gj44Gf44KJMDEsIDAy44Gu44KI44GG44Gr44GZ44KLXG4gICAgICAgIGlmKHRpbWUgPCAxMClcbiAgICAgICAgICAgIHNlYy5odG1sKFwiMFwiK3RpbWUudG9GaXhlZCgyKSlcbiAgICAgICAgZWxzZVxuICAgICAgICAgICAgc2VjLmh0bWwodGltZS50b0ZpeGVkKDIpKVxuICAgICAgICBtaW4uaHRtbChtaW5fdGltZSk7XG5cblxuICAgICPjg5zjgr/jg7Pjga7liIfjgormm7/jgYhcbiAgICB0b2dnbGUgPSAoKSAtPlxuICAgICAgICBpZighc3RhcnQucHJvcChcImRpc2FibGVkXCIpKVxuICAgICAgICAgICAgc3RhcnQucHJvcChcImRpc2FibGVkXCIsIHRydWUpO1xuICAgICAgICAgICAgc3RvcC5wcm9wKFwiZGlzYWJsZWRcIiwgZmFsc2UpO1xuICAgICAgICAgICAgcmVzZXQucHJvcChcImRpc2FibGVkXCIsIHRydWUpO1xuICAgICAgICBlbHNlXG4gICAgICAgICAgICBzdGFydC5wcm9wKFwiZGlzYWJsZWRcIiwgZmFsc2UpO1xuICAgICAgICAgICAgc3RvcC5wcm9wKFwiZGlzYWJsZWRcIiwgdHJ1ZSk7XG4gICAgICAgICAgICByZXNldC5wcm9wKFwiZGlzYWJsZWRcIiwgZmFsc2UpO1xuXG5kbyAtPlxuICBzbGlkZUhUTUwgPSBcIlwiXG4gIHByZXNlblN0YXRlcyA9IG5ldyBQcmVzZW5TdGF0ZXMoXG4gICAgJCgnI3ByZXZpZXcnKVswXVxuICApXG5cbiAgIyBTcGxpdHRlclxuICBkcmFnZ2luZ1NwbGl0dGVyICAgICAgPSBmYWxzZVxuICBkcmFnZ2luZ1NwbGl0UG9zaXRpb24gPSB1bmRlZmluZWRcblxuICBzZXRTcGxpdHRlciA9IChzcGxpdFBvaW50KSAtPlxuICAgIHNwbGl0UG9pbnQgPSBNYXRoLm1pbigwLjgsIE1hdGgubWF4KDAuMiwgcGFyc2VGbG9hdChzcGxpdFBvaW50KSkpXG5cbiAgICAkKCcucGFuZS5tYXJrZG93bicpLmNzcygnZmxleC1ncm93Jywgc3BsaXRQb2ludCAqIDEwMClcbiAgICAkKCcucGFuZS5wcmV2aWV3JykuY3NzKCdmbGV4LWdyb3cnLCAoMSAtIHNwbGl0UG9pbnQpICogMTAwKVxuXG4gICAgcmV0dXJuIHNwbGl0UG9pbnRcblxuICAkKCcucGFuZS1zcGxpdHRlcicpXG4gICAgLm1vdXNlZG93biAtPlxuICAgICAgZHJhZ2dpbmdTcGxpdHRlciA9IHRydWVcbiAgICAgIGRyYWdnaW5nU3BsaXRQb3NpdGlvbiA9IHVuZGVmaW5lZFxuXG4gICAgLmRibGNsaWNrIC0+XG4gICAgICBNZHNSZW5kZXJlci5zZW5kVG9NYWluICdzZXRDb25maWcnLCAnc3BsaXR0ZXJQb3NpdGlvbicsIHNldFNwbGl0dGVyKDAuNSlcblxuICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lciAnbW91c2Vtb3ZlJywgKGUpIC0+XG4gICAgaWYgZHJhZ2dpbmdTcGxpdHRlclxuICAgICAgZHJhZ2dpbmdTcGxpdFBvc2l0aW9uID0gc2V0U3BsaXR0ZXIgTWF0aC5taW4oTWF0aC5tYXgoMCwgZS5jbGllbnRYKSwgZG9jdW1lbnQuYm9keS5jbGllbnRXaWR0aCkgLyBkb2N1bWVudC5ib2R5LmNsaWVudFdpZHRoXG4gICwgZmFsc2VcblxuICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lciAnbW91c2V1cCcsIChlKSAtPlxuICAgIGRyYWdnaW5nU3BsaXR0ZXIgPSBmYWxzZVxuICAgIE1kc1JlbmRlcmVyLnNlbmRUb01haW4gJ3NldENvbmZpZycsICdzcGxpdHRlclBvc2l0aW9uJywgZHJhZ2dpbmdTcGxpdFBvc2l0aW9uIGlmIGRyYWdnaW5nU3BsaXRQb3NpdGlvbj9cbiAgLCBmYWxzZVxuXG4gIHJlc3BvbnNlUGRmT3B0cyA9IG51bGxcblxuICAjIEV2ZW50c1xuICBNZHNSZW5kZXJlclxuICAgIC5vbiAndmlld01vZGUnLCAobW9kZSkgLT5cbiAgICAgIHN3aXRjaCBtb2RlXG4gICAgICAgIHdoZW4gJ21hcmtkb3duJ1xuICAgICAgICAgIHByZXNlblN0YXRlcy5wcmV2aWV3LnNlbmQgJ3NldENsYXNzJywgJydcbiAgICAgICAgd2hlbiAnc2NyZWVuJ1xuICAgICAgICAgIHByZXNlblN0YXRlcy5wcmV2aWV3LnNlbmQgJ3NldENsYXNzJywgJ3NsaWRlLXZpZXcgc2NyZWVuJ1xuICAgICAgICB3aGVuICdsaXN0J1xuICAgICAgICAgIHByZXNlblN0YXRlcy5wcmV2aWV3LnNlbmQgJ3NldENsYXNzJywgJ3NsaWRlLXZpZXcgbGlzdCdcbiAgICAgICAgd2hlbiAncHJlc2VuLWRldidcbiAgICAgICAgICBwcmVzZW5TdGF0ZXMucHJldmlldy5zZW5kICdzZXRDbGFzcycsICdzbGlkZS12aWV3IHByZXNlbi1kZXYnXG5cbiAgICAgICQoJyNwcmV2aWV3LW1vZGVzJykucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJylcbiAgICAgICQoJy52aWV3bW9kZS1idG5bZGF0YS12aWV3bW9kZV0nKS5yZW1vdmVDbGFzcygnYWN0aXZlJylcbiAgICAgICAgLmZpbHRlcihcIltkYXRhLXZpZXdtb2RlPScje21vZGV9J11cIikuYWRkQ2xhc3MoJ2FjdGl2ZScpXG5cbiAgICAub24gJ29wZW5EZXZUb29sJywgLT5cbiAgICAgIGlmIHByZXNlblN0YXRlcy5wcmV2aWV3LmlzRGV2VG9vbHNPcGVuZWQoKVxuICAgICAgICBwcmVzZW5TdGF0ZXMucHJldmlldy5jbG9zZURldlRvb2xzKClcbiAgICAgIGVsc2VcbiAgICAgICAgcHJlc2VuU3RhdGVzLnByZXZpZXcub3BlbkRldlRvb2xzKClcblxuICAgIC5vbiAnc2V0U3BsaXR0ZXInLCAoc3BsaWl0ZXJQb3MpIC0+IHNldFNwbGl0dGVyIHNwbGlpdGVyUG9zXG4gICAgLm9uICdzZXRUaGVtZScsICh0aGVtZSkgLT4gcHJlc2VuU3RhdGVzLnVwZGF0ZUdsb2JhbFNldHRpbmcgJyR0aGVtZScsIHRoZW1lXG4gICAgLm9uICdyZXNvdXJjZVN0YXRlJywgKHN0YXRlKSAtPiBsb2FkaW5nU3RhdGUgPSBzdGF0ZVxuIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcbiAgd2VidmlldyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNwcmV2aWV3JylcbiAgIyBzaW1wbGUgcHJlc2VudGF0aW9uIG1vZGUgb24hXG4gICMgJCgnI3ByZXNlbnRhdGlvbicpLm9uICdjbGljaycsICgpID0+XG4gICMgICB3ZWJ2aWV3LndlYmtpdFJlcXVlc3RGdWxsU2NyZWVuKClcblxuICAjICQoJyNwcmVzZW50YXRpb24nKS5vbiAnY2xpY2snLCAoKSA9PlxuICAjICAgJCgnLnBhbmUubWFya2Rvd24nKS50b2dnbGUoKVxuICAjICAgaXBjLnNlbmQoJ1ByZXNlbnRhdGlvbicpXG5cbiAgIyBpcGMub24gJ2luaXRpYWxpemUnICgpID0+XG5cbiAgIyBpcGMub24gXCJwcmVzZW50YXRpb25cIiwgKCkgLT5cbiAgIyAgIGNvbnNvbGUubG9nIFwicmVjaWV2ZSBwcmVzZW50YXRpb25cIlxuICAjICAgaXBjLnNlbmQgXCJ0ZXh0U2VuZFwiLCBwcmVzZW5TdGF0ZXMuY29kZU1pcnJvci5nZXRWYWx1ZSgpXG4gICMgICBjb25zb2xlLmxvZyAnc2VuZCB0ZXh0U2VuZCdcblxuICAkKCcjcHJlc2VudGF0aW9uJykub24gJ2NsaWNrJywgKCkgPT5cbiAgICAjICQoJy5wYW5lLm1hcmtkb3duJykudG9nZ2xlKClcbiAgICB3ZWJ2aWV3LnNlbmQgJ3JlcXVlc3RTbGlkZUluZm8nXG4gICAgY29uc29sZS5sb2cgJ3NlbmQgcmVxdWVzdFNsaWRlSW5mbydcblxuICB3ZWJ2aWV3LmFkZEV2ZW50TGlzdGVuZXIgJ2lwYy1tZXNzYWdlJywgKGV2ZW50KSA9PlxuICAgICBzd2l0Y2ggZXZlbnQuY2hhbm5lbFxuICAgICAgIHdoZW4gXCJzZW5kU2xpZGVJbmZvXCIgICAjIHdlYnZpZXcg44GL44KJ44K544Op44Kk44OJ5oOF5aCx44KS5Y+X5L+hXG4gICAgICAgIHNsaWRlSW5mbyA9IGV2ZW50LmFyZ3NbMF1cbiAgICAgICAgY29uc29sZS5sb2cgJ3JlY2VpdmUgc2VuZFNsaWRlSW5mbydcbiAgICAgICAgY29uc29sZS5sb2cgc2xpZGVJbmZvXG4gICAgICAgIGlwYy5zZW5kICd0ZXh0U2VuZCcsIHNsaWRlSW5mb1xuICAgICAgICBjb25zb2xlLmxvZyAnc2VuZCB0ZXh0U2VuZCdcbiAgICAgICAgYnJlYWtcbiAgICAgICB3aGVuIFwicmVxdWVzdFNsaWRlSFRNTFwiXG4gICAgICAgIHdlYnZpZXcuc2VuZCAnc2V0U2xpZGUnLCBzbGlkZUhUTUxcbiAgICAgICAgY29uc29sZS5sb2cgJ3NlbmQgc2V0U2xpZGUnXG4gICAgICAgIGJyZWFrXG4gICAgICAgd2hlbiBcImdvVG9QYWdlXCJcbiAgICAgICAgcGFnZSA9IGV2ZW50LmFyZ3NbMF1cbiAgICAgICAgY29uc29sZS5sb2cgcGFnZVxuICAgICAgICBpcGMuc2VuZCAnZ29Ub1BhZ2UnLCBwYWdlXG5cbiAgaXBjLm9uICdwcmVzZW5EZXZJbml0aWFsaXplJywgKGUsIHRleHQpID0+XG4gICAgICBjb25zb2xlLmxvZyAncmVjZWl2ZSBwcmVzZW5EZXZJbml0aWFsaXplJ1xuICAgICAgY29uc29sZS5sb2cgdGV4dFxuICAgICAgc2xpZGVIVE1MID0gdGV4dFxuXG4gICAgICAjIHdlYnZpZXcg44Gu5rqW5YKZ44GM44Gn44GN44Gm44Gq44GEXG4gICAgICAjIHdlYnZpZXcuc2VuZCAnc2V0U2xpZGUnLCB0ZXh0XG4gICAgICAjIGNvbnNvbGUubG9nICdzZW5kIHNldFNsaWRlJ1xuICAjIGlwYy5vbiAnaW5pdGlhbGl6ZScsICgpID0+XG4gICMgICAkKCcucGFuZS5tYXJrZG93bicpLmh0bWwoKVxuIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG5cbiAgIyBJbml0aWFsaXplIl19
