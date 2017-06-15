var CodeMirror, EditorStates, MdsMenu, MdsRenderer, MickrClient, clsMdsRenderer, createValidator, ipc, kanjiContinuousLen, loadingState, maxComma, maxTen, mixedPeriod, noAbusage, noDoubleNegativeJa, noDoubledConjunction, noDoubledConjunctiveParticleGa, noDoubledJoshi, noDroppingTheRa, noExclamationQuestionMark, noHankakuKana, noMixDearuDesumasu, noNfd, noStartDuplicatedConjunction, ref, shell, successiveWord, validator, weakPhrase, webFrame,
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

EditorStates = (function() {
  EditorStates.prototype.rulers = [];

  EditorStates.prototype.currentPage = null;

  EditorStates.prototype.previewInitialized = false;

  EditorStates.prototype.lastRendered = {};

  EditorStates.prototype._lockChangedStatus = false;

  EditorStates.prototype._imageDirectory = null;

  function EditorStates(codeMirror, preview) {
    this.codeMirror = codeMirror;
    this.preview = preview;
    this.updateGlobalSetting = bind(this.updateGlobalSetting, this);
    this.pickUpCommentFromPage = bind(this.pickUpCommentFromPage, this);
    this.pickUpComment = bind(this.pickUpComment, this);
    this.insertVideo = bind(this.insertVideo, this);
    this.insertImage = bind(this.insertImage, this);
    this.setImageDirectory = bind(this.setImageDirectory, this);
    this.initializeEditor = bind(this.initializeEditor, this);
    this.openLink = bind(this.openLink, this);
    this.initializePreview = bind(this.initializePreview, this);
    this.refreshPage = bind(this.refreshPage, this);
    console.log("" + __dirname);
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

  EditorStates.prototype.refreshPage = function(rulers) {
    var j, len, lineNumber, page, ref1, rulerLine;
    if (rulers != null) {
      this.rulers = rulers;
    }
    page = 1;
    console.log("rulers.length = " + this.rulers.length);
    console.log(this.pickUpComment());
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

  EditorStates.prototype.initializePreview = function() {
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

  EditorStates.prototype.openLink = function(link) {
    if (/^https?:\/\/.+/.test(link)) {
      return shell.openExternal(link);
    }
  };

  EditorStates.prototype.initializeEditor = function() {
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
    return this.codeMirror.on('cursorActivity', (function(_this) {
      return function(cm) {
        return window.setTimeout((function() {
          return _this.refreshPage();
        }), 5);
      };
    })(this));
  };

  EditorStates.prototype.setImageDirectory = function(directory) {
    if (this.previewInitialized) {
      this.preview.send('setImageDirectory', directory);
      return this.preview.send('render', this.codeMirror.getValue());
    } else {
      return this._imageDirectory = directory;
    }
  };

  EditorStates.prototype.insertImage = function(filePath) {
    return this.codeMirror.replaceSelection("![](" + (filePath.replace(/ /g, '%20')) + ")\n");
  };

  EditorStates.prototype.insertVideo = function(filePath) {
    return console.log(filePath);
  };

  EditorStates.prototype.pickUpComment = function() {
    var CommentEachPage, i, j, pageMax, ref1;
    pageMax = this.rulers.length + 1;
    CommentEachPage = [];
    for (i = j = 1, ref1 = pageMax + 1; 1 <= ref1 ? j < ref1 : j > ref1; i = 1 <= ref1 ? ++j : --j) {
      console.log(i);
      CommentEachPage.push(this.pickUpCommentFromPage(i));
    }
    return CommentEachPage;
  };

  EditorStates.prototype.pickUpCommentFromPage = function(page) {
    var TextInEditor, comment, pageEndLine, pageStartLine, re, result;
    if (page === 1 && !this.rulers.length) {
      pageStartLine = 0;
      pageEndLine = this.codeMirror.lineCount();
      console.log("pageEndLine = " + pageEndLine);
    } else if (page === 1 && this.rulers.length !== 0) {
      pageStartLine = 0;
      pageEndLine = this.rulers[0];
    } else if (page === this.rulers.length + 1) {
      pageStartLine = this.rulers[this.rulers.length - 1];
      pageEndLine = this.codeMirror.lineCount();
    } else {
      pageStartLine = this.rulers[page - 2] + 1;
      pageEndLine = this.rulers[page - 1] + 1;
    }
    TextInEditor = this.codeMirror.getRange({
      "line": pageStartLine,
      "ch": 0
    }, {
      "line": pageEndLine - 1,
      "ch": 0
    });
    re = /\{##[\s\n]*(.*)[\s\n]*##\}/;
    result = TextInEditor.match(re);
    comment = '';
    if (result) {
      comment = result[1];
    }
    return comment;
  };

  EditorStates.prototype.updateGlobalSetting = function(prop, value) {
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

  return EditorStates;

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

document.addEventListener("DOMContentLoaded", (function(_this) {
  return function(event) {};
})(this));

(function() {
  var client, draggingSplitPosition, draggingSplitter, editorStates, responsePdfOpts, setEditorConfig, setSplitter, setting, slideHTML, webview;
  slideHTML = "";
  editorStates = new EditorStates(CodeMirror.fromTextArea($('#editor')[0], {
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
  $('.viewmode-btn[data-viewmode]').click(function() {
    return MdsRenderer.sendToMain('viewMode', $(this).attr('data-viewmode'));
  });
  $('#pdf-export').click(function() {
    return ipc.send('PdfExport');
  });
  $(document).on('dragover', function() {
    return false;
  }).on('dragleave', function() {
    return false;
  }).on('dragend', function() {
    return false;
  }).on('drop', (function(_this) {
    return function(e) {
      var f, ref1, ref2;
      e.preventDefault();
      if ((f = (ref1 = e.originalEvent.dataTransfer) != null ? (ref2 = ref1.files) != null ? ref2[0] : void 0 : void 0) == null) {
        return false;
      }
      console.log(f);
      if (f.type.startsWith('image')) {
        editorStates.insertImage(f.path);
      } else if (f.type.startsWith('text') || f.type === '') {
        if (f.path != null) {
          MdsRenderer.sendToMain('loadFromFile', f.path);
        }
      } else if (f.type.startsWith('video')) {
        editorStates.insertVideo(f.path);
      }
      return false;
    };
  })(this));
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
    editor = $((ref1 = editorStates.codeMirror) != null ? ref1.getWrapperElement() : void 0);
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
    editorStates.codeMirror.getInputField().blur();
    $('body').addClass('exporting-pdf');
    return editorStates.preview.send('requestPdfOptions', {
      filename: fname
    });
  }).on('responsePdfOptions', function(opts) {
    var startPublish;
    startPublish = function() {
      if (loadingState === 'loading') {
        return setTimeout(startPublish, 250);
      } else {
        return editorStates.preview.printToPDF({
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
    editorStates.preview.send('unfreeze');
    return $('body').removeClass('exporting-pdf');
  }).on('loadText', function(buffer) {
    editorStates._lockChangedStatus = true;
    editorStates.codeMirror.setValue(buffer);
    editorStates.codeMirror.clearHistory();
    return editorStates._lockChangedStatus = false;
  }).on('setImageDirectory', function(directories) {
    return editorStates.setImageDirectory(directories);
  }).on('save', function(fname, triggers) {
    if (triggers == null) {
      triggers = {};
    }
    MdsRenderer.sendToMain('writeFile', fname, editorStates.codeMirror.getValue(), triggers);
    return MdsRenderer.sendToMain('initializeState', fname);
  }).on('viewMode', function(mode) {
    switch (mode) {
      case 'markdown':
        editorStates.preview.send('setClass', '');
        break;
      case 'screen':
        editorStates.preview.send('setClass', 'slide-view screen');
        break;
      case 'list':
        editorStates.preview.send('setClass', 'slide-view list');
        break;
      case 'presen-dev':
        editorStates.preview.send('setClass', 'slide-view presen-dev');
    }
    $('#preview-modes').removeClass('disabled');
    return $('.viewmode-btn[data-viewmode]').removeClass('active').filter("[data-viewmode='" + mode + "']").addClass('active');
  }).on('editCommand', function(command) {
    return editorStates.codeMirror.execCommand(command);
  }).on('openDevTool', function() {
    if (editorStates.preview.isDevToolsOpened()) {
      return editorStates.preview.closeDevTools();
    } else {
      return editorStates.preview.openDevTools();
    }
  }).on('setEditorConfig', function(editorConfig) {
    return setEditorConfig(editorConfig);
  }).on('setSplitter', function(spliiterPos) {
    return setSplitter(spliiterPos);
  }).on('setTheme', function(theme) {
    return editorStates.updateGlobalSetting('$theme', theme);
  }).on('themeChanged', function(theme) {
    return MdsRenderer.sendToMain('themeChanged', theme);
  }).on('resourceState', function(state) {
    return loadingState = state;
  });
  setting = {
    "id": "index",
    "url": "ws://apps.wisdomweb.net:64260/ws/mik",
    "site": "test",
    "token": "Pad:9948"
  };
  client = new MickrClient(setting);
  client.on("canReceiveEditorText", (function(_this) {
    return function() {
      return client.send("sendEditorText", {
        "to": "presenIndex",
        "body": {
          "content": editorStates.codeMirror.getValue()
        }
      });
    };
  })(this));
  client.on("canReceiveComment", (function(_this) {
    return function() {
      return client.send("sendComment", {
        "to": "presenDevIndex",
        "body": {
          "content": editorStates.pickUpComment()
        }
      });
    };
  })(this));
  webview = document.querySelector('#preview');
  $('#presentation').on('click', (function(_this) {
    return function() {
      webview.send('requestSlideInfo');
      return console.log('send requestSlideInfo');
    };
  })(this));
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
  editorStates.codeMirror.focus();
  return editorStates.refreshPage();
})();

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VzIjpbImluZGV4LmNvZmZlZSJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxJQUFBLHdiQUFBO0VBQUE7OztBQUFBLEdBQUEsR0FBTSxPQUFBLENBQVEsVUFBUixDQUFtQixDQUFDOztBQUMxQixNQUFvQixPQUFBLENBQVEsVUFBUixDQUFwQixFQUFDLGlCQUFELEVBQVE7O0FBQ1IsT0FBQSxHQUFvQixPQUFBLENBQVEsdUJBQVI7O0FBQ3BCLGNBQUEsR0FBb0IsT0FBQSxDQUFRLDJCQUFSOztBQUNwQixlQUFBLEdBQW9CLE9BQUEsQ0FBUSxxQkFBUjs7QUFDcEIsV0FBQSxHQUFvQixJQUFJOztBQUN4QixXQUFXLENBQUMsYUFBWixDQUFBOztBQUVBLFFBQVEsQ0FBQyxrQkFBVCxDQUE0QixDQUE1QixFQUErQixDQUEvQjs7QUFFQSxVQUFBLEdBQWEsT0FBQSxDQUFRLFlBQVI7O0FBQ2IsT0FBQSxDQUFRLHlCQUFSOztBQUNBLE9BQUEsQ0FBUSxtQ0FBUjs7QUFDQSxPQUFBLENBQVEseUJBQVI7O0FBQ0EsT0FBQSxDQUFRLG9DQUFSOztBQUNBLE9BQUEsQ0FBUSw0QkFBUjs7QUFDQSxXQUFBLEdBQWMsT0FBQSxDQUFRLHVCQUFSOztBQUVSO3lCQUNKLE1BQUEsR0FBUTs7eUJBQ1IsV0FBQSxHQUFhOzt5QkFDYixrQkFBQSxHQUFvQjs7eUJBQ3BCLFlBQUEsR0FBYzs7eUJBRWQsa0JBQUEsR0FBb0I7O3lCQUNwQixlQUFBLEdBQWlCOztFQUVKLHNCQUFDLFVBQUQsRUFBYyxPQUFkO0lBQUMsSUFBQyxDQUFBLGFBQUQ7SUFBYSxJQUFDLENBQUEsVUFBRDs7Ozs7Ozs7Ozs7SUFDekIsT0FBTyxDQUFDLEdBQVIsQ0FBWSxFQUFBLEdBQUcsU0FBZjtJQUNBLElBQUMsQ0FBQSxnQkFBRCxDQUFBO0lBQ0EsSUFBQyxDQUFBLGlCQUFELENBQUE7SUFFQSxJQUFDLENBQUEsSUFBRCxHQUFRLElBQUksT0FBSixDQUFZO01BQ2xCO1FBQUUs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LE9BQU8sQ0FBQyxJQUFSLENBQWEsVUFBYixFQUF5QixJQUF6QjtJQUZpQjtFQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBbkI7RUFhQSxZQUFZLENBQUMsVUFBVSxDQUFDLEtBQXhCLENBQUE7U0FDQSxZQUFZLENBQUMsV0FBYixDQUFBO0FBMU9DLENBQUEsQ0FBSCxDQUFBIiwic291cmNlc0NvbnRlbnQiOlsiaXBjID0gcmVxdWlyZSgnZWxlY3Ryb24nKS5pcGNSZW5kZXJlclxue3NoZWxsLCB3ZWJGcmFtZX0gPSByZXF1aXJlICdlbGVjdHJvbidcbk1kc01lbnUgICAgICAgICAgID0gcmVxdWlyZSAnLi9qcy9jbGFzc2VzL21kc19tZW51J1xuY2xzTWRzUmVuZGVyZXIgICAgPSByZXF1aXJlICcuL2pzL2NsYXNzZXMvbWRzX3JlbmRlcmVyJ1xuY3JlYXRlVmFsaWRhdG9yICAgPSByZXF1aXJlICdjb2RlbWlycm9yLXRleHRsaW50J1xuTWRzUmVuZGVyZXIgICAgICAgPSBuZXcgY2xzTWRzUmVuZGVyZXJcbk1kc1JlbmRlcmVyLnJlcXVlc3RBY2NlcHQoKVxuXG53ZWJGcmFtZS5zZXRab29tTGV2ZWxMaW1pdHMoMSwgMSlcblxuQ29kZU1pcnJvciA9IHJlcXVpcmUgJ2NvZGVtaXJyb3InXG5yZXF1aXJlICdjb2RlbWlycm9yL21vZGUveG1sL3htbCdcbnJlcXVpcmUgJ2NvZGVtaXJyb3IvbW9kZS9tYXJrZG93bi9tYXJrZG93bidcbnJlcXVpcmUgJ2NvZGVtaXJyb3IvbW9kZS9nZm0vZ2ZtJ1xucmVxdWlyZSAnY29kZW1pcnJvci9hZGRvbi9lZGl0L2NvbnRpbnVlbGlzdCdcbnJlcXVpcmUgXCJjb2RlbWlycm9yL2FkZG9uL2xpbnQvbGludFwiXG5NaWNrckNsaWVudCA9IHJlcXVpcmUgJy4vbW9kdWxlcy9NaWNrckNsaWVudCdcblxuY2xhc3MgRWRpdG9yU3RhdGVzXG4gIHJ1bGVyczogW11cbiAgY3VycmVudFBhZ2U6IG51bGxcbiAgcHJldmlld0luaXRpYWxpemVkOiBmYWxzZVxuICBsYXN0UmVuZGVyZWQ6IHt9XG5cbiAgX2xvY2tDaGFuZ2VkU3RhdHVzOiBmYWxzZVxuICBfaW1hZ2VEaXJlY3Rvcnk6IG51bGxcblxuICBjb25zdHJ1Y3RvcjogKEBjb2RlTWlycm9yLCBAcHJldmlldykgLT5cbiAgICBjb25zb2xlLmxvZyBcIiN7X19kaXJuYW1lfVwiXG4gICAgQGluaXRpYWxpemVFZGl0b3IoKVxuICAgIEBpbml0aWFsaXplUHJldmlldygpXG5cbiAgICBAbWVudSA9IG5ldyBNZHNNZW51IFtcbiAgICAgIHsgbGFiZWw6ICcmVW5kbycsIGFjY2VsZXJhdG9yOiAnQ21kT3JDdHJsK1onLCBjbGljazogKGksIHcpID0+IEBjb2RlTWlycm9yLmV4ZWNDb21tYW5kICd1bmRvJyBpZiB3IGFuZCAhdy5tZHNXaW5kb3cuZnJlZXplIH1cbiAgICAgIHtcbiAgICAgICAgbGFiZWw6ICcmUmVkbydcbiAgICAgICAgYWNjZWxlcmF0b3I6IGRvIC0+IGlmIHByb2Nlc3MucGxhdGZvcm0gaXMgJ3dpbjMyJyB0aGVuICdDb250cm9sK1knIGVsc2UgJ1NoaWZ0K0NtZE9yQ3RybCtaJ1xuICAgICAgICBjbGljazogKGksIHcpID0+IEBjb2RlTWlycm9yLmV4ZWNDb21tYW5kICdyZWRvJyBpZiB3IGFuZCAhdy5tZHNXaW5kb3cuZnJlZXplXG4gICAgICB9XG4gICAgICB7IHR5cGU6ICdzZXBhcmF0b3InIH1cbiAgICAgIHsgbGFiZWw6ICdDdSZ0JywgYWNjZWxlcmF0b3I6ICdDbWRPckN0cmwrWCcsIHJvbGU6ICdjdXQnIH1cbiAgICAgIHsgbGFiZWw6ICcmQ29weScsIGFjY2VsZXJhdG9yOiAnQ21kT3JDdHJsK0MnLCByb2xlOiAnY29weScgfVxuICAgICAgeyBsYWJlbDogJyZQYXN0ZScsIGFjY2VsZXJhdG9yOiAnQ21kT3JDdHJsK1YnLCByb2xlOiAncGFzdGUnIH1cbiAgICAgIHsgbGFiZWw6ICcmRGVsZXRlJywgcm9sZTogJ2RlbGV0ZScgfVxuICAgICAgeyBsYWJlbDogJ1NlbGVjdCAmQWxsJywgYWNjZWxlcmF0b3I6ICdDbWRPckN0cmwrQScsIGNsaWNrOiAoaSwgdykgPT4gQGNvZGVNaXJyb3IuZXhlY0NvbW1hbmQgJ3NlbGVjdEFsbCcgaWYgdyBhbmQgIXcubWRzV2luZG93LmZyZWV6ZSB9XG4gICAgICB7IHR5cGU6ICdzZXBhcmF0b3InLCBwbGF0Zm9ybTogJ2RhcndpbicgfVxuICAgICAgeyBsYWJlbDogJ1NlcnZpY2VzJywgcm9sZTogJ3NlcnZpY2VzJywgc3VibWVudTogW10sIHBsYXRmb3JtOiAnZGFyd2luJyB9XG4gICAgXVxuXG4gICMg44Oa44O844K444Kr44Km44Oz44OI5b6M44CBd2Vidmlld+OBuOOBneOCjOOCkumAgeS/oVxuICByZWZyZXNoUGFnZTogKHJ1bGVycykgPT5cbiAgICAjIEVkaXRvclN0YXRlc+OCr+ODqeOCueOBruWkieaVsHJ1bGVyc+ODquOCueODiOOBuOWFpeOCjOOBpuOAgeS4gOaXpuODmuODvOOCuOOCku+8keOBq+OBmeOCi1xuICAgIEBydWxlcnMgPSBydWxlcnMgaWYgcnVsZXJzP1xuICAgIHBhZ2UgICAgPSAxXG4gICAjIGNvbnNvbGUubG9nIFwiY29tbWVudCAxcGFnZSA9IFwiICsgQHBpY2tVcENvbW1lbnRGcm9tUGFnZSgxKVxuICAgIGNvbnNvbGUubG9nIFwicnVsZXJzLmxlbmd0aCA9IFwiICsgQHJ1bGVycy5sZW5ndGhcbiAgICBjb25zb2xlLmxvZyBAcGlja1VwQ29tbWVudCgpXG4gICAgIyBjb25zb2xlLmxvZyBcImxhc3QgcGFnZSA9IFwiICsgQHBpY2tVcENvbW1lbnRGcm9tUGFnZShAcnVsZXJzLmxlbmd0aCsxKVxuICAgICNjb25zb2xlLmxvZyBAcGlja1VwQ29tbWVudCgpXG5cbiAgICAjIHJ1bGVyTGluZeOBq+OBryctLS0n44Gu6KGM5L2N572u44GM6KiY44GV44KM44Gm44GK44KK44CB44Gd44KM44Go44Ko44OH44Kj44K/5LiK44Gu44Kr44O844K944Or5L2N572u44KS5q+U6LyD44GX44GmcGFnZeOCkuaxuuOCgeOCi1xuICAgIGxpbmVOdW1iZXIgPSBAY29kZU1pcnJvci5nZXRDdXJzb3IoKS5saW5lIHx8IDBcbiAgICBmb3IgcnVsZXJMaW5lIGluIEBydWxlcnNcbiAgICAgIHBhZ2UrKyBpZiBydWxlckxpbmUgPD0gbGluZU51bWJlclxuXG4gICAgIyBydWxlcuioiOeul+W+jOOBq+ODmuODvOOCuOOBruWil+a4m+OBjOOBguOBo+OBn+WgtOWQiOOAgeato+OBl+OBhOODmuODvOOCuOaDheWgseOCkndlYnZpZXfjgbjpgIHkv6FcbiAgICBpZiBAY3VycmVudFBhZ2UgIT0gcGFnZVxuICAgICAgQGN1cnJlbnRQYWdlID0gcGFnZVxuICAgICAgQHByZXZpZXcuc2VuZCAnY3VycmVudFBhZ2UnLCBAY3VycmVudFBhZ2UgaWYgQHByZXZpZXdJbml0aWFsaXplZFxuXG4gICAgJCgnI3BhZ2UtaW5kaWNhdG9yJykudGV4dCBcIlBhZ2UgI3tAY3VycmVudFBhZ2V9IC8gI3tAcnVsZXJzLmxlbmd0aCArIDF9XCJcblxuICBpbml0aWFsaXplUHJldmlldzogPT5cbiAgICAkKEBwcmV2aWV3KVxuICAgICAgLm9uICdkb20tcmVhZHknLCA9PlxuICAgICAgICAjIEZpeCBtaW5pbWl6ZWQgcHJldmlldyAoIzIwKVxuICAgICAgICAjIFtOb3RlXSBodHRwczovL2dpdGh1Yi5jb20vZWxlY3Ryb24vZWxlY3Ryb24vaXNzdWVzLzQ4ODJcbiAgICAgICAgJChAcHJldmlldy5zaGFkb3dSb290KS5hcHBlbmQoJzxzdHlsZT5vYmplY3R7bWluLXdpZHRoOjA7bWluLWhlaWdodDowO308L3N0eWxlPicpXG5cbiAgICAgICMgd2VidmlldyDjgYvjgonjga7pgJrkv6HjgpLlj5fjgZHlj5bjgosgJ2lwYy1tZXNzYWdlJ1xuICAgICAgLm9uICdpcGMtbWVzc2FnZScsIChldikgPT5cbiAgICAgICAgZSA9IGV2Lm9yaWdpbmFsRXZlbnRcblxuICAgICAgICBzd2l0Y2ggZS5jaGFubmVsXG4gICAgICAgICAgd2hlbiAncnVsZXJDaGFuZ2VkJ1xuICAgICAgICAgICAgQHJlZnJlc2hQYWdlIGUuYXJnc1swXVxuICAgICAgICAgIHdoZW4gJ2xpbmtUbydcbiAgICAgICAgICAgIEBvcGVuTGluayBlLmFyZ3NbMF1cbiAgICAgICAgICB3aGVuICdyZW5kZXJlZCdcbiAgICAgICAgICAgIEBsYXN0UmVuZGVyZWQgPSBlLmFyZ3NbMF1cbiAgICAgICAgICAgIHVubGVzcyBAcHJldmlld0luaXRpYWxpemVkXG4gICAgICAgICAgICAgIE1kc1JlbmRlcmVyLnNlbmRUb01haW4gJ3ByZXZpZXdJbml0aWFsaXplZCdcblxuICAgICAgICAgICAgICBAcHJldmlld0luaXRpYWxpemVkID0gdHJ1ZVxuICAgICAgICAgICAgICAkKCdib2R5JykuYWRkQ2xhc3MgJ2luaXRpYWxpemVkLXNsaWRlJ1xuICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgIE1kc1JlbmRlcmVyLl9jYWxsX2V2ZW50IGUuY2hhbm5lbCwgZS5hcmdzLi4uXG4gICAgICAjIHVybOOCkuOCr+ODquODg+OCr+OBl+OBpuaWsOOBl+OBhOOCpuOCpOODs+ODieOCpuOBjOmWi+OBi+OCjOOCi+aZglxuICAgICAgLm9uICduZXctd2luZG93JywgKGUpID0+XG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKVxuICAgICAgICBAb3BlbkxpbmsgZS5vcmlnaW5hbEV2ZW50LnVybFxuXG4gICAgICAub24gJ2RpZC1maW5pc2gtbG9hZCcsIChlKSA9PlxuICAgICAgICBAcHJldmlldy5zZW5kICdjdXJyZW50UGFnZScsIDFcbiAgICAgICAgQHByZXZpZXcuc2VuZCAnc2V0SW1hZ2VEaXJlY3RvcnknLCBAX2ltYWdlRGlyZWN0b3J5XG4gICAgICAgIEBwcmV2aWV3LnNlbmQgJ3JlbmRlcicsIEBjb2RlTWlycm9yLmdldFZhbHVlKCkgICMgcmVuZGVyIOOCpOODmeODs+ODiOmAgeS/oeOBp3J1bGVy56K66KqN44GX44Gm44Oa44O844K45YiH44KK5pu/44KP44KKXG5cbiAgb3Blbkxpbms6IChsaW5rKSA9PlxuICAgIHNoZWxsLm9wZW5FeHRlcm5hbCBsaW5rIGlmIC9eaHR0cHM/OlxcL1xcLy4rLy50ZXN0KGxpbmspXG5cbiAgaW5pdGlhbGl6ZUVkaXRvcjogPT5cbiAgICBAY29kZU1pcnJvci5vbiAnY29udGV4dG1lbnUnLCAoY20sIGUpID0+XG4gICAgICBlLnByZXZlbnREZWZhdWx0KClcbiAgICAgIEBjb2RlTWlycm9yLmZvY3VzKClcbiAgICAgIEBtZW51LnBvcHVwKClcbiAgICAgIGZhbHNlXG5cbiAgICBAY29kZU1pcnJvci5vbiAnY2hhbmdlJywgKGNtLCBjaGcpID0+XG4gICAgICBAcHJldmlldy5zZW5kICdyZW5kZXInLCBjbS5nZXRWYWx1ZSgpXG4gICAgICBNZHNSZW5kZXJlci5zZW5kVG9NYWluICdzZXRDaGFuZ2VkU3RhdHVzJywgdHJ1ZSBpZiAhQF9sb2NrQ2hhbmdlZFN0YXR1c1xuXG4gICAgQGNvZGVNaXJyb3Iub24gJ2N1cnNvckFjdGl2aXR5JywgKGNtKSA9PiB3aW5kb3cuc2V0VGltZW91dCAoPT4gQHJlZnJlc2hQYWdlKCkpLCA1XG5cbiAgc2V0SW1hZ2VEaXJlY3Rvcnk6IChkaXJlY3RvcnkpID0+XG4gICAgaWYgQHByZXZpZXdJbml0aWFsaXplZFxuICAgICAgQHByZXZpZXcuc2VuZCAnc2V0SW1hZ2VEaXJlY3RvcnknLCBkaXJlY3RvcnlcbiAgICAgIEBwcmV2aWV3LnNlbmQgJ3JlbmRlcicsIEBjb2RlTWlycm9yLmdldFZhbHVlKClcbiAgICBlbHNlXG4gICAgICBAX2ltYWdlRGlyZWN0b3J5ID0gZGlyZWN0b3J5XG5cbiAgaW5zZXJ0SW1hZ2U6IChmaWxlUGF0aCkgPT4gQGNvZGVNaXJyb3IucmVwbGFjZVNlbGVjdGlvbihcIiFbXSgje2ZpbGVQYXRoLnJlcGxhY2UoLyAvZywgJyUyMCcpfSlcXG5cIilcblxuICAjKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipUT0RPKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuICBpbnNlcnRWaWRlbzogKGZpbGVQYXRoKSA9PlxuICAgIGNvbnNvbGUubG9nIGZpbGVQYXRoXG4gICMqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG5cbiAgIyBwYWdl5q+O44Gr5Yil44KM44Gf44Kz44Oh44Oz44OI44Gu44Oq44K544OI44KS6L+U44GZXG4gIHBpY2tVcENvbW1lbnQgOiAoKSA9PlxuICAgIHBhZ2VNYXggPSBAcnVsZXJzLmxlbmd0aCArIDFcbiAgICBDb21tZW50RWFjaFBhZ2UgPSBbXVxuICAgIGZvciBpIGluIFsxLi4ucGFnZU1heCsxXVxuICAgICAgY29uc29sZS5sb2cgaVxuICAgICAgQ29tbWVudEVhY2hQYWdlLnB1c2goQHBpY2tVcENvbW1lbnRGcm9tUGFnZShpKSlcbiAgICByZXR1cm4gQ29tbWVudEVhY2hQYWdlXG5cblxuICAjIHsjIyAjI30g44Gn5Zuy44G+44KM44Gf44Kz44Oh44Oz44OI6YOo5YiG44KS5oqc44GN5Ye644GZXG4gICMg44OW44Ot44OD44Kv44Kz44Oh44Oz44OI44Gu5aC05ZCI44GveyMjICMjfeOBruWJjeW+jOOBq+aUueihjOOBjOWFpeOBo+OBpuOBhOOBquOBkeOCjOOBsOOBquOCieOBquOBhFxuICAjIHBpY2tVcENvbW1lbnRGcm9tUGFnZShOdW1iZXIpIC0+IFN0cmluZ1xuICBwaWNrVXBDb21tZW50RnJvbVBhZ2UgOiAocGFnZSkgPT5cbiAgICBpZiBwYWdlPT0xIGFuZCBub3QgQHJ1bGVycy5sZW5ndGhcbiAgICAgIHBhZ2VTdGFydExpbmUgPSAwXG4gICAgICBwYWdlRW5kTGluZSAgID0gQGNvZGVNaXJyb3IubGluZUNvdW50KClcbiAgICAgIGNvbnNvbGUubG9nIFwicGFnZUVuZExpbmUgPSBcIiArIHBhZ2VFbmRMaW5lXG4gICAgZWxzZSBpZiBwYWdlID09IDEgYW5kIEBydWxlcnMubGVuZ3RoICE9IDBcbiAgICAgIHBhZ2VTdGFydExpbmUgPSAwXG4gICAgICBwYWdlRW5kTGluZSAgID0gQHJ1bGVyc1swXVxuICAgIGVsc2UgaWYgcGFnZSA9PSBAcnVsZXJzLmxlbmd0aCArIDFcbiAgICAgIHBhZ2VTdGFydExpbmUgPSBAcnVsZXJzW0BydWxlcnMubGVuZ3RoLTFdXG4gICAgICBwYWdlRW5kTGluZSAgID0gQGNvZGVNaXJyb3IubGluZUNvdW50KClcbiAgICBlbHNlXG4gICAgICBwYWdlU3RhcnRMaW5lID0gQHJ1bGVyc1twYWdlLTJdICsgMVxuICAgICAgcGFnZUVuZExpbmUgICA9IEBydWxlcnNbcGFnZS0xXSArIDFcblxuICAgIFRleHRJbkVkaXRvciA9IEBjb2RlTWlycm9yLmdldFJhbmdlIHtcImxpbmVcIjpwYWdlU3RhcnRMaW5lICwgXCJjaFwiOiAwfSx7XCJsaW5lXCI6cGFnZUVuZExpbmUtMSAsIFwiY2hcIjowIH1cbiAgICByZSA9IC9cXHsjI1tcXHNcXG5dKiguKilbXFxzXFxuXSojI1xcfS9cbiAgICByZXN1bHQgPSBUZXh0SW5FZGl0b3IubWF0Y2gocmUpXG4gICAgY29tbWVudCA9ICcnXG4gICAgaWYocmVzdWx0KVxuICAgICAgY29tbWVudCA9IHJlc3VsdFsxXVxuICAgIHJldHVybiBjb21tZW50XG5cbiAgdXBkYXRlR2xvYmFsU2V0dGluZzogKHByb3AsIHZhbHVlKSA9PlxuICAgIGxhdGVzdFBvcyA9IG51bGxcblxuICAgIGZvciBvYmogaW4gKEBsYXN0UmVuZGVyZWQ/LnNldHRpbmdzUG9zaXRpb24gfHwgW10pXG4gICAgICBsYXRlc3RQb3MgPSBvYmogaWYgb2JqLnByb3BlcnR5IGlzIHByb3BcblxuICAgIGlmIGxhdGVzdFBvcz9cbiAgICAgIEBjb2RlTWlycm9yLnJlcGxhY2VSYW5nZShcbiAgICAgICAgXCIje3Byb3B9OiAje3ZhbHVlfVwiLFxuICAgICAgICBDb2RlTWlycm9yLlBvcyhsYXRlc3RQb3MubGluZUlkeCwgbGF0ZXN0UG9zLmZyb20pLFxuICAgICAgICBDb2RlTWlycm9yLlBvcyhsYXRlc3RQb3MubGluZUlkeCwgbGF0ZXN0UG9zLmZyb20gKyBsYXRlc3RQb3MubGVuZ3RoKSxcbiAgICAgIClcbiAgICBlbHNlXG4gICAgICBAY29kZU1pcnJvci5yZXBsYWNlUmFuZ2UoXG4gICAgICAgIFwiPCEtLSAje3Byb3B9OiAje3ZhbHVlfSAtLT5cXG5cXG5cIixcbiAgICAgICAgQ29kZU1pcnJvci5Qb3MoQGNvZGVNaXJyb3IuZmlyc3RMaW5lKCksIDApXG4gICAgICApXG5cbmxvYWRpbmdTdGF0ZSA9ICdsb2FkaW5nJ1xuXG5cblxuIyB0ZXh0bGludCBydWxlcyBzZXR0aW5nXG5cbm5vQWJ1c2FnZSA9IHJlcXVpcmUgJ3RleHRsaW50LXJ1bGUtamEtbm8tYWJ1c2FnZSdcbm1peGVkUGVyaW9kID0gcmVxdWlyZSAndGV4dGxpbnQtcnVsZS1qYS1uby1taXhlZC1wZXJpb2QnXG5zdWNjZXNzaXZlV29yZCA9IHJlcXVpcmUgJ3RleHRsaW50LXJ1bGUtamEtbm8tc3VjY2Vzc2l2ZS13b3JkJ1xud2Vha1BocmFzZSA9IHJlcXVpcmUgJ3RleHRsaW50LXJ1bGUtamEtbm8td2Vhay1waHJhc2UnXG5tYXhDb21tYSA9IHJlcXVpcmUgJ3RleHRsaW50LXJ1bGUtbWF4LWNvbW1hJ1xua2FuamlDb250aW51b3VzTGVuID0gcmVxdWlyZSAndGV4dGxpbnQtcnVsZS1tYXgta2FuamktY29udGludW91cy1sZW4nXG5tYXhUZW4gPSByZXF1aXJlICd0ZXh0bGludC1ydWxlLW1heC10ZW4nXG5ub0RvdWJsZU5lZ2F0aXZlSmEgPSByZXF1aXJlICd0ZXh0bGludC1ydWxlLW5vLWRvdWJsZS1uZWdhdGl2ZS1qYSdcbm5vRG91YmxlZENvbmp1bmN0aW9uID0gcmVxdWlyZSAndGV4dGxpbnQtcnVsZS1uby1kb3VibGVkLWNvbmp1bmN0aW9uJ1xubm9Eb3VibGVkQ29uanVuY3RpdmVQYXJ0aWNsZUdhID0gcmVxdWlyZSAndGV4dGxpbnQtcnVsZS1uby1kb3VibGVkLWNvbmp1bmN0aXZlLXBhcnRpY2xlLWdhJ1xubm9Eb3VibGVkSm9zaGkgPSByZXF1aXJlICd0ZXh0bGludC1ydWxlLW5vLWRvdWJsZWQtam9zaGknXG5ub0Ryb3BwaW5nVGhlUmEgPSByZXF1aXJlICd0ZXh0bGludC1ydWxlLW5vLWRyb3BwaW5nLXRoZS1yYSdcbm5vRXhjbGFtYXRpb25RdWVzdGlvbk1hcmsgPSByZXF1aXJlICd0ZXh0bGludC1ydWxlLW5vLWV4Y2xhbWF0aW9uLXF1ZXN0aW9uLW1hcmsnXG5ub0hhbmtha3VLYW5hID0gcmVxdWlyZSAndGV4dGxpbnQtcnVsZS1uby1oYW5rYWt1LWthbmEnXG5ub01peERlYXJ1RGVzdW1hc3UgPSByZXF1aXJlICd0ZXh0bGludC1ydWxlLW5vLW1peC1kZWFydS1kZXN1bWFzdSdcbm5vTmZkID0gcmVxdWlyZSAndGV4dGxpbnQtcnVsZS1uby1uZmQnXG5ub1N0YXJ0RHVwbGljYXRlZENvbmp1bmN0aW9uID0gcmVxdWlyZSAndGV4dGxpbnQtcnVsZS1uby1zdGFydC1kdXBsaWNhdGVkLWNvbmp1bmN0aW9uJ1xuXG52YWxpZGF0b3IgPSBjcmVhdGVWYWxpZGF0b3Ioe1xuICBydWxlczoge1xuICAgICdub0FidXNhZ2UnIDogbm9BYnVzYWdlLFxuICAgICdtaXhlZFBlcmlvZCcgOiBtaXhlZFBlcmlvZCxcbiAgICAnc3VjY2Vzc2l2ZVdvcmQnIDogc3VjY2Vzc2l2ZVdvcmQsXG4gICAgJ3dlYWtQaHJhc2UnIDogd2Vha1BocmFzZSxcbiAgICAnbWF4Q29tbWEnIDogbWF4Q29tbWEsXG4gICAgJ2thbmppQ29udGludW91c0xlbicgOiBrYW5qaUNvbnRpbnVvdXNMZW4sXG4gICAgJ21heFRlbicgOiBtYXhUZW4sXG4gICAgJ25vRG91YmxlZE5lZ2F0aXZlSmEnIDogbm9Eb3VibGVOZWdhdGl2ZUphLFxuICAgICdub0RvdWJsZWRDb25qdW5jdGlvbicgOiBub0RvdWJsZWRDb25qdW5jdGlvbixcbiAgICAnbm9Eb3VibGVkQ29uanVuY3RpdmVQYXJ0aWNsZUdhJyA6IG5vRG91YmxlZENvbmp1bmN0aXZlUGFydGljbGVHYSxcbiAgICAnbm9Eb3VibGVkSm9zaGknIDogbm9Eb3VibGVkSm9zaGksXG4gICAgJ25vRHJvcHBpbmdUaGVSYScgOiBub0Ryb3BwaW5nVGhlUmEsXG4gICAgJ25vRXhjbGFtYXRpb25RdWVzdGlvbk1hcmsnIDogbm9FeGNsYW1hdGlvblF1ZXN0aW9uTWFyayxcbiAgICAnbm9IYW5rYWt1S2FuYScgOiBub0hhbmtha3VLYW5hLFxuICAgICdub01peERlYXJ1RGVzdW1hc3UnIDogbm9NaXhEZWFydURlc3VtYXN1LFxuICAgICdub05mZCcgOiBub05mZCxcbiAgICAnbm9TdGFydER1cGxpY2F0ZWRDb25qdW5jdGlvbicgOiBub1N0YXJ0RHVwbGljYXRlZENvbmp1bmN0aW9uXG4gIH1cbiAgfSk7XG5kb2N1bWVudC5hZGRFdmVudExpc3RlbmVyIFwiRE9NQ29udGVudExvYWRlZFwiLCAoZXZlbnQpPT5cblxuICAjIGNsaWVudC5zZW5kIFwibW9ybmluZ1wiLFxuICAjICAgXCJmcm9tXCI6IHNldHRpbmcuaWQsXG4gICMgICBcInRvXCIgOiBcImxhbmRcIixcbiAgIyAgIFwiYm9keVwiOlxuICAjICAgICBcImNvbnRlbnRcIjogXCJoZWxsbyEgbGFuZCEgaSdtIGluZGV4XCJcblxuXG5kbyAtPlxuICBzbGlkZUhUTUwgPSBcIlwiXG4gIGVkaXRvclN0YXRlcyA9IG5ldyBFZGl0b3JTdGF0ZXMoXG4gICAgQ29kZU1pcnJvci5mcm9tVGV4dEFyZWEoJCgnI2VkaXRvcicpWzBdLFxuICAgICAgIyBnZm0gOiBHaXRodWIgRmxhdm9yZWQgTW9kZVxuICAgICAgbW9kZTogJ2dmbSdcbiAgICAgICN0aGVtZTogJ2Jhc2UxNi1saWdodCdcbiAgICAgIGxpbmVXcmFwcGluZzogdHJ1ZVxuICAgICAgbGluZU51bWJlcnM6IHRydWVcbiAgICAgIGRyYWdEcm9wOiBmYWxzZVxuICAgICAgZ3V0dGVyczogW1wiQ29kZU1pcnJvci1saW50LW1hcmtlcnNcIl1cbiAgICAgIGxpbnQ6IHtcbiAgICAgICAgIFwiZ2V0QW5ub3RhdGlvbnNcIjogdmFsaWRhdG9yLFxuICAgICAgICAgXCJhc3luY1wiOiB0cnVlXG4gICAgICB9XG4gICAgICBleHRyYUtleXM6XG4gICAgICAgIEVudGVyOiAnbmV3bGluZUFuZEluZGVudENvbnRpbnVlTWFya2Rvd25MaXN0J1xuICAgICksXG4gICAgJCgnI3ByZXZpZXcnKVswXVxuICApXG5cblxuXG4gICMgVmlldyBtb2Rlc1xuICAkKCcudmlld21vZGUtYnRuW2RhdGEtdmlld21vZGVdJykuY2xpY2sgLT4gTWRzUmVuZGVyZXIuc2VuZFRvTWFpbigndmlld01vZGUnLCAkKHRoaXMpLmF0dHIoJ2RhdGEtdmlld21vZGUnKSlcblxuICAjIFBERiBFeHBvcnQgYnV0dG9uXG4gICQoJyNwZGYtZXhwb3J0JykuY2xpY2sgLT4gaXBjLnNlbmQgJ1BkZkV4cG9ydCdcblxuICAjIEZpbGUgRCZEXG4gICQoZG9jdW1lbnQpXG4gICAgLm9uICdkcmFnb3ZlcicsICAtPiBmYWxzZVxuICAgIC5vbiAnZHJhZ2xlYXZlJywgLT4gZmFsc2VcbiAgICAub24gJ2RyYWdlbmQnLCAgIC0+IGZhbHNlXG4gICAgLm9uICdkcm9wJywgICAgICAoZSkgPT5cbiAgICAgIGUucHJldmVudERlZmF1bHQoKVxuICAgICAgcmV0dXJuIGZhbHNlIHVubGVzcyAoZiA9IGUub3JpZ2luYWxFdmVudC5kYXRhVHJhbnNmZXI/LmZpbGVzP1swXSk/XG4gICAgICBjb25zb2xlLmxvZyBmXG4gICAgICBpZiBmLnR5cGUuc3RhcnRzV2l0aCgnaW1hZ2UnKVxuICAgICAgICBlZGl0b3JTdGF0ZXMuaW5zZXJ0SW1hZ2UgZi5wYXRoXG4gICAgICBlbHNlIGlmIGYudHlwZS5zdGFydHNXaXRoKCd0ZXh0JykgfHwgZi50eXBlIGlzICcnXG4gICAgICAgIE1kc1JlbmRlcmVyLnNlbmRUb01haW4gJ2xvYWRGcm9tRmlsZScsIGYucGF0aCBpZiBmLnBhdGg/XG4gICAgICBlbHNlIGlmIGYudHlwZS5zdGFydHNXaXRoKCd2aWRlbycpXG4gICAgICAgIGVkaXRvclN0YXRlcy5pbnNlcnRWaWRlbyBmLnBhdGhcblxuICAgICAgZmFsc2VcblxuICAjIFNwbGl0dGVyXG4gIGRyYWdnaW5nU3BsaXR0ZXIgICAgICA9IGZhbHNlXG4gIGRyYWdnaW5nU3BsaXRQb3NpdGlvbiA9IHVuZGVmaW5lZFxuXG4gIHNldFNwbGl0dGVyID0gKHNwbGl0UG9pbnQpIC0+XG4gICAgc3BsaXRQb2ludCA9IE1hdGgubWluKDAuOCwgTWF0aC5tYXgoMC4yLCBwYXJzZUZsb2F0KHNwbGl0UG9pbnQpKSlcblxuICAgICQoJy5wYW5lLm1hcmtkb3duJykuY3NzKCdmbGV4LWdyb3cnLCBzcGxpdFBvaW50ICogMTAwKVxuICAgICQoJy5wYW5lLnByZXZpZXcnKS5jc3MoJ2ZsZXgtZ3JvdycsICgxIC0gc3BsaXRQb2ludCkgKiAxMDApXG5cbiAgICByZXR1cm4gc3BsaXRQb2ludFxuXG4gIHNldEVkaXRvckNvbmZpZyA9IChlZGl0b3JDb25maWcpIC0+XG4gICAgZWRpdG9yID0gJChlZGl0b3JTdGF0ZXMuY29kZU1pcnJvcj8uZ2V0V3JhcHBlckVsZW1lbnQoKSlcbiAgICBlZGl0b3IuY3NzKCdmb250LWZhbWlseScsIGVkaXRvckNvbmZpZy5mb250RmFtaWx5KSBpZiBlZGl0b3I/XG4gICAgZWRpdG9yLmNzcygnZm9udC1zaXplJywgZWRpdG9yQ29uZmlnLmZvbnRTaXplKSBpZiBlZGl0b3I/XG5cbiAgJCgnLnBhbmUtc3BsaXR0ZXInKVxuICAgIC5tb3VzZWRvd24gLT5cbiAgICAgIGRyYWdnaW5nU3BsaXR0ZXIgPSB0cnVlXG4gICAgICBkcmFnZ2luZ1NwbGl0UG9zaXRpb24gPSB1bmRlZmluZWRcblxuICAgIC5kYmxjbGljayAtPlxuICAgICAgTWRzUmVuZGVyZXIuc2VuZFRvTWFpbiAnc2V0Q29uZmlnJywgJ3NwbGl0dGVyUG9zaXRpb24nLCBzZXRTcGxpdHRlcigwLjUpXG5cbiAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIgJ21vdXNlbW92ZScsIChlKSAtPlxuICAgIGlmIGRyYWdnaW5nU3BsaXR0ZXJcbiAgICAgIGRyYWdnaW5nU3BsaXRQb3NpdGlvbiA9IHNldFNwbGl0dGVyIE1hdGgubWluKE1hdGgubWF4KDAsIGUuY2xpZW50WCksIGRvY3VtZW50LmJvZHkuY2xpZW50V2lkdGgpIC8gZG9jdW1lbnQuYm9keS5jbGllbnRXaWR0aFxuICAsIGZhbHNlXG5cbiAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIgJ21vdXNldXAnLCAoZSkgLT5cbiAgICBkcmFnZ2luZ1NwbGl0dGVyID0gZmFsc2VcbiAgICBNZHNSZW5kZXJlci5zZW5kVG9NYWluICdzZXRDb25maWcnLCAnc3BsaXR0ZXJQb3NpdGlvbicsIGRyYWdnaW5nU3BsaXRQb3NpdGlvbiBpZiBkcmFnZ2luZ1NwbGl0UG9zaXRpb24/XG4gICwgZmFsc2VcblxuICByZXNwb25zZVBkZk9wdHMgPSBudWxsXG5cbiAgIyBFdmVudHNcbiAgTWRzUmVuZGVyZXJcbiAgICAub24gJ3B1Ymxpc2hQZGYnLCAoZm5hbWUpIC0+XG4gICAgICBlZGl0b3JTdGF0ZXMuY29kZU1pcnJvci5nZXRJbnB1dEZpZWxkKCkuYmx1cigpXG4gICAgICAkKCdib2R5JykuYWRkQ2xhc3MgJ2V4cG9ydGluZy1wZGYnXG5cbiAgICAgIGVkaXRvclN0YXRlcy5wcmV2aWV3LnNlbmQgJ3JlcXVlc3RQZGZPcHRpb25zJywgeyBmaWxlbmFtZTogZm5hbWUgfVxuXG4gICAgLm9uICdyZXNwb25zZVBkZk9wdGlvbnMnLCAob3B0cykgLT5cbiAgICAgICMgV2FpdCBsb2FkaW5nIHJlc291cmNlc1xuICAgICAgc3RhcnRQdWJsaXNoID0gLT5cbiAgICAgICAgaWYgbG9hZGluZ1N0YXRlIGlzICdsb2FkaW5nJ1xuICAgICAgICAgIHNldFRpbWVvdXQgc3RhcnRQdWJsaXNoLCAyNTBcbiAgICAgICAgZWxzZVxuICAgICAgICAgIGVkaXRvclN0YXRlcy5wcmV2aWV3LnByaW50VG9QREZcbiAgICAgICAgICAgIG1hcmdpbnNUeXBlOiAxXG4gICAgICAgICAgICBwYWdlU2l6ZTogb3B0cy5leHBvcnRTaXplXG4gICAgICAgICAgICBwcmludEJhY2tncm91bmQ6IHRydWVcbiAgICAgICAgICAsIChlcnIsIGRhdGEpIC0+XG4gICAgICAgICAgICB1bmxlc3MgZXJyXG4gICAgICAgICAgICAgIE1kc1JlbmRlcmVyLnNlbmRUb01haW4gJ3dyaXRlRmlsZScsIG9wdHMuZmlsZW5hbWUsIGRhdGEsIHsgZmluYWxpemVkOiAndW5mcmVlemUnIH1cbiAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgTWRzUmVuZGVyZXIuc2VuZFRvTWFpbiAndW5mcmVlemUnXG5cbiAgICAgIHNldFRpbWVvdXQgc3RhcnRQdWJsaXNoLCA1MDBcblxuICAgIC5vbiAndW5mcmVlemVkJywgLT5cbiAgICAgIGVkaXRvclN0YXRlcy5wcmV2aWV3LnNlbmQgJ3VuZnJlZXplJ1xuICAgICAgJCgnYm9keScpLnJlbW92ZUNsYXNzICdleHBvcnRpbmctcGRmJ1xuXG4gICAgLm9uICdsb2FkVGV4dCcsIChidWZmZXIpIC0+XG4gICAgICBlZGl0b3JTdGF0ZXMuX2xvY2tDaGFuZ2VkU3RhdHVzID0gdHJ1ZVxuICAgICAgZWRpdG9yU3RhdGVzLmNvZGVNaXJyb3Iuc2V0VmFsdWUgYnVmZmVyXG4gICAgICBlZGl0b3JTdGF0ZXMuY29kZU1pcnJvci5jbGVhckhpc3RvcnkoKVxuICAgICAgZWRpdG9yU3RhdGVzLl9sb2NrQ2hhbmdlZFN0YXR1cyA9IGZhbHNlXG5cbiAgICAub24gJ3NldEltYWdlRGlyZWN0b3J5JywgKGRpcmVjdG9yaWVzKSAtPiBlZGl0b3JTdGF0ZXMuc2V0SW1hZ2VEaXJlY3RvcnkgZGlyZWN0b3JpZXNcblxuICAgICMgc2VuZCB0ZXh0IHRvIHNhdmUgdG8gbWFpbiBwcm9jZXNzIGFuZCByZWxvYWRcbiAgICAub24gJ3NhdmUnLCAoZm5hbWUsIHRyaWdnZXJzID0ge30pIC0+XG4gICAgICBNZHNSZW5kZXJlci5zZW5kVG9NYWluICd3cml0ZUZpbGUnLCBmbmFtZSwgZWRpdG9yU3RhdGVzLmNvZGVNaXJyb3IuZ2V0VmFsdWUoKSwgdHJpZ2dlcnNcbiAgICAgIE1kc1JlbmRlcmVyLnNlbmRUb01haW4gJ2luaXRpYWxpemVTdGF0ZScsIGZuYW1lXG5cbiAgICAub24gJ3ZpZXdNb2RlJywgKG1vZGUpIC0+XG4gICAgICBzd2l0Y2ggbW9kZVxuICAgICAgICB3aGVuICdtYXJrZG93bidcbiAgICAgICAgICBlZGl0b3JTdGF0ZXMucHJldmlldy5zZW5kICdzZXRDbGFzcycsICcnXG4gICAgICAgIHdoZW4gJ3NjcmVlbidcbiAgICAgICAgICBlZGl0b3JTdGF0ZXMucHJldmlldy5zZW5kICdzZXRDbGFzcycsICdzbGlkZS12aWV3IHNjcmVlbidcbiAgICAgICAgd2hlbiAnbGlzdCdcbiAgICAgICAgICBlZGl0b3JTdGF0ZXMucHJldmlldy5zZW5kICdzZXRDbGFzcycsICdzbGlkZS12aWV3IGxpc3QnXG4gICAgICAgIHdoZW4gJ3ByZXNlbi1kZXYnXG4gICAgICAgICAgZWRpdG9yU3RhdGVzLnByZXZpZXcuc2VuZCAnc2V0Q2xhc3MnLCAnc2xpZGUtdmlldyBwcmVzZW4tZGV2J1xuXG4gICAgICAkKCcjcHJldmlldy1tb2RlcycpLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpXG4gICAgICAkKCcudmlld21vZGUtYnRuW2RhdGEtdmlld21vZGVdJykucmVtb3ZlQ2xhc3MoJ2FjdGl2ZScpXG4gICAgICAgIC5maWx0ZXIoXCJbZGF0YS12aWV3bW9kZT0nI3ttb2RlfSddXCIpLmFkZENsYXNzKCdhY3RpdmUnKVxuXG4gICAgLm9uICdlZGl0Q29tbWFuZCcsIChjb21tYW5kKSAtPiBlZGl0b3JTdGF0ZXMuY29kZU1pcnJvci5leGVjQ29tbWFuZChjb21tYW5kKVxuXG4gICAgLm9uICdvcGVuRGV2VG9vbCcsIC0+XG4gICAgICBpZiBlZGl0b3JTdGF0ZXMucHJldmlldy5pc0RldlRvb2xzT3BlbmVkKClcbiAgICAgICAgZWRpdG9yU3RhdGVzLnByZXZpZXcuY2xvc2VEZXZUb29scygpXG4gICAgICBlbHNlXG4gICAgICAgIGVkaXRvclN0YXRlcy5wcmV2aWV3Lm9wZW5EZXZUb29scygpXG5cbiAgICAub24gJ3NldEVkaXRvckNvbmZpZycsIChlZGl0b3JDb25maWcpIC0+IHNldEVkaXRvckNvbmZpZyBlZGl0b3JDb25maWdcbiAgICAub24gJ3NldFNwbGl0dGVyJywgKHNwbGlpdGVyUG9zKSAtPiBzZXRTcGxpdHRlciBzcGxpaXRlclBvc1xuICAgIC5vbiAnc2V0VGhlbWUnLCAodGhlbWUpIC0+IGVkaXRvclN0YXRlcy51cGRhdGVHbG9iYWxTZXR0aW5nICckdGhlbWUnLCB0aGVtZVxuICAgIC5vbiAndGhlbWVDaGFuZ2VkJywgKHRoZW1lKSAtPiBNZHNSZW5kZXJlci5zZW5kVG9NYWluICd0aGVtZUNoYW5nZWQnLCB0aGVtZVxuICAgIC5vbiAncmVzb3VyY2VTdGF0ZScsIChzdGF0ZSkgLT4gbG9hZGluZ1N0YXRlID0gc3RhdGVcbiAgIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcblxuICBzZXR0aW5nID1cbiAgICBcImlkXCI6IFwiaW5kZXhcIlxuICAgIFwidXJsXCI6IFwid3M6Ly9hcHBzLndpc2RvbXdlYi5uZXQ6NjQyNjAvd3MvbWlrXCJcbiAgICBcInNpdGVcIjogXCJ0ZXN0XCJcbiAgICBcInRva2VuXCI6IFwiUGFkOjk5NDhcIlxuICBjbGllbnQgPSBuZXcgTWlja3JDbGllbnQoc2V0dGluZylcblxuICBjbGllbnQub24gXCJjYW5SZWNlaXZlRWRpdG9yVGV4dFwiLCAoKT0+XG4gICAgY2xpZW50LnNlbmQgXCJzZW5kRWRpdG9yVGV4dFwiLCB7XG4gICAgICBcInRvXCI6IFwicHJlc2VuSW5kZXhcIlxuICAgICAgXCJib2R5XCI6XG4gICAgICAgIFwiY29udGVudFwiOiBlZGl0b3JTdGF0ZXMuY29kZU1pcnJvci5nZXRWYWx1ZSgpXG4gICAgfVxuICBjbGllbnQub24gXCJjYW5SZWNlaXZlQ29tbWVudFwiLCAoKT0+XG4gICBjbGllbnQuc2VuZCBcInNlbmRDb21tZW50XCIsIHtcbiAgICAgXCJ0b1wiOiBcInByZXNlbkRldkluZGV4XCIsXG4gICAgIFwiYm9keVwiOlxuICAgICAgIFwiY29udGVudFwiOiBlZGl0b3JTdGF0ZXMucGlja1VwQ29tbWVudCgpXG4gICB9XG5cbiAgd2VidmlldyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNwcmV2aWV3JylcbiAgIyBzaW1wbGUgcHJlc2VudGF0aW9uIG1vZGUgb24hXG4gICMgJCgnI3ByZXNlbnRhdGlvbicpLm9uICdjbGljaycsICgpID0+XG4gICMgICB3ZWJ2aWV3LndlYmtpdFJlcXVlc3RGdWxsU2NyZWVuKClcblxuICAjICQoJyNwcmVzZW50YXRpb24nKS5vbiAnY2xpY2snLCAoKSA9PlxuICAjICAgJCgnLnBhbmUubWFya2Rvd24nKS50b2dnbGUoKVxuICAjICAgaXBjLnNlbmQoJ1ByZXNlbnRhdGlvbicpXG5cbiAgIyBpcGMub24gJ2luaXRpYWxpemUnICgpID0+XG5cblxuICAjIGlwYy5vbiBcInByZXNlbnRhdGlvblwiLCAoKSAtPlxuICAjICAgY29uc29sZS5sb2cgXCJyZWNpZXZlIHByZXNlbnRhdGlvblwiXG4gICMgICBpcGMuc2VuZCBcInRleHRTZW5kXCIsIGVkaXRvclN0YXRlcy5jb2RlTWlycm9yLmdldFZhbHVlKClcbiAgIyAgIGNvbnNvbGUubG9nICdzZW5kIHRleHRTZW5kJ1xuXG4gICQoJyNwcmVzZW50YXRpb24nKS5vbiAnY2xpY2snLCAoKSA9PlxuICAgICMgJCgnLnBhbmUubWFya2Rvd24nKS50b2dnbGUoKVxuICAgICMgJCgnLnRvb2xiYXItZm9vdGVyJykudG9nZ2xlKClcbiAgICB3ZWJ2aWV3LnNlbmQgJ3JlcXVlc3RTbGlkZUluZm8nXG4gICAgY29uc29sZS5sb2cgJ3NlbmQgcmVxdWVzdFNsaWRlSW5mbydcblxuICB3ZWJ2aWV3LmFkZEV2ZW50TGlzdGVuZXIgJ2lwYy1tZXNzYWdlJywgKGV2ZW50KSA9PlxuICAgICBzd2l0Y2ggZXZlbnQuY2hhbm5lbFxuICAgICAgIHdoZW4gXCJzZW5kU2xpZGVJbmZvXCIgICAjIHdlYnZpZXcg44GL44KJ44K544Op44Kk44OJ5oOF5aCx44KS5Y+X5L+hXG4gICAgICAgIHNsaWRlSW5mbyA9IGV2ZW50LmFyZ3NbMF1cbiAgICAgICAgY29uc29sZS5sb2cgJ3JlY2VpdmUgc2VuZFNsaWRlSW5mbydcbiAgICAgICAgY29uc29sZS5sb2cgc2xpZGVJbmZvXG4gICAgICAgIGlwYy5zZW5kICd0ZXh0U2VuZCcsIHNsaWRlSW5mb1xuICAgICAgICBjb25zb2xlLmxvZyAnc2VuZCB0ZXh0U2VuZCdcbiAgICAgICAgYnJlYWtcblxuICAgICAgIHdoZW4gXCJyZXF1ZXN0U2xpZGVIVE1MXCJcbiAgICAgICAgd2Vidmlldy5zZW5kICdzZXRTbGlkZScsIHNsaWRlSFRNTFxuICAgICAgICBjb25zb2xlLmxvZyAnc2VuZCBzZXRTbGlkZSdcbiAgICAgICAgYnJlYWtcblxuICBpcGMub24gJ3ByZXNlbkRldkluaXRpYWxpemUnLCAoZSwgdGV4dCkgPT5cbiAgICAgIGNvbnNvbGUubG9nICdyZWNlaXZlIHByZXNlbkRldkluaXRpYWxpemUnXG4gICAgICBjb25zb2xlLmxvZyB0ZXh0XG4gICAgICBzbGlkZUhUTUwgPSB0ZXh0XG5cbiAgaXBjLm9uICdnb1RvUGFnZScsIChlLCBwYWdlKSA9PlxuICAgIGNvbnNvbGUubG9nIHBhZ2VcbiAgICB3ZWJ2aWV3LnNlbmQgJ2dvVG9QYWdlJywgcGFnZVxuXG4gICAgICAjIHdlYnZpZXcg44Gu5rqW5YKZ44GM44Gn44GN44Gm44Gq44GEXG4gICAgICAjIHdlYnZpZXcuc2VuZCAnc2V0U2xpZGUnLCB0ZXh0XG4gICAgICAjIGNvbnNvbGUubG9nICdzZW5kIHNldFNsaWRlJ1xuICAjIGlwYy5vbiAnaW5pdGlhbGl6ZScsICgpID0+XG4gICMgICAkKCcucGFuZS5tYXJrZG93bicpLmh0bWwoKVxuIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG5cblxuICAjIEluaXRpYWxpemVcbiAgZWRpdG9yU3RhdGVzLmNvZGVNaXJyb3IuZm9jdXMoKVxuICBlZGl0b3JTdGF0ZXMucmVmcmVzaFBhZ2UoKVxuIl19
