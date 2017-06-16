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
  var client, draggingSplitPosition, draggingSplitter, presenDevStates, responsePdfOpts, setSplitter, setting, slideHTML, state, webview;
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
  $('#button1').html("Pause");
  state = "pause";
  $("input[name='s']").attr("disabled", "disabled");
  $("#t").addClass("badge-important");
  $('#button1').removeClass("icon icon-play");
  $('#button1').addClass('icon icon-pause');
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJlc2VuRGV2SW5kZXguanMiLCJzb3VyY2VzIjpbInByZXNlbkRldkluZGV4LmNvZmZlZSJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxJQUFBLDZGQUFBO0VBQUE7OztBQUFBLEdBQUEsR0FBTSxPQUFBLENBQVEsVUFBUixDQUFtQixDQUFDOztBQUMxQixNQUFvQixPQUFBLENBQVEsVUFBUixDQUFwQixFQUFDLGlCQUFELEVBQVE7O0FBQ1IsT0FBQSxHQUFvQixPQUFBLENBQVEsdUJBQVI7O0FBQ3BCLGNBQUEsR0FBb0IsT0FBQSxDQUFRLDJCQUFSOztBQUNwQixXQUFBLEdBQW9CLElBQUk7O0FBQ3hCLFdBQUEsR0FBb0IsT0FBQSxDQUFRLHVCQUFSOztBQUVwQixXQUFXLENBQUMsYUFBWixDQUFBOztBQUdNO0FBQ0osTUFBQTs7RUFBQSxPQUFBLEdBQVU7OzRCQUNWLFdBQUEsR0FBYTs7NEJBQ2Isa0JBQUEsR0FBb0I7OzRCQUNwQixZQUFBLEdBQWM7OzRCQUVkLGtCQUFBLEdBQW9COzs0QkFDcEIsZUFBQSxHQUFpQjs7RUFFSix5QkFBQyxPQUFEO0lBQUMsSUFBQyxDQUFBLFVBQUQ7Ozs7SUFDWixJQUFDLENBQUEsaUJBQUQsQ0FBQTtFQURXOzs0QkFLYixpQkFBQSxHQUFtQixTQUFBO1dBQ2pCLENBQUEsQ0FBRSxJQUFDLENBQUEsT0FBSCxDQUNFLENBQUMsRUFESCxDQUNNLFdBRE4sRUFDbUIsQ0FBQSxTQUFBLEtBQUE7YUFBQSxTQUFBO2VBR2YsQ0FBQSxDQUFFLEtBQUMsQ0FBQSxPQUFPLENBQUMsVUFBWCxDQUFzQixDQUFDLE1BQXZCLENBQThCLGtEQUE5QjtNQUhlO0lBQUEsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQURuQixDQU9FLENBQUMsRUFQSCxDQU9NLGFBUE4sRUFPcUIsQ0FBQSxTQUFBLEtBQUE7YUFBQSxTQUFDLEVBQUQ7QUFDakIsWUFBQTtRQUFBLENBQUEsR0FBSSxFQUFFLENBQUM7QUFFUCxnQkFBTyxDQUFDLENBQUMsT0FBVDtB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SUFBQSxHQUFPLEtBQUssQ0FBQyxJQUFLLENBQUEsQ0FBQTtVQUNsQixPQUFPLENBQUMsR0FBUixDQUFZLElBQVo7aUJBQ0EsR0FBRyxDQUFDLElBQUosQ0FBUyxVQUFULEVBQXFCLElBQXJCO0FBZkg7SUFEcUM7RUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBQXhDO1NBa0JBLEdBQUcsQ0FBQyxFQUFKLENBQU8scUJBQVAsRUFBOEIsQ0FBQSxTQUFBLEtBQUE7V0FBQSxTQUFDLENBQUQsRUFBSSxJQUFKO01BQzFCLE9BQU8sQ0FBQyxHQUFSLENBQVksNkJBQVo7TUFDQSxPQUFPLENBQUMsR0FBUixDQUFZLElBQVo7YUFDQSxTQUFBLEdBQVk7SUFIYztFQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBOUI7QUF2SEMsQ0FBQSxDQUFILENBQUEiLCJzb3VyY2VzQ29udGVudCI6WyJpcGMgPSByZXF1aXJlKCdlbGVjdHJvbicpLmlwY1JlbmRlcmVyXG57c2hlbGwsIHdlYkZyYW1lfSA9IHJlcXVpcmUgJ2VsZWN0cm9uJ1xuTWRzTWVudSAgICAgICAgICAgPSByZXF1aXJlICcuL2pzL2NsYXNzZXMvbWRzX21lbnUnXG5jbHNNZHNSZW5kZXJlciAgICA9IHJlcXVpcmUgJy4vanMvY2xhc3Nlcy9tZHNfcmVuZGVyZXInXG5NZHNSZW5kZXJlciAgICAgICA9IG5ldyBjbHNNZHNSZW5kZXJlclxuTWlja3JDbGllbnQgICAgICAgPSByZXF1aXJlICcuL21vZHVsZXMvTWlja3JDbGllbnQnXG5cbk1kc1JlbmRlcmVyLnJlcXVlc3RBY2NlcHQoKVxuI3dlYkZyYW1lLnNldFpvb21MZXZlbExpbWl0cygxLCAxKVxuXG5jbGFzcyBQcmVzZW5EZXZTdGF0ZXNcbiAgY29tbWVudCA9IFtdXG4gIGN1cnJlbnRQYWdlOiBudWxsXG4gIHByZXZpZXdJbml0aWFsaXplZDogZmFsc2VcbiAgbGFzdFJlbmRlcmVkOiB7fVxuXG4gIF9sb2NrQ2hhbmdlZFN0YXR1czogZmFsc2VcbiAgX2ltYWdlRGlyZWN0b3J5OiBudWxsXG5cbiAgY29uc3RydWN0b3I6IChAcHJldmlldykgLT5cbiAgICBAaW5pdGlhbGl6ZVByZXZpZXcoKVxuICAgICMgQGluaXRpYWxpemVTdG9wV2F0Y2goKVxuXG5cbiAgaW5pdGlhbGl6ZVByZXZpZXc6ID0+XG4gICAgJChAcHJldmlldylcbiAgICAgIC5vbiAnZG9tLXJlYWR5JywgPT5cbiAgICAgICAgIyBGaXggbWluaW1pemVkIHByZXZpZXcgKCMyMClcbiAgICAgICAgIyBbTm90ZV0gaHR0cHM6Ly9naXRodWIuY29tL2VsZWN0cm9uL2VsZWN0cm9uL2lzc3Vlcy80ODgyXG4gICAgICAgICQoQHByZXZpZXcuc2hhZG93Um9vdCkuYXBwZW5kKCc8c3R5bGU+b2JqZWN0e21pbi13aWR0aDowO21pbi1oZWlnaHQ6MDt9PC9zdHlsZT4nKVxuXG4gICAgICAjIHdlYnZpZXcg44GL44KJ44Gu6YCa5L+h44KS5Y+X44GR5Y+W44KLICdpcGMtbWVzc2FnZSdcbiAgICAgIC5vbiAnaXBjLW1lc3NhZ2UnLCAoZXYpID0+XG4gICAgICAgIGUgPSBldi5vcmlnaW5hbEV2ZW50XG5cbiAgICAgICAgc3dpdGNoIGUuY2hhbm5lbFxuICAgICAgICAgIHdoZW4gJ3J1bGVyQ2hhbmdlZCdcbiAgICAgICAgICAgIEByZWZyZXNoUGFnZSBlLmFyZ3NbMF1cbiAgICAgICAgICB3aGVuICdsaW5rVG8nXG4gICAgICAgICAgICBAb3BlbkxpbmsgZS5hcmdzWzBdXG4gICAgICAgICAgd2hlbiAncmVuZGVyZWQnXG4gICAgICAgICAgICBAbGFzdFJlbmRlcmVkID0gZS5hcmdzWzBdXG4gICAgICAgICAgICB1bmxlc3MgQHByZXZpZXdJbml0aWFsaXplZFxuICAgICAgICAgICAgICBNZHNSZW5kZXJlci5zZW5kVG9NYWluICdwcmV2aWV3SW5pdGlhbGl6ZWQnXG5cbiAgICAgICAgICAgICAgQHByZXZpZXdJbml0aWFsaXplZCA9IHRydWVcbiAgICAgICAgICAgICAgJCgnYm9keScpLmFkZENsYXNzICdpbml0aWFsaXplZC1zbGlkZSdcbiAgICAgICAgICBlbHNlXG4gICAgICAgICAgICBNZHNSZW5kZXJlci5fY2FsbF9ldmVudCBlLmNoYW5uZWwsIGUuYXJncy4uLlxuICAgICAgIyB1cmzjgpLjgq/jg6rjg4Pjgq/jgZfjgabmlrDjgZfjgYTjgqbjgqTjg7Pjg4njgqbjgYzplovjgYvjgozjgovmmYJcbiAgICAgIC5vbiAnbmV3LXdpbmRvdycsIChlKSA9PlxuICAgICAgICBlLnByZXZlbnREZWZhdWx0KClcbiAgICAgICAgQG9wZW5MaW5rIGUub3JpZ2luYWxFdmVudC51cmxcblxuICAgICAgLm9uICdkaWQtZmluaXNoLWxvYWQnLCAoZSkgPT5cbiAgICAgICAgQHByZXZpZXcuc2VuZCAnY3VycmVudFBhZ2UnLCAxXG4gICAgICAgIEBwcmV2aWV3LnNlbmQgJ3NldEltYWdlRGlyZWN0b3J5JywgQF9pbWFnZURpcmVjdG9yeVxuICAgICAgICBAcHJldmlldy5zZW5kICdyZW5kZXInLCBcIlwiXG5cbiAgb3Blbkxpbms6IChsaW5rKSA9PlxuICAgIHNoZWxsLm9wZW5FeHRlcm5hbCBsaW5rIGlmIC9eaHR0cHM/OlxcL1xcLy4rLy50ZXN0KGxpbmspXG5cbiAgaW5pdGlhbGl6ZVN0b3BXYXRjaDogPT5cblxuICAgIHRpbWUgPSAwXG4gICAgbWlkID0gMFxuXG4gICAgbWluX3RpbWUgPSAwXG4gICAgc2VjX3RpbWUgPSAwXG5cbiAgICBub3cgPSBudWxsXG4gICAgY291bnQgPSBudWxsXG5cbiAgICBtaW4gPSAkKFwiI21pblwiKVxuICAgIHNlYyA9ICQoXCIjc2VjXCIpXG5cbiAgICBzdGFydCA9ICQoXCIjc3RhcnRcIilcbiAgICBzdG9wID0gJChcIiNzdG9wXCIpXG4gICAgcmVzZXQgPSAkKFwiI3Jlc2V0XCIpXG5cbiAgICAjc3RhcnTjg5zjgr/jg7PjgYzmirzjgZXjgozjgZ/mmYLjga7lh6bnkIZcbiAgICBzdGFydC5jbGljayAoKSAtPlxuICAgICAgICBub3cgPSBuZXcgRGF0ZSgpICPnj77lnKjmmYLliLtcbiAgICAgICAgY291bnQgPSBzZXRJbnRlcnZhbChjb3VudGVyLCAxMClcbiAgICAgICAgdG9nZ2xlKClcbiAgICAgICAgcmVzZXQuY3NzKFwiY29sb3JcIiwgXCIjRkY5MTk0XCIpXG5cbiAgICAjc3RvcOODnOOCv+ODs+OBjOaKvOOBleOCjOOBn+aZguOBruWHpueQhlxuICAgIHN0b3AuY2xpY2sgKCkgLT5cbiAgICAgICAgbWlkICs9IChuZXcgRGF0ZSgpIC0gbm93KS8xMDAwXG4gICAgICAgIGNsZWFySW50ZXJ2YWwoY291bnQpXG4gICAgICAgIHRvZ2dsZSgpXG4gICAgICAgIHJlc2V0LmNzcyhcImNvbG9yXCIsIFwicmVkXCIpXG5cblxuICAgICNyZXNldOODnOOCv+ODs+OBjOaKvOOBleOCjOOBn+aZguOBruWHpueQhlxuICAgIHJlc2V0LmNsaWNrICgpIC0+XG4gICAgICAgIG1pZCA9IDBcbiAgICAgICAgbWluLmh0bWwoXCIwXCIpXG4gICAgICAgIHNlYy5odG1sKFwiMDAuMDBcIilcbiAgICAgICAgcmVzZXQuY3NzKFwiY29sb3JcIiwgXCJncmF5XCIpXG4gICAgICAgIHJlc2V0LnByb3AoXCJkaXNhYmxlZFwiLCB0cnVlKVxuXG4gICAgI+aZgumWk+OBruioiOeul1xuICAgIGNvdW50ZXIgPSAoKS0+XG4gICAgICAgIHRpbWUgPSBtaWQgKyAoKG5ldyBEYXRlKCkgLSBub3cpLzEwMDApXG5cbiAgICAgICAgIzYw56eS57WM6YGO44GX44Gf5pmC44Gu5Yem55CGXG4gICAgICAgIGlmKHRpbWUgPiA2MClcbiAgICAgICAgICAgIG1pZCA9IDBcbiAgICAgICAgICAgIG1pbl90aW1lKytcbiAgICAgICAgICAgIG5vdyA9IG5ldyBEYXRlKClcbiAgICAgICAgICAgIHRpbWUgPSAwXG4gICAgICAgICAgICBzZWMuaHRtbCgpXG5cblxuICAgICAgICAj56eS5pWw44GMMTDnp5LjgojjgorlsI/jgZXjgYvjgaPjgZ/jgokwMSwgMDLjga7jgojjgYbjgavjgZnjgotcbiAgICAgICAgaWYodGltZSA8IDEwKVxuICAgICAgICAgICAgc2VjLmh0bWwoXCIwXCIrdGltZS50b0ZpeGVkKDIpKVxuICAgICAgICBlbHNlXG4gICAgICAgICAgICBzZWMuaHRtbCh0aW1lLnRvRml4ZWQoMikpXG4gICAgICAgIG1pbi5odG1sKG1pbl90aW1lKTtcblxuXG4gICAgI+ODnOOCv+ODs+OBruWIh+OCiuabv+OBiFxuICAgIHRvZ2dsZSA9ICgpIC0+XG4gICAgICAgIGlmKCFzdGFydC5wcm9wKFwiZGlzYWJsZWRcIikpXG4gICAgICAgICAgICBzdGFydC5wcm9wKFwiZGlzYWJsZWRcIiwgdHJ1ZSk7XG4gICAgICAgICAgICBzdG9wLnByb3AoXCJkaXNhYmxlZFwiLCBmYWxzZSk7XG4gICAgICAgICAgICByZXNldC5wcm9wKFwiZGlzYWJsZWRcIiwgdHJ1ZSk7XG4gICAgICAgIGVsc2VcbiAgICAgICAgICAgIHN0YXJ0LnByb3AoXCJkaXNhYmxlZFwiLCBmYWxzZSk7XG4gICAgICAgICAgICBzdG9wLnByb3AoXCJkaXNhYmxlZFwiLCB0cnVlKTtcbiAgICAgICAgICAgIHJlc2V0LnByb3AoXCJkaXNhYmxlZFwiLCBmYWxzZSk7XG5cbmRvIC0+XG5cbiAgc2xpZGVIVE1MID0gXCJcIlxuICBwcmVzZW5EZXZTdGF0ZXMgPSBuZXcgUHJlc2VuRGV2U3RhdGVzKFxuICAgICQoJyNwcmV2aWV3JylbMF1cbiAgKVxuXG4gICMgU3BsaXR0ZXJcbiAgZHJhZ2dpbmdTcGxpdHRlciAgICAgID0gZmFsc2VcbiAgZHJhZ2dpbmdTcGxpdFBvc2l0aW9uID0gdW5kZWZpbmVkXG5cbiAgc2V0U3BsaXR0ZXIgPSAoc3BsaXRQb2ludCkgLT5cbiAgICBzcGxpdFBvaW50ID0gTWF0aC5taW4oMC44LCBNYXRoLm1heCgwLjIsIHBhcnNlRmxvYXQoc3BsaXRQb2ludCkpKVxuXG4gICAgJCgnLnBhbmUubWFya2Rvd24nKS5jc3MoJ2ZsZXgtZ3JvdycsIHNwbGl0UG9pbnQgKiAxMDApXG4gICAgJCgnLnBhbmUucHJldmlldycpLmNzcygnZmxleC1ncm93JywgKDEgLSBzcGxpdFBvaW50KSAqIDEwMClcblxuICAgIHJldHVybiBzcGxpdFBvaW50XG5cbiAgJCgnLnBhbmUtc3BsaXR0ZXInKVxuICAgIC5tb3VzZWRvd24gLT5cbiAgICAgIGRyYWdnaW5nU3BsaXR0ZXIgPSB0cnVlXG4gICAgICBkcmFnZ2luZ1NwbGl0UG9zaXRpb24gPSB1bmRlZmluZWRcblxuICAgIC5kYmxjbGljayAtPlxuICAgICAgTWRzUmVuZGVyZXIuc2VuZFRvTWFpbiAnc2V0Q29uZmlnJywgJ3NwbGl0dGVyUG9zaXRpb24nLCBzZXRTcGxpdHRlcigwLjUpXG5cbiAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIgJ21vdXNlbW92ZScsIChlKSAtPlxuICAgIGlmIGRyYWdnaW5nU3BsaXR0ZXJcbiAgICAgIGRyYWdnaW5nU3BsaXRQb3NpdGlvbiA9IHNldFNwbGl0dGVyIE1hdGgubWluKE1hdGgubWF4KDAsIGUuY2xpZW50WCksIGRvY3VtZW50LmJvZHkuY2xpZW50V2lkdGgpIC8gZG9jdW1lbnQuYm9keS5jbGllbnRXaWR0aFxuICAsIGZhbHNlXG5cbiAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIgJ21vdXNldXAnLCAoZSkgLT5cbiAgICBkcmFnZ2luZ1NwbGl0dGVyID0gZmFsc2VcbiAgICBNZHNSZW5kZXJlci5zZW5kVG9NYWluICdzZXRDb25maWcnLCAnc3BsaXR0ZXJQb3NpdGlvbicsIGRyYWdnaW5nU3BsaXRQb3NpdGlvbiBpZiBkcmFnZ2luZ1NwbGl0UG9zaXRpb24/XG4gICwgZmFsc2VcblxuICByZXNwb25zZVBkZk9wdHMgPSBudWxsXG5cbiAgIyBFdmVudHNcbiAgTWRzUmVuZGVyZXJcbiAgICAub24gJ3ZpZXdNb2RlJywgKG1vZGUpIC0+XG4gICAgICBzd2l0Y2ggbW9kZVxuICAgICAgICB3aGVuICdtYXJrZG93bidcbiAgICAgICAgICBwcmVzZW5EZXZTdGF0ZXMucHJldmlldy5zZW5kICdzZXRDbGFzcycsICcnXG4gICAgICAgIHdoZW4gJ3NjcmVlbidcbiAgICAgICAgICBwcmVzZW5EZXZTdGF0ZXMucHJldmlldy5zZW5kICdzZXRDbGFzcycsICdzbGlkZS12aWV3IHNjcmVlbidcbiAgICAgICAgd2hlbiAnbGlzdCdcbiAgICAgICAgICBwcmVzZW5EZXZTdGF0ZXMucHJldmlldy5zZW5kICdzZXRDbGFzcycsICdzbGlkZS12aWV3IGxpc3QnXG4gICAgICAgIHdoZW4gJ3ByZXNlbi1kZXYnXG4gICAgICAgICAgcHJlc2VuRGV2U3RhdGVzLnByZXZpZXcuc2VuZCAnc2V0Q2xhc3MnLCAnc2xpZGUtdmlldyBwcmVzZW4tZGV2J1xuXG4gICAgICAkKCcjcHJldmlldy1tb2RlcycpLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpXG4gICAgICAkKCcudmlld21vZGUtYnRuW2RhdGEtdmlld21vZGVdJykucmVtb3ZlQ2xhc3MoJ2FjdGl2ZScpXG4gICAgICAgIC5maWx0ZXIoXCJbZGF0YS12aWV3bW9kZT0nI3ttb2RlfSddXCIpLmFkZENsYXNzKCdhY3RpdmUnKVxuXG4gICAgLm9uICdvcGVuRGV2VG9vbCcsIC0+XG4gICAgICBpZiBwcmVzZW5EZXZTdGF0ZXMucHJldmlldy5pc0RldlRvb2xzT3BlbmVkKClcbiAgICAgICAgcHJlc2VuRGV2U3RhdGVzLnByZXZpZXcuY2xvc2VEZXZUb29scygpXG4gICAgICBlbHNlXG4gICAgICAgIHByZXNlbkRldlN0YXRlcy5wcmV2aWV3Lm9wZW5EZXZUb29scygpXG5cbiAgICAub24gJ3NldFNwbGl0dGVyJywgKHNwbGlpdGVyUG9zKSAtPiBzZXRTcGxpdHRlciBzcGxpaXRlclBvc1xuICAgIC5vbiAnc2V0VGhlbWUnLCAodGhlbWUpIC0+IHByZXNlbkRldlN0YXRlcy51cGRhdGVHbG9iYWxTZXR0aW5nICckdGhlbWUnLCB0aGVtZVxuICAgIC5vbiAncmVzb3VyY2VTdGF0ZScsIChzdGF0ZSkgLT4gbG9hZGluZ1N0YXRlID0gc3RhdGVcbiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG4gIHNldHRpbmcgPVxuICAgIFwiaWRcIjogXCJwcmVzZW5EZXZJbmRleFwiXG4gICAgXCJ1cmxcIjogXCJ3czovL2FwcHMud2lzZG9td2ViLm5ldDo2NDI2MC93cy9taWtcIlxuICAgIFwic2l0ZVwiOiBcInRlc3RcIlxuICAgIFwidG9rZW5cIjogXCJQYWQ6OTk0OFwiXG4gIGNsaWVudCA9IG5ldyBNaWNrckNsaWVudChzZXR0aW5nKVxuICAgICMg44Kz44Oh44Oz44OI5Y+X5L+hXG4gIGNsaWVudC5vbiBcInNlbmRDb21tZW50XCIsIChlLCBkYXRhKSA9PlxuICAgIEBjb21tZW50ID0gW10uY29uY2F0KGRhdGEuYm9keS5jb250ZW50KVxuICAgIGNvbnNvbGUubG9nIEBjb21tZW50XG5cbiAgY2xpZW50LnNlbmQgXCJjYW5SZWNlaXZlQ29tbWVudFwiLCB7XG4gICAgXCJ0b1wiOiBcImluZGV4XCJcbiAgICBcImJvZHlcIjpcbiAgICAgIFwiY29udGVudFwiOiBcIlwiXG4gICAgfVxuICBjbGllbnQub24gXCJjaGFuZ2VDb21tZW50XCIsIChlLGRhdGEpID0+XG4gICAgaWQgPSBkYXRhLmJvZHkuY29udGVudFxuICAgICQoJyNjb21tZW50JykudGV4dChjb21tZW50W2lkLTFdKVxuXG5cbiAgJChcIiN0XCIpLnRpbWVyKHtcbiAgICAgICAgYWN0aW9uOiAnc3RhcnQnLFxuICAgICAgICBzZWNvbmRzOiAwLFxuICAgICAgICB9KTtcbiAgJCgnI2J1dHRvbjEnKS5odG1sKFwiUGF1c2VcIik7XG4gIHN0YXRlID0gXCJwYXVzZVwiO1xuICAkKFwiaW5wdXRbbmFtZT0ncyddXCIpLmF0dHIoXCJkaXNhYmxlZFwiLCBcImRpc2FibGVkXCIpO1xuICAkKFwiI3RcIikuYWRkQ2xhc3MoXCJiYWRnZS1pbXBvcnRhbnRcIik7XG4gICQoJyNidXR0b24xJykucmVtb3ZlQ2xhc3MoXCJpY29uIGljb24tcGxheVwiKTtcbiAgJCgnI2J1dHRvbjEnKS5hZGRDbGFzcygnaWNvbiBpY29uLXBhdXNlJylcblxuXG4gIHdlYnZpZXcgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjcHJldmlldycpXG5cbiAgd2Vidmlldy5hZGRFdmVudExpc3RlbmVyICdpcGMtbWVzc2FnZScsIChldmVudCkgPT5cbiAgICAgc3dpdGNoIGV2ZW50LmNoYW5uZWxcbiAgICAgICB3aGVuIFwic2VuZFNsaWRlSW5mb1wiICAgIyB3ZWJ2aWV3IOOBi+OCieOCueODqeOCpOODieaDheWgseOCkuWPl+S/oVxuICAgICAgICBzbGlkZUluZm8gPSBldmVudC5hcmdzWzBdXG4gICAgICAgIGNvbnNvbGUubG9nICdyZWNlaXZlIHNlbmRTbGlkZUluZm8nXG4gICAgICAgIGNvbnNvbGUubG9nIHNsaWRlSW5mb1xuICAgICAgICBpcGMuc2VuZCAndGV4dFNlbmQnLCBzbGlkZUluZm9cbiAgICAgICAgY29uc29sZS5sb2cgJ3NlbmQgdGV4dFNlbmQnXG4gICAgICAgIGJyZWFrXG4gICAgICAgd2hlbiBcInJlcXVlc3RTbGlkZUhUTUxcIlxuICAgICAgICB3ZWJ2aWV3LnNlbmQgJ3NldFNsaWRlJywgc2xpZGVIVE1MXG4gICAgICAgIGNvbnNvbGUubG9nICdzZW5kIHNldFNsaWRlJ1xuICAgICAgICBicmVha1xuICAgICAgIHdoZW4gXCJnb1RvUGFnZVwiXG4gICAgICAgIHBhZ2UgPSBldmVudC5hcmdzWzBdXG4gICAgICAgIGNvbnNvbGUubG9nIHBhZ2VcbiAgICAgICAgaXBjLnNlbmQgJ2dvVG9QYWdlJywgcGFnZVxuXG4gIGlwYy5vbiAncHJlc2VuRGV2SW5pdGlhbGl6ZScsIChlLCB0ZXh0KSA9PlxuICAgICAgY29uc29sZS5sb2cgJ3JlY2VpdmUgcHJlc2VuRGV2SW5pdGlhbGl6ZSdcbiAgICAgIGNvbnNvbGUubG9nIHRleHRcbiAgICAgIHNsaWRlSFRNTCA9IHRleHRcbiJdfQ==
