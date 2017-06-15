var CodeMirror, MdsMenu, MdsRenderer, MickrClient, PresenStates, clsMdsRenderer, createValidator, ipc, kanjiContinuousLen, loadingState, maxComma, maxTen, mixedPeriod, noAbusage, noDoubleNegativeJa, noDoubledConjunction, noDoubledConjunctiveParticleGa, noDoubledJoshi, noDroppingTheRa, noExclamationQuestionMark, noHankakuKana, noMixDearuDesumasu, noNfd, noStartDuplicatedConjunction, ref, shell, successiveWord, validator, weakPhrase, webFrame,
  bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  slice = [].slice;

ipc = require('electron').ipcRenderer;

ref = require('electron'), shell = ref.shell, webFrame = ref.webFrame;

MdsMenu = require('./js/classes/mds_menu');

clsMdsRenderer = require('./js/classes/mds_renderer');

createValidator = require('codemirror-textlint');

MdsRenderer = new clsMdsRenderer;

MickrClient = require('./modules/MickrClient');

MdsRenderer.requestAccept();

webFrame.setZoomLevelLimits(1, 1);

CodeMirror = require('codemirror');

require('codemirror/mode/xml/xml');

require('codemirror/mode/markdown/markdown');

require('codemirror/mode/gfm/gfm');

require('codemirror/addon/edit/continuelist');

require("codemirror/addon/lint/lint");

MickrClient = require('./modules/MickrClient');

PresenStates = (function() {
  PresenStates.prototype.rulers = [];

  PresenStates.prototype.currentPage = null;

  PresenStates.prototype.previewInitialized = false;

  PresenStates.prototype.lastRendered = {};

  PresenStates.prototype._lockChangedStatus = false;

  PresenStates.prototype._imageDirectory = null;

  function PresenStates(codeMirror, preview) {
    this.codeMirror = codeMirror;
    this.preview = preview;
    this.updateGlobalSetting = bind(this.updateGlobalSetting, this);
    this.insertVideo = bind(this.insertVideo, this);
    this.insertImage = bind(this.insertImage, this);
    this.setImageDirectory = bind(this.setImageDirectory, this);
    this.initializeEditor = bind(this.initializeEditor, this);
    this.openLink = bind(this.openLink, this);
    this.initializePreview = bind(this.initializePreview, this);
    this.refreshPage = bind(this.refreshPage, this);
    this.initializeEditor();
    this.initializePreview();
    this.menu = new MdsMenu([
      {
        label: '&Undo',
        accelerator: 'CmdOrCtrl+Z',
        click: (function(_this) {
          return function(i, w) {
            if (w && !w.mdsWindow.freeze) {
              return _this.codeMirror.execCommand('undo');
            }
          };
        })(this)
      }, {
        label: '&Redo',
        accelerator: (function() {
          if (process.platform === 'win32') {
            return 'Control+Y';
          } else {
            return 'Shift+CmdOrCtrl+Z';
          }
        })(),
        click: (function(_this) {
          return function(i, w) {
            if (w && !w.mdsWindow.freeze) {
              return _this.codeMirror.execCommand('redo');
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
        accelerator: 'CmdOrCtrl+A',
        click: (function(_this) {
          return function(i, w) {
            if (w && !w.mdsWindow.freeze) {
              return _this.codeMirror.execCommand('selectAll');
            }
          };
        })(this)
      }, {
        type: 'separator',
        platform: 'darwin'
      }, {
        label: 'Services',
        role: 'services',
        submenu: [],
        platform: 'darwin'
      }
    ]);
  }

  PresenStates.prototype.refreshPage = function(rulers) {
    var j, len, lineNumber, page, ref1, rulerLine;
    if (rulers != null) {
      this.rulers = rulers;
    }
    page = 1;
    lineNumber = this.codeMirror.getCursor().line || 0;
    ref1 = this.rulers;
    for (j = 0, len = ref1.length; j < len; j++) {
      rulerLine = ref1[j];
      if (rulerLine <= lineNumber) {
        page++;
      }
    }
    if (this.currentPage !== page) {
      this.currentPage = page;
      if (this.previewInitialized) {
        this.preview.send('currentPage', this.currentPage);
      }
    }
    return $('#page-indicator').text("Page " + this.currentPage + " / " + (this.rulers.length + 1));
  };

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
        return _this.preview.send('render', _this.codeMirror.getValue());
      };
    })(this));
  };

  PresenStates.prototype.openLink = function(link) {
    if (/^https?:\/\/.+/.test(link)) {
      return shell.openExternal(link);
    }
  };

  PresenStates.prototype.initializeEditor = function() {
    this.codeMirror.on('contextmenu', (function(_this) {
      return function(cm, e) {
        e.preventDefault();
        _this.codeMirror.focus();
        _this.menu.popup();
        return false;
      };
    })(this));
    this.codeMirror.on('change', (function(_this) {
      return function(cm, chg) {
        _this.preview.send('render', cm.getValue());
        if (!_this._lockChangedStatus) {
          return MdsRenderer.sendToMain('setChangedStatus', true);
        }
      };
    })(this));
    this.codeMirror.on('cursorActivity', (function(_this) {
      return function(cm) {
        return window.setTimeout((function() {
          return _this.refreshPage();
        }), 5);
      };
    })(this));
    return $('.pane.markdown').toggle();
  };

  PresenStates.prototype.setImageDirectory = function(directory) {
    if (this.previewInitialized) {
      this.preview.send('setImageDirectory', directory);
      return this.preview.send('render', this.codeMirror.getValue());
    } else {
      return this._imageDirectory = directory;
    }
  };

  PresenStates.prototype.insertImage = function(filePath) {
    return this.codeMirror.replaceSelection("![](" + (filePath.replace(/ /g, '%20')) + ")\n");
  };

  PresenStates.prototype.insertVideo = function(filePath) {
    return console.log(filePath);
  };

  PresenStates.prototype.updateGlobalSetting = function(prop, value) {
    var j, latestPos, len, obj, ref1, ref2;
    latestPos = null;
    ref2 = ((ref1 = this.lastRendered) != null ? ref1.settingsPosition : void 0) || [];
    for (j = 0, len = ref2.length; j < len; j++) {
      obj = ref2[j];
      if (obj.property === prop) {
        latestPos = obj;
      }
    }
    if (latestPos != null) {
      return this.codeMirror.replaceRange(prop + ": " + value, CodeMirror.Pos(latestPos.lineIdx, latestPos.from), CodeMirror.Pos(latestPos.lineIdx, latestPos.from + latestPos.length));
    } else {
      return this.codeMirror.replaceRange("<!-- " + prop + ": " + value + " -->\n\n", CodeMirror.Pos(this.codeMirror.firstLine(), 0));
    }
  };

  return PresenStates;

})();

loadingState = 'loading';

noAbusage = require('textlint-rule-ja-no-abusage');

mixedPeriod = require('textlint-rule-ja-no-mixed-period');

successiveWord = require('textlint-rule-ja-no-successive-word');

weakPhrase = require('textlint-rule-ja-no-weak-phrase');

maxComma = require('textlint-rule-max-comma');

kanjiContinuousLen = require('textlint-rule-max-kanji-continuous-len');

maxTen = require('textlint-rule-max-ten');

noDoubleNegativeJa = require('textlint-rule-no-double-negative-ja');

