var CodeMirror, MdsMenu, MdsRenderer, MickrClient, PresenStates, clsMdsRenderer, createValidator, ipc, kanjiContinuousLen, loadingState, maxComma, maxTen, mixedPeriod, noAbusage, noDoubleNegativeJa, noDoubledConjunction, noDoubledConjunctiveParticleGa, noDoubledJoshi, noDroppingTheRa, noExclamationQuestionMark, noHankakuKana, noMixDearuDesumasu, noNfd, noStartDuplicatedConjunction, ref, shell, successiveWord, validator, weakPhrase, webFrame,
  bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  slice = [].slice;

ipc = require('electron').ipcRenderer;

ref = require('electron'), shell = ref.shell, webFrame = ref.webFrame;

MdsMenu = require('./js/classes/mds_menu');

clsMdsRenderer = require('./js/classes/mds_renderer');

createValidator = require('codemirror-textlint');

MdsRenderer = new clsMdsRenderer;

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
  setting = {
    "id": "index",
    "url": "ws://apps.wisdomweb.net:64260/ws/mik",
    "site": "test",
    "token": "Pad:9948"
  };
  client = new MickrClient(setting);
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJlc2VuSW5kZXguanMiLCJzb3VyY2VzIjpbInByZXNlbkluZGV4LmNvZmZlZSJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxJQUFBLHdiQUFBO0VBQUE7OztBQUFBLEdBQUEsR0FBTSxPQUFBLENBQVEsVUFBUixDQUFtQixDQUFDOztBQUMxQixNQUFvQixPQUFBLENBQVEsVUFBUixDQUFwQixFQUFDLGlCQUFELEVBQVE7O0FBQ1IsT0FBQSxHQUFvQixPQUFBLENBQVEsdUJBQVI7O0FBQ3BCLGNBQUEsR0FBb0IsT0FBQSxDQUFRLDJCQUFSOztBQUNwQixlQUFBLEdBQW9CLE9BQUEsQ0FBUSxxQkFBUjs7QUFDcEIsV0FBQSxHQUFvQixJQUFJOztBQUN4QixXQUFXLENBQUMsYUFBWixDQUFBOztBQUVBLFFBQVEsQ0FBQyxrQkFBVCxDQUE0QixDQUE1QixFQUErQixDQUEvQjs7QUFFQSxVQUFBLEdBQWEsT0FBQSxDQUFRLFlBQVI7O0FBQ2IsT0FBQSxDQUFRLHlCQUFSOztBQUNBLE9BQUEsQ0FBUSxtQ0FBUjs7QUFDQSxPQUFBLENBQVEseUJBQVI7O0FBQ0EsT0FBQSxDQUFRLG9DQUFSOztBQUNBLE9BQUEsQ0FBUSw0QkFBUjs7QUFDQSxXQUFBLEdBQWMsT0FBQSxDQUFRLHVCQUFSOztBQUVSO3lCQUNKLE1BQUEsR0FBUTs7eUJBQ1IsV0FBQSxHQUFhOzt5QkFDYixrQkFBQSxHQUFvQjs7eUJBQ3BCLFlBQUEsR0FBYzs7eUJBRWQsa0JBQUEsR0FBb0I7O3lCQUNwQixlQUFBLEdBQWlCOztFQUVKLHNCQUFDLFVBQUQsRUFBYyxPQUFkO0lBQUMsSUFBQyxDQUFBLGFBQUQ7SUFBYSxJQUFDLENBQUEsVUFBRDs7Ozs7Ozs7O0lBQ3pCLElBQUMsQ0FBQSxnQkFBRCxDQUFBO0lBQ0EsSUFBQyxDQUFBLGlCQUFELENBQUE7SUFFQSxJQUFDLENBQUEsSUFBRCxHQUFRLElBQUksT0FBSixDQUFZO01BQ2xCO1FBQUUsS0FBQSxFQUFPLE9BQVQ7UUFBa0IsV0FBQSxFQUFhLGFBQS9CO1FBQThDLEtBQUEsRUFBTyxDQUFBLFNBQUEsS0FBQTtpQkFBQSxTQUFDLENBQUQsRUFBSSxDQUFKO1lBQVUsSUFBa0MsQ0FBQSxJQUFNLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxNQUFyRDtxQkFBQSxLQUFDLENBQUEsVUFBVSxDQUFDLFdBQVosQ0FBd0IsTUFBeEIsRUFBQTs7VUFBVjtRQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBckQ7T0FEa0IsRUFFbEI7UUFDRSxLQUFBLEVBQU8sT0FEVDtRQUVFLFdBQUEsRUFBZ0IsQ0FBQSxTQUFBO1VBQUcsSUFBRyxPQUFPLENBQUMsUUFBUixLQUFvQixPQUF2QjttQkFBb0MsWUFBcEM7V0FBQSxNQUFBO21CQUFxRCxvQkFBckQ7O1FBQUgsQ0FBQSxDQUFILENBQUEsQ0FGZjtRQUdFLEtBQUEsRUFBTyxDQUFBLFNBQUEsS0FBQTtpQkFBQSxTQUFDLENBQUQsRUFBSSxDQUFKO1lBQVUsSUFBa0MsQ0FBQSxJQUFNLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxNQUFyRDtxQkFBQSxLQUFDLENBQUEsVUFBVSxDQUFDLFdBQVosQ0FBd0IsTUFBeEIsRUFBQTs7VUFBVjtRQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FIVDtPQUZrQixFQU9sQjtRQUFFLElBQUEsRUFBTSxXQUFSO09BUGtCLEVBUWxCO1FBQUUsS0FBQSxFQUFPLE1BQVQ7UUFBaUIsV0FBQSxFQUFhLGFBQTlCO1FBQTZDLElBQUEsRUFBTSxLQUFuRDtPQVJrQixFQVNsQjtRQUFFLEtBQUEsRUFBTyxPQUFUO1FBQWtCLFdBQUEsRUFBYSxhQUEvQjtRQUE4QyxJQUFBLEVBQU0sTUFBcEQ7T0FUa0IsRUFVbEI7UUFBRSxLQUFBLEVBQU8sUUFBVDtRQUFtQixXQUFBLEVBQWEsYUFBaEM7UUFBK0MsSUFBQSxFQUFNLE9BQXJEO09BVmtCLEVBV2xCO1FBQUUsS0FBQSxFQUFPLFNBQVQ7UUFBb0IsSUFBQSxFQUFNLFFBQTFCO09BWGtCLEVBWWxCO1FBQUUsS0FBQSxFQUFPLGFBQVQ7UUFBd0IsV0FBQSxFQUFhLGFBQXJDO1FBQW9ELEtBQUEsRUFBTyxDQUFBLFNBQUEsS0FBQTtpQkFBQSxTQUFDLENBQUQsRUFBSSxDQUFKO1lBQVUsSUFBdUMsQ0FBQSxJQUFNLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxNQUExRDtxQkFBQSxLQUFDLENBQUEsVUFBVSxDQUFDLFdBQVosQ0FBd0IsV0FBeEIsRUFBQTs7VUFBVjtRQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBM0Q7T0Faa0IsRUFhbEI7UUFBRSxJQUFBLEVBQU0sV0FBUjtRQUFxQixRQUFBLEVBQVUsUUFBL0I7T0Fia0IsRUFjbEI7UUFBRSxLQUFBLEVBQU8sVUFBVDtRQUFxQixJQUFBLEVBQU0sVUFBM0I7UUFBdUMsT0FBQSxFQUFTLEVBQWhEO1FBQW9ELFFBQUEsRUFBVSxRQUE5RDtPQWRrQjtLQUFaO0VBSkc7O3lCQXNCYixXQUFBLEdBQWEsU0FBQyxNQUFEO0FBRVgsUUFBQTtJQUFBLElBQW9CLGNBQXBCO01BQUEsSUFBQyxDQUFBLE1BQUQsR0FBVSxPQUFWOztJQUNBLElBQUEsR0FBVTtJQU1WLFVBQUEsR0FBYSxJQUFDLENBQUEsVUFBVSxDQUFDLFNBQVosQ0FBQSxDQUF1QixDQUFDLElBQXhCLElBQWdDO0FBQzdDO0FBQUEsU0FBQSxzQ0FBQTs7TUFDRSxJQUFVLFNBQUEsSUFBYSxVQUF2QjtRQUFBLElBQUEsR0FBQTs7QUFERjtJQUlBLElBQUcsSUFBQyxDQUFBLFdBQUQsS0FBZ0IsSUFBbkI7TUFDRSxJQUFDLENBQUEsV0FBRCxHQUFlO01BQ2YsSUFBNkMsSUFBQyxDQUFBLGtCQUE5QztRQUFBLElBQUMsQ0FBQSxPQUFPLENBQUMsSUFBVCxDQUFjLGFBQWQsRUFBNkIsSUFBQyxDQUFBLFdBQTlCLEVBQUE7T0FGRjs7V0FJQSxDQUFBLENBQUUsaUJBQUYsQ0FBb0IsQ0FBQyxJQUFyQixDQUEwQixPQUFBLEdBQVEsSUFBQyxDQUFBLFdBQVQsR0FBcUIsS0FBckIsR0FBeUIsQ0FBQyxJQUFDLENBQUEsTUFBTSxDQUFDLE1BQVIsR0FBaUIsQ0FBbEIsQ0FBbkQ7RUFsQlc7O3lCQW9CYixpQkFBQSxHQUFtQixTQUFBO1dBQ2pCLENBQUEsQ0FBRSxJQUFDLENBQUEsT0FBSCxDQUNFLENBQUMsRUFESCxDQUNNLFdBRE4sRUFDbUIsQ0FBQSxTQUFBLEtBQUE7YUFBQSxTQUFBO2VBR2YsQ0FBQSxDQUFFLEtBQUMsQ0FBQSxPQUFPLENBQUMsVUFBWCxDQUFzQixDQUFDLE1BQXZCLENBQThCLGtEQUE5QjtNQUhlO0lBQUEsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQURuQixDQU9FLENBQUMsRUFQSCxDQU9NLGFBUE4sRUFPcUIsQ0FBQSxTQUFBLEtBQUE7YUFBQSxTQUFDLEVBQUQ7QUFDakIsWUFBQTtRQUFBLENBQUEsR0FBSSxFQUFFLENBQUM7QUFFUCxnQkFBTyxDQUFDLENBQUMsT0FBVDtBQUFBLGVBQ08sY0FEUDttQkFFSSxLQUFDLENBQUEsV0FBRCxDQUFhLENBQUMsQ0FBQyxJQUFLLENBQUEsQ0FBQSxDQUFwQjtBQUZKLGVBR08sUUFIUDttQkFJSSxLQUFDLENBQUEsUUFBRCxDQUFVLENBQUMsQ0FBQyxJQUFLLENBQUEsQ0FBQSxDQUFqQjtBQUpKLGVBS08sVUFMUDtZQU1JLEtBQUMsQ0FBQSxZQUFELEdBQWdCLENBQUMsQ0FBQyxJQUFLLENBQUEsQ0FBQTtZQUN2QixJQUFBLENBQU8sS0FBQyxDQUFBLGtCQUFSO2NBQ0UsV0FBVyxDQUFDLFVBQVosQ0FBdUIsb0JBQXZCO2NBRUEsS0FBQyxDQUFBLGtCQUFELEdBQXNCO3FCQUN0QixDQUFBLENBQUUsTUFBRixDQUFTLENBQUMsUUFBVixDQUFtQixtQkFBbkIsRUFKRjs7QUFGRztBQUxQO21CQWFJLFdBQVcsQ0FBQyxXQUFaLG9CQUF3QixDQUFBLENBQUMsQ0FBQyxPQUFTLFNBQUEsV0FBQSxDQUFDLENBQUMsSUFBRixDQUFBLENBQW5DO0FBYko7TUFIaUI7SUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBUHJCLENBeUJFLENBQUMsRUF6QkgsQ0F5Qk0sWUF6Qk4sRUF5Qm9CLENBQUEsU0FBQSxLQUFBO2FBQUEsU0FBQyxDQUFEO1FBQ2hCLENBQUMsQ0FBQyxjQUFGLENBQUE7ZUFDQSxLQUFDLENBQUEsUUFBRCxDQUFVLENBQUMsQ0FBQyxhQUFhLENBQUMsR0FBMUI7TUFGZ0I7SUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBekJwQixDQTZCRSxDQUFDLEVBN0JILENBNkJNLGlCQTdCTixFQTZCeUIsQ0FBQSxTQUFBLEtBQUE7YUFBQSxTQUFDLENBQUQ7UUFDckIsS0FBQyxDQUFBLE9BQU8sQ0FBQyxJQUFULENBQWMsYUFBZCxFQUE2QixDQUE3QjtRQUNBLEtBQUMsQ0FBQSxPQUFPLENBQUMsSUFBVCxDQUFjLG1CQUFkLEVBQW1DLEtBQUMsQ0FBQSxlQUFwQztlQUNBLEtBQUMsQ0FBQSxPQUFPLENBQUMsSUFBVCxDQUFjLFFBQWQsRUFBd0IsS0FBQyxDQUFBLFVBQVUsQ0FBQyxRQUFaLENBQUEsQ0FBeEI7TUFIcUI7SUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBN0J6QjtFQURpQjs7eUJBbUNuQixRQUFBLEdBQVUsU0FBQyxJQUFEO0lBQ1IsSUFBMkIsZ0JBQWdCLENBQUMsSUFBakIsQ0FBc0IsSUFBdEIsQ0FBM0I7YUFBQSxLQUFLLENBQUMsWUFBTixDQUFtQixJQUFuQixFQUFBOztFQURROzt5QkFHVixnQkFBQSxHQUFrQixTQUFBO0lBQ2hCLElBQUMsQ0FBQSxVQUFVLENBQUMsRUFBWixDQUFlLGFBQWYsRUFBOEIsQ0FBQSxTQUFBLEtBQUE7YUFBQSxTQUFDLEVBQUQsRUFBSyxDQUFMO1FBQzVCLENBQUMsQ0FBQyxjQUFGLENBQUE7UUFDQSxLQUFDLENBQUEsVUFBVSxDQUFDLEtBQVosQ0FBQTtRQUNBLEtBQUMsQ0FBQSxJQUFJLENBQUMsS0FBTixDQUFBO2VBQ0E7TUFKNEI7SUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBQTlCO0lBTUEsSUFBQyxDQUFBLFVBQVUsQ0FBQyxFQUFaLENBQWUsUUFBZixFQUF5QixDQUFBLFNBQUEsS0FBQTthQUFBLFNBQUMsRUFBRCxFQUFLLEdBQUw7UUFDdkIsS0FBQyxDQUFBLE9BQU8sQ0FBQyxJQUFULENBQWMsUUFBZCxFQUF3QixFQUFFLENBQUMsUUFBSCxDQUFBLENBQXhCO1FBQ0EsSUFBbUQsQ0FBQyxLQUFDLENBQUEsa0JBQXJEO2lCQUFBLFdBQVcsQ0FBQyxVQUFaLENBQXVCLGtCQUF2QixFQUEyQyxJQUEzQyxFQUFBOztNQUZ1QjtJQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBekI7SUFJQSxJQUFDLENBQUEsVUFBVSxDQUFDLEVBQVosQ0FBZSxnQkFBZixFQUFpQyxDQUFBLFNBQUEsS0FBQTthQUFBLFNBQUMsRUFBRDtlQUFRLE1BQU0sQ0FBQyxVQUFQLENBQWtCLENBQUMsU0FBQTtpQkFBRyxLQUFDLENBQUEsV0FBRCxDQUFBO1FBQUgsQ0FBRCxDQUFsQixFQUF1QyxDQUF2QztNQUFSO0lBQUEsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQUFqQztXQUVBLENBQUEsQ0FBRSxnQkFBRixDQUFtQixDQUFDLE1BQXBCLENBQUE7RUFiZ0I7O3lCQWVsQixpQkFBQSxHQUFtQixTQUFDLFNBQUQ7SUFDakIsSUFBRyxJQUFDLENBQUEsa0JBQUo7TUFDRSxJQUFDLENBQUEsT0FBTyxDQUFDLElBQVQsQ0FBYyxtQkFBZCxFQUFtQyxTQUFuQzthQUNBLElBQUMsQ0FBQSxPQUFPLENBQUMsSUFBVCxDQUFjLFFBQWQsRUFBd0IsSUFBQyxDQUFBLFVBQVUsQ0FBQyxRQUFaLENBQUEsQ0FBeEIsRUFGRjtLQUFBLE1BQUE7YUFJRSxJQUFDLENBQUEsZUFBRCxHQUFtQixVQUpyQjs7RUFEaUI7O3lCQU9uQixXQUFBLEdBQWEsU0FBQyxRQUFEO1dBQWMsSUFBQyxDQUFBLFVBQVUsQ0FBQyxnQkFBWixDQUE2QixNQUFBLEdBQU0sQ0FBQyxRQUFRLENBQUMsT0FBVCxDQUFpQixJQUFqQixFQUF1QixLQUF2QixDQUFELENBQU4sR0FBcUMsS0FBbEU7RUFBZDs7eUJBR2IsV0FBQSxHQUFhLFNBQUMsUUFBRDtXQUNYLE9BQU8sQ0FBQyxHQUFSLENBQVksUUFBWjtFQURXOzt5QkFLYixtQkFBQSxHQUFxQixTQUFDLElBQUQsRUFBTyxLQUFQO0FBQ25CLFFBQUE7SUFBQSxTQUFBLEdBQVk7QUFFWjtBQUFBLFNBQUEsc0NBQUE7O01BQ0UsSUFBbUIsR0FBRyxDQUFDLFFBQUosS0FBZ0IsSUFBbkM7UUFBQSxTQUFBLEdBQVksSUFBWjs7QUFERjtJQUdBLElBQUcsaUJBQUg7YUFDRSxJQUFDLENBQUEsVUFBVSxDQUFDLFlBQVosQ0FDSyxJQUFELEdBQU0sSUFBTixHQUFVLEtBRGQsRUFFRSxVQUFVLENBQUMsR0FBWCxDQUFlLFNBQVMsQ0FBQyxPQUF6QixFQUFrQyxTQUFTLENBQUMsSUFBNUMsQ0FGRixFQUdFLFVBQVUsQ0FBQyxHQUFYLENBQWUsU0FBUyxDQUFDLE9BQXpCLEVBQWtDLFNBQVMsQ0FBQyxJQUFWLEdBQWlCLFNBQVMsQ0FBQyxNQUE3RCxDQUhGLEVBREY7S0FBQSxNQUFBO2FBT0UsSUFBQyxDQUFBLFVBQVUsQ0FBQyxZQUFaLENBQ0UsT0FBQSxHQUFRLElBQVIsR0FBYSxJQUFiLEdBQWlCLEtBQWpCLEdBQXVCLFVBRHpCLEVBRUUsVUFBVSxDQUFDLEdBQVgsQ0FBZSxJQUFDLENBQUEsVUFBVSxDQUFDLFNBQVosQ0FBQSxDQUFmLEVBQXdDLENBQXhDLENBRkYsRUFQRjs7RUFObUI7Ozs7OztBQWtCdkIsWUFBQSxHQUFlOztBQU1mLFNBQUEsR0FBWSxPQUFBLENBQVEsNkJBQVI7O0FBQ1osV0FBQSxHQUFjLE9BQUEsQ0FBUSxrQ0FBUjs7QUFDZCxjQUFBLEdBQWlCLE9BQUEsQ0FBUSxxQ0FBUjs7QUFDakIsVUFBQSxHQUFhLE9BQUEsQ0FBUSxpQ0FBUjs7QUFDYixRQUFBLEdBQVcsT0FBQSxDQUFRLHlCQUFSOztBQUNYLGtCQUFBLEdBQXFCLE9BQUEsQ0FBUSx3Q0FBUjs7QUFDckIsTUFBQSxHQUFTLE9BQUEsQ0FBUSx1QkFBUjs7QUFDVCxrQkFBQSxHQUFxQixPQUFBLENBQVEscUNBQVI7O0FBQ3JCLG9CQUFBLEdBQXVCLE9BQUEsQ0FBUSxzQ0FBUjs7QUFDdkIsOEJBQUEsR0FBaUMsT0FBQSxDQUFRLGtEQUFSOztBQUNqQyxjQUFBLEdBQWlCLE9BQUEsQ0FBUSxnQ0FBUjs7QUFDakIsZUFBQSxHQUFrQixPQUFBLENBQVEsa0NBQVI7O0FBQ2xCLHlCQUFBLEdBQTRCLE9BQUEsQ0FBUSw0Q0FBUjs7QUFDNUIsYUFBQSxHQUFnQixPQUFBLENBQVEsK0JBQVI7O0FBQ2hCLGtCQUFBLEdBQXFCLE9BQUEsQ0FBUSxxQ0FBUjs7QUFDckIsS0FBQSxHQUFRLE9BQUEsQ0FBUSxzQkFBUjs7QUFDUiw0QkFBQSxHQUErQixPQUFBLENBQVEsK0NBQVI7O0FBRS9CLFNBQUEsR0FBWSxlQUFBLENBQWdCO0VBQzFCLEtBQUEsRUFBTztJQUNMLFdBQUEsRUFBYyxTQURUO0lBRUwsYUFBQSxFQUFnQixXQUZYO0lBR0wsZ0JBQUEsRUFBbUIsY0FIZDtJQUlMLFlBQUEsRUFBZSxVQUpWO0lBS0wsVUFBQSxFQUFhLFFBTFI7SUFNTCxvQkFBQSxFQUF1QixrQkFObEI7SUFPTCxRQUFBLEVBQVcsTUFQTjtJQVFMLHFCQUFBLEVBQXdCLGtCQVJuQjtJQVNMLHNCQUFBLEVBQXlCLG9CQVRwQjtJQVVMLGdDQUFBLEVBQW1DLDhCQVY5QjtJQVdMLGdCQUFBLEVBQW1CLGNBWGQ7SUFZTCxpQkFBQSxFQUFvQixlQVpmO0lBYUwsMkJBQUEsRUFBOEIseUJBYnpCO0lBY0wsZUFBQSxFQUFrQixhQWRiO0lBZUwsb0JBQUEsRUFBdUIsa0JBZmxCO0lBZ0JMLE9BQUEsRUFBVSxLQWhCTDtJQWlCTCw4QkFBQSxFQUFpQyw0QkFqQjVCO0dBRG1CO0NBQWhCOztBQXNCVCxDQUFBLFNBQUE7QUFDRCxNQUFBO0VBQUEsU0FBQSxHQUFZO0VBQ1osWUFBQSxHQUFlLElBQUksWUFBSixDQUNiLFVBQVUsQ0FBQyxZQUFYLENBQXdCLENBQUEsQ0FBRSxTQUFGLENBQWEsQ0FBQSxDQUFBLENBQXJDLEVBRUU7SUFBQSxJQUFBLEVBQU0sS0FBTjtJQUVBLFlBQUEsRUFBYyxJQUZkO0lBR0EsV0FBQSxFQUFhLElBSGI7SUFJQSxRQUFBLEVBQVUsS0FKVjtJQUtBLE9BQUEsRUFBUyxDQUFDLHlCQUFELENBTFQ7SUFNQSxJQUFBLEVBQU07TUFDSCxnQkFBQSxFQUFrQixTQURmO01BRUgsT0FBQSxFQUFTLElBRk47S0FOTjtJQVVBLFNBQUEsRUFDRTtNQUFBLEtBQUEsRUFBTyxzQ0FBUDtLQVhGO0dBRkYsQ0FEYSxFQWdCYixDQUFBLENBQUUsVUFBRixDQUFjLENBQUEsQ0FBQSxDQWhCRDtFQW1CZixPQUFBLEdBQ0U7SUFBQSxJQUFBLEVBQU0sT0FBTjtJQUNBLEtBQUEsRUFBTyxzQ0FEUDtJQUVBLE1BQUEsRUFBUSxNQUZSO0lBR0EsT0FBQSxFQUFTLFVBSFQ7O0VBSUYsTUFBQSxHQUFTLElBQUksV0FBSixDQUFnQixPQUFoQjtFQUdULGdCQUFBLEdBQXdCO0VBQ3hCLHFCQUFBLEdBQXdCO0VBRXhCLFdBQUEsR0FBYyxTQUFDLFVBQUQ7SUFDWixVQUFBLEdBQWEsSUFBSSxDQUFDLEdBQUwsQ0FBUyxHQUFULEVBQWMsSUFBSSxDQUFDLEdBQUwsQ0FBUyxHQUFULEVBQWMsVUFBQSxDQUFXLFVBQVgsQ0FBZCxDQUFkO0lBRWIsQ0FBQSxDQUFFLGdCQUFGLENBQW1CLENBQUMsR0FBcEIsQ0FBd0IsV0FBeEIsRUFBcUMsVUFBQSxHQUFhLEdBQWxEO0lBQ0EsQ0FBQSxDQUFFLGVBQUYsQ0FBa0IsQ0FBQyxHQUFuQixDQUF1QixXQUF2QixFQUFvQyxDQUFDLENBQUEsR0FBSSxVQUFMLENBQUEsR0FBbUIsR0FBdkQ7QUFFQSxXQUFPO0VBTks7RUFRZCxlQUFBLEdBQWtCLFNBQUMsWUFBRDtBQUNoQixRQUFBO0lBQUEsTUFBQSxHQUFTLENBQUEsZ0RBQXlCLENBQUUsaUJBQXpCLENBQUEsVUFBRjtJQUNULElBQXNELGNBQXREO01BQUEsTUFBTSxDQUFDLEdBQVAsQ0FBVyxhQUFYLEVBQTBCLFlBQVksQ0FBQyxVQUF2QyxFQUFBOztJQUNBLElBQWtELGNBQWxEO2FBQUEsTUFBTSxDQUFDLEdBQVAsQ0FBVyxXQUFYLEVBQXdCLFlBQVksQ0FBQyxRQUFyQyxFQUFBOztFQUhnQjtFQUtsQixDQUFBLENBQUUsZ0JBQUYsQ0FDRSxDQUFDLFNBREgsQ0FDYSxTQUFBO0lBQ1QsZ0JBQUEsR0FBbUI7V0FDbkIscUJBQUEsR0FBd0I7RUFGZixDQURiLENBS0UsQ0FBQyxRQUxILENBS1ksU0FBQTtXQUNSLFdBQVcsQ0FBQyxVQUFaLENBQXVCLFdBQXZCLEVBQW9DLGtCQUFwQyxFQUF3RCxXQUFBLENBQVksR0FBWixDQUF4RDtFQURRLENBTFo7RUFRQSxNQUFNLENBQUMsZ0JBQVAsQ0FBd0IsV0FBeEIsRUFBcUMsU0FBQyxDQUFEO0lBQ25DLElBQUcsZ0JBQUg7YUFDRSxxQkFBQSxHQUF3QixXQUFBLENBQVksSUFBSSxDQUFDLEdBQUwsQ0FBUyxJQUFJLENBQUMsR0FBTCxDQUFTLENBQVQsRUFBWSxDQUFDLENBQUMsT0FBZCxDQUFULEVBQWlDLFFBQVEsQ0FBQyxJQUFJLENBQUMsV0FBL0MsQ0FBQSxHQUE4RCxRQUFRLENBQUMsSUFBSSxDQUFDLFdBQXhGLEVBRDFCOztFQURtQyxDQUFyQyxFQUdFLEtBSEY7RUFLQSxNQUFNLENBQUMsZ0JBQVAsQ0FBd0IsU0FBeEIsRUFBbUMsU0FBQyxDQUFEO0lBQ2pDLGdCQUFBLEdBQW1CO0lBQ25CLElBQWlGLDZCQUFqRjthQUFBLFdBQVcsQ0FBQyxVQUFaLENBQXVCLFdBQXZCLEVBQW9DLGtCQUFwQyxFQUF3RCxxQkFBeEQsRUFBQTs7RUFGaUMsQ0FBbkMsRUFHRSxLQUhGO0VBS0EsZUFBQSxHQUFrQjtFQUdsQixXQUNFLENBQUMsRUFESCxDQUNNLFlBRE4sRUFDb0IsU0FBQyxLQUFEO0lBQ2hCLFlBQVksQ0FBQyxVQUFVLENBQUMsYUFBeEIsQ0FBQSxDQUF1QyxDQUFDLElBQXhDLENBQUE7SUFDQSxDQUFBLENBQUUsTUFBRixDQUFTLENBQUMsUUFBVixDQUFtQixlQUFuQjtXQUVBLFlBQVksQ0FBQyxPQUFPLENBQUMsSUFBckIsQ0FBMEIsbUJBQTFCLEVBQStDO01BQUUsUUFBQSxFQUFVLEtBQVo7S0FBL0M7RUFKZ0IsQ0FEcEIsQ0FPRSxDQUFDLEVBUEgsQ0FPTSxvQkFQTixFQU80QixTQUFDLElBQUQ7QUFFeEIsUUFBQTtJQUFBLFlBQUEsR0FBZSxTQUFBO01BQ2IsSUFBRyxZQUFBLEtBQWdCLFNBQW5CO2VBQ0UsVUFBQSxDQUFXLFlBQVgsRUFBeUIsR0FBekIsRUFERjtPQUFBLE1BQUE7ZUFHRSxZQUFZLENBQUMsT0FBTyxDQUFDLFVBQXJCLENBQ0U7VUFBQSxXQUFBLEVBQWEsQ0FBYjtVQUNBLFFBQUEsRUFBVSxJQUFJLENBQUMsVUFEZjtVQUVBLGVBQUEsRUFBaUIsSUFGakI7U0FERixFQUlFLFNBQUMsR0FBRCxFQUFNLElBQU47VUFDQSxJQUFBLENBQU8sR0FBUDttQkFDRSxXQUFXLENBQUMsVUFBWixDQUF1QixXQUF2QixFQUFvQyxJQUFJLENBQUMsUUFBekMsRUFBbUQsSUFBbkQsRUFBeUQ7Y0FBRSxTQUFBLEVBQVcsVUFBYjthQUF6RCxFQURGO1dBQUEsTUFBQTttQkFHRSxXQUFXLENBQUMsVUFBWixDQUF1QixVQUF2QixFQUhGOztRQURBLENBSkYsRUFIRjs7SUFEYTtXQWNmLFVBQUEsQ0FBVyxZQUFYLEVBQXlCLEdBQXpCO0VBaEJ3QixDQVA1QixDQXlCRSxDQUFDLEVBekJILENBeUJNLFdBekJOLEVBeUJtQixTQUFBO0lBQ2YsWUFBWSxDQUFDLE9BQU8sQ0FBQyxJQUFyQixDQUEwQixVQUExQjtXQUNBLENBQUEsQ0FBRSxNQUFGLENBQVMsQ0FBQyxXQUFWLENBQXNCLGVBQXRCO0VBRmUsQ0F6Qm5CLENBNkJFLENBQUMsRUE3QkgsQ0E2Qk0sVUE3Qk4sRUE2QmtCLFNBQUMsTUFBRDtJQUNkLFlBQVksQ0FBQyxrQkFBYixHQUFrQztJQUNsQyxZQUFZLENBQUMsVUFBVSxDQUFDLFFBQXhCLENBQWlDLE1BQWpDO0lBQ0EsWUFBWSxDQUFDLFVBQVUsQ0FBQyxZQUF4QixDQUFBO1dBQ0EsWUFBWSxDQUFDLGtCQUFiLEdBQWtDO0VBSnBCLENBN0JsQixDQW1DRSxDQUFDLEVBbkNILENBbUNNLG1CQW5DTixFQW1DMkIsU0FBQyxXQUFEO1dBQWlCLFlBQVksQ0FBQyxpQkFBYixDQUErQixXQUEvQjtFQUFqQixDQW5DM0IsQ0FzQ0UsQ0FBQyxFQXRDSCxDQXNDTSxNQXRDTixFQXNDYyxTQUFDLEtBQUQsRUFBUSxRQUFSOztNQUFRLFdBQVc7O0lBQzdCLFdBQVcsQ0FBQyxVQUFaLENBQXVCLFdBQXZCLEVBQW9DLEtBQXBDLEVBQTJDLFlBQVksQ0FBQyxVQUFVLENBQUMsUUFBeEIsQ0FBQSxDQUEzQyxFQUErRSxRQUEvRTtXQUNBLFdBQVcsQ0FBQyxVQUFaLENBQXVCLGlCQUF2QixFQUEwQyxLQUExQztFQUZVLENBdENkLENBMENFLENBQUMsRUExQ0gsQ0EwQ00sVUExQ04sRUEwQ2tCLFNBQUMsSUFBRDtBQUNkLFlBQU8sSUFBUDtBQUFBLFdBQ08sVUFEUDtRQUVJLFlBQVksQ0FBQyxPQUFPLENBQUMsSUFBckIsQ0FBMEIsVUFBMUIsRUFBc0MsRUFBdEM7QUFERztBQURQLFdBR08sUUFIUDtRQUlJLFlBQVksQ0FBQyxPQUFPLENBQUMsSUFBckIsQ0FBMEIsVUFBMUIsRUFBc0MsbUJBQXRDO0FBREc7QUFIUCxXQUtPLE1BTFA7UUFNSSxZQUFZLENBQUMsT0FBTyxDQUFDLElBQXJCLENBQTBCLFVBQTFCLEVBQXNDLGlCQUF0QztBQURHO0FBTFAsV0FPTyxZQVBQO1FBUUksWUFBWSxDQUFDLE9BQU8sQ0FBQyxJQUFyQixDQUEwQixVQUExQixFQUFzQyx1QkFBdEM7QUFSSjtJQVVBLENBQUEsQ0FBRSxnQkFBRixDQUFtQixDQUFDLFdBQXBCLENBQWdDLFVBQWhDO1dBQ0EsQ0FBQSxDQUFFLDhCQUFGLENBQWlDLENBQUMsV0FBbEMsQ0FBOEMsUUFBOUMsQ0FDRSxDQUFDLE1BREgsQ0FDVSxrQkFBQSxHQUFtQixJQUFuQixHQUF3QixJQURsQyxDQUNzQyxDQUFDLFFBRHZDLENBQ2dELFFBRGhEO0VBWmMsQ0ExQ2xCLENBeURFLENBQUMsRUF6REgsQ0F5RE0sYUF6RE4sRUF5RHFCLFNBQUMsT0FBRDtXQUFhLFlBQVksQ0FBQyxVQUFVLENBQUMsV0FBeEIsQ0FBb0MsT0FBcEM7RUFBYixDQXpEckIsQ0EyREUsQ0FBQyxFQTNESCxDQTJETSxhQTNETixFQTJEcUIsU0FBQTtJQUNqQixJQUFHLFlBQVksQ0FBQyxPQUFPLENBQUMsZ0JBQXJCLENBQUEsQ0FBSDthQUNFLFlBQVksQ0FBQyxPQUFPLENBQUMsYUFBckIsQ0FBQSxFQURGO0tBQUEsTUFBQTthQUdFLFlBQVksQ0FBQyxPQUFPLENBQUMsWUFBckIsQ0FBQSxFQUhGOztFQURpQixDQTNEckIsQ0FpRUUsQ0FBQyxFQWpFSCxDQWlFTSxpQkFqRU4sRUFpRXlCLFNBQUMsWUFBRDtXQUFrQixlQUFBLENBQWdCLFlBQWhCO0VBQWxCLENBakV6QixDQWtFRSxDQUFDLEVBbEVILENBa0VNLGFBbEVOLEVBa0VxQixTQUFDLFdBQUQ7V0FBaUIsV0FBQSxDQUFZLFdBQVo7RUFBakIsQ0FsRXJCLENBbUVFLENBQUMsRUFuRUgsQ0FtRU0sVUFuRU4sRUFtRWtCLFNBQUMsS0FBRDtXQUFXLFlBQVksQ0FBQyxtQkFBYixDQUFpQyxRQUFqQyxFQUEyQyxLQUEzQztFQUFYLENBbkVsQixDQW9FRSxDQUFDLEVBcEVILENBb0VNLGNBcEVOLEVBb0VzQixTQUFDLEtBQUQ7V0FBVyxXQUFXLENBQUMsVUFBWixDQUF1QixjQUF2QixFQUF1QyxLQUF2QztFQUFYLENBcEV0QixDQXFFRSxDQUFDLEVBckVILENBcUVNLGVBckVOLEVBcUV1QixTQUFDLEtBQUQ7V0FBVyxZQUFBLEdBQWU7RUFBMUIsQ0FyRXZCO0VBdUVBLE9BQUEsR0FBVSxRQUFRLENBQUMsYUFBVCxDQUF1QixVQUF2QjtFQUVWLE9BQU8sQ0FBQyxnQkFBUixDQUF5QixhQUF6QixFQUF3QyxDQUFBLFNBQUEsS0FBQTtXQUFBLFNBQUMsS0FBRDtBQUNyQyxVQUFBO0FBQUEsY0FBTyxLQUFLLENBQUMsT0FBYjtBQUFBLGFBQ08sZUFEUDtVQUVHLFNBQUEsR0FBWSxLQUFLLENBQUMsSUFBSyxDQUFBLENBQUE7VUFDdkIsT0FBTyxDQUFDLEdBQVIsQ0FBWSx1QkFBWjtVQUNBLE9BQU8sQ0FBQyxHQUFSLENBQVksU0FBWjtVQUNBLEdBQUcsQ0FBQyxJQUFKLENBQVMsVUFBVCxFQUFxQixTQUFyQjtVQUNBLE9BQU8sQ0FBQyxHQUFSLENBQVksZUFBWjtBQUNBO0FBUEgsYUFTTyxrQkFUUDtVQVVHLE9BQU8sQ0FBQyxJQUFSLENBQWEsVUFBYixFQUF5QixTQUF6QjtVQUNBLE9BQU8sQ0FBQyxHQUFSLENBQVksZUFBWjtBQUNBO0FBWkg7SUFEcUM7RUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBQXhDO0VBZUEsR0FBRyxDQUFDLEVBQUosQ0FBTyxxQkFBUCxFQUE4QixDQUFBLFNBQUEsS0FBQTtXQUFBLFNBQUMsQ0FBRCxFQUFJLElBQUo7TUFDMUIsT0FBTyxDQUFDLEdBQVIsQ0FBWSw2QkFBWjtNQUNBLE9BQU8sQ0FBQyxHQUFSLENBQVksSUFBWjthQUNBLFNBQUEsR0FBWTtJQUhjO0VBQUEsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQUE5QjtFQUtBLEdBQUcsQ0FBQyxFQUFKLENBQU8sVUFBUCxFQUFtQixDQUFBLFNBQUEsS0FBQTtXQUFBLFNBQUMsQ0FBRCxFQUFJLElBQUo7TUFDakIsT0FBTyxDQUFDLEdBQVIsQ0FBWSxJQUFaO2FBQ0EsT0FBTyxDQUFDLElBQVIsQ0FBYSxVQUFiLEVBQXlCLElBQXpCO0lBRmlCO0VBQUEsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQUFuQjtFQU1BLFlBQVksQ0FBQyxVQUFVLENBQUMsS0FBeEIsQ0FBQTtTQUNBLFlBQVksQ0FBQyxXQUFiLENBQUE7QUF0S0MsQ0FBQSxDQUFILENBQUEiLCJzb3VyY2VzQ29udGVudCI6WyJpcGMgPSByZXF1aXJlKCdlbGVjdHJvbicpLmlwY1JlbmRlcmVyXG57c2hlbGwsIHdlYkZyYW1lfSA9IHJlcXVpcmUgJ2VsZWN0cm9uJ1xuTWRzTWVudSAgICAgICAgICAgPSByZXF1aXJlICcuL2pzL2NsYXNzZXMvbWRzX21lbnUnXG5jbHNNZHNSZW5kZXJlciAgICA9IHJlcXVpcmUgJy4vanMvY2xhc3Nlcy9tZHNfcmVuZGVyZXInXG5jcmVhdGVWYWxpZGF0b3IgICA9IHJlcXVpcmUgJ2NvZGVtaXJyb3ItdGV4dGxpbnQnXG5NZHNSZW5kZXJlciAgICAgICA9IG5ldyBjbHNNZHNSZW5kZXJlclxuTWRzUmVuZGVyZXIucmVxdWVzdEFjY2VwdCgpXG5cbndlYkZyYW1lLnNldFpvb21MZXZlbExpbWl0cygxLCAxKVxuXG5Db2RlTWlycm9yID0gcmVxdWlyZSAnY29kZW1pcnJvcidcbnJlcXVpcmUgJ2NvZGVtaXJyb3IvbW9kZS94bWwveG1sJ1xucmVxdWlyZSAnY29kZW1pcnJvci9tb2RlL21hcmtkb3duL21hcmtkb3duJ1xucmVxdWlyZSAnY29kZW1pcnJvci9tb2RlL2dmbS9nZm0nXG5yZXF1aXJlICdjb2RlbWlycm9yL2FkZG9uL2VkaXQvY29udGludWVsaXN0J1xucmVxdWlyZSBcImNvZGVtaXJyb3IvYWRkb24vbGludC9saW50XCJcbk1pY2tyQ2xpZW50ID0gcmVxdWlyZSAnLi9tb2R1bGVzL01pY2tyQ2xpZW50J1xuXG5jbGFzcyBQcmVzZW5TdGF0ZXNcbiAgcnVsZXJzOiBbXVxuICBjdXJyZW50UGFnZTogbnVsbFxuICBwcmV2aWV3SW5pdGlhbGl6ZWQ6IGZhbHNlXG4gIGxhc3RSZW5kZXJlZDoge31cblxuICBfbG9ja0NoYW5nZWRTdGF0dXM6IGZhbHNlXG4gIF9pbWFnZURpcmVjdG9yeTogbnVsbFxuXG4gIGNvbnN0cnVjdG9yOiAoQGNvZGVNaXJyb3IsIEBwcmV2aWV3KSAtPlxuICAgIEBpbml0aWFsaXplRWRpdG9yKClcbiAgICBAaW5pdGlhbGl6ZVByZXZpZXcoKVxuXG4gICAgQG1lbnUgPSBuZXcgTWRzTWVudSBbXG4gICAgICB7IGxhYmVsOiAnJlVuZG8nLCBhY2NlbGVyYXRvcjogJ0NtZE9yQ3RybCtaJywgY2xpY2s6IChpLCB3KSA9PiBAY29kZU1pcnJvci5leGVjQ29tbWFuZCAndW5kbycgaWYgdyBhbmQgIXcubWRzV2luZG93LmZyZWV6ZSB9XG4gICAgICB7XG4gICAgICAgIGxhYmVsOiAnJlJlZG8nXG4gICAgICAgIGFjY2VsZXJhdG9yOiBkbyAtPiBpZiBwcm9jZXNzLnBsYXRmb3JtIGlzICd3aW4zMicgdGhlbiAnQ29udHJvbCtZJyBlbHNlICdTaGlmdCtDbWRPckN0cmwrWidcbiAgICAgICAgY2xpY2s6IChpLCB3KSA9PiBAY29kZU1pcnJvci5leGVjQ29tbWFuZCAncmVkbycgaWYgdyBhbmQgIXcubWRzV2luZG93LmZyZWV6ZVxuICAgICAgfVxuICAgICAgeyB0eXBlOiAnc2VwYXJhdG9yJyB9XG4gICAgICB7IGxhYmVsOiAnQ3UmdCcsIGFjY2VsZXJhdG9yOiAnQ21kT3JDdHJsK1gnLCByb2xlOiAnY3V0JyB9XG4gICAgICB7IGxhYmVsOiAnJkNvcHknLCBhY2NlbGVyYXRvcjogJ0NtZE9yQ3RybCtDJywgcm9sZTogJ2NvcHknIH1cbiAgICAgIHsgbGFiZWw6ICcmUGFzdGUnLCBhY2NlbGVyYXRvcjogJ0NtZE9yQ3RybCtWJywgcm9sZTogJ3Bhc3RlJyB9XG4gICAgICB7IGxhYmVsOiAnJkRlbGV0ZScsIHJvbGU6ICdkZWxldGUnIH1cbiAgICAgIHsgbGFiZWw6ICdTZWxlY3QgJkFsbCcsIGFjY2VsZXJhdG9yOiAnQ21kT3JDdHJsK0EnLCBjbGljazogKGksIHcpID0+IEBjb2RlTWlycm9yLmV4ZWNDb21tYW5kICdzZWxlY3RBbGwnIGlmIHcgYW5kICF3Lm1kc1dpbmRvdy5mcmVlemUgfVxuICAgICAgeyB0eXBlOiAnc2VwYXJhdG9yJywgcGxhdGZvcm06ICdkYXJ3aW4nIH1cbiAgICAgIHsgbGFiZWw6ICdTZXJ2aWNlcycsIHJvbGU6ICdzZXJ2aWNlcycsIHN1Ym1lbnU6IFtdLCBwbGF0Zm9ybTogJ2RhcndpbicgfVxuICAgIF1cblxuICAjIOODmuODvOOCuOOCq+OCpuODs+ODiOW+jOOAgXdlYnZpZXfjgbjjgZ3jgozjgpLpgIHkv6FcbiAgcmVmcmVzaFBhZ2U6IChydWxlcnMpID0+XG4gICAgIyBwcmVzZW5TdGF0ZXPjgq/jg6njgrnjga7lpInmlbBydWxlcnPjg6rjgrnjg4jjgbjlhaXjgozjgabjgIHkuIDml6bjg5rjg7zjgrjjgpLvvJHjgavjgZnjgotcbiAgICBAcnVsZXJzID0gcnVsZXJzIGlmIHJ1bGVycz9cbiAgICBwYWdlICAgID0gMVxuICAgICMgY29uc29sZS5sb2cgXCIxcGFnZSA9IFwiICsgQHBpY2tVcENvbW1lbnRGcm9tUGFnZSgxKVxuICAgICMgY29uc29sZS5sb2cgXCJsYXN0IHBhZ2UgPSBcIiArIEBwaWNrVXBDb21tZW50RnJvbVBhZ2UoQHJ1bGVycy5sZW5ndGgrMSlcbiAgICAjY29uc29sZS5sb2cgQHBpY2tVcENvbW1lbnQoKVxuXG4gICAgIyBydWxlckxpbmXjgavjga8nLS0tJ+OBruihjOS9jee9ruOBjOiomOOBleOCjOOBpuOBiuOCiuOAgeOBneOCjOOBqOOCqOODh+OCo+OCv+S4iuOBruOCq+ODvOOCveODq+S9jee9ruOCkuavlOi8g+OBl+OBpnBhZ2XjgpLmsbrjgoHjgotcbiAgICBsaW5lTnVtYmVyID0gQGNvZGVNaXJyb3IuZ2V0Q3Vyc29yKCkubGluZSB8fCAwXG4gICAgZm9yIHJ1bGVyTGluZSBpbiBAcnVsZXJzXG4gICAgICBwYWdlKysgaWYgcnVsZXJMaW5lIDw9IGxpbmVOdW1iZXJcblxuICAgICMgcnVsZXLoqIjnrpflvozjgavjg5rjg7zjgrjjga7lopfmuJvjgYzjgYLjgaPjgZ/loLTlkIjjgIHmraPjgZfjgYTjg5rjg7zjgrjmg4XloLHjgpJ3ZWJ2aWV344G46YCB5L+hXG4gICAgaWYgQGN1cnJlbnRQYWdlICE9IHBhZ2VcbiAgICAgIEBjdXJyZW50UGFnZSA9IHBhZ2VcbiAgICAgIEBwcmV2aWV3LnNlbmQgJ2N1cnJlbnRQYWdlJywgQGN1cnJlbnRQYWdlIGlmIEBwcmV2aWV3SW5pdGlhbGl6ZWRcblxuICAgICQoJyNwYWdlLWluZGljYXRvcicpLnRleHQgXCJQYWdlICN7QGN1cnJlbnRQYWdlfSAvICN7QHJ1bGVycy5sZW5ndGggKyAxfVwiXG5cbiAgaW5pdGlhbGl6ZVByZXZpZXc6ID0+XG4gICAgJChAcHJldmlldylcbiAgICAgIC5vbiAnZG9tLXJlYWR5JywgPT5cbiAgICAgICAgIyBGaXggbWluaW1pemVkIHByZXZpZXcgKCMyMClcbiAgICAgICAgIyBbTm90ZV0gaHR0cHM6Ly9naXRodWIuY29tL2VsZWN0cm9uL2VsZWN0cm9uL2lzc3Vlcy80ODgyXG4gICAgICAgICQoQHByZXZpZXcuc2hhZG93Um9vdCkuYXBwZW5kKCc8c3R5bGU+b2JqZWN0e21pbi13aWR0aDowO21pbi1oZWlnaHQ6MDt9PC9zdHlsZT4nKVxuXG4gICAgICAjIHdlYnZpZXcg44GL44KJ44Gu6YCa5L+h44KS5Y+X44GR5Y+W44KLICdpcGMtbWVzc2FnZSdcbiAgICAgIC5vbiAnaXBjLW1lc3NhZ2UnLCAoZXYpID0+XG4gICAgICAgIGUgPSBldi5vcmlnaW5hbEV2ZW50XG5cbiAgICAgICAgc3dpdGNoIGUuY2hhbm5lbFxuICAgICAgICAgIHdoZW4gJ3J1bGVyQ2hhbmdlZCdcbiAgICAgICAgICAgIEByZWZyZXNoUGFnZSBlLmFyZ3NbMF1cbiAgICAgICAgICB3aGVuICdsaW5rVG8nXG4gICAgICAgICAgICBAb3BlbkxpbmsgZS5hcmdzWzBdXG4gICAgICAgICAgd2hlbiAncmVuZGVyZWQnXG4gICAgICAgICAgICBAbGFzdFJlbmRlcmVkID0gZS5hcmdzWzBdXG4gICAgICAgICAgICB1bmxlc3MgQHByZXZpZXdJbml0aWFsaXplZFxuICAgICAgICAgICAgICBNZHNSZW5kZXJlci5zZW5kVG9NYWluICdwcmV2aWV3SW5pdGlhbGl6ZWQnXG5cbiAgICAgICAgICAgICAgQHByZXZpZXdJbml0aWFsaXplZCA9IHRydWVcbiAgICAgICAgICAgICAgJCgnYm9keScpLmFkZENsYXNzICdpbml0aWFsaXplZC1zbGlkZSdcbiAgICAgICAgICBlbHNlXG4gICAgICAgICAgICBNZHNSZW5kZXJlci5fY2FsbF9ldmVudCBlLmNoYW5uZWwsIGUuYXJncy4uLlxuICAgICAgIyB1cmzjgpLjgq/jg6rjg4Pjgq/jgZfjgabmlrDjgZfjgYTjgqbjgqTjg7Pjg4njgqbjgYzplovjgYvjgozjgovmmYJcbiAgICAgIC5vbiAnbmV3LXdpbmRvdycsIChlKSA9PlxuICAgICAgICBlLnByZXZlbnREZWZhdWx0KClcbiAgICAgICAgQG9wZW5MaW5rIGUub3JpZ2luYWxFdmVudC51cmxcblxuICAgICAgLm9uICdkaWQtZmluaXNoLWxvYWQnLCAoZSkgPT5cbiAgICAgICAgQHByZXZpZXcuc2VuZCAnY3VycmVudFBhZ2UnLCAxXG4gICAgICAgIEBwcmV2aWV3LnNlbmQgJ3NldEltYWdlRGlyZWN0b3J5JywgQF9pbWFnZURpcmVjdG9yeVxuICAgICAgICBAcHJldmlldy5zZW5kICdyZW5kZXInLCBAY29kZU1pcnJvci5nZXRWYWx1ZSgpICAjIHJlbmRlciDjgqTjg5njg7Pjg4jpgIHkv6HjgadydWxlcueiuuiqjeOBl+OBpuODmuODvOOCuOWIh+OCiuabv+OCj+OCilxuXG4gIG9wZW5MaW5rOiAobGluaykgPT5cbiAgICBzaGVsbC5vcGVuRXh0ZXJuYWwgbGluayBpZiAvXmh0dHBzPzpcXC9cXC8uKy8udGVzdChsaW5rKVxuXG4gIGluaXRpYWxpemVFZGl0b3I6ID0+XG4gICAgQGNvZGVNaXJyb3Iub24gJ2NvbnRleHRtZW51JywgKGNtLCBlKSA9PlxuICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpXG4gICAgICBAY29kZU1pcnJvci5mb2N1cygpXG4gICAgICBAbWVudS5wb3B1cCgpXG4gICAgICBmYWxzZVxuXG4gICAgQGNvZGVNaXJyb3Iub24gJ2NoYW5nZScsIChjbSwgY2hnKSA9PlxuICAgICAgQHByZXZpZXcuc2VuZCAncmVuZGVyJywgY20uZ2V0VmFsdWUoKVxuICAgICAgTWRzUmVuZGVyZXIuc2VuZFRvTWFpbiAnc2V0Q2hhbmdlZFN0YXR1cycsIHRydWUgaWYgIUBfbG9ja0NoYW5nZWRTdGF0dXNcblxuICAgIEBjb2RlTWlycm9yLm9uICdjdXJzb3JBY3Rpdml0eScsIChjbSkgPT4gd2luZG93LnNldFRpbWVvdXQgKD0+IEByZWZyZXNoUGFnZSgpKSwgNVxuXG4gICAgJCgnLnBhbmUubWFya2Rvd24nKS50b2dnbGUoKVxuXG4gIHNldEltYWdlRGlyZWN0b3J5OiAoZGlyZWN0b3J5KSA9PlxuICAgIGlmIEBwcmV2aWV3SW5pdGlhbGl6ZWRcbiAgICAgIEBwcmV2aWV3LnNlbmQgJ3NldEltYWdlRGlyZWN0b3J5JywgZGlyZWN0b3J5XG4gICAgICBAcHJldmlldy5zZW5kICdyZW5kZXInLCBAY29kZU1pcnJvci5nZXRWYWx1ZSgpXG4gICAgZWxzZVxuICAgICAgQF9pbWFnZURpcmVjdG9yeSA9IGRpcmVjdG9yeVxuXG4gIGluc2VydEltYWdlOiAoZmlsZVBhdGgpID0+IEBjb2RlTWlycm9yLnJlcGxhY2VTZWxlY3Rpb24oXCIhW10oI3tmaWxlUGF0aC5yZXBsYWNlKC8gL2csICclMjAnKX0pXFxuXCIpXG5cbiAgIyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqVE9ETyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbiAgaW5zZXJ0VmlkZW86IChmaWxlUGF0aCkgPT5cbiAgICBjb25zb2xlLmxvZyBmaWxlUGF0aFxuICAjKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuXG5cbiAgdXBkYXRlR2xvYmFsU2V0dGluZzogKHByb3AsIHZhbHVlKSA9PlxuICAgIGxhdGVzdFBvcyA9IG51bGxcblxuICAgIGZvciBvYmogaW4gKEBsYXN0UmVuZGVyZWQ/LnNldHRpbmdzUG9zaXRpb24gfHwgW10pXG4gICAgICBsYXRlc3RQb3MgPSBvYmogaWYgb2JqLnByb3BlcnR5IGlzIHByb3BcblxuICAgIGlmIGxhdGVzdFBvcz9cbiAgICAgIEBjb2RlTWlycm9yLnJlcGxhY2VSYW5nZShcbiAgICAgICAgXCIje3Byb3B9OiAje3ZhbHVlfVwiLFxuICAgICAgICBDb2RlTWlycm9yLlBvcyhsYXRlc3RQb3MubGluZUlkeCwgbGF0ZXN0UG9zLmZyb20pLFxuICAgICAgICBDb2RlTWlycm9yLlBvcyhsYXRlc3RQb3MubGluZUlkeCwgbGF0ZXN0UG9zLmZyb20gKyBsYXRlc3RQb3MubGVuZ3RoKSxcbiAgICAgIClcbiAgICBlbHNlXG4gICAgICBAY29kZU1pcnJvci5yZXBsYWNlUmFuZ2UoXG4gICAgICAgIFwiPCEtLSAje3Byb3B9OiAje3ZhbHVlfSAtLT5cXG5cXG5cIixcbiAgICAgICAgQ29kZU1pcnJvci5Qb3MoQGNvZGVNaXJyb3IuZmlyc3RMaW5lKCksIDApXG4gICAgICApXG5cbmxvYWRpbmdTdGF0ZSA9ICdsb2FkaW5nJ1xuXG5cblxuIyB0ZXh0bGludCBydWxlcyBzZXR0aW5nXG5cbm5vQWJ1c2FnZSA9IHJlcXVpcmUgJ3RleHRsaW50LXJ1bGUtamEtbm8tYWJ1c2FnZSdcbm1peGVkUGVyaW9kID0gcmVxdWlyZSAndGV4dGxpbnQtcnVsZS1qYS1uby1taXhlZC1wZXJpb2QnXG5zdWNjZXNzaXZlV29yZCA9IHJlcXVpcmUgJ3RleHRsaW50LXJ1bGUtamEtbm8tc3VjY2Vzc2l2ZS13b3JkJ1xud2Vha1BocmFzZSA9IHJlcXVpcmUgJ3RleHRsaW50LXJ1bGUtamEtbm8td2Vhay1waHJhc2UnXG5tYXhDb21tYSA9IHJlcXVpcmUgJ3RleHRsaW50LXJ1bGUtbWF4LWNvbW1hJ1xua2FuamlDb250aW51b3VzTGVuID0gcmVxdWlyZSAndGV4dGxpbnQtcnVsZS1tYXgta2FuamktY29udGludW91cy1sZW4nXG5tYXhUZW4gPSByZXF1aXJlICd0ZXh0bGludC1ydWxlLW1heC10ZW4nXG5ub0RvdWJsZU5lZ2F0aXZlSmEgPSByZXF1aXJlICd0ZXh0bGludC1ydWxlLW5vLWRvdWJsZS1uZWdhdGl2ZS1qYSdcbm5vRG91YmxlZENvbmp1bmN0aW9uID0gcmVxdWlyZSAndGV4dGxpbnQtcnVsZS1uby1kb3VibGVkLWNvbmp1bmN0aW9uJ1xubm9Eb3VibGVkQ29uanVuY3RpdmVQYXJ0aWNsZUdhID0gcmVxdWlyZSAndGV4dGxpbnQtcnVsZS1uby1kb3VibGVkLWNvbmp1bmN0aXZlLXBhcnRpY2xlLWdhJ1xubm9Eb3VibGVkSm9zaGkgPSByZXF1aXJlICd0ZXh0bGludC1ydWxlLW5vLWRvdWJsZWQtam9zaGknXG5ub0Ryb3BwaW5nVGhlUmEgPSByZXF1aXJlICd0ZXh0bGludC1ydWxlLW5vLWRyb3BwaW5nLXRoZS1yYSdcbm5vRXhjbGFtYXRpb25RdWVzdGlvbk1hcmsgPSByZXF1aXJlICd0ZXh0bGludC1ydWxlLW5vLWV4Y2xhbWF0aW9uLXF1ZXN0aW9uLW1hcmsnXG5ub0hhbmtha3VLYW5hID0gcmVxdWlyZSAndGV4dGxpbnQtcnVsZS1uby1oYW5rYWt1LWthbmEnXG5ub01peERlYXJ1RGVzdW1hc3UgPSByZXF1aXJlICd0ZXh0bGludC1ydWxlLW5vLW1peC1kZWFydS1kZXN1bWFzdSdcbm5vTmZkID0gcmVxdWlyZSAndGV4dGxpbnQtcnVsZS1uby1uZmQnXG5ub1N0YXJ0RHVwbGljYXRlZENvbmp1bmN0aW9uID0gcmVxdWlyZSAndGV4dGxpbnQtcnVsZS1uby1zdGFydC1kdXBsaWNhdGVkLWNvbmp1bmN0aW9uJ1xuXG52YWxpZGF0b3IgPSBjcmVhdGVWYWxpZGF0b3Ioe1xuICBydWxlczoge1xuICAgICdub0FidXNhZ2UnIDogbm9BYnVzYWdlLFxuICAgICdtaXhlZFBlcmlvZCcgOiBtaXhlZFBlcmlvZCxcbiAgICAnc3VjY2Vzc2l2ZVdvcmQnIDogc3VjY2Vzc2l2ZVdvcmQsXG4gICAgJ3dlYWtQaHJhc2UnIDogd2Vha1BocmFzZSxcbiAgICAnbWF4Q29tbWEnIDogbWF4Q29tbWEsXG4gICAgJ2thbmppQ29udGludW91c0xlbicgOiBrYW5qaUNvbnRpbnVvdXNMZW4sXG4gICAgJ21heFRlbicgOiBtYXhUZW4sXG4gICAgJ25vRG91YmxlZE5lZ2F0aXZlSmEnIDogbm9Eb3VibGVOZWdhdGl2ZUphLFxuICAgICdub0RvdWJsZWRDb25qdW5jdGlvbicgOiBub0RvdWJsZWRDb25qdW5jdGlvbixcbiAgICAnbm9Eb3VibGVkQ29uanVuY3RpdmVQYXJ0aWNsZUdhJyA6IG5vRG91YmxlZENvbmp1bmN0aXZlUGFydGljbGVHYSxcbiAgICAnbm9Eb3VibGVkSm9zaGknIDogbm9Eb3VibGVkSm9zaGksXG4gICAgJ25vRHJvcHBpbmdUaGVSYScgOiBub0Ryb3BwaW5nVGhlUmEsXG4gICAgJ25vRXhjbGFtYXRpb25RdWVzdGlvbk1hcmsnIDogbm9FeGNsYW1hdGlvblF1ZXN0aW9uTWFyayxcbiAgICAnbm9IYW5rYWt1S2FuYScgOiBub0hhbmtha3VLYW5hLFxuICAgICdub01peERlYXJ1RGVzdW1hc3UnIDogbm9NaXhEZWFydURlc3VtYXN1LFxuICAgICdub05mZCcgOiBub05mZCxcbiAgICAnbm9TdGFydER1cGxpY2F0ZWRDb25qdW5jdGlvbicgOiBub1N0YXJ0RHVwbGljYXRlZENvbmp1bmN0aW9uXG4gIH1cbiAgfSk7XG5cbmRvIC0+XG4gIHNsaWRlSFRNTCA9IFwiXCJcbiAgcHJlc2VuU3RhdGVzID0gbmV3IFByZXNlblN0YXRlcyhcbiAgICBDb2RlTWlycm9yLmZyb21UZXh0QXJlYSgkKCcjZWRpdG9yJylbMF0sXG4gICAgICAjIGdmbSA6IEdpdGh1YiBGbGF2b3JlZCBNb2RlXG4gICAgICBtb2RlOiAnZ2ZtJ1xuICAgICAgI3RoZW1lOiAnYmFzZTE2LWxpZ2h0J1xuICAgICAgbGluZVdyYXBwaW5nOiB0cnVlXG4gICAgICBsaW5lTnVtYmVyczogdHJ1ZVxuICAgICAgZHJhZ0Ryb3A6IGZhbHNlXG4gICAgICBndXR0ZXJzOiBbXCJDb2RlTWlycm9yLWxpbnQtbWFya2Vyc1wiXVxuICAgICAgbGludDoge1xuICAgICAgICAgXCJnZXRBbm5vdGF0aW9uc1wiOiB2YWxpZGF0b3IsXG4gICAgICAgICBcImFzeW5jXCI6IHRydWVcbiAgICAgIH1cbiAgICAgIGV4dHJhS2V5czpcbiAgICAgICAgRW50ZXI6ICduZXdsaW5lQW5kSW5kZW50Q29udGludWVNYXJrZG93bkxpc3QnXG4gICAgKSxcbiAgICAkKCcjcHJldmlldycpWzBdXG4gIClcblxuICBzZXR0aW5nID1cbiAgICBcImlkXCI6IFwiaW5kZXhcIlxuICAgIFwidXJsXCI6IFwid3M6Ly9hcHBzLndpc2RvbXdlYi5uZXQ6NjQyNjAvd3MvbWlrXCJcbiAgICBcInNpdGVcIjogXCJ0ZXN0XCJcbiAgICBcInRva2VuXCI6IFwiUGFkOjk5NDhcIlxuICBjbGllbnQgPSBuZXcgTWlja3JDbGllbnQoc2V0dGluZylcblxuICAjIFNwbGl0dGVyXG4gIGRyYWdnaW5nU3BsaXR0ZXIgICAgICA9IGZhbHNlXG4gIGRyYWdnaW5nU3BsaXRQb3NpdGlvbiA9IHVuZGVmaW5lZFxuXG4gIHNldFNwbGl0dGVyID0gKHNwbGl0UG9pbnQpIC0+XG4gICAgc3BsaXRQb2ludCA9IE1hdGgubWluKDAuOCwgTWF0aC5tYXgoMC4yLCBwYXJzZUZsb2F0KHNwbGl0UG9pbnQpKSlcblxuICAgICQoJy5wYW5lLm1hcmtkb3duJykuY3NzKCdmbGV4LWdyb3cnLCBzcGxpdFBvaW50ICogMTAwKVxuICAgICQoJy5wYW5lLnByZXZpZXcnKS5jc3MoJ2ZsZXgtZ3JvdycsICgxIC0gc3BsaXRQb2ludCkgKiAxMDApXG5cbiAgICByZXR1cm4gc3BsaXRQb2ludFxuXG4gIHNldEVkaXRvckNvbmZpZyA9IChlZGl0b3JDb25maWcpIC0+XG4gICAgZWRpdG9yID0gJChwcmVzZW5TdGF0ZXMuY29kZU1pcnJvcj8uZ2V0V3JhcHBlckVsZW1lbnQoKSlcbiAgICBlZGl0b3IuY3NzKCdmb250LWZhbWlseScsIGVkaXRvckNvbmZpZy5mb250RmFtaWx5KSBpZiBlZGl0b3I/XG4gICAgZWRpdG9yLmNzcygnZm9udC1zaXplJywgZWRpdG9yQ29uZmlnLmZvbnRTaXplKSBpZiBlZGl0b3I/XG5cbiAgJCgnLnBhbmUtc3BsaXR0ZXInKVxuICAgIC5tb3VzZWRvd24gLT5cbiAgICAgIGRyYWdnaW5nU3BsaXR0ZXIgPSB0cnVlXG4gICAgICBkcmFnZ2luZ1NwbGl0UG9zaXRpb24gPSB1bmRlZmluZWRcblxuICAgIC5kYmxjbGljayAtPlxuICAgICAgTWRzUmVuZGVyZXIuc2VuZFRvTWFpbiAnc2V0Q29uZmlnJywgJ3NwbGl0dGVyUG9zaXRpb24nLCBzZXRTcGxpdHRlcigwLjUpXG5cbiAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIgJ21vdXNlbW92ZScsIChlKSAtPlxuICAgIGlmIGRyYWdnaW5nU3BsaXR0ZXJcbiAgICAgIGRyYWdnaW5nU3BsaXRQb3NpdGlvbiA9IHNldFNwbGl0dGVyIE1hdGgubWluKE1hdGgubWF4KDAsIGUuY2xpZW50WCksIGRvY3VtZW50LmJvZHkuY2xpZW50V2lkdGgpIC8gZG9jdW1lbnQuYm9keS5jbGllbnRXaWR0aFxuICAsIGZhbHNlXG5cbiAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIgJ21vdXNldXAnLCAoZSkgLT5cbiAgICBkcmFnZ2luZ1NwbGl0dGVyID0gZmFsc2VcbiAgICBNZHNSZW5kZXJlci5zZW5kVG9NYWluICdzZXRDb25maWcnLCAnc3BsaXR0ZXJQb3NpdGlvbicsIGRyYWdnaW5nU3BsaXRQb3NpdGlvbiBpZiBkcmFnZ2luZ1NwbGl0UG9zaXRpb24/XG4gICwgZmFsc2VcblxuICByZXNwb25zZVBkZk9wdHMgPSBudWxsXG5cbiAgIyBFdmVudHNcbiAgTWRzUmVuZGVyZXJcbiAgICAub24gJ3B1Ymxpc2hQZGYnLCAoZm5hbWUpIC0+XG4gICAgICBwcmVzZW5TdGF0ZXMuY29kZU1pcnJvci5nZXRJbnB1dEZpZWxkKCkuYmx1cigpXG4gICAgICAkKCdib2R5JykuYWRkQ2xhc3MgJ2V4cG9ydGluZy1wZGYnXG5cbiAgICAgIHByZXNlblN0YXRlcy5wcmV2aWV3LnNlbmQgJ3JlcXVlc3RQZGZPcHRpb25zJywgeyBmaWxlbmFtZTogZm5hbWUgfVxuXG4gICAgLm9uICdyZXNwb25zZVBkZk9wdGlvbnMnLCAob3B0cykgLT5cbiAgICAgICMgV2FpdCBsb2FkaW5nIHJlc291cmNlc1xuICAgICAgc3RhcnRQdWJsaXNoID0gLT5cbiAgICAgICAgaWYgbG9hZGluZ1N0YXRlIGlzICdsb2FkaW5nJ1xuICAgICAgICAgIHNldFRpbWVvdXQgc3RhcnRQdWJsaXNoLCAyNTBcbiAgICAgICAgZWxzZVxuICAgICAgICAgIHByZXNlblN0YXRlcy5wcmV2aWV3LnByaW50VG9QREZcbiAgICAgICAgICAgIG1hcmdpbnNUeXBlOiAxXG4gICAgICAgICAgICBwYWdlU2l6ZTogb3B0cy5leHBvcnRTaXplXG4gICAgICAgICAgICBwcmludEJhY2tncm91bmQ6IHRydWVcbiAgICAgICAgICAsIChlcnIsIGRhdGEpIC0+XG4gICAgICAgICAgICB1bmxlc3MgZXJyXG4gICAgICAgICAgICAgIE1kc1JlbmRlcmVyLnNlbmRUb01haW4gJ3dyaXRlRmlsZScsIG9wdHMuZmlsZW5hbWUsIGRhdGEsIHsgZmluYWxpemVkOiAndW5mcmVlemUnIH1cbiAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgTWRzUmVuZGVyZXIuc2VuZFRvTWFpbiAndW5mcmVlemUnXG5cbiAgICAgIHNldFRpbWVvdXQgc3RhcnRQdWJsaXNoLCA1MDBcblxuICAgIC5vbiAndW5mcmVlemVkJywgLT5cbiAgICAgIHByZXNlblN0YXRlcy5wcmV2aWV3LnNlbmQgJ3VuZnJlZXplJ1xuICAgICAgJCgnYm9keScpLnJlbW92ZUNsYXNzICdleHBvcnRpbmctcGRmJ1xuXG4gICAgLm9uICdsb2FkVGV4dCcsIChidWZmZXIpIC0+XG4gICAgICBwcmVzZW5TdGF0ZXMuX2xvY2tDaGFuZ2VkU3RhdHVzID0gdHJ1ZVxuICAgICAgcHJlc2VuU3RhdGVzLmNvZGVNaXJyb3Iuc2V0VmFsdWUgYnVmZmVyXG4gICAgICBwcmVzZW5TdGF0ZXMuY29kZU1pcnJvci5jbGVhckhpc3RvcnkoKVxuICAgICAgcHJlc2VuU3RhdGVzLl9sb2NrQ2hhbmdlZFN0YXR1cyA9IGZhbHNlXG5cbiAgICAub24gJ3NldEltYWdlRGlyZWN0b3J5JywgKGRpcmVjdG9yaWVzKSAtPiBwcmVzZW5TdGF0ZXMuc2V0SW1hZ2VEaXJlY3RvcnkgZGlyZWN0b3JpZXNcblxuICAgICMgc2VuZCB0ZXh0IHRvIHNhdmUgdG8gbWFpbiBwcm9jZXNzIGFuZCByZWxvYWRcbiAgICAub24gJ3NhdmUnLCAoZm5hbWUsIHRyaWdnZXJzID0ge30pIC0+XG4gICAgICBNZHNSZW5kZXJlci5zZW5kVG9NYWluICd3cml0ZUZpbGUnLCBmbmFtZSwgcHJlc2VuU3RhdGVzLmNvZGVNaXJyb3IuZ2V0VmFsdWUoKSwgdHJpZ2dlcnNcbiAgICAgIE1kc1JlbmRlcmVyLnNlbmRUb01haW4gJ2luaXRpYWxpemVTdGF0ZScsIGZuYW1lXG5cbiAgICAub24gJ3ZpZXdNb2RlJywgKG1vZGUpIC0+XG4gICAgICBzd2l0Y2ggbW9kZVxuICAgICAgICB3aGVuICdtYXJrZG93bidcbiAgICAgICAgICBwcmVzZW5TdGF0ZXMucHJldmlldy5zZW5kICdzZXRDbGFzcycsICcnXG4gICAgICAgIHdoZW4gJ3NjcmVlbidcbiAgICAgICAgICBwcmVzZW5TdGF0ZXMucHJldmlldy5zZW5kICdzZXRDbGFzcycsICdzbGlkZS12aWV3IHNjcmVlbidcbiAgICAgICAgd2hlbiAnbGlzdCdcbiAgICAgICAgICBwcmVzZW5TdGF0ZXMucHJldmlldy5zZW5kICdzZXRDbGFzcycsICdzbGlkZS12aWV3IGxpc3QnXG4gICAgICAgIHdoZW4gJ3ByZXNlbi1kZXYnXG4gICAgICAgICAgcHJlc2VuU3RhdGVzLnByZXZpZXcuc2VuZCAnc2V0Q2xhc3MnLCAnc2xpZGUtdmlldyBwcmVzZW4tZGV2J1xuXG4gICAgICAkKCcjcHJldmlldy1tb2RlcycpLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpXG4gICAgICAkKCcudmlld21vZGUtYnRuW2RhdGEtdmlld21vZGVdJykucmVtb3ZlQ2xhc3MoJ2FjdGl2ZScpXG4gICAgICAgIC5maWx0ZXIoXCJbZGF0YS12aWV3bW9kZT0nI3ttb2RlfSddXCIpLmFkZENsYXNzKCdhY3RpdmUnKVxuXG4gICAgLm9uICdlZGl0Q29tbWFuZCcsIChjb21tYW5kKSAtPiBwcmVzZW5TdGF0ZXMuY29kZU1pcnJvci5leGVjQ29tbWFuZChjb21tYW5kKVxuXG4gICAgLm9uICdvcGVuRGV2VG9vbCcsIC0+XG4gICAgICBpZiBwcmVzZW5TdGF0ZXMucHJldmlldy5pc0RldlRvb2xzT3BlbmVkKClcbiAgICAgICAgcHJlc2VuU3RhdGVzLnByZXZpZXcuY2xvc2VEZXZUb29scygpXG4gICAgICBlbHNlXG4gICAgICAgIHByZXNlblN0YXRlcy5wcmV2aWV3Lm9wZW5EZXZUb29scygpXG5cbiAgICAub24gJ3NldEVkaXRvckNvbmZpZycsIChlZGl0b3JDb25maWcpIC0+IHNldEVkaXRvckNvbmZpZyBlZGl0b3JDb25maWdcbiAgICAub24gJ3NldFNwbGl0dGVyJywgKHNwbGlpdGVyUG9zKSAtPiBzZXRTcGxpdHRlciBzcGxpaXRlclBvc1xuICAgIC5vbiAnc2V0VGhlbWUnLCAodGhlbWUpIC0+IHByZXNlblN0YXRlcy51cGRhdGVHbG9iYWxTZXR0aW5nICckdGhlbWUnLCB0aGVtZVxuICAgIC5vbiAndGhlbWVDaGFuZ2VkJywgKHRoZW1lKSAtPiBNZHNSZW5kZXJlci5zZW5kVG9NYWluICd0aGVtZUNoYW5nZWQnLCB0aGVtZVxuICAgIC5vbiAncmVzb3VyY2VTdGF0ZScsIChzdGF0ZSkgLT4gbG9hZGluZ1N0YXRlID0gc3RhdGVcblxuICB3ZWJ2aWV3ID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI3ByZXZpZXcnKVxuXG4gIHdlYnZpZXcuYWRkRXZlbnRMaXN0ZW5lciAnaXBjLW1lc3NhZ2UnLCAoZXZlbnQpID0+XG4gICAgIHN3aXRjaCBldmVudC5jaGFubmVsXG4gICAgICAgd2hlbiBcInNlbmRTbGlkZUluZm9cIiAgICMgd2VidmlldyDjgYvjgonjgrnjg6njgqTjg4nmg4XloLHjgpLlj5fkv6FcbiAgICAgICAgc2xpZGVJbmZvID0gZXZlbnQuYXJnc1swXVxuICAgICAgICBjb25zb2xlLmxvZyAncmVjZWl2ZSBzZW5kU2xpZGVJbmZvJ1xuICAgICAgICBjb25zb2xlLmxvZyBzbGlkZUluZm9cbiAgICAgICAgaXBjLnNlbmQgJ3RleHRTZW5kJywgc2xpZGVJbmZvXG4gICAgICAgIGNvbnNvbGUubG9nICdzZW5kIHRleHRTZW5kJ1xuICAgICAgICBicmVha1xuXG4gICAgICAgd2hlbiBcInJlcXVlc3RTbGlkZUhUTUxcIlxuICAgICAgICB3ZWJ2aWV3LnNlbmQgJ3NldFNsaWRlJywgc2xpZGVIVE1MXG4gICAgICAgIGNvbnNvbGUubG9nICdzZW5kIHNldFNsaWRlJ1xuICAgICAgICBicmVha1xuXG4gIGlwYy5vbiAncHJlc2VuRGV2SW5pdGlhbGl6ZScsIChlLCB0ZXh0KSA9PlxuICAgICAgY29uc29sZS5sb2cgJ3JlY2VpdmUgcHJlc2VuRGV2SW5pdGlhbGl6ZSdcbiAgICAgIGNvbnNvbGUubG9nIHRleHRcbiAgICAgIHNsaWRlSFRNTCA9IHRleHRcblxuICBpcGMub24gJ2dvVG9QYWdlJywgKGUsIHBhZ2UpID0+XG4gICAgY29uc29sZS5sb2cgcGFnZVxuICAgIHdlYnZpZXcuc2VuZCAnZ29Ub1BhZ2UnLCBwYWdlXG5cblxuICAjIEluaXRpYWxpemVcbiAgcHJlc2VuU3RhdGVzLmNvZGVNaXJyb3IuZm9jdXMoKVxuICBwcmVzZW5TdGF0ZXMucmVmcmVzaFBhZ2UoKVxuIl19
