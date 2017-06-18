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
  $("#t").timer({
    action: 'start',
    seconds: 0
  });
  $("#t").addClass("badge-important");
  $('#btn1').removeClass("icon icon-play");
  $('#btn1').addClass('icon icon-pause');
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJlc2VuRGV2SW5kZXguanMiLCJzb3VyY2VzIjpbInByZXNlbkRldkluZGV4LmNvZmZlZSJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxJQUFBLDZGQUFBO0VBQUE7OztBQUFBLEdBQUEsR0FBTSxPQUFBLENBQVEsVUFBUixDQUFtQixDQUFDOztBQUMxQixNQUFvQixPQUFBLENBQVEsVUFBUixDQUFwQixFQUFDLGlCQUFELEVBQVE7O0FBQ1IsT0FBQSxHQUFvQixPQUFBLENBQVEsdUJBQVI7O0FBQ3BCLGNBQUEsR0FBb0IsT0FBQSxDQUFRLDJCQUFSOztBQUNwQixXQUFBLEdBQW9CLElBQUk7O0FBQ3hCLFdBQUEsR0FBb0IsT0FBQSxDQUFRLHVCQUFSOztBQUVwQixXQUFXLENBQUMsYUFBWixDQUFBOztBQUdNO0FBQ0osTUFBQTs7RUFBQSxPQUFBLEdBQVU7OzRCQUNWLFdBQUEsR0FBYTs7NEJBQ2Isa0JBQUEsR0FBb0I7OzRCQUNwQixZQUFBLEdBQWM7OzRCQUVkLGtCQUFBLEdBQW9COzs0QkFDcEIsZUFBQSxHQUFpQjs7RUFFSix5QkFBQyxPQUFEO0lBQUMsSUFBQyxDQUFBLFVBQUQ7Ozs7SUFDWixJQUFDLENBQUEsaUJBQUQsQ0FBQTtFQURXOzs0QkFLYixpQkFBQSxHQUFtQixTQUFBO1dBQ2pCLENBQUEsQ0FBRSxJQUFDLENBQUEsT0FBSCxDQUNFLENBQUMsRUFESCxDQUNNLFdBRE4sRUFDbUIsQ0FBQSxTQUFBLEtBQUE7YUFBQSxTQUFBO2VBR2YsQ0FBQSxDQUFFLEtBQUMsQ0FBQSxPQUFPLENBQUMsVUFBWCxDQUFzQixDQUFDLE1BQXZCLENBQThCLGtEQUE5QjtNQUhlO0lBQUEsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQURuQixDQU9FLENBQUMsRUFQSCxDQU9NLGFBUE4sRUFPcUIsQ0FBQSxTQUFBLEtBQUE7YUFBQSxTQUFDLEVBQUQ7QUFDakIsWUFBQTtRQUFBLENBQUEsR0FBSSxFQUFFLENBQUM7QUFFUCxnQkFBTyxDQUFDLENBQUMsT0FBVDtB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LENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBeEM7U0FrQkEsR0FBRyxDQUFDLEVBQUosQ0FBTyxxQkFBUCxFQUE4QixDQUFBLFNBQUEsS0FBQTtXQUFBLFNBQUMsQ0FBRCxFQUFJLElBQUo7TUFDMUIsT0FBTyxDQUFDLEdBQVIsQ0FBWSw2QkFBWjtNQUNBLE9BQU8sQ0FBQyxHQUFSLENBQVksSUFBWjthQUNBLFNBQUEsR0FBWTtJQUhjO0VBQUEsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQUE5QjtBQXJIQyxDQUFBLENBQUgsQ0FBQSIsInNvdXJjZXNDb250ZW50IjpbImlwYyA9IHJlcXVpcmUoJ2VsZWN0cm9uJykuaXBjUmVuZGVyZXJcbntzaGVsbCwgd2ViRnJhbWV9ID0gcmVxdWlyZSAnZWxlY3Ryb24nXG5NZHNNZW51ICAgICAgICAgICA9IHJlcXVpcmUgJy4vanMvY2xhc3Nlcy9tZHNfbWVudSdcbmNsc01kc1JlbmRlcmVyICAgID0gcmVxdWlyZSAnLi9qcy9jbGFzc2VzL21kc19yZW5kZXJlcidcbk1kc1JlbmRlcmVyICAgICAgID0gbmV3IGNsc01kc1JlbmRlcmVyXG5NaWNrckNsaWVudCAgICAgICA9IHJlcXVpcmUgJy4vbW9kdWxlcy9NaWNrckNsaWVudCdcblxuTWRzUmVuZGVyZXIucmVxdWVzdEFjY2VwdCgpXG4jd2ViRnJhbWUuc2V0Wm9vbUxldmVsTGltaXRzKDEsIDEpXG5cbmNsYXNzIFByZXNlbkRldlN0YXRlc1xuICBjb21tZW50ID0gW11cbiAgY3VycmVudFBhZ2U6IG51bGxcbiAgcHJldmlld0luaXRpYWxpemVkOiBmYWxzZVxuICBsYXN0UmVuZGVyZWQ6IHt9XG5cbiAgX2xvY2tDaGFuZ2VkU3RhdHVzOiBmYWxzZVxuICBfaW1hZ2VEaXJlY3Rvcnk6IG51bGxcblxuICBjb25zdHJ1Y3RvcjogKEBwcmV2aWV3KSAtPlxuICAgIEBpbml0aWFsaXplUHJldmlldygpXG4gICAgIyBAaW5pdGlhbGl6ZVN0b3BXYXRjaCgpXG5cblxuICBpbml0aWFsaXplUHJldmlldzogPT5cbiAgICAkKEBwcmV2aWV3KVxuICAgICAgLm9uICdkb20tcmVhZHknLCA9PlxuICAgICAgICAjIEZpeCBtaW5pbWl6ZWQgcHJldmlldyAoIzIwKVxuICAgICAgICAjIFtOb3RlXSBodHRwczovL2dpdGh1Yi5jb20vZWxlY3Ryb24vZWxlY3Ryb24vaXNzdWVzLzQ4ODJcbiAgICAgICAgJChAcHJldmlldy5zaGFkb3dSb290KS5hcHBlbmQoJzxzdHlsZT5vYmplY3R7bWluLXdpZHRoOjA7bWluLWhlaWdodDowO308L3N0eWxlPicpXG5cbiAgICAgICMgd2VidmlldyDjgYvjgonjga7pgJrkv6HjgpLlj5fjgZHlj5bjgosgJ2lwYy1tZXNzYWdlJ1xuICAgICAgLm9uICdpcGMtbWVzc2FnZScsIChldikgPT5cbiAgICAgICAgZSA9IGV2Lm9yaWdpbmFsRXZlbnRcblxuICAgICAgICBzd2l0Y2ggZS5jaGFubmVsXG4gICAgICAgICAgd2hlbiAncnVsZXJDaGFuZ2VkJ1xuICAgICAgICAgICAgQHJlZnJlc2hQYWdlIGUuYXJnc1swXVxuICAgICAgICAgIHdoZW4gJ2xpbmtUbydcbiAgICAgICAgICAgIEBvcGVuTGluayBlLmFyZ3NbMF1cbiAgICAgICAgICB3aGVuICdyZW5kZXJlZCdcbiAgICAgICAgICAgIEBsYXN0UmVuZGVyZWQgPSBlLmFyZ3NbMF1cbiAgICAgICAgICAgIHVubGVzcyBAcHJldmlld0luaXRpYWxpemVkXG4gICAgICAgICAgICAgIE1kc1JlbmRlcmVyLnNlbmRUb01haW4gJ3ByZXZpZXdJbml0aWFsaXplZCdcblxuICAgICAgICAgICAgICBAcHJldmlld0luaXRpYWxpemVkID0gdHJ1ZVxuICAgICAgICAgICAgICAkKCdib2R5JykuYWRkQ2xhc3MgJ2luaXRpYWxpemVkLXNsaWRlJ1xuICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgIE1kc1JlbmRlcmVyLl9jYWxsX2V2ZW50IGUuY2hhbm5lbCwgZS5hcmdzLi4uXG4gICAgICAjIHVybOOCkuOCr+ODquODg+OCr+OBl+OBpuaWsOOBl+OBhOOCpuOCpOODs+ODieOCpuOBjOmWi+OBi+OCjOOCi+aZglxuICAgICAgLm9uICduZXctd2luZG93JywgKGUpID0+XG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKVxuICAgICAgICBAb3BlbkxpbmsgZS5vcmlnaW5hbEV2ZW50LnVybFxuXG4gICAgICAub24gJ2RpZC1maW5pc2gtbG9hZCcsIChlKSA9PlxuICAgICAgICBAcHJldmlldy5zZW5kICdjdXJyZW50UGFnZScsIDFcbiAgICAgICAgQHByZXZpZXcuc2VuZCAnc2V0SW1hZ2VEaXJlY3RvcnknLCBAX2ltYWdlRGlyZWN0b3J5XG4gICAgICAgIEBwcmV2aWV3LnNlbmQgJ3JlbmRlcicsIFwiXCJcblxuICBvcGVuTGluazogKGxpbmspID0+XG4gICAgc2hlbGwub3BlbkV4dGVybmFsIGxpbmsgaWYgL15odHRwcz86XFwvXFwvLisvLnRlc3QobGluaylcblxuICBpbml0aWFsaXplU3RvcFdhdGNoOiA9PlxuXG4gICAgdGltZSA9IDBcbiAgICBtaWQgPSAwXG5cbiAgICBtaW5fdGltZSA9IDBcbiAgICBzZWNfdGltZSA9IDBcblxuICAgIG5vdyA9IG51bGxcbiAgICBjb3VudCA9IG51bGxcblxuICAgIG1pbiA9ICQoXCIjbWluXCIpXG4gICAgc2VjID0gJChcIiNzZWNcIilcblxuICAgIHN0YXJ0ID0gJChcIiNzdGFydFwiKVxuICAgIHN0b3AgPSAkKFwiI3N0b3BcIilcbiAgICByZXNldCA9ICQoXCIjcmVzZXRcIilcblxuICAgICNzdGFydOODnOOCv+ODs+OBjOaKvOOBleOCjOOBn+aZguOBruWHpueQhlxuICAgIHN0YXJ0LmNsaWNrICgpIC0+XG4gICAgICAgIG5vdyA9IG5ldyBEYXRlKCkgI+ePvuWcqOaZguWIu1xuICAgICAgICBjb3VudCA9IHNldEludGVydmFsKGNvdW50ZXIsIDEwKVxuICAgICAgICB0b2dnbGUoKVxuICAgICAgICByZXNldC5jc3MoXCJjb2xvclwiLCBcIiNGRjkxOTRcIilcblxuICAgICNzdG9w44Oc44K/44Oz44GM5oq844GV44KM44Gf5pmC44Gu5Yem55CGXG4gICAgc3RvcC5jbGljayAoKSAtPlxuICAgICAgICBtaWQgKz0gKG5ldyBEYXRlKCkgLSBub3cpLzEwMDBcbiAgICAgICAgY2xlYXJJbnRlcnZhbChjb3VudClcbiAgICAgICAgdG9nZ2xlKClcbiAgICAgICAgcmVzZXQuY3NzKFwiY29sb3JcIiwgXCJyZWRcIilcblxuXG4gICAgI3Jlc2V044Oc44K/44Oz44GM5oq844GV44KM44Gf5pmC44Gu5Yem55CGXG4gICAgcmVzZXQuY2xpY2sgKCkgLT5cbiAgICAgICAgbWlkID0gMFxuICAgICAgICBtaW4uaHRtbChcIjBcIilcbiAgICAgICAgc2VjLmh0bWwoXCIwMC4wMFwiKVxuICAgICAgICByZXNldC5jc3MoXCJjb2xvclwiLCBcImdyYXlcIilcbiAgICAgICAgcmVzZXQucHJvcChcImRpc2FibGVkXCIsIHRydWUpXG5cbiAgICAj5pmC6ZaT44Gu6KiI566XXG4gICAgY291bnRlciA9ICgpLT5cbiAgICAgICAgdGltZSA9IG1pZCArICgobmV3IERhdGUoKSAtIG5vdykvMTAwMClcblxuICAgICAgICAjNjDnp5LntYzpgY7jgZfjgZ/mmYLjga7lh6bnkIZcbiAgICAgICAgaWYodGltZSA+IDYwKVxuICAgICAgICAgICAgbWlkID0gMFxuICAgICAgICAgICAgbWluX3RpbWUrK1xuICAgICAgICAgICAgbm93ID0gbmV3IERhdGUoKVxuICAgICAgICAgICAgdGltZSA9IDBcbiAgICAgICAgICAgIHNlYy5odG1sKClcblxuXG4gICAgICAgICPnp5LmlbDjgYwxMOenkuOCiOOCiuWwj+OBleOBi+OBo+OBn+OCiTAxLCAwMuOBruOCiOOBhuOBq+OBmeOCi1xuICAgICAgICBpZih0aW1lIDwgMTApXG4gICAgICAgICAgICBzZWMuaHRtbChcIjBcIit0aW1lLnRvRml4ZWQoMikpXG4gICAgICAgIGVsc2VcbiAgICAgICAgICAgIHNlYy5odG1sKHRpbWUudG9GaXhlZCgyKSlcbiAgICAgICAgbWluLmh0bWwobWluX3RpbWUpO1xuXG5cbiAgICAj44Oc44K/44Oz44Gu5YiH44KK5pu/44GIXG4gICAgdG9nZ2xlID0gKCkgLT5cbiAgICAgICAgaWYoIXN0YXJ0LnByb3AoXCJkaXNhYmxlZFwiKSlcbiAgICAgICAgICAgIHN0YXJ0LnByb3AoXCJkaXNhYmxlZFwiLCB0cnVlKTtcbiAgICAgICAgICAgIHN0b3AucHJvcChcImRpc2FibGVkXCIsIGZhbHNlKTtcbiAgICAgICAgICAgIHJlc2V0LnByb3AoXCJkaXNhYmxlZFwiLCB0cnVlKTtcbiAgICAgICAgZWxzZVxuICAgICAgICAgICAgc3RhcnQucHJvcChcImRpc2FibGVkXCIsIGZhbHNlKTtcbiAgICAgICAgICAgIHN0b3AucHJvcChcImRpc2FibGVkXCIsIHRydWUpO1xuICAgICAgICAgICAgcmVzZXQucHJvcChcImRpc2FibGVkXCIsIGZhbHNlKTtcblxuZG8gLT5cblxuICBzbGlkZUhUTUwgPSBcIlwiXG4gIHByZXNlbkRldlN0YXRlcyA9IG5ldyBQcmVzZW5EZXZTdGF0ZXMoXG4gICAgJCgnI3ByZXZpZXcnKVswXVxuICApXG5cbiAgIyBTcGxpdHRlclxuICBkcmFnZ2luZ1NwbGl0dGVyICAgICAgPSBmYWxzZVxuICBkcmFnZ2luZ1NwbGl0UG9zaXRpb24gPSB1bmRlZmluZWRcblxuICBzZXRTcGxpdHRlciA9IChzcGxpdFBvaW50KSAtPlxuICAgIHNwbGl0UG9pbnQgPSBNYXRoLm1pbigwLjgsIE1hdGgubWF4KDAuMiwgcGFyc2VGbG9hdChzcGxpdFBvaW50KSkpXG5cbiAgICAkKCcucGFuZS5tYXJrZG93bicpLmNzcygnZmxleC1ncm93Jywgc3BsaXRQb2ludCAqIDEwMClcbiAgICAkKCcucGFuZS5wcmV2aWV3JykuY3NzKCdmbGV4LWdyb3cnLCAoMSAtIHNwbGl0UG9pbnQpICogMTAwKVxuXG4gICAgcmV0dXJuIHNwbGl0UG9pbnRcblxuICAkKCcucGFuZS1zcGxpdHRlcicpXG4gICAgLm1vdXNlZG93biAtPlxuICAgICAgZHJhZ2dpbmdTcGxpdHRlciA9IHRydWVcbiAgICAgIGRyYWdnaW5nU3BsaXRQb3NpdGlvbiA9IHVuZGVmaW5lZFxuXG4gICAgLmRibGNsaWNrIC0+XG4gICAgICBNZHNSZW5kZXJlci5zZW5kVG9NYWluICdzZXRDb25maWcnLCAnc3BsaXR0ZXJQb3NpdGlvbicsIHNldFNwbGl0dGVyKDAuNSlcblxuICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lciAnbW91c2Vtb3ZlJywgKGUpIC0+XG4gICAgaWYgZHJhZ2dpbmdTcGxpdHRlclxuICAgICAgZHJhZ2dpbmdTcGxpdFBvc2l0aW9uID0gc2V0U3BsaXR0ZXIgTWF0aC5taW4oTWF0aC5tYXgoMCwgZS5jbGllbnRYKSwgZG9jdW1lbnQuYm9keS5jbGllbnRXaWR0aCkgLyBkb2N1bWVudC5ib2R5LmNsaWVudFdpZHRoXG4gICwgZmFsc2VcblxuICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lciAnbW91c2V1cCcsIChlKSAtPlxuICAgIGRyYWdnaW5nU3BsaXR0ZXIgPSBmYWxzZVxuICAgIE1kc1JlbmRlcmVyLnNlbmRUb01haW4gJ3NldENvbmZpZycsICdzcGxpdHRlclBvc2l0aW9uJywgZHJhZ2dpbmdTcGxpdFBvc2l0aW9uIGlmIGRyYWdnaW5nU3BsaXRQb3NpdGlvbj9cbiAgLCBmYWxzZVxuXG4gIHJlc3BvbnNlUGRmT3B0cyA9IG51bGxcblxuICAjIEV2ZW50c1xuICBNZHNSZW5kZXJlclxuICAgIC5vbiAndmlld01vZGUnLCAobW9kZSkgLT5cbiAgICAgIHN3aXRjaCBtb2RlXG4gICAgICAgIHdoZW4gJ21hcmtkb3duJ1xuICAgICAgICAgIHByZXNlbkRldlN0YXRlcy5wcmV2aWV3LnNlbmQgJ3NldENsYXNzJywgJydcbiAgICAgICAgd2hlbiAnc2NyZWVuJ1xuICAgICAgICAgIHByZXNlbkRldlN0YXRlcy5wcmV2aWV3LnNlbmQgJ3NldENsYXNzJywgJ3NsaWRlLXZpZXcgc2NyZWVuJ1xuICAgICAgICB3aGVuICdsaXN0J1xuICAgICAgICAgIHByZXNlbkRldlN0YXRlcy5wcmV2aWV3LnNlbmQgJ3NldENsYXNzJywgJ3NsaWRlLXZpZXcgbGlzdCdcbiAgICAgICAgd2hlbiAncHJlc2VuLWRldidcbiAgICAgICAgICBwcmVzZW5EZXZTdGF0ZXMucHJldmlldy5zZW5kICdzZXRDbGFzcycsICdzbGlkZS12aWV3IHByZXNlbi1kZXYnXG5cbiAgICAgICQoJyNwcmV2aWV3LW1vZGVzJykucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJylcbiAgICAgICQoJy52aWV3bW9kZS1idG5bZGF0YS12aWV3bW9kZV0nKS5yZW1vdmVDbGFzcygnYWN0aXZlJylcbiAgICAgICAgLmZpbHRlcihcIltkYXRhLXZpZXdtb2RlPScje21vZGV9J11cIikuYWRkQ2xhc3MoJ2FjdGl2ZScpXG5cbiAgICAub24gJ29wZW5EZXZUb29sJywgLT5cbiAgICAgIGlmIHByZXNlbkRldlN0YXRlcy5wcmV2aWV3LmlzRGV2VG9vbHNPcGVuZWQoKVxuICAgICAgICBwcmVzZW5EZXZTdGF0ZXMucHJldmlldy5jbG9zZURldlRvb2xzKClcbiAgICAgIGVsc2VcbiAgICAgICAgcHJlc2VuRGV2U3RhdGVzLnByZXZpZXcub3BlbkRldlRvb2xzKClcblxuICAgIC5vbiAnc2V0U3BsaXR0ZXInLCAoc3BsaWl0ZXJQb3MpIC0+IHNldFNwbGl0dGVyIHNwbGlpdGVyUG9zXG4gICAgLm9uICdzZXRUaGVtZScsICh0aGVtZSkgLT4gcHJlc2VuRGV2U3RhdGVzLnVwZGF0ZUdsb2JhbFNldHRpbmcgJyR0aGVtZScsIHRoZW1lXG4gICAgLm9uICdyZXNvdXJjZVN0YXRlJywgKHN0YXRlKSAtPiBsb2FkaW5nU3RhdGUgPSBzdGF0ZVxuIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcbiAgc2V0dGluZyA9XG4gICAgXCJpZFwiOiBcInByZXNlbkRldkluZGV4XCJcbiAgICBcInVybFwiOiBcIndzOi8vYXBwcy53aXNkb213ZWIubmV0OjY0MjYwL3dzL21pa1wiXG4gICAgXCJzaXRlXCI6IFwidGVzdFwiXG4gICAgXCJ0b2tlblwiOiBcIlBhZDo5OTQ4XCJcbiAgY2xpZW50ID0gbmV3IE1pY2tyQ2xpZW50KHNldHRpbmcpXG4gICAgIyDjgrPjg6Hjg7Pjg4jlj5fkv6FcbiAgY2xpZW50Lm9uIFwic2VuZENvbW1lbnRcIiwgKGUsIGRhdGEpID0+XG4gICAgQGNvbW1lbnQgPSBbXS5jb25jYXQoZGF0YS5ib2R5LmNvbnRlbnQpXG4gICAgY29uc29sZS5sb2cgQGNvbW1lbnRcblxuICBjbGllbnQuc2VuZCBcImNhblJlY2VpdmVDb21tZW50XCIsIHtcbiAgICBcInRvXCI6IFwiaW5kZXhcIlxuICAgIFwiYm9keVwiOlxuICAgICAgXCJjb250ZW50XCI6IFwiXCJcbiAgICB9XG5cbiAgY2xpZW50Lm9uIFwiY2hhbmdlQ29tbWVudFwiLCAoZSxkYXRhKSA9PlxuICAgIGlkID0gZGF0YS5ib2R5LmNvbnRlbnRcbiAgICAkKCcjY29tbWVudCcpLnRleHQoY29tbWVudFtpZC0xXSlcblxuICAjIHByZXNlbkRlduOCpuOCpOODs+ODieOCpuOBjOmWi+OBhOOBn+OCieOAgeOBneOBk+OBp+OCv+OCpOODnuODvOmWi+Wni1xuICAkKFwiI3RcIikudGltZXIoe1xuICAgICAgICBhY3Rpb246ICdzdGFydCcsXG4gICAgICAgIHNlY29uZHM6IDAsXG4gICAgICAgIH0pO1xuICAkKFwiI3RcIikuYWRkQ2xhc3MoXCJiYWRnZS1pbXBvcnRhbnRcIik7XG4gICQoJyNidG4xJykucmVtb3ZlQ2xhc3MoXCJpY29uIGljb24tcGxheVwiKTtcbiAgJCgnI2J0bjEnKS5hZGRDbGFzcygnaWNvbiBpY29uLXBhdXNlJylcblxuXG4gIHdlYnZpZXcgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjcHJldmlldycpXG5cbiAgd2Vidmlldy5hZGRFdmVudExpc3RlbmVyICdpcGMtbWVzc2FnZScsIChldmVudCkgPT5cbiAgICAgc3dpdGNoIGV2ZW50LmNoYW5uZWxcbiAgICAgICB3aGVuIFwic2VuZFNsaWRlSW5mb1wiICAgIyB3ZWJ2aWV3IOOBi+OCieOCueODqeOCpOODieaDheWgseOCkuWPl+S/oVxuICAgICAgICBzbGlkZUluZm8gPSBldmVudC5hcmdzWzBdXG4gICAgICAgIGNvbnNvbGUubG9nICdyZWNlaXZlIHNlbmRTbGlkZUluZm8nXG4gICAgICAgIGNvbnNvbGUubG9nIHNsaWRlSW5mb1xuICAgICAgICBpcGMuc2VuZCAndGV4dFNlbmQnLCBzbGlkZUluZm9cbiAgICAgICAgY29uc29sZS5sb2cgJ3NlbmQgdGV4dFNlbmQnXG4gICAgICAgIGJyZWFrXG4gICAgICAgd2hlbiBcInJlcXVlc3RTbGlkZUhUTUxcIlxuICAgICAgICB3ZWJ2aWV3LnNlbmQgJ3NldFNsaWRlJywgc2xpZGVIVE1MXG4gICAgICAgIGNvbnNvbGUubG9nICdzZW5kIHNldFNsaWRlJ1xuICAgICAgICBicmVha1xuICAgICAgIHdoZW4gXCJnb1RvUGFnZVwiXG4gICAgICAgIHBhZ2UgPSBldmVudC5hcmdzWzBdXG4gICAgICAgIGNvbnNvbGUubG9nIHBhZ2VcbiAgICAgICAgaXBjLnNlbmQgJ2dvVG9QYWdlJywgcGFnZVxuXG4gIGlwYy5vbiAncHJlc2VuRGV2SW5pdGlhbGl6ZScsIChlLCB0ZXh0KSA9PlxuICAgICAgY29uc29sZS5sb2cgJ3JlY2VpdmUgcHJlc2VuRGV2SW5pdGlhbGl6ZSdcbiAgICAgIGNvbnNvbGUubG9nIHRleHRcbiAgICAgIHNsaWRlSFRNTCA9IHRleHRcbiJdfQ==