noDoubledConjunction = require('textlint-rule-no-doubled-conjunction');

noDoubledConjunctiveParticleGa = require('textlint-rule-no-doubled-conjunctive-particle-ga');

noDoubledJoshi = require('textlint-rule-no-doubled-joshi');

noDroppingTheRa = require('textlint-rule-no-dropping-the-ra');

noExclamationQuestionMark = require('textlint-rule-no-exclamation-question-mark');

noHankakuKana = require('textlint-rule-no-hankaku-kana');

noMixDearuDesumasu = require('textlint-rule-no-mix-dearu-desumasu');

noNfd = require('textlint-rule-no-nfd');

noStartDuplicatedConjunction = require('textlint-rule-no-start-duplicated-conjunction');

validator = createValidator({
  rules: {
    'noAbusage': noAbusage,
    'mixedPeriod': mixedPeriod,
    'successiveWord': successiveWord,
    'weakPhrase': weakPhrase,
    'maxComma': maxComma,
    'kanjiContinuousLen': kanjiContinuousLen,
    'maxTen': maxTen,
    'noDoubledNegativeJa': noDoubleNegativeJa,
    'noDoubledConjunction': noDoubledConjunction,
    'noDoubledConjunctiveParticleGa': noDoubledConjunctiveParticleGa,
    'noDoubledJoshi': noDoubledJoshi,
    'noDroppingTheRa': noDroppingTheRa,
    'noExclamationQuestionMark': noExclamationQuestionMark,
    'noHankakuKana': noHankakuKana,
    'noMixDearuDesumasu': noMixDearuDesumasu,
    'noNfd': noNfd,
    'noStartDuplicatedConjunction': noStartDuplicatedConjunction
  }
});

(function() {
  var client, draggingSplitPosition, draggingSplitter, presenStates, responsePdfOpts, setEditorConfig, setSplitter, setting, slideHTML, webview;
  slideHTML = "";
  presenStates = new PresenStates(CodeMirror.fromTextArea($('#editor')[0], {
    mode: 'gfm',
    lineWrapping: true,
    lineNumbers: true,
    dragDrop: false,
    gutters: ["CodeMirror-lint-markers"],
    lint: {
      "getAnnotations": validator,
      "async": true
    },
    extraKeys: {
      Enter: 'newlineAndIndentContinueMarkdownList'
    }
  }), $('#preview')[0]);
  draggingSplitter = false;
  draggingSplitPosition = void 0;
  setSplitter = function(splitPoint) {
    splitPoint = Math.min(0.8, Math.max(0.2, parseFloat(splitPoint)));
    $('.pane.markdown').css('flex-grow', splitPoint * 100);
    $('.pane.preview').css('flex-grow', (1 - splitPoint) * 100);
    return splitPoint;
  };
  setEditorConfig = function(editorConfig) {
    var editor, ref1;
    editor = $((ref1 = presenStates.codeMirror) != null ? ref1.getWrapperElement() : void 0);
    if (editor != null) {
      editor.css('font-family', editorConfig.fontFamily);
    }
    if (editor != null) {
      return editor.css('font-size', editorConfig.fontSize);
    }
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
  MdsRenderer.on('publishPdf', function(fname) {
    presenStates.codeMirror.getInputField().blur();
    $('body').addClass('exporting-pdf');
    return presenStates.preview.send('requestPdfOptions', {
      filename: fname
    });
  }).on('responsePdfOptions', function(opts) {
    var startPublish;
    startPublish = function() {
      if (loadingState === 'loading') {
        return setTimeout(startPublish, 250);
      } else {
        return presenStates.preview.printToPDF({
          marginsType: 1,
          pageSize: opts.exportSize,
          printBackground: true
        }, function(err, data) {
          if (!err) {
            return MdsRenderer.sendToMain('writeFile', opts.filename, data, {
              finalized: 'unfreeze'
            });
          } else {
            return MdsRenderer.sendToMain('unfreeze');
          }
        });
      }
    };
    return setTimeout(startPublish, 500);
  }).on('unfreezed', function() {
    presenStates.preview.send('unfreeze');
    return $('body').removeClass('exporting-pdf');
  }).on('loadText', function(buffer) {
    presenStates._lockChangedStatus = true;
    presenStates.codeMirror.setValue(buffer);
    presenStates.codeMirror.clearHistory();
    return presenStates._lockChangedStatus = false;
  }).on('setImageDirectory', function(directories) {
    return presenStates.setImageDirectory(directories);
  }).on('save', function(fname, triggers) {
    if (triggers == null) {
      triggers = {};
    }
    MdsRenderer.sendToMain('writeFile', fname, presenStates.codeMirror.getValue(), triggers);
    return MdsRenderer.sendToMain('initializeState', fname);
  }).on('viewMode', function(mode) {
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
  }).on('editCommand', function(command) {
    return presenStates.codeMirror.execCommand(command);
  }).on('openDevTool', function() {
    if (presenStates.preview.isDevToolsOpened()) {
      return presenStates.preview.closeDevTools();
    } else {
      return presenStates.preview.openDevTools();
    }
  }).on('setEditorConfig', function(editorConfig) {
    return setEditorConfig(editorConfig);
  }).on('setSplitter', function(spliiterPos) {
    return setSplitter(spliiterPos);
  }).on('setTheme', function(theme) {
    return presenStates.updateGlobalSetting('$theme', theme);
  }).on('themeChanged', function(theme) {
    return MdsRenderer.sendToMain('themeChanged', theme);
  }).on('resourceState', function(state) {
    return loadingState = state;
  });
  setting = {
    "id": "presenIndex",
    "url": "ws://apps.wisdomweb.net:64260/ws/mik",
    "site": "test",
    "token": "Pad:9948"
  };
  client = new MickrClient(setting);
  client.send("canReceiveEditorText", {
    "to": "index",
    "body": {
      "content": ""
    }
  });
  client.on("sendEditorText", (function(_this) {
    return function(e, data) {
      var editorText;
      editorText = data.body.content;
      console.log(data.body.content);
      return presenStates.codeMirror.setValue(editorText);
    };
  })(this));
  webview = document.querySelector('#preview');
  webview.addEventListener('ipc-message', (function(_this) {
    return function(event) {
      var slideInfo;
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
      }
    };
  })(this));
  ipc.on('presenDevInitialize', (function(_this) {
    return function(e, text) {
      console.log('receive presenDevInitialize');
      console.log(text);
      return slideHTML = text;
    };
  })(this));
  ipc.on('goToPage', (function(_this) {
    return function(e, page) {
      console.log(page);
      return webview.send('goToPage', page);
    };
  })(this));
  presenStates.codeMirror.focus();
  return presenStates.refreshPage();
})();

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJlc2VuSW5kZXguanMiLCJzb3VyY2VzIjpbInByZXNlbkluZGV4LmNvZmZlZSJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxJQUFBLHdiQUFBO0VBQUE7OztBQUFBLEdBQUEsR0FBTSxPQUFBLENBQVEsVUFBUixDQUFtQixDQUFDOztBQUMxQixNQUFvQixPQUFBLENBQVEsVUFBUixDQUFwQixFQUFDLGlCQUFELEVBQVE7O0FBQ1IsT0FBQSxHQUFvQixPQUFBLENBQVEsdUJBQVI7O0FBQ3BCLGNBQUEsR0FBb0IsT0FBQSxDQUFRLDJCQUFSOztBQUNwQixlQUFBLEdBQW9CLE9BQUEsQ0FBUSxxQkFBUjs7QUFDcEIsV0FBQSxHQUFvQixJQUFJOztBQUN4QixXQUFBLEdBQW9CLE9BQUEsQ0FBUSx1QkFBUjs7QUFDcEIsV0FBVyxDQUFDLGFBQVosQ0FBQTs7QUFFQSxRQUFRLENBQUMsa0JBQVQsQ0FBNEIsQ0FBNUIsRUFBK0IsQ0FBL0I7O0FBRUEsVUFBQSxHQUFhLE9BQUEsQ0FBUSxZQUFSOztBQUNiLE9BQUEsQ0FBUSx5QkFBUjs7QUFDQSxPQUFBLENBQVEsbUNBQVI7O0FBQ0EsT0FBQSxDQUFRLHlCQUFSOztBQUNBLE9BQUEsQ0FBUSxvQ0FBUjs7QUFDQSxPQUFBLENBQVEsNEJBQVI7O0FBQ0EsV0FBQSxHQUFjLE9BQUEsQ0FBUSx1QkFBUjs7QUFFUjt5QkFDSixNQUFBLEdBQVE7O3lCQUNSLFdBQUEsR0FBYTs7eUJBQ2Isa0JBQUEsR0FBb0I7O3lCQUNwQixZQUFBLEdBQWM7O3lCQUVkLGtCQUFBLEdBQW9COzt5QkFDcEIsZUFBQSxHQUFpQjs7RUFFSixzQkFBQyxVQUFELEVBQWMsT0FBZDtJQUFDLElBQUMsQ0FBQSxhQUFEO0lBQWEsSUFBQyxDQUFBLFVBQUQ7Ozs7Ozs7OztJQUN6QixJQUFDLENBQUEsZ0JBQUQsQ0FBQTtJQUNBLElBQUMsQ0FBQSxpQkFBRCxDQUFBO0lBRUEsSUFBQyxDQUFBLElBQUQsR0FBUSxJQUFJLE9BQUosQ0FBWTtNQUNsQjtR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LFNBQUMsQ0FBRCxFQUFJLElBQUo7TUFDakIsT0FBTyxDQUFDLEdBQVIsQ0FBWSxJQUFaO2FBQ0EsT0FBTyxDQUFDLElBQVIsQ0FBYSxVQUFiLEVBQXlCLElBQXpCO0lBRmlCO0VBQUEsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQUFuQjtFQU1BLFlBQVksQ0FBQyxVQUFVLENBQUMsS0FBeEIsQ0FBQTtTQUNBLFlBQVksQ0FBQyxXQUFiLENBQUE7QUFsTEMsQ0FBQSxDQUFILENBQUEiLCJzb3VyY2VzQ29udGVudCI6WyJpcGMgPSByZXF1aXJlKCdlbGVjdHJvbicpLmlwY1JlbmRlcmVyXG57c2hlbGwsIHdlYkZyYW1lfSA9IHJlcXVpcmUgJ2VsZWN0cm9uJ1xuTWRzTWVudSAgICAgICAgICAgPSByZXF1aXJlICcuL2pzL2NsYXNzZXMvbWRzX21lbnUnXG5jbHNNZHNSZW5kZXJlciAgICA9IHJlcXVpcmUgJy4vanMvY2xhc3Nlcy9tZHNfcmVuZGVyZXInXG5jcmVhdGVWYWxpZGF0b3IgICA9IHJlcXVpcmUgJ2NvZGVtaXJyb3ItdGV4dGxpbnQnXG5NZHNSZW5kZXJlciAgICAgICA9IG5ldyBjbHNNZHNSZW5kZXJlclxuTWlja3JDbGllbnQgICAgICAgPSByZXF1aXJlICcuL21vZHVsZXMvTWlja3JDbGllbnQnXG5NZHNSZW5kZXJlci5yZXF1ZXN0QWNjZXB0KClcblxud2ViRnJhbWUuc2V0Wm9vbUxldmVsTGltaXRzKDEsIDEpXG5cbkNvZGVNaXJyb3IgPSByZXF1aXJlICdjb2RlbWlycm9yJ1xucmVxdWlyZSAnY29kZW1pcnJvci9tb2RlL3htbC94bWwnXG5yZXF1aXJlICdjb2RlbWlycm9yL21vZGUvbWFya2Rvd24vbWFya2Rvd24nXG5yZXF1aXJlICdjb2RlbWlycm9yL21vZGUvZ2ZtL2dmbSdcbnJlcXVpcmUgJ2NvZGVtaXJyb3IvYWRkb24vZWRpdC9jb250aW51ZWxpc3QnXG5yZXF1aXJlIFwiY29kZW1pcnJvci9hZGRvbi9saW50L2xpbnRcIlxuTWlja3JDbGllbnQgPSByZXF1aXJlICcuL21vZHVsZXMvTWlja3JDbGllbnQnXG5cbmNsYXNzIFByZXNlblN0YXRlc1xuICBydWxlcnM6IFtdXG4gIGN1cnJlbnRQYWdlOiBudWxsXG4gIHByZXZpZXdJbml0aWFsaXplZDogZmFsc2VcbiAgbGFzdFJlbmRlcmVkOiB7fVxuXG4gIF9sb2NrQ2hhbmdlZFN0YXR1czogZmFsc2VcbiAgX2ltYWdlRGlyZWN0b3J5OiBudWxsXG5cbiAgY29uc3RydWN0b3I6IChAY29kZU1pcnJvciwgQHByZXZpZXcpIC0+XG4gICAgQGluaXRpYWxpemVFZGl0b3IoKVxuICAgIEBpbml0aWFsaXplUHJldmlldygpXG5cbiAgICBAbWVudSA9IG5ldyBNZHNNZW51IFtcbiAgICAgIHsgbGFiZWw6ICcmVW5kbycsIGFjY2VsZXJhdG9yOiAnQ21kT3JDdHJsK1onLCBjbGljazogKGksIHcpID0+IEBjb2RlTWlycm9yLmV4ZWNDb21tYW5kICd1bmRvJyBpZiB3IGFuZCAhdy5tZHNXaW5kb3cuZnJlZXplIH1cbiAgICAgIHtcbiAgICAgICAgbGFiZWw6ICcmUmVkbydcbiAgICAgICAgYWNjZWxlcmF0b3I6IGRvIC0+IGlmIHByb2Nlc3MucGxhdGZvcm0gaXMgJ3dpbjMyJyB0aGVuICdDb250cm9sK1knIGVsc2UgJ1NoaWZ0K0NtZE9yQ3RybCtaJ1xuICAgICAgICBjbGljazogKGksIHcpID0+IEBjb2RlTWlycm9yLmV4ZWNDb21tYW5kICdyZWRvJyBpZiB3IGFuZCAhdy5tZHNXaW5kb3cuZnJlZXplXG4gICAgICB9XG4gICAgICB7IHR5cGU6ICdzZXBhcmF0b3InIH1cbiAgICAgIHsgbGFiZWw6ICdDdSZ0JywgYWNjZWxlcmF0b3I6ICdDbWRPckN0cmwrWCcsIHJvbGU6ICdjdXQnIH1cbiAgICAgIHsgbGFiZWw6ICcmQ29weScsIGFjY2VsZXJhdG9yOiAnQ21kT3JDdHJsK0MnLCByb2xlOiAnY29weScgfVxuICAgICAgeyBsYWJlbDogJyZQYXN0ZScsIGFjY2VsZXJhdG9yOiAnQ21kT3JDdHJsK1YnLCByb2xlOiAncGFzdGUnIH1cbiAgICAgIHsgbGFiZWw6ICcmRGVsZXRlJywgcm9sZTogJ2RlbGV0ZScgfVxuICAgICAgeyBsYWJlbDogJ1NlbGVjdCAmQWxsJywgYWNjZWxlcmF0b3I6ICdDbWRPckN0cmwrQScsIGNsaWNrOiAoaSwgdykgPT4gQGNvZGVNaXJyb3IuZXhlY0NvbW1hbmQgJ3NlbGVjdEFsbCcgaWYgdyBhbmQgIXcubWRzV2luZG93LmZyZWV6ZSB9XG4gICAgICB7IHR5cGU6ICdzZXBhcmF0b3InLCBwbGF0Zm9ybTogJ2RhcndpbicgfVxuICAgICAgeyBsYWJlbDogJ1NlcnZpY2VzJywgcm9sZTogJ3NlcnZpY2VzJywgc3VibWVudTogW10sIHBsYXRmb3JtOiAnZGFyd2luJyB9XG4gICAgXVxuXG4gICMg44Oa44O844K444Kr44Km44Oz44OI5b6M44CBd2Vidmlld+OBuOOBneOCjOOCkumAgeS/oVxuICByZWZyZXNoUGFnZTogKHJ1bGVycykgPT5cbiAgICAjIHByZXNlblN0YXRlc+OCr+ODqeOCueOBruWkieaVsHJ1bGVyc+ODquOCueODiOOBuOWFpeOCjOOBpuOAgeS4gOaXpuODmuODvOOCuOOCku+8keOBq+OBmeOCi1xuICAgIEBydWxlcnMgPSBydWxlcnMgaWYgcnVsZXJzP1xuICAgIHBhZ2UgICAgPSAxXG4gICAgIyBjb25zb2xlLmxvZyBcIjFwYWdlID0gXCIgKyBAcGlja1VwQ29tbWVudEZyb21QYWdlKDEpXG4gICAgIyBjb25zb2xlLmxvZyBcImxhc3QgcGFnZSA9IFwiICsgQHBpY2tVcENvbW1lbnRGcm9tUGFnZShAcnVsZXJzLmxlbmd0aCsxKVxuICAgICNjb25zb2xlLmxvZyBAcGlja1VwQ29tbWVudCgpXG5cbiAgICAjIHJ1bGVyTGluZeOBq+OBryctLS0n44Gu6KGM5L2N572u44GM6KiY44GV44KM44Gm44GK44KK44CB44Gd44KM44Go44Ko44OH44Kj44K/5LiK44Gu44Kr44O844K944Or5L2N572u44KS5q+U6LyD44GX44GmcGFnZeOCkuaxuuOCgeOCi1xuICAgIGxpbmVOdW1iZXIgPSBAY29kZU1pcnJvci5nZXRDdXJzb3IoKS5saW5lIHx8IDBcbiAgICBmb3IgcnVsZXJMaW5lIGluIEBydWxlcnNcbiAgICAgIHBhZ2UrKyBpZiBydWxlckxpbmUgPD0gbGluZU51bWJlclxuXG4gICAgIyBydWxlcuioiOeul+W+jOOBq+ODmuODvOOCuOOBruWil+a4m+OBjOOBguOBo+OBn+WgtOWQiOOAgeato+OBl+OBhOODmuODvOOCuOaDheWgseOCkndlYnZpZXfjgbjpgIHkv6FcbiAgICBpZiBAY3VycmVudFBhZ2UgIT0gcGFnZVxuICAgICAgQGN1cnJlbnRQYWdlID0gcGFnZVxuICAgICAgQHByZXZpZXcuc2VuZCAnY3VycmVudFBhZ2UnLCBAY3VycmVudFBhZ2UgaWYgQHByZXZpZXdJbml0aWFsaXplZFxuXG4gICAgJCgnI3BhZ2UtaW5kaWNhdG9yJykudGV4dCBcIlBhZ2UgI3tAY3VycmVudFBhZ2V9IC8gI3tAcnVsZXJzLmxlbmd0aCArIDF9XCJcblxuICBpbml0aWFsaXplUHJldmlldzogPT5cbiAgICAkKEBwcmV2aWV3KVxuICAgICAgLm9uICdkb20tcmVhZHknLCA9PlxuICAgICAgICAjIEZpeCBtaW5pbWl6ZWQgcHJldmlldyAoIzIwKVxuICAgICAgICAjIFtOb3RlXSBodHRwczovL2dpdGh1Yi5jb20vZWxlY3Ryb24vZWxlY3Ryb24vaXNzdWVzLzQ4ODJcbiAgICAgICAgJChAcHJldmlldy5zaGFkb3dSb290KS5hcHBlbmQoJzxzdHlsZT5vYmplY3R7bWluLXdpZHRoOjA7bWluLWhlaWdodDowO308L3N0eWxlPicpXG5cbiAgICAgICMgd2VidmlldyDjgYvjgonjga7pgJrkv6HjgpLlj5fjgZHlj5bjgosgJ2lwYy1tZXNzYWdlJ1xuICAgICAgLm9uICdpcGMtbWVzc2FnZScsIChldikgPT5cbiAgICAgICAgZSA9IGV2Lm9yaWdpbmFsRXZlbnRcblxuICAgICAgICBzd2l0Y2ggZS5jaGFubmVsXG4gICAgICAgICAgd2hlbiAncnVsZXJDaGFuZ2VkJ1xuICAgICAgICAgICAgQHJlZnJlc2hQYWdlIGUuYXJnc1swXVxuICAgICAgICAgIHdoZW4gJ2xpbmtUbydcbiAgICAgICAgICAgIEBvcGVuTGluayBlLmFyZ3NbMF1cbiAgICAgICAgICB3aGVuICdyZW5kZXJlZCdcbiAgICAgICAgICAgIEBsYXN0UmVuZGVyZWQgPSBlLmFyZ3NbMF1cbiAgICAgICAgICAgIHVubGVzcyBAcHJldmlld0luaXRpYWxpemVkXG4gICAgICAgICAgICAgIE1kc1JlbmRlcmVyLnNlbmRUb01haW4gJ3ByZXZpZXdJbml0aWFsaXplZCdcblxuICAgICAgICAgICAgICBAcHJldmlld0luaXRpYWxpemVkID0gdHJ1ZVxuICAgICAgICAgICAgICAkKCdib2R5JykuYWRkQ2xhc3MgJ2luaXRpYWxpemVkLXNsaWRlJ1xuICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgIE1kc1JlbmRlcmVyLl9jYWxsX2V2ZW50IGUuY2hhbm5lbCwgZS5hcmdzLi4uXG4gICAgICAjIHVybOOCkuOCr+ODquODg+OCr+OBl+OBpuaWsOOBl+OBhOOCpuOCpOODs+ODieOCpuOBjOmWi+OBi+OCjOOCi+aZglxuICAgICAgLm9uICduZXctd2luZG93JywgKGUpID0+XG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKVxuICAgICAgICBAb3BlbkxpbmsgZS5vcmlnaW5hbEV2ZW50LnVybFxuXG4gICAgICAub24gJ2RpZC1maW5pc2gtbG9hZCcsIChlKSA9PlxuICAgICAgICBAcHJldmlldy5zZW5kICdjdXJyZW50UGFnZScsIDFcbiAgICAgICAgQHByZXZpZXcuc2VuZCAnc2V0SW1hZ2VEaXJlY3RvcnknLCBAX2ltYWdlRGlyZWN0b3J5XG4gICAgICAgIEBwcmV2aWV3LnNlbmQgJ3JlbmRlcicsIEBjb2RlTWlycm9yLmdldFZhbHVlKCkgICMgcmVuZGVyIOOCpOODmeODs+ODiOmAgeS/oeOBp3J1bGVy56K66KqN44GX44Gm44Oa44O844K45YiH44KK5pu/44KP44KKXG5cbiAgb3Blbkxpbms6IChsaW5rKSA9PlxuICAgIHNoZWxsLm9wZW5FeHRlcm5hbCBsaW5rIGlmIC9eaHR0cHM/OlxcL1xcLy4rLy50ZXN0KGxpbmspXG5cbiAgaW5pdGlhbGl6ZUVkaXRvcjogPT5cbiAgICBAY29kZU1pcnJvci5vbiAnY29udGV4dG1lbnUnLCAoY20sIGUpID0+XG4gICAgICBlLnByZXZlbnREZWZhdWx0KClcbiAgICAgIEBjb2RlTWlycm9yLmZvY3VzKClcbiAgICAgIEBtZW51LnBvcHVwKClcbiAgICAgIGZhbHNlXG5cbiAgICBAY29kZU1pcnJvci5vbiAnY2hhbmdlJywgKGNtLCBjaGcpID0+XG4gICAgICBAcHJldmlldy5zZW5kICdyZW5kZXInLCBjbS5nZXRWYWx1ZSgpXG4gICAgICBNZHNSZW5kZXJlci5zZW5kVG9NYWluICdzZXRDaGFuZ2VkU3RhdHVzJywgdHJ1ZSBpZiAhQF9sb2NrQ2hhbmdlZFN0YXR1c1xuXG4gICAgQGNvZGVNaXJyb3Iub24gJ2N1cnNvckFjdGl2aXR5JywgKGNtKSA9PiB3aW5kb3cuc2V0VGltZW91dCAoPT4gQHJlZnJlc2hQYWdlKCkpLCA1XG5cbiAgICAkKCcucGFuZS5tYXJrZG93bicpLnRvZ2dsZSgpXG5cbiAgc2V0SW1hZ2VEaXJlY3Rvcnk6IChkaXJlY3RvcnkpID0+XG4gICAgaWYgQHByZXZpZXdJbml0aWFsaXplZFxuICAgICAgQHByZXZpZXcuc2VuZCAnc2V0SW1hZ2VEaXJlY3RvcnknLCBkaXJlY3RvcnlcbiAgICAgIEBwcmV2aWV3LnNlbmQgJ3JlbmRlcicsIEBjb2RlTWlycm9yLmdldFZhbHVlKClcbiAgICBlbHNlXG4gICAgICBAX2ltYWdlRGlyZWN0b3J5ID0gZGlyZWN0b3J5XG5cbiAgaW5zZXJ0SW1hZ2U6IChmaWxlUGF0aCkgPT4gQGNvZGVNaXJyb3IucmVwbGFjZVNlbGVjdGlvbihcIiFbXSgje2ZpbGVQYXRoLnJlcGxhY2UoLyAvZywgJyUyMCcpfSlcXG5cIilcblxuICAjKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipUT0RPKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuICBpbnNlcnRWaWRlbzogKGZpbGVQYXRoKSA9PlxuICAgIGNvbnNvbGUubG9nIGZpbGVQYXRoXG4gICMqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG5cblxuICB1cGRhdGVHbG9iYWxTZXR0aW5nOiAocHJvcCwgdmFsdWUpID0+XG4gICAgbGF0ZXN0UG9zID0gbnVsbFxuXG4gICAgZm9yIG9iaiBpbiAoQGxhc3RSZW5kZXJlZD8uc2V0dGluZ3NQb3NpdGlvbiB8fCBbXSlcbiAgICAgIGxhdGVzdFBvcyA9IG9iaiBpZiBvYmoucHJvcGVydHkgaXMgcHJvcFxuXG4gICAgaWYgbGF0ZXN0UG9zP1xuICAgICAgQGNvZGVNaXJyb3IucmVwbGFjZVJhbmdlKFxuICAgICAgICBcIiN7cHJvcH06ICN7dmFsdWV9XCIsXG4gICAgICAgIENvZGVNaXJyb3IuUG9zKGxhdGVzdFBvcy5saW5lSWR4LCBsYXRlc3RQb3MuZnJvbSksXG4gICAgICAgIENvZGVNaXJyb3IuUG9zKGxhdGVzdFBvcy5saW5lSWR4LCBsYXRlc3RQb3MuZnJvbSArIGxhdGVzdFBvcy5sZW5ndGgpLFxuICAgICAgKVxuICAgIGVsc2VcbiAgICAgIEBjb2RlTWlycm9yLnJlcGxhY2VSYW5nZShcbiAgICAgICAgXCI8IS0tICN7cHJvcH06ICN7dmFsdWV9IC0tPlxcblxcblwiLFxuICAgICAgICBDb2RlTWlycm9yLlBvcyhAY29kZU1pcnJvci5maXJzdExpbmUoKSwgMClcbiAgICAgIClcblxubG9hZGluZ1N0YXRlID0gJ2xvYWRpbmcnXG5cblxuXG4jIHRleHRsaW50IHJ1bGVzIHNldHRpbmdcblxubm9BYnVzYWdlID0gcmVxdWlyZSAndGV4dGxpbnQtcnVsZS1qYS1uby1hYnVzYWdlJ1xubWl4ZWRQZXJpb2QgPSByZXF1aXJlICd0ZXh0bGludC1ydWxlLWphLW5vLW1peGVkLXBlcmlvZCdcbnN1Y2Nlc3NpdmVXb3JkID0gcmVxdWlyZSAndGV4dGxpbnQtcnVsZS1qYS1uby1zdWNjZXNzaXZlLXdvcmQnXG53ZWFrUGhyYXNlID0gcmVxdWlyZSAndGV4dGxpbnQtcnVsZS1qYS1uby13ZWFrLXBocmFzZSdcbm1heENvbW1hID0gcmVxdWlyZSAndGV4dGxpbnQtcnVsZS1tYXgtY29tbWEnXG5rYW5qaUNvbnRpbnVvdXNMZW4gPSByZXF1aXJlICd0ZXh0bGludC1ydWxlLW1heC1rYW5qaS1jb250aW51b3VzLWxlbidcbm1heFRlbiA9IHJlcXVpcmUgJ3RleHRsaW50LXJ1bGUtbWF4LXRlbidcbm5vRG91YmxlTmVnYXRpdmVKYSA9IHJlcXVpcmUgJ3RleHRsaW50LXJ1bGUtbm8tZG91YmxlLW5lZ2F0aXZlLWphJ1xubm9Eb3VibGVkQ29uanVuY3Rpb24gPSByZXF1aXJlICd0ZXh0bGludC1ydWxlLW5vLWRvdWJsZWQtY29uanVuY3Rpb24nXG5ub0RvdWJsZWRDb25qdW5jdGl2ZVBhcnRpY2xlR2EgPSByZXF1aXJlICd0ZXh0bGludC1ydWxlLW5vLWRvdWJsZWQtY29uanVuY3RpdmUtcGFydGljbGUtZ2EnXG5ub0RvdWJsZWRKb3NoaSA9IHJlcXVpcmUgJ3RleHRsaW50LXJ1bGUtbm8tZG91YmxlZC1qb3NoaSdcbm5vRHJvcHBpbmdUaGVSYSA9IHJlcXVpcmUgJ3RleHRsaW50LXJ1bGUtbm8tZHJvcHBpbmctdGhlLXJhJ1xubm9FeGNsYW1hdGlvblF1ZXN0aW9uTWFyayA9IHJlcXVpcmUgJ3RleHRsaW50LXJ1bGUtbm8tZXhjbGFtYXRpb24tcXVlc3Rpb24tbWFyaydcbm5vSGFua2FrdUthbmEgPSByZXF1aXJlICd0ZXh0bGludC1ydWxlLW5vLWhhbmtha3Uta2FuYSdcbm5vTWl4RGVhcnVEZXN1bWFzdSA9IHJlcXVpcmUgJ3RleHRsaW50LXJ1bGUtbm8tbWl4LWRlYXJ1LWRlc3VtYXN1J1xubm9OZmQgPSByZXF1aXJlICd0ZXh0bGludC1ydWxlLW5vLW5mZCdcbm5vU3RhcnREdXBsaWNhdGVkQ29uanVuY3Rpb24gPSByZXF1aXJlICd0ZXh0bGludC1ydWxlLW5vLXN0YXJ0LWR1cGxpY2F0ZWQtY29uanVuY3Rpb24nXG5cbnZhbGlkYXRvciA9IGNyZWF0ZVZhbGlkYXRvcih7XG4gIHJ1bGVzOiB7XG4gICAgJ25vQWJ1c2FnZScgOiBub0FidXNhZ2UsXG4gICAgJ21peGVkUGVyaW9kJyA6IG1peGVkUGVyaW9kLFxuICAgICdzdWNjZXNzaXZlV29yZCcgOiBzdWNjZXNzaXZlV29yZCxcbiAgICAnd2Vha1BocmFzZScgOiB3ZWFrUGhyYXNlLFxuICAgICdtYXhDb21tYScgOiBtYXhDb21tYSxcbiAgICAna2FuamlDb250aW51b3VzTGVuJyA6IGthbmppQ29udGludW91c0xlbixcbiAgICAnbWF4VGVuJyA6IG1heFRlbixcbiAgICAnbm9Eb3VibGVkTmVnYXRpdmVKYScgOiBub0RvdWJsZU5lZ2F0aXZlSmEsXG4gICAgJ25vRG91YmxlZENvbmp1bmN0aW9uJyA6IG5vRG91YmxlZENvbmp1bmN0aW9uLFxuICAgICdub0RvdWJsZWRDb25qdW5jdGl2ZVBhcnRpY2xlR2EnIDogbm9Eb3VibGVkQ29uanVuY3RpdmVQYXJ0aWNsZUdhLFxuICAgICdub0RvdWJsZWRKb3NoaScgOiBub0RvdWJsZWRKb3NoaSxcbiAgICAnbm9Ecm9wcGluZ1RoZVJhJyA6IG5vRHJvcHBpbmdUaGVSYSxcbiAgICAnbm9FeGNsYW1hdGlvblF1ZXN0aW9uTWFyaycgOiBub0V4Y2xhbWF0aW9uUXVlc3Rpb25NYXJrLFxuICAgICdub0hhbmtha3VLYW5hJyA6IG5vSGFua2FrdUthbmEsXG4gICAgJ25vTWl4RGVhcnVEZXN1bWFzdScgOiBub01peERlYXJ1RGVzdW1hc3UsXG4gICAgJ25vTmZkJyA6IG5vTmZkLFxuICAgICdub1N0YXJ0RHVwbGljYXRlZENvbmp1bmN0aW9uJyA6IG5vU3RhcnREdXBsaWNhdGVkQ29uanVuY3Rpb25cbiAgfVxuICB9KTtcblxuZG8gLT5cbiAgc2xpZGVIVE1MID0gXCJcIlxuICBwcmVzZW5TdGF0ZXMgPSBuZXcgUHJlc2VuU3RhdGVzKFxuICAgIENvZGVNaXJyb3IuZnJvbVRleHRBcmVhKCQoJyNlZGl0b3InKVswXSxcbiAgICAgICMgZ2ZtIDogR2l0aHViIEZsYXZvcmVkIE1vZGVcbiAgICAgIG1vZGU6ICdnZm0nXG4gICAgICAjdGhlbWU6ICdiYXNlMTYtbGlnaHQnXG4gICAgICBsaW5lV3JhcHBpbmc6IHRydWVcbiAgICAgIGxpbmVOdW1iZXJzOiB0cnVlXG4gICAgICBkcmFnRHJvcDogZmFsc2VcbiAgICAgIGd1dHRlcnM6IFtcIkNvZGVNaXJyb3ItbGludC1tYXJrZXJzXCJdXG4gICAgICBsaW50OiB7XG4gICAgICAgICBcImdldEFubm90YXRpb25zXCI6IHZhbGlkYXRvcixcbiAgICAgICAgIFwiYXN5bmNcIjogdHJ1ZVxuICAgICAgfVxuICAgICAgZXh0cmFLZXlzOlxuICAgICAgICBFbnRlcjogJ25ld2xpbmVBbmRJbmRlbnRDb250aW51ZU1hcmtkb3duTGlzdCdcbiAgICApLFxuICAgICQoJyNwcmV2aWV3JylbMF1cbiAgKVxuXG4gICMgU3BsaXR0ZXJcbiAgZHJhZ2dpbmdTcGxpdHRlciAgICAgID0gZmFsc2VcbiAgZHJhZ2dpbmdTcGxpdFBvc2l0aW9uID0gdW5kZWZpbmVkXG5cbiAgc2V0U3BsaXR0ZXIgPSAoc3BsaXRQb2ludCkgLT5cbiAgICBzcGxpdFBvaW50ID0gTWF0aC5taW4oMC44LCBNYXRoLm1heCgwLjIsIHBhcnNlRmxvYXQoc3BsaXRQb2ludCkpKVxuXG4gICAgJCgnLnBhbmUubWFya2Rvd24nKS5jc3MoJ2ZsZXgtZ3JvdycsIHNwbGl0UG9pbnQgKiAxMDApXG4gICAgJCgnLnBhbmUucHJldmlldycpLmNzcygnZmxleC1ncm93JywgKDEgLSBzcGxpdFBvaW50KSAqIDEwMClcblxuICAgIHJldHVybiBzcGxpdFBvaW50XG5cbiAgc2V0RWRpdG9yQ29uZmlnID0gKGVkaXRvckNvbmZpZykgLT5cbiAgICBlZGl0b3IgPSAkKHByZXNlblN0YXRlcy5jb2RlTWlycm9yPy5nZXRXcmFwcGVyRWxlbWVudCgpKVxuICAgIGVkaXRvci5jc3MoJ2ZvbnQtZmFtaWx5JywgZWRpdG9yQ29uZmlnLmZvbnRGYW1pbHkpIGlmIGVkaXRvcj9cbiAgICBlZGl0b3IuY3NzKCdmb250LXNpemUnLCBlZGl0b3JDb25maWcuZm9udFNpemUpIGlmIGVkaXRvcj9cblxuICAkKCcucGFuZS1zcGxpdHRlcicpXG4gICAgLm1vdXNlZG93biAtPlxuICAgICAgZHJhZ2dpbmdTcGxpdHRlciA9IHRydWVcbiAgICAgIGRyYWdnaW5nU3BsaXRQb3NpdGlvbiA9IHVuZGVmaW5lZFxuXG4gICAgLmRibGNsaWNrIC0+XG4gICAgICBNZHNSZW5kZXJlci5zZW5kVG9NYWluICdzZXRDb25maWcnLCAnc3BsaXR0ZXJQb3NpdGlvbicsIHNldFNwbGl0dGVyKDAuNSlcblxuICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lciAnbW91c2Vtb3ZlJywgKGUpIC0+XG4gICAgaWYgZHJhZ2dpbmdTcGxpdHRlclxuICAgICAgZHJhZ2dpbmdTcGxpdFBvc2l0aW9uID0gc2V0U3BsaXR0ZXIgTWF0aC5taW4oTWF0aC5tYXgoMCwgZS5jbGllbnRYKSwgZG9jdW1lbnQuYm9keS5jbGllbnRXaWR0aCkgLyBkb2N1bWVudC5ib2R5LmNsaWVudFdpZHRoXG4gICwgZmFsc2VcblxuICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lciAnbW91c2V1cCcsIChlKSAtPlxuICAgIGRyYWdnaW5nU3BsaXR0ZXIgPSBmYWxzZVxuICAgIE1kc1JlbmRlcmVyLnNlbmRUb01haW4gJ3NldENvbmZpZycsICdzcGxpdHRlclBvc2l0aW9uJywgZHJhZ2dpbmdTcGxpdFBvc2l0aW9uIGlmIGRyYWdnaW5nU3BsaXRQb3NpdGlvbj9cbiAgLCBmYWxzZVxuXG4gIHJlc3BvbnNlUGRmT3B0cyA9IG51bGxcblxuICAjIEV2ZW50c1xuICBNZHNSZW5kZXJlclxuICAgIC5vbiAncHVibGlzaFBkZicsIChmbmFtZSkgLT5cbiAgICAgIHByZXNlblN0YXRlcy5jb2RlTWlycm9yLmdldElucHV0RmllbGQoKS5ibHVyKClcbiAgICAgICQoJ2JvZHknKS5hZGRDbGFzcyAnZXhwb3J0aW5nLXBkZidcblxuICAgICAgcHJlc2VuU3RhdGVzLnByZXZpZXcuc2VuZCAncmVxdWVzdFBkZk9wdGlvbnMnLCB7IGZpbGVuYW1lOiBmbmFtZSB9XG5cbiAgICAub24gJ3Jlc3BvbnNlUGRmT3B0aW9ucycsIChvcHRzKSAtPlxuICAgICAgIyBXYWl0IGxvYWRpbmcgcmVzb3VyY2VzXG4gICAgICBzdGFydFB1Ymxpc2ggPSAtPlxuICAgICAgICBpZiBsb2FkaW5nU3RhdGUgaXMgJ2xvYWRpbmcnXG4gICAgICAgICAgc2V0VGltZW91dCBzdGFydFB1Ymxpc2gsIDI1MFxuICAgICAgICBlbHNlXG4gICAgICAgICAgcHJlc2VuU3RhdGVzLnByZXZpZXcucHJpbnRUb1BERlxuICAgICAgICAgICAgbWFyZ2luc1R5cGU6IDFcbiAgICAgICAgICAgIHBhZ2VTaXplOiBvcHRzLmV4cG9ydFNpemVcbiAgICAgICAgICAgIHByaW50QmFja2dyb3VuZDogdHJ1ZVxuICAgICAgICAgICwgKGVyciwgZGF0YSkgLT5cbiAgICAgICAgICAgIHVubGVzcyBlcnJcbiAgICAgICAgICAgICAgTWRzUmVuZGVyZXIuc2VuZFRvTWFpbiAnd3JpdGVGaWxlJywgb3B0cy5maWxlbmFtZSwgZGF0YSwgeyBmaW5hbGl6ZWQ6ICd1bmZyZWV6ZScgfVxuICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICBNZHNSZW5kZXJlci5zZW5kVG9NYWluICd1bmZyZWV6ZSdcblxuICAgICAgc2V0VGltZW91dCBzdGFydFB1Ymxpc2gsIDUwMFxuXG4gICAgLm9uICd1bmZyZWV6ZWQnLCAtPlxuICAgICAgcHJlc2VuU3RhdGVzLnByZXZpZXcuc2VuZCAndW5mcmVlemUnXG4gICAgICAkKCdib2R5JykucmVtb3ZlQ2xhc3MgJ2V4cG9ydGluZy1wZGYnXG5cbiAgICAub24gJ2xvYWRUZXh0JywgKGJ1ZmZlcikgLT5cbiAgICAgIHByZXNlblN0YXRlcy5fbG9ja0NoYW5nZWRTdGF0dXMgPSB0cnVlXG4gICAgICBwcmVzZW5TdGF0ZXMuY29kZU1pcnJvci5zZXRWYWx1ZSBidWZmZXJcbiAgICAgIHByZXNlblN0YXRlcy5jb2RlTWlycm9yLmNsZWFySGlzdG9yeSgpXG4gICAgICBwcmVzZW5TdGF0ZXMuX2xvY2tDaGFuZ2VkU3RhdHVzID0gZmFsc2VcblxuICAgIC5vbiAnc2V0SW1hZ2VEaXJlY3RvcnknLCAoZGlyZWN0b3JpZXMpIC0+IHByZXNlblN0YXRlcy5zZXRJbWFnZURpcmVjdG9yeSBkaXJlY3Rvcmllc1xuXG4gICAgIyBzZW5kIHRleHQgdG8gc2F2ZSB0byBtYWluIHByb2Nlc3MgYW5kIHJlbG9hZFxuICAgIC5vbiAnc2F2ZScsIChmbmFtZSwgdHJpZ2dlcnMgPSB7fSkgLT5cbiAgICAgIE1kc1JlbmRlcmVyLnNlbmRUb01haW4gJ3dyaXRlRmlsZScsIGZuYW1lLCBwcmVzZW5TdGF0ZXMuY29kZU1pcnJvci5nZXRWYWx1ZSgpLCB0cmlnZ2Vyc1xuICAgICAgTWRzUmVuZGVyZXIuc2VuZFRvTWFpbiAnaW5pdGlhbGl6ZVN0YXRlJywgZm5hbWVcblxuICAgIC5vbiAndmlld01vZGUnLCAobW9kZSkgLT5cbiAgICAgIHN3aXRjaCBtb2RlXG4gICAgICAgIHdoZW4gJ21hcmtkb3duJ1xuICAgICAgICAgIHByZXNlblN0YXRlcy5wcmV2aWV3LnNlbmQgJ3NldENsYXNzJywgJydcbiAgICAgICAgd2hlbiAnc2NyZWVuJ1xuICAgICAgICAgIHByZXNlblN0YXRlcy5wcmV2aWV3LnNlbmQgJ3NldENsYXNzJywgJ3NsaWRlLXZpZXcgc2NyZWVuJ1xuICAgICAgICB3aGVuICdsaXN0J1xuICAgICAgICAgIHByZXNlblN0YXRlcy5wcmV2aWV3LnNlbmQgJ3NldENsYXNzJywgJ3NsaWRlLXZpZXcgbGlzdCdcbiAgICAgICAgd2hlbiAncHJlc2VuLWRldidcbiAgICAgICAgICBwcmVzZW5TdGF0ZXMucHJldmlldy5zZW5kICdzZXRDbGFzcycsICdzbGlkZS12aWV3IHByZXNlbi1kZXYnXG5cbiAgICAgICQoJyNwcmV2aWV3LW1vZGVzJykucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJylcbiAgICAgICQoJy52aWV3bW9kZS1idG5bZGF0YS12aWV3bW9kZV0nKS5yZW1vdmVDbGFzcygnYWN0aXZlJylcbiAgICAgICAgLmZpbHRlcihcIltkYXRhLXZpZXdtb2RlPScje21vZGV9J11cIikuYWRkQ2xhc3MoJ2FjdGl2ZScpXG5cbiAgICAub24gJ2VkaXRDb21tYW5kJywgKGNvbW1hbmQpIC0+IHByZXNlblN0YXRlcy5jb2RlTWlycm9yLmV4ZWNDb21tYW5kKGNvbW1hbmQpXG5cbiAgICAub24gJ29wZW5EZXZUb29sJywgLT5cbiAgICAgIGlmIHByZXNlblN0YXRlcy5wcmV2aWV3LmlzRGV2VG9vbHNPcGVuZWQoKVxuICAgICAgICBwcmVzZW5TdGF0ZXMucHJldmlldy5jbG9zZURldlRvb2xzKClcbiAgICAgIGVsc2VcbiAgICAgICAgcHJlc2VuU3RhdGVzLnByZXZpZXcub3BlbkRldlRvb2xzKClcblxuICAgIC5vbiAnc2V0RWRpdG9yQ29uZmlnJywgKGVkaXRvckNvbmZpZykgLT4gc2V0RWRpdG9yQ29uZmlnIGVkaXRvckNvbmZpZ1xuICAgIC5vbiAnc2V0U3BsaXR0ZXInLCAoc3BsaWl0ZXJQb3MpIC0+IHNldFNwbGl0dGVyIHNwbGlpdGVyUG9zXG4gICAgLm9uICdzZXRUaGVtZScsICh0aGVtZSkgLT4gcHJlc2VuU3RhdGVzLnVwZGF0ZUdsb2JhbFNldHRpbmcgJyR0aGVtZScsIHRoZW1lXG4gICAgLm9uICd0aGVtZUNoYW5nZWQnLCAodGhlbWUpIC0+IE1kc1JlbmRlcmVyLnNlbmRUb01haW4gJ3RoZW1lQ2hhbmdlZCcsIHRoZW1lXG4gICAgLm9uICdyZXNvdXJjZVN0YXRlJywgKHN0YXRlKSAtPiBsb2FkaW5nU3RhdGUgPSBzdGF0ZVxuXG4gICMgTWlja3JDbGllbnQ9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgc2V0dGluZyA9XG4gICAgXCJpZFwiOiBcInByZXNlbkluZGV4XCJcbiAgICBcInVybFwiOiBcIndzOi8vYXBwcy53aXNkb213ZWIubmV0OjY0MjYwL3dzL21pa1wiXG4gICAgXCJzaXRlXCI6IFwidGVzdFwiXG4gICAgXCJ0b2tlblwiOiBcIlBhZDo5OTQ4XCJcbiAgY2xpZW50ID0gbmV3IE1pY2tyQ2xpZW50KHNldHRpbmcpXG5cbiAgY2xpZW50LnNlbmQgXCJjYW5SZWNlaXZlRWRpdG9yVGV4dFwiLHtcbiAgICBcInRvXCI6IFwiaW5kZXhcIlxuICAgIFwiYm9keVwiOlxuICAgICAgXCJjb250ZW50XCI6IFwiXCJcbiAgfVxuICBjbGllbnQub24gXCJzZW5kRWRpdG9yVGV4dFwiLCAoZSwgZGF0YSk9PlxuICAgIGVkaXRvclRleHQgPSBkYXRhLmJvZHkuY29udGVudFxuICAgIGNvbnNvbGUubG9nIGRhdGEuYm9keS5jb250ZW50XG4gICAgcHJlc2VuU3RhdGVzLmNvZGVNaXJyb3Iuc2V0VmFsdWUoZWRpdG9yVGV4dClcbiAgIyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbiAgd2VidmlldyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNwcmV2aWV3JylcblxuICB3ZWJ2aWV3LmFkZEV2ZW50TGlzdGVuZXIgJ2lwYy1tZXNzYWdlJywgKGV2ZW50KSA9PlxuICAgICBzd2l0Y2ggZXZlbnQuY2hhbm5lbFxuICAgICAgIHdoZW4gXCJzZW5kU2xpZGVJbmZvXCIgICAjIHdlYnZpZXcg44GL44KJ44K544Op44Kk44OJ5oOF5aCx44KS5Y+X5L+hXG4gICAgICAgIHNsaWRlSW5mbyA9IGV2ZW50LmFyZ3NbMF1cbiAgICAgICAgY29uc29sZS5sb2cgJ3JlY2VpdmUgc2VuZFNsaWRlSW5mbydcbiAgICAgICAgY29uc29sZS5sb2cgc2xpZGVJbmZvXG4gICAgICAgIGlwYy5zZW5kICd0ZXh0U2VuZCcsIHNsaWRlSW5mb1xuICAgICAgICBjb25zb2xlLmxvZyAnc2VuZCB0ZXh0U2VuZCdcbiAgICAgICAgYnJlYWtcblxuICAgICAgIHdoZW4gXCJyZXF1ZXN0U2xpZGVIVE1MXCJcbiAgICAgICAgd2Vidmlldy5zZW5kICdzZXRTbGlkZScsIHNsaWRlSFRNTFxuICAgICAgICBjb25zb2xlLmxvZyAnc2VuZCBzZXRTbGlkZSdcbiAgICAgICAgYnJlYWtcblxuICBpcGMub24gJ3ByZXNlbkRldkluaXRpYWxpemUnLCAoZSwgdGV4dCkgPT5cbiAgICAgIGNvbnNvbGUubG9nICdyZWNlaXZlIHByZXNlbkRldkluaXRpYWxpemUnXG4gICAgICBjb25zb2xlLmxvZyB0ZXh0XG4gICAgICBzbGlkZUhUTUwgPSB0ZXh0XG5cbiAgaXBjLm9uICdnb1RvUGFnZScsIChlLCBwYWdlKSA9PlxuICAgIGNvbnNvbGUubG9nIHBhZ2VcbiAgICB3ZWJ2aWV3LnNlbmQgJ2dvVG9QYWdlJywgcGFnZVxuXG5cbiAgIyBJbml0aWFsaXplXG4gIHByZXNlblN0YXRlcy5jb2RlTWlycm9yLmZvY3VzKClcbiAgcHJlc2VuU3RhdGVzLnJlZnJlc2hQYWdlKClcbiJdfQ==
