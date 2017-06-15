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
      CommentEachPage.push(this.pickUpCommentFromPage(i));
    }
    return CommentEachPage;
  };

  EditorStates.prototype.pickUpCommentFromPage = function(page) {
    var TextInEditor, comment, pageEndLine, pageStartLine, re, result;
    if (page === 1) {
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
      return comment;
    } else {
      return comment;
    }
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
  setting = {
    "id": "index",
    "url": "ws://apps.wisdomweb.net:64260/ws/mik",
    "site": "test",
    "token": "Pad:9948"
  };
  client = new MickrClient(setting);
  client.on("canReceiveComment", (function(_this) {
    return function() {
      return client.send("sendComment", {
        "to": "presenIndex",
        "body": {
          "content": editorStates.pickUpComment()
        }
      });
    };
  })(this));
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VzIjpbImluZGV4LmNvZmZlZSJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxJQUFBLHdiQUFBO0VBQUE7OztBQUFBLEdBQUEsR0FBTSxPQUFBLENBQVEsVUFBUixDQUFtQixDQUFDOztBQUMxQixNQUFvQixPQUFBLENBQVEsVUFBUixDQUFwQixFQUFDLGlCQUFELEVBQVE7O0FBQ1IsT0FBQSxHQUFvQixPQUFBLENBQVEsdUJBQVI7O0FBQ3BCLGNBQUEsR0FBb0IsT0FBQSxDQUFRLDJCQUFSOztBQUNwQixlQUFBLEdBQW9CLE9BQUEsQ0FBUSxxQkFBUjs7QUFDcEIsV0FBQSxHQUFvQixJQUFJOztBQUN4QixXQUFXLENBQUMsYUFBWixDQUFBOztBQUVBLFFBQVEsQ0FBQyxrQkFBVCxDQUE0QixDQUE1QixFQUErQixDQUEvQjs7QUFFQSxVQUFBLEdBQWEsT0FBQSxDQUFRLFlBQVI7O0FBQ2IsT0FBQSxDQUFRLHlCQUFSOztBQUNBLE9BQUEsQ0FBUSxtQ0FBUjs7QUFDQSxPQUFBLENBQVEseUJBQVI7O0FBQ0EsT0FBQSxDQUFRLG9DQUFSOztBQUNBLE9BQUEsQ0FBUSw0QkFBUjs7QUFDQSxXQUFBLEdBQWMsT0FBQSxDQUFRLHVCQUFSOztBQUVSO3lCQUNKLE1BQUEsR0FBUTs7eUJBQ1IsV0FBQSxHQUFhOzt5QkFDYixrQkFBQSxHQUFvQjs7eUJBQ3BCLFlBQUEsR0FBYzs7eUJBRWQsa0JBQUEsR0FBb0I7O3lCQUNwQixlQUFBLEdBQWlCOztFQUVKLHNCQUFDLFVBQUQsRUFBYyxPQUFkO0lBQUMsSUFBQyxDQUFBLGFBQUQ7SUFBYSxJQUFDLENBQUEsVUFBRDs7Ozs7Ozs7Ozs7SUFDekIsT0FBTyxDQUFDLEdBQVIsQ0FBWSxFQUFBLEdBQUcsU0FBZjtJQUNBLElBQUMsQ0FBQSxnQkFBRCxDQUFBO0lBQ0EsSUFBQyxDQUFBLGlCQUFELENBQUE7SUFFQSxJQUFDLENBQUEsSUFBRCxHQUFRLElBQUksT0FBSixDQUFZO01BQ2xCO1FBQUUsS0FBQSxFQUFPLE9BQVQ7UUFBa0IsV0FBQSxFQUFhLGFBQS9CO1FBQThDLEtBQUEsRUFBTyxDQUFBLFNBQUEsS0FBQTtpQkFBQSxTQUFDLENBQUQsRUFBSSxDQUFKO1lBQVUsSUFBa0MsQ0FBQSxJQUFNLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxNQUFyRDtxQkFBQSxLQUFDLENBQUEsVUFBVSxDQUFDLFdBQVosQ0FBd0IsTUFBeEIsRUFBQTs7VUFBVjtRQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBckQ7T0FEa0IsRUFFbEI7UUFDRSxLQUFBLEVBQU8sT0FEVDtRQUVFLFdBQUEsRUFBZ0IsQ0FBQSxTQUFBO1VBQUcsSUFBRyxPQUFPLENBQUMsUUFBUixLQUFvQixPQUF2QjttQkFBb0MsWUFBcEM7V0FBQSxNQUFBO21CQUFxRCxvQkFBckQ7O1FBQUgsQ0FBQSxDQUFILENBQUEsQ0FGZjtRQUdFLEtBQUEsRUFBTyxDQUFBLFNBQUEsS0FBQTtpQkFBQSxTQUFDLENBQUQsRUFBSSxDQUFKO1lBQVUsSUFBa0MsQ0FBQSxJQUFNLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxNQUFyRDtxQkFBQSxLQUFDLENBQUEsVUFBVSxDQUFDLFdBQVosQ0FBd0IsTUFBeEIsRUFBQTs7VUFBVjtRQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FIVDtPQUZrQixFQU9sQjtRQUFFLElBQUEsRUFBTSxXQUFSO09BUGtCLEVBUWxCO1FBQUUsS0FBQSxFQUFPLE1BQVQ7UUFBaUIsV0FBQSxFQUFhLGFBQTlCO1FBQTZDLElBQUEsRUFBTSxLQUFuRDtPQVJrQixFQVNsQjtRQUFFLEtBQUEsRUFBTyxPQUFUO1FBQWtCLFdBQUEsRUFBYSxhQUEvQjtRQUE4QyxJQUFBLEVBQU0sTUFBcEQ7T0FUa0IsRUFVbEI7UUFBRSxLQUFBLEVBQU8sUUFBVDtRQUFtQixXQUFBLEVBQWEsYUFBaEM7UUFBK0MsSUFBQSxFQUFNLE9BQXJEO09BVmtCLEVBV2xCO1FBQUUsS0FBQSxFQUFPLFNBQVQ7UUFBb0IsSUFBQSxFQUFNLFFBQTFCO09BWGtCLEVBWWxCO1FBQUUsS0FBQSxFQUFPLGFBQVQ7UUFBd0IsV0FBQSxFQUFhLGFBQXJDO1FBQW9ELEtBQUEsRUFBTyxDQUFBLFNBQUEsS0FBQTtpQkFBQSxTQUFDLENBQUQsRUFBSSxDQUFKO1lBQVUsSUFBdUMsQ0FBQSxJQUFNLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxNQUExRDtxQkFBQSxLQUFDLENBQUEsVUFBVSxDQUFDLFdBQVosQ0FBd0IsV0FBeEIsRUFBQTs7VUFBVjtRQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBM0Q7T0Faa0IsRUFhbEI7UUFBRSxJQUFBLEVBQU0sV0FBUjtRQUFxQixRQUFBLEVBQVUsUUFBL0I7T0Fia0IsRUFjbEI7UUFBRSxLQUFBLEVBQU8sVUFBVDtRQUFxQixJQUFBLEVBQU0sVUFBM0I7UUFBdUMsT0FBQSxFQUFTLEVBQWhEO1FBQW9ELFFBQUEsRUFBVSxRQUE5RDtPQWRrQjtLQUFaO0VBTEc7O3lCQXVCYixXQUFBLEdBQWEsU0FBQyxNQUFEO0FBRVgsUUFBQTtJQUFBLElBQW9CLGNBQXBCO01BQUEsSUFBQyxDQUFBLE1BQUQsR0FBVSxPQUFWOztJQUNBLElBQUEsR0FBVTtJQU1WLFVBQUEsR0FBYSxJQUFDLENBQUEsVUFBVSxDQUFDLFNBQVosQ0FBQSxDQUF1QixDQUFDLElBQXhCLElBQWdDO0FBQzdDO0FBQUEsU0FBQSxzQ0FBQTs7TUFDRSxJQUFVLFNBQUEsSUFBYSxVQUF2QjtRQUFBLElBQUEsR0FBQTs7QUFERjtJQUlBLElBQUcsSUFBQyxDQUFBLFdBQUQsS0FBZ0IsSUFBbkI7TUFDRSxJQUFDLENBQUEsV0FBRCxHQUFlO01BQ2YsSUFBNkMsSUFBQyxDQUFBLGtCQUE5QztRQUFBLElBQUMsQ0FBQSxPQUFPLENBQUMsSUFBVCxDQUFjLGFBQWQsRUFBNkIsSUFBQyxDQUFBLFdBQTlCLEVBQUE7T0FGRjs7V0FJQSxDQUFBLENBQUUsaUJBQUYsQ0FBb0IsQ0FBQyxJQUFyQixDQUEwQixPQUFBLEdBQVEsSUFBQyxDQUFBLFdBQVQsR0FBcUIsS0FBckIsR0FBeUIsQ0FBQyxJQUFDLENBQUEsTUFBTSxDQUFDLE1BQVIsR0FBaUIsQ0FBbEIsQ0FBbkQ7RUFsQlc7O3lCQW9CYixpQkFBQSxHQUFtQixTQUFBO1dBQ2pCLENBQUEsQ0FBRSxJQUFDLENBQUEsT0FBSCxDQUNFLENBQUMsRUFESCxDQUNNLFdBRE4sRUFDbUIsQ0FBQSxTQUFBLEtBQUE7YUFBQSxTQUFBO2VBR2YsQ0FBQSxDQUFFLEtBQUMsQ0FBQSxPQUFPLENBQUMsVUFBWCxDQUFzQixDQUFDLE1BQXZCLENBQThCLGtEQUE5QjtNQUhlO0lBQUEsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQURuQixDQU9FLENBQUMsRUFQSCxDQU9NLGFBUE4sRUFPcUIsQ0FBQSxTQUFBLEtBQUE7YUFBQSxTQUFDLEVBQUQ7QUFDakIsWUFBQTtRQUFBLENBQUEsR0FBSSxFQUFFLENBQUM7QUFFUCxnQkFBTyxDQUFDLENBQUMsT0FBVDtBQUFBLGVBQ08sY0FEUDttQkFFSSxLQUFDLENBQUEsV0FBRCxDQUFhLENBQUMsQ0FBQyxJQUFLLENBQUEsQ0FBQSxDQUFwQjtBQUZKLGVBR08sUUFIUDttQkFJSSxLQUFDLENBQUEsUUFBRCxDQUFVLENBQUMsQ0FBQyxJQUFLLENBQUEsQ0FBQSxDQUFqQjtBQUpKLGVBS08sVUFMUDtZQU1JLEtBQUMsQ0FBQSxZQUFELEdBQWdCLENBQUMsQ0FBQyxJQUFLLENBQUEsQ0FBQTtZQUN2QixJQUFBLENBQU8sS0FBQyxDQUFBLGtCQUFSO2NBQ0UsV0FBVyxDQUFDLFVBQVosQ0FBdUIsb0JBQXZCO2NBRUEsS0FBQyxDQUFBLGtCQUFELEdBQXNCO3FCQUN0QixDQUFBLENBQUUsTUFBRixDQUFTLENBQUMsUUFBVixDQUFtQixtQkFBbkIsRUFKRjs7QUFGRztBQUxQO21CQWFJLFdBQVcsQ0FBQyxXQUFaLG9CQUF3QixDQUFBLENBQUMsQ0FBQyxPQUFTLFNBQUEsV0FBQSxDQUFDLENBQUMsSUFBRixDQUFBLENBQW5DO0FBYko7TUFIaUI7SUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBUHJCLENBeUJFLENBQUMsRUF6QkgsQ0F5Qk0sWUF6Qk4sRUF5Qm9CLENBQUEsU0FBQSxLQUFBO2FBQUEsU0FBQyxDQUFEO1FBQ2hCLENBQUMsQ0FBQyxjQUFGLENBQUE7ZUFDQSxLQUFDLENBQUEsUUFBRCxDQUFVLENBQUMsQ0FBQyxhQUFhLENBQUMsR0FBMUI7TUFGZ0I7SUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBekJwQixDQTZCRSxDQUFDLEVBN0JILENBNkJNLGlCQTdCTixFQTZCeUIsQ0FBQSxTQUFBLEtBQUE7YUFBQSxTQUFDLENBQUQ7UUFDckIsS0FBQyxDQUFBLE9BQU8sQ0FBQyxJQUFULENBQWMsYUFBZCxFQUE2QixDQUE3QjtRQUNBLEtBQUMsQ0FBQSxPQUFPLENBQUMsSUFBVCxDQUFjLG1CQUFkLEVBQW1DLEtBQUMsQ0FBQSxlQUFwQztlQUNBLEtBQUMsQ0FBQSxPQUFPLENBQUMsSUFBVCxDQUFjLFFBQWQsRUFBd0IsS0FBQyxDQUFBLFVBQVUsQ0FBQyxRQUFaLENBQUEsQ0FBeEI7TUFIcUI7SUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBN0J6QjtFQURpQjs7eUJBbUNuQixRQUFBLEdBQVUsU0FBQyxJQUFEO0lBQ1IsSUFBMkIsZ0JBQWdCLENBQUMsSUFBakIsQ0FBc0IsSUFBdEIsQ0FBM0I7YUFBQSxLQUFLLENBQUMsWUFBTixDQUFtQixJQUFuQixFQUFBOztFQURROzt5QkFHVixnQkFBQSxHQUFrQixTQUFBO0lBQ2hCLElBQUMsQ0FBQSxVQUFVLENBQUMsRUFBWixDQUFlLGFBQWYsRUFBOEIsQ0FBQSxTQUFBLEtBQUE7YUFBQSxTQUFDLEVBQUQsRUFBSyxDQUFMO1FBQzVCLENBQUMsQ0FBQyxjQUFGLENBQUE7UUFDQSxLQUFDLENBQUEsVUFBVSxDQUFDLEtBQVosQ0FBQTtRQUNBLEtBQUMsQ0FBQSxJQUFJLENBQUMsS0FBTixDQUFBO2VBQ0E7TUFKNEI7SUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBQTlCO0lBTUEsSUFBQyxDQUFBLFVBQVUsQ0FBQyxFQUFaLENBQWUsUUFBZixFQUF5QixDQUFBLFNBQUEsS0FBQTthQUFBLFNBQUMsRUFBRCxFQUFLLEdBQUw7UUFDdkIsS0FBQyxDQUFBLE9BQU8sQ0FBQyxJQUFULENBQWMsUUFBZCxFQUF3QixFQUFFLENBQUMsUUFBSCxDQUFBLENBQXhCO1FBQ0EsSUFBbUQsQ0FBQyxLQUFDLENBQUEsa0JBQXJEO2lCQUFBLFdBQVcsQ0FBQyxVQUFaLENBQXVCLGtCQUF2QixFQUEyQyxJQUEzQyxFQUFBOztNQUZ1QjtJQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBekI7V0FJQSxJQUFDLENBQUEsVUFBVSxDQUFDLEVBQVosQ0FBZSxnQkFBZixFQUFpQyxDQUFBLFNBQUEsS0FBQTthQUFBLFNBQUMsRUFBRDtlQUFRLE1BQU0sQ0FBQyxVQUFQLENBQWtCLENBQUMsU0FBQTtpQkFBRyxLQUFDLENBQUEsV0FBRCxDQUFBO1FBQUgsQ0FBRCxDQUFsQixFQUF1QyxDQUF2QztNQUFSO0lBQUEsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQUFqQztFQVhnQjs7eUJBYWxCLGlCQUFBLEdBQW1CLFNBQUMsU0FBRDtJQUNqQixJQUFHLElBQUMsQ0FBQSxrQkFBSjtNQUNFLElBQUMsQ0FBQSxPQUFPLENBQUMsSUFBVCxDQUFjLG1CQUFkLEVBQW1DLFNBQW5DO2FBQ0EsSUFBQyxDQUFBLE9BQU8sQ0FBQyxJQUFULENBQWMsUUFBZCxFQUF3QixJQUFDLENBQUEsVUFBVSxDQUFDLFFBQVosQ0FBQSxDQUF4QixFQUZGO0tBQUEsTUFBQTthQUlFLElBQUMsQ0FBQSxlQUFELEdBQW1CLFVBSnJCOztFQURpQjs7eUJBT25CLFdBQUEsR0FBYSxTQUFDLFFBQUQ7V0FBYyxJQUFDLENBQUEsVUFBVSxDQUFDLGdCQUFaLENBQTZCLE1BQUEsR0FBTSxDQUFDLFFBQVEsQ0FBQyxPQUFULENBQWlCLElBQWpCLEVBQXVCLEtBQXZCLENBQUQsQ0FBTixHQUFxQyxLQUFsRTtFQUFkOzt5QkFHYixXQUFBLEdBQWEsU0FBQyxRQUFEO1dBQ1gsT0FBTyxDQUFDLEdBQVIsQ0FBWSxRQUFaO0VBRFc7O3lCQUtiLGFBQUEsR0FBZ0IsU0FBQTtBQUNkLFFBQUE7SUFBQSxPQUFBLEdBQVUsSUFBQyxDQUFBLE1BQU0sQ0FBQyxNQUFSLEdBQWlCO0lBQzNCLGVBQUEsR0FBa0I7QUFDbEIsU0FBUyx5RkFBVDtNQUNFLGVBQWUsQ0FBQyxJQUFoQixDQUFxQixJQUFDLENBQUEscUJBQUQsQ0FBdUIsQ0FBdkIsQ0FBckI7QUFERjtBQUVBLFdBQU87RUFMTzs7eUJBV2hCLHFCQUFBLEdBQXdCLFNBQUMsSUFBRDtBQUN0QixRQUFBO0lBQUEsSUFBRyxJQUFBLEtBQU0sQ0FBVDtNQUNFLGFBQUEsR0FBZ0I7TUFDaEIsV0FBQSxHQUFnQixJQUFDLENBQUEsTUFBTyxDQUFBLENBQUEsRUFGMUI7S0FBQSxNQUdLLElBQUcsSUFBQSxLQUFRLElBQUMsQ0FBQSxNQUFNLENBQUMsTUFBUixHQUFpQixDQUE1QjtNQUNILGFBQUEsR0FBZ0IsSUFBQyxDQUFBLE1BQU8sQ0FBQSxJQUFDLENBQUEsTUFBTSxDQUFDLE1BQVIsR0FBZSxDQUFmO01BQ3hCLFdBQUEsR0FBZ0IsSUFBQyxDQUFBLFVBQVUsQ0FBQyxTQUFaLENBQUEsRUFGYjtLQUFBLE1BQUE7TUFJSCxhQUFBLEdBQWdCLElBQUMsQ0FBQSxNQUFPLENBQUEsSUFBQSxHQUFLLENBQUwsQ0FBUixHQUFrQjtNQUNsQyxXQUFBLEdBQWdCLElBQUMsQ0FBQSxNQUFPLENBQUEsSUFBQSxHQUFLLENBQUwsQ0FBUixHQUFrQixFQUwvQjs7SUFPTCxZQUFBLEdBQWUsSUFBQyxDQUFBLFVBQVUsQ0FBQyxRQUFaLENBQXFCO01BQUMsTUFBQSxFQUFPLGFBQVI7TUFBd0IsSUFBQSxFQUFNLENBQTlCO0tBQXJCLEVBQXNEO01BQUMsTUFBQSxFQUFPLFdBQUEsR0FBWSxDQUFwQjtNQUF3QixJQUFBLEVBQUssQ0FBN0I7S0FBdEQ7SUFDZixFQUFBLEdBQUs7SUFDTCxNQUFBLEdBQVMsWUFBWSxDQUFDLEtBQWIsQ0FBbUIsRUFBbkI7SUFDVCxPQUFBLEdBQVU7SUFDVixJQUFHLE1BQUg7TUFDRSxPQUFBLEdBQVUsTUFBTyxDQUFBLENBQUE7QUFDakIsYUFBTyxRQUZUO0tBQUEsTUFBQTtBQUlFLGFBQU8sUUFKVDs7RUFmc0I7O3lCQXFCeEIsbUJBQUEsR0FBcUIsU0FBQyxJQUFELEVBQU8sS0FBUDtBQUNuQixRQUFBO0lBQUEsU0FBQSxHQUFZO0FBRVo7QUFBQSxTQUFBLHNDQUFBOztNQUNFLElBQW1CLEdBQUcsQ0FBQyxRQUFKLEtBQWdCLElBQW5DO1FBQUEsU0FBQSxHQUFZLElBQVo7O0FBREY7SUFHQSxJQUFHLGlCQUFIO2FBQ0UsSUFBQyxDQUFBLFVBQVUsQ0FBQyxZQUFaLENBQ0ssSUFBRCxHQUFNLElBQU4sR0FBVSxLQURkLEVBRUUsVUFBVSxDQUFDLEdBQVgsQ0FBZSxTQUFTLENBQUMsT0FBekIsRUFBa0MsU0FBUyxDQUFDLElBQTVDLENBRkYsRUFHRSxVQUFVLENBQUMsR0FBWCxDQUFlLFNBQVMsQ0FBQyxPQUF6QixFQUFrQyxTQUFTLENBQUMsSUFBVixHQUFpQixTQUFTLENBQUMsTUFBN0QsQ0FIRixFQURGO0tBQUEsTUFBQTthQU9FLElBQUMsQ0FBQSxVQUFVLENBQUMsWUFBWixDQUNFLE9BQUEsR0FBUSxJQUFSLEdBQWEsSUFBYixHQUFpQixLQUFqQixHQUF1QixVQUR6QixFQUVFLFVBQVUsQ0FBQyxHQUFYLENBQWUsSUFBQyxDQUFBLFVBQVUsQ0FBQyxTQUFaLENBQUEsQ0FBZixFQUF3QyxDQUF4QyxDQUZGLEVBUEY7O0VBTm1COzs7Ozs7QUFrQnZCLFlBQUEsR0FBZTs7QUFNZixTQUFBLEdBQVksT0FBQSxDQUFRLDZCQUFSOztBQUNaLFdBQUEsR0FBYyxPQUFBLENBQVEsa0NBQVI7O0FBQ2QsY0FBQSxHQUFpQixPQUFBLENBQVEscUNBQVI7O0FBQ2pCLFVBQUEsR0FBYSxPQUFBLENBQVEsaUNBQVI7O0FBQ2IsUUFBQSxHQUFXLE9BQUEsQ0FBUSx5QkFBUjs7QUFDWCxrQkFBQSxHQUFxQixPQUFBLENBQVEsd0NBQVI7O0FBQ3JCLE1BQUEsR0FBUyxPQUFBLENBQVEsdUJBQVI7O0FBQ1Qsa0JBQUEsR0FBcUIsT0FBQSxDQUFRLHFDQUFSOztBQUNyQixvQkFBQSxHQUF1QixPQUFBLENBQVEsc0NBQVI7O0FBQ3ZCLDhCQUFBLEdBQWlDLE9BQUEsQ0FBUSxrREFBUjs7QUFDakMsY0FBQSxHQUFpQixPQUFBLENBQVEsZ0NBQVI7O0FBQ2pCLGVBQUEsR0FBa0IsT0FBQSxDQUFRLGtDQUFSOztBQUNsQix5QkFBQSxHQUE0QixPQUFBLENBQVEsNENBQVI7O0FBQzVCLGFBQUEsR0FBZ0IsT0FBQSxDQUFRLCtCQUFSOztBQUNoQixrQkFBQSxHQUFxQixPQUFBLENBQVEscUNBQVI7O0FBQ3JCLEtBQUEsR0FBUSxPQUFBLENBQVEsc0JBQVI7O0FBQ1IsNEJBQUEsR0FBK0IsT0FBQSxDQUFRLCtDQUFSOztBQUUvQixTQUFBLEdBQVksZUFBQSxDQUFnQjtFQUMxQixLQUFBLEVBQU87SUFDTCxXQUFBLEVBQWMsU0FEVDtJQUVMLGFBQUEsRUFBZ0IsV0FGWDtJQUdMLGdCQUFBLEVBQW1CLGNBSGQ7SUFJTCxZQUFBLEVBQWUsVUFKVjtJQUtMLFVBQUEsRUFBYSxRQUxSO0lBTUwsb0JBQUEsRUFBdUIsa0JBTmxCO0lBT0wsUUFBQSxFQUFXLE1BUE47SUFRTCxxQkFBQSxFQUF3QixrQkFSbkI7SUFTTCxzQkFBQSxFQUF5QixvQkFUcEI7SUFVTCxnQ0FBQSxFQUFtQyw4QkFWOUI7SUFXTCxnQkFBQSxFQUFtQixjQVhkO0lBWUwsaUJBQUEsRUFBb0IsZUFaZjtJQWFMLDJCQUFBLEVBQThCLHlCQWJ6QjtJQWNMLGVBQUEsRUFBa0IsYUFkYjtJQWVMLG9CQUFBLEVBQXVCLGtCQWZsQjtJQWdCTCxPQUFBLEVBQVUsS0FoQkw7SUFpQkwsOEJBQUEsRUFBaUMsNEJBakI1QjtHQURtQjtDQUFoQjs7QUFxQlosUUFBUSxDQUFDLGdCQUFULENBQTBCLGtCQUExQixFQUE4QyxDQUFBLFNBQUEsS0FBQTtTQUFBLFNBQUMsS0FBRCxHQUFBO0FBQUEsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQUE5Qzs7QUFTRyxDQUFBLFNBQUE7QUFDRCxNQUFBO0VBQUEsU0FBQSxHQUFZO0VBQ1osWUFBQSxHQUFlLElBQUksWUFBSixDQUNiLFVBQVUsQ0FBQyxZQUFYLENBQXdCLENBQUEsQ0FBRSxTQUFGLENBQWEsQ0FBQSxDQUFBLENBQXJDLEVBRUU7SUFBQSxJQUFBLEVBQU0sS0FBTjtJQUVBLFlBQUEsRUFBYyxJQUZkO0lBR0EsV0FBQSxFQUFhLElBSGI7SUFJQSxRQUFBLEVBQVUsS0FKVjtJQUtBLE9BQUEsRUFBUyxDQUFDLHlCQUFELENBTFQ7SUFNQSxJQUFBLEVBQU07TUFDSCxnQkFBQSxFQUFrQixTQURmO01BRUgsT0FBQSxFQUFTLElBRk47S0FOTjtJQVVBLFNBQUEsRUFDRTtNQUFBLEtBQUEsRUFBTyxzQ0FBUDtLQVhGO0dBRkYsQ0FEYSxFQWdCYixDQUFBLENBQUUsVUFBRixDQUFjLENBQUEsQ0FBQSxDQWhCRDtFQW1CZixPQUFBLEdBQ0U7SUFBQSxJQUFBLEVBQU0sT0FBTjtJQUNBLEtBQUEsRUFBTyxzQ0FEUDtJQUVBLE1BQUEsRUFBUSxNQUZSO0lBR0EsT0FBQSxFQUFTLFVBSFQ7O0VBSUYsTUFBQSxHQUFTLElBQUksV0FBSixDQUFnQixPQUFoQjtFQUVULE1BQU0sQ0FBQyxFQUFQLENBQVUsbUJBQVYsRUFBK0IsQ0FBQSxTQUFBLEtBQUE7V0FBQSxTQUFBO2FBQzdCLE1BQU0sQ0FBQyxJQUFQLENBQVksYUFBWixFQUEyQjtRQUN6QixJQUFBLEVBQU0sYUFEbUI7UUFFekIsTUFBQSxFQUNFO1VBQUEsU0FBQSxFQUFXLFlBQVksQ0FBQyxhQUFiLENBQUEsQ0FBWDtTQUh1QjtPQUEzQjtJQUQ2QjtFQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBL0I7RUFTQSxDQUFBLENBQUUsOEJBQUYsQ0FBaUMsQ0FBQyxLQUFsQyxDQUF3QyxTQUFBO1dBQUcsV0FBVyxDQUFDLFVBQVosQ0FBdUIsVUFBdkIsRUFBbUMsQ0FBQSxDQUFFLElBQUYsQ0FBTyxDQUFDLElBQVIsQ0FBYSxlQUFiLENBQW5DO0VBQUgsQ0FBeEM7RUFHQSxDQUFBLENBQUUsYUFBRixDQUFnQixDQUFDLEtBQWpCLENBQXVCLFNBQUE7V0FBRyxHQUFHLENBQUMsSUFBSixDQUFTLFdBQVQ7RUFBSCxDQUF2QjtFQUdBLENBQUEsQ0FBRSxRQUFGLENBQ0UsQ0FBQyxFQURILENBQ00sVUFETixFQUNtQixTQUFBO1dBQUc7RUFBSCxDQURuQixDQUVFLENBQUMsRUFGSCxDQUVNLFdBRk4sRUFFbUIsU0FBQTtXQUFHO0VBQUgsQ0FGbkIsQ0FHRSxDQUFDLEVBSEgsQ0FHTSxTQUhOLEVBR21CLFNBQUE7V0FBRztFQUFILENBSG5CLENBSUUsQ0FBQyxFQUpILENBSU0sTUFKTixFQUltQixDQUFBLFNBQUEsS0FBQTtXQUFBLFNBQUMsQ0FBRDtBQUNmLFVBQUE7TUFBQSxDQUFDLENBQUMsY0FBRixDQUFBO01BQ0EsSUFBb0IscUhBQXBCO0FBQUEsZUFBTyxNQUFQOztNQUNBLE9BQU8sQ0FBQyxHQUFSLENBQVksQ0FBWjtNQUNBLElBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFQLENBQWtCLE9BQWxCLENBQUg7UUFDRSxZQUFZLENBQUMsV0FBYixDQUF5QixDQUFDLENBQUMsSUFBM0IsRUFERjtPQUFBLE1BRUssSUFBRyxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQVAsQ0FBa0IsTUFBbEIsQ0FBQSxJQUE2QixDQUFDLENBQUMsSUFBRixLQUFVLEVBQTFDO1FBQ0gsSUFBaUQsY0FBakQ7VUFBQSxXQUFXLENBQUMsVUFBWixDQUF1QixjQUF2QixFQUF1QyxDQUFDLENBQUMsSUFBekMsRUFBQTtTQURHO09BQUEsTUFFQSxJQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBUCxDQUFrQixPQUFsQixDQUFIO1FBQ0gsWUFBWSxDQUFDLFdBQWIsQ0FBeUIsQ0FBQyxDQUFDLElBQTNCLEVBREc7O2FBR0w7SUFYZTtFQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FKbkI7RUFrQkEsZ0JBQUEsR0FBd0I7RUFDeEIscUJBQUEsR0FBd0I7RUFFeEIsV0FBQSxHQUFjLFNBQUMsVUFBRDtJQUNaLFVBQUEsR0FBYSxJQUFJLENBQUMsR0FBTCxDQUFTLEdBQVQsRUFBYyxJQUFJLENBQUMsR0FBTCxDQUFTLEdBQVQsRUFBYyxVQUFBLENBQVcsVUFBWCxDQUFkLENBQWQ7SUFFYixDQUFBLENBQUUsZ0JBQUYsQ0FBbUIsQ0FBQyxHQUFwQixDQUF3QixXQUF4QixFQUFxQyxVQUFBLEdBQWEsR0FBbEQ7SUFDQSxDQUFBLENBQUUsZUFBRixDQUFrQixDQUFDLEdBQW5CLENBQXVCLFdBQXZCLEVBQW9DLENBQUMsQ0FBQSxHQUFJLFVBQUwsQ0FBQSxHQUFtQixHQUF2RDtBQUVBLFdBQU87RUFOSztFQVFkLGVBQUEsR0FBa0IsU0FBQyxZQUFEO0FBQ2hCLFFBQUE7SUFBQSxNQUFBLEdBQVMsQ0FBQSxnREFBeUIsQ0FBRSxpQkFBekIsQ0FBQSxVQUFGO0lBQ1QsSUFBc0QsY0FBdEQ7TUFBQSxNQUFNLENBQUMsR0FBUCxDQUFXLGFBQVgsRUFBMEIsWUFBWSxDQUFDLFVBQXZDLEVBQUE7O0lBQ0EsSUFBa0QsY0FBbEQ7YUFBQSxNQUFNLENBQUMsR0FBUCxDQUFXLFdBQVgsRUFBd0IsWUFBWSxDQUFDLFFBQXJDLEVBQUE7O0VBSGdCO0VBS2xCLENBQUEsQ0FBRSxnQkFBRixDQUNFLENBQUMsU0FESCxDQUNhLFNBQUE7SUFDVCxnQkFBQSxHQUFtQjtXQUNuQixxQkFBQSxHQUF3QjtFQUZmLENBRGIsQ0FLRSxDQUFDLFFBTEgsQ0FLWSxTQUFBO1dBQ1IsV0FBVyxDQUFDLFVBQVosQ0FBdUIsV0FBdkIsRUFBb0Msa0JBQXBDLEVBQXdELFdBQUEsQ0FBWSxHQUFaLENBQXhEO0VBRFEsQ0FMWjtFQVFBLE1BQU0sQ0FBQyxnQkFBUCxDQUF3QixXQUF4QixFQUFxQyxTQUFDLENBQUQ7SUFDbkMsSUFBRyxnQkFBSDthQUNFLHFCQUFBLEdBQXdCLFdBQUEsQ0FBWSxJQUFJLENBQUMsR0FBTCxDQUFTLElBQUksQ0FBQyxHQUFMLENBQVMsQ0FBVCxFQUFZLENBQUMsQ0FBQyxPQUFkLENBQVQsRUFBaUMsUUFBUSxDQUFDLElBQUksQ0FBQyxXQUEvQyxDQUFBLEdBQThELFFBQVEsQ0FBQyxJQUFJLENBQUMsV0FBeEYsRUFEMUI7O0VBRG1DLENBQXJDLEVBR0UsS0FIRjtFQUtBLE1BQU0sQ0FBQyxnQkFBUCxDQUF3QixTQUF4QixFQUFtQyxTQUFDLENBQUQ7SUFDakMsZ0JBQUEsR0FBbUI7SUFDbkIsSUFBaUYsNkJBQWpGO2FBQUEsV0FBVyxDQUFDLFVBQVosQ0FBdUIsV0FBdkIsRUFBb0Msa0JBQXBDLEVBQXdELHFCQUF4RCxFQUFBOztFQUZpQyxDQUFuQyxFQUdFLEtBSEY7RUFLQSxlQUFBLEdBQWtCO0VBR2xCLFdBQ0UsQ0FBQyxFQURILENBQ00sWUFETixFQUNvQixTQUFDLEtBQUQ7SUFDaEIsWUFBWSxDQUFDLFVBQVUsQ0FBQyxhQUF4QixDQUFBLENBQXVDLENBQUMsSUFBeEMsQ0FBQTtJQUNBLENBQUEsQ0FBRSxNQUFGLENBQVMsQ0FBQyxRQUFWLENBQW1CLGVBQW5CO1dBRUEsWUFBWSxDQUFDLE9BQU8sQ0FBQyxJQUFyQixDQUEwQixtQkFBMUIsRUFBK0M7TUFBRSxRQUFBLEVBQVUsS0FBWjtLQUEvQztFQUpnQixDQURwQixDQU9FLENBQUMsRUFQSCxDQU9NLG9CQVBOLEVBTzRCLFNBQUMsSUFBRDtBQUV4QixRQUFBO0lBQUEsWUFBQSxHQUFlLFNBQUE7TUFDYixJQUFHLFlBQUEsS0FBZ0IsU0FBbkI7ZUFDRSxVQUFBLENBQVcsWUFBWCxFQUF5QixHQUF6QixFQURGO09BQUEsTUFBQTtlQUdFLFlBQVksQ0FBQyxPQUFPLENBQUMsVUFBckIsQ0FDRTtVQUFBLFdBQUEsRUFBYSxDQUFiO1VBQ0EsUUFBQSxFQUFVLElBQUksQ0FBQyxVQURmO1VBRUEsZUFBQSxFQUFpQixJQUZqQjtTQURGLEVBSUUsU0FBQyxHQUFELEVBQU0sSUFBTjtVQUNBLElBQUEsQ0FBTyxHQUFQO21CQUNFLFdBQVcsQ0FBQyxVQUFaLENBQXVCLFdBQXZCLEVBQW9DLElBQUksQ0FBQyxRQUF6QyxFQUFtRCxJQUFuRCxFQUF5RDtjQUFFLFNBQUEsRUFBVyxVQUFiO2FBQXpELEVBREY7V0FBQSxNQUFBO21CQUdFLFdBQVcsQ0FBQyxVQUFaLENBQXVCLFVBQXZCLEVBSEY7O1FBREEsQ0FKRixFQUhGOztJQURhO1dBY2YsVUFBQSxDQUFXLFlBQVgsRUFBeUIsR0FBekI7RUFoQndCLENBUDVCLENBeUJFLENBQUMsRUF6QkgsQ0F5Qk0sV0F6Qk4sRUF5Qm1CLFNBQUE7SUFDZixZQUFZLENBQUMsT0FBTyxDQUFDLElBQXJCLENBQTBCLFVBQTFCO1dBQ0EsQ0FBQSxDQUFFLE1BQUYsQ0FBUyxDQUFDLFdBQVYsQ0FBc0IsZUFBdEI7RUFGZSxDQXpCbkIsQ0E2QkUsQ0FBQyxFQTdCSCxDQTZCTSxVQTdCTixFQTZCa0IsU0FBQyxNQUFEO0lBQ2QsWUFBWSxDQUFDLGtCQUFiLEdBQWtDO0lBQ2xDLFlBQVksQ0FBQyxVQUFVLENBQUMsUUFBeEIsQ0FBaUMsTUFBakM7SUFDQSxZQUFZLENBQUMsVUFBVSxDQUFDLFlBQXhCLENBQUE7V0FDQSxZQUFZLENBQUMsa0JBQWIsR0FBa0M7RUFKcEIsQ0E3QmxCLENBbUNFLENBQUMsRUFuQ0gsQ0FtQ00sbUJBbkNOLEVBbUMyQixTQUFDLFdBQUQ7V0FBaUIsWUFBWSxDQUFDLGlCQUFiLENBQStCLFdBQS9CO0VBQWpCLENBbkMzQixDQXNDRSxDQUFDLEVBdENILENBc0NNLE1BdENOLEVBc0NjLFNBQUMsS0FBRCxFQUFRLFFBQVI7O01BQVEsV0FBVzs7SUFDN0IsV0FBVyxDQUFDLFVBQVosQ0FBdUIsV0FBdkIsRUFBb0MsS0FBcEMsRUFBMkMsWUFBWSxDQUFDLFVBQVUsQ0FBQyxRQUF4QixDQUFBLENBQTNDLEVBQStFLFFBQS9FO1dBQ0EsV0FBVyxDQUFDLFVBQVosQ0FBdUIsaUJBQXZCLEVBQTBDLEtBQTFDO0VBRlUsQ0F0Q2QsQ0EwQ0UsQ0FBQyxFQTFDSCxDQTBDTSxVQTFDTixFQTBDa0IsU0FBQyxJQUFEO0FBQ2QsWUFBTyxJQUFQO0FBQUEsV0FDTyxVQURQO1FBRUksWUFBWSxDQUFDLE9BQU8sQ0FBQyxJQUFyQixDQUEwQixVQUExQixFQUFzQyxFQUF0QztBQURHO0FBRFAsV0FHTyxRQUhQO1FBSUksWUFBWSxDQUFDLE9BQU8sQ0FBQyxJQUFyQixDQUEwQixVQUExQixFQUFzQyxtQkFBdEM7QUFERztBQUhQLFdBS08sTUFMUDtRQU1JLFlBQVksQ0FBQyxPQUFPLENBQUMsSUFBckIsQ0FBMEIsVUFBMUIsRUFBc0MsaUJBQXRDO0FBREc7QUFMUCxXQU9PLFlBUFA7UUFRSSxZQUFZLENBQUMsT0FBTyxDQUFDLElBQXJCLENBQTBCLFVBQTFCLEVBQXNDLHVCQUF0QztBQVJKO0lBVUEsQ0FBQSxDQUFFLGdCQUFGLENBQW1CLENBQUMsV0FBcEIsQ0FBZ0MsVUFBaEM7V0FDQSxDQUFBLENBQUUsOEJBQUYsQ0FBaUMsQ0FBQyxXQUFsQyxDQUE4QyxRQUE5QyxDQUNFLENBQUMsTUFESCxDQUNVLGtCQUFBLEdBQW1CLElBQW5CLEdBQXdCLElBRGxDLENBQ3NDLENBQUMsUUFEdkMsQ0FDZ0QsUUFEaEQ7RUFaYyxDQTFDbEIsQ0F5REUsQ0FBQyxFQXpESCxDQXlETSxhQXpETixFQXlEcUIsU0FBQyxPQUFEO1dBQWEsWUFBWSxDQUFDLFVBQVUsQ0FBQyxXQUF4QixDQUFvQyxPQUFwQztFQUFiLENBekRyQixDQTJERSxDQUFDLEVBM0RILENBMkRNLGFBM0ROLEVBMkRxQixTQUFBO0lBQ2pCLElBQUcsWUFBWSxDQUFDLE9BQU8sQ0FBQyxnQkFBckIsQ0FBQSxDQUFIO2FBQ0UsWUFBWSxDQUFDLE9BQU8sQ0FBQyxhQUFyQixDQUFBLEVBREY7S0FBQSxNQUFBO2FBR0UsWUFBWSxDQUFDLE9BQU8sQ0FBQyxZQUFyQixDQUFBLEVBSEY7O0VBRGlCLENBM0RyQixDQWlFRSxDQUFDLEVBakVILENBaUVNLGlCQWpFTixFQWlFeUIsU0FBQyxZQUFEO1dBQWtCLGVBQUEsQ0FBZ0IsWUFBaEI7RUFBbEIsQ0FqRXpCLENBa0VFLENBQUMsRUFsRUgsQ0FrRU0sYUFsRU4sRUFrRXFCLFNBQUMsV0FBRDtXQUFpQixXQUFBLENBQVksV0FBWjtFQUFqQixDQWxFckIsQ0FtRUUsQ0FBQyxFQW5FSCxDQW1FTSxVQW5FTixFQW1Fa0IsU0FBQyxLQUFEO1dBQVcsWUFBWSxDQUFDLG1CQUFiLENBQWlDLFFBQWpDLEVBQTJDLEtBQTNDO0VBQVgsQ0FuRWxCLENBb0VFLENBQUMsRUFwRUgsQ0FvRU0sY0FwRU4sRUFvRXNCLFNBQUMsS0FBRDtXQUFXLFdBQVcsQ0FBQyxVQUFaLENBQXVCLGNBQXZCLEVBQXVDLEtBQXZDO0VBQVgsQ0FwRXRCLENBcUVFLENBQUMsRUFyRUgsQ0FxRU0sZUFyRU4sRUFxRXVCLFNBQUMsS0FBRDtXQUFXLFlBQUEsR0FBZTtFQUExQixDQXJFdkI7RUF1RUEsT0FBQSxHQUFVLFFBQVEsQ0FBQyxhQUFULENBQXVCLFVBQXZCO0VBaUJWLENBQUEsQ0FBRSxlQUFGLENBQWtCLENBQUMsRUFBbkIsQ0FBc0IsT0FBdEIsRUFBK0IsQ0FBQSxTQUFBLEtBQUE7V0FBQSxTQUFBO01BRzdCLE9BQU8sQ0FBQyxJQUFSLENBQWEsa0JBQWI7YUFDQSxPQUFPLENBQUMsR0FBUixDQUFZLHVCQUFaO0lBSjZCO0VBQUEsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQUEvQjtFQU1BLE9BQU8sQ0FBQyxnQkFBUixDQUF5QixhQUF6QixFQUF3QyxDQUFBLFNBQUEsS0FBQTtXQUFBLFNBQUMsS0FBRDtBQUNyQyxVQUFBO0FBQUEsY0FBTyxLQUFLLENBQUMsT0FBYjtBQUFBLGFBQ08sZUFEUDtVQUVHLFNBQUEsR0FBWSxLQUFLLENBQUMsSUFBSyxDQUFBLENBQUE7VUFDdkIsT0FBTyxDQUFDLEdBQVIsQ0FBWSx1QkFBWjtVQUNBLE9BQU8sQ0FBQyxHQUFSLENBQVksU0FBWjtVQUNBLEdBQUcsQ0FBQyxJQUFKLENBQVMsVUFBVCxFQUFxQixTQUFyQjtVQUNBLE9BQU8sQ0FBQyxHQUFSLENBQVksZUFBWjtBQUNBO0FBUEgsYUFTTyxrQkFUUDtVQVVHLE9BQU8sQ0FBQyxJQUFSLENBQWEsVUFBYixFQUF5QixTQUF6QjtVQUNBLE9BQU8sQ0FBQyxHQUFSLENBQVksZUFBWjtBQUNBO0FBWkg7SUFEcUM7RUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBQXhDO0VBZUEsR0FBRyxDQUFDLEVBQUosQ0FBTyxxQkFBUCxFQUE4QixDQUFBLFNBQUEsS0FBQTtXQUFBLFNBQUMsQ0FBRCxFQUFJLElBQUo7TUFDMUIsT0FBTyxDQUFDLEdBQVIsQ0FBWSw2QkFBWjtNQUNBLE9BQU8sQ0FBQyxHQUFSLENBQVksSUFBWjthQUNBLFNBQUEsR0FBWTtJQUhjO0VBQUEsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQUE5QjtFQUtBLEdBQUcsQ0FBQyxFQUFKLENBQU8sVUFBUCxFQUFtQixDQUFBLFNBQUEsS0FBQTtXQUFBLFNBQUMsQ0FBRCxFQUFJLElBQUo7TUFDakIsT0FBTyxDQUFDLEdBQVIsQ0FBWSxJQUFaO2FBQ0EsT0FBTyxDQUFDLElBQVIsQ0FBYSxVQUFiLEVBQXlCLElBQXpCO0lBRmlCO0VBQUEsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQUFuQjtFQWFBLFlBQVksQ0FBQyxVQUFVLENBQUMsS0FBeEIsQ0FBQTtTQUNBLFlBQVksQ0FBQyxXQUFiLENBQUE7QUFsT0MsQ0FBQSxDQUFILENBQUEiLCJzb3VyY2VzQ29udGVudCI6WyJpcGMgPSByZXF1aXJlKCdlbGVjdHJvbicpLmlwY1JlbmRlcmVyXG57c2hlbGwsIHdlYkZyYW1lfSA9IHJlcXVpcmUgJ2VsZWN0cm9uJ1xuTWRzTWVudSAgICAgICAgICAgPSByZXF1aXJlICcuL2pzL2NsYXNzZXMvbWRzX21lbnUnXG5jbHNNZHNSZW5kZXJlciAgICA9IHJlcXVpcmUgJy4vanMvY2xhc3Nlcy9tZHNfcmVuZGVyZXInXG5jcmVhdGVWYWxpZGF0b3IgICA9IHJlcXVpcmUgJ2NvZGVtaXJyb3ItdGV4dGxpbnQnXG5NZHNSZW5kZXJlciAgICAgICA9IG5ldyBjbHNNZHNSZW5kZXJlclxuTWRzUmVuZGVyZXIucmVxdWVzdEFjY2VwdCgpXG5cbndlYkZyYW1lLnNldFpvb21MZXZlbExpbWl0cygxLCAxKVxuXG5Db2RlTWlycm9yID0gcmVxdWlyZSAnY29kZW1pcnJvcidcbnJlcXVpcmUgJ2NvZGVtaXJyb3IvbW9kZS94bWwveG1sJ1xucmVxdWlyZSAnY29kZW1pcnJvci9tb2RlL21hcmtkb3duL21hcmtkb3duJ1xucmVxdWlyZSAnY29kZW1pcnJvci9tb2RlL2dmbS9nZm0nXG5yZXF1aXJlICdjb2RlbWlycm9yL2FkZG9uL2VkaXQvY29udGludWVsaXN0J1xucmVxdWlyZSBcImNvZGVtaXJyb3IvYWRkb24vbGludC9saW50XCJcbk1pY2tyQ2xpZW50ID0gcmVxdWlyZSAnLi9tb2R1bGVzL01pY2tyQ2xpZW50J1xuXG5jbGFzcyBFZGl0b3JTdGF0ZXNcbiAgcnVsZXJzOiBbXVxuICBjdXJyZW50UGFnZTogbnVsbFxuICBwcmV2aWV3SW5pdGlhbGl6ZWQ6IGZhbHNlXG4gIGxhc3RSZW5kZXJlZDoge31cblxuICBfbG9ja0NoYW5nZWRTdGF0dXM6IGZhbHNlXG4gIF9pbWFnZURpcmVjdG9yeTogbnVsbFxuXG4gIGNvbnN0cnVjdG9yOiAoQGNvZGVNaXJyb3IsIEBwcmV2aWV3KSAtPlxuICAgIGNvbnNvbGUubG9nIFwiI3tfX2Rpcm5hbWV9XCJcbiAgICBAaW5pdGlhbGl6ZUVkaXRvcigpXG4gICAgQGluaXRpYWxpemVQcmV2aWV3KClcblxuICAgIEBtZW51ID0gbmV3IE1kc01lbnUgW1xuICAgICAgeyBsYWJlbDogJyZVbmRvJywgYWNjZWxlcmF0b3I6ICdDbWRPckN0cmwrWicsIGNsaWNrOiAoaSwgdykgPT4gQGNvZGVNaXJyb3IuZXhlY0NvbW1hbmQgJ3VuZG8nIGlmIHcgYW5kICF3Lm1kc1dpbmRvdy5mcmVlemUgfVxuICAgICAge1xuICAgICAgICBsYWJlbDogJyZSZWRvJ1xuICAgICAgICBhY2NlbGVyYXRvcjogZG8gLT4gaWYgcHJvY2Vzcy5wbGF0Zm9ybSBpcyAnd2luMzInIHRoZW4gJ0NvbnRyb2wrWScgZWxzZSAnU2hpZnQrQ21kT3JDdHJsK1onXG4gICAgICAgIGNsaWNrOiAoaSwgdykgPT4gQGNvZGVNaXJyb3IuZXhlY0NvbW1hbmQgJ3JlZG8nIGlmIHcgYW5kICF3Lm1kc1dpbmRvdy5mcmVlemVcbiAgICAgIH1cbiAgICAgIHsgdHlwZTogJ3NlcGFyYXRvcicgfVxuICAgICAgeyBsYWJlbDogJ0N1JnQnLCBhY2NlbGVyYXRvcjogJ0NtZE9yQ3RybCtYJywgcm9sZTogJ2N1dCcgfVxuICAgICAgeyBsYWJlbDogJyZDb3B5JywgYWNjZWxlcmF0b3I6ICdDbWRPckN0cmwrQycsIHJvbGU6ICdjb3B5JyB9XG4gICAgICB7IGxhYmVsOiAnJlBhc3RlJywgYWNjZWxlcmF0b3I6ICdDbWRPckN0cmwrVicsIHJvbGU6ICdwYXN0ZScgfVxuICAgICAgeyBsYWJlbDogJyZEZWxldGUnLCByb2xlOiAnZGVsZXRlJyB9XG4gICAgICB7IGxhYmVsOiAnU2VsZWN0ICZBbGwnLCBhY2NlbGVyYXRvcjogJ0NtZE9yQ3RybCtBJywgY2xpY2s6IChpLCB3KSA9PiBAY29kZU1pcnJvci5leGVjQ29tbWFuZCAnc2VsZWN0QWxsJyBpZiB3IGFuZCAhdy5tZHNXaW5kb3cuZnJlZXplIH1cbiAgICAgIHsgdHlwZTogJ3NlcGFyYXRvcicsIHBsYXRmb3JtOiAnZGFyd2luJyB9XG4gICAgICB7IGxhYmVsOiAnU2VydmljZXMnLCByb2xlOiAnc2VydmljZXMnLCBzdWJtZW51OiBbXSwgcGxhdGZvcm06ICdkYXJ3aW4nIH1cbiAgICBdXG5cbiAgIyDjg5rjg7zjgrjjgqvjgqbjg7Pjg4jlvozjgIF3ZWJ2aWV344G444Gd44KM44KS6YCB5L+hXG4gIHJlZnJlc2hQYWdlOiAocnVsZXJzKSA9PlxuICAgICMgRWRpdG9yU3RhdGVz44Kv44Op44K544Gu5aSJ5pWwcnVsZXJz44Oq44K544OI44G45YWl44KM44Gm44CB5LiA5pem44Oa44O844K444KS77yR44Gr44GZ44KLXG4gICAgQHJ1bGVycyA9IHJ1bGVycyBpZiBydWxlcnM/XG4gICAgcGFnZSAgICA9IDFcbiAgICAjIGNvbnNvbGUubG9nIFwiMXBhZ2UgPSBcIiArIEBwaWNrVXBDb21tZW50RnJvbVBhZ2UoMSlcbiAgICAjIGNvbnNvbGUubG9nIFwibGFzdCBwYWdlID0gXCIgKyBAcGlja1VwQ29tbWVudEZyb21QYWdlKEBydWxlcnMubGVuZ3RoKzEpXG4gICAgI2NvbnNvbGUubG9nIEBwaWNrVXBDb21tZW50KClcblxuICAgICMgcnVsZXJMaW5l44Gr44GvJy0tLSfjga7ooYzkvY3nva7jgYzoqJjjgZXjgozjgabjgYrjgorjgIHjgZ3jgozjgajjgqjjg4fjgqPjgr/kuIrjga7jgqvjg7zjgr3jg6vkvY3nva7jgpLmr5TovIPjgZfjgaZwYWdl44KS5rG644KB44KLXG4gICAgbGluZU51bWJlciA9IEBjb2RlTWlycm9yLmdldEN1cnNvcigpLmxpbmUgfHwgMFxuICAgIGZvciBydWxlckxpbmUgaW4gQHJ1bGVyc1xuICAgICAgcGFnZSsrIGlmIHJ1bGVyTGluZSA8PSBsaW5lTnVtYmVyXG5cbiAgICAjIHJ1bGVy6KiI566X5b6M44Gr44Oa44O844K444Gu5aKX5rib44GM44GC44Gj44Gf5aC05ZCI44CB5q2j44GX44GE44Oa44O844K45oOF5aCx44KSd2Vidmlld+OBuOmAgeS/oVxuICAgIGlmIEBjdXJyZW50UGFnZSAhPSBwYWdlXG4gICAgICBAY3VycmVudFBhZ2UgPSBwYWdlXG4gICAgICBAcHJldmlldy5zZW5kICdjdXJyZW50UGFnZScsIEBjdXJyZW50UGFnZSBpZiBAcHJldmlld0luaXRpYWxpemVkXG5cbiAgICAkKCcjcGFnZS1pbmRpY2F0b3InKS50ZXh0IFwiUGFnZSAje0BjdXJyZW50UGFnZX0gLyAje0BydWxlcnMubGVuZ3RoICsgMX1cIlxuXG4gIGluaXRpYWxpemVQcmV2aWV3OiA9PlxuICAgICQoQHByZXZpZXcpXG4gICAgICAub24gJ2RvbS1yZWFkeScsID0+XG4gICAgICAgICMgRml4IG1pbmltaXplZCBwcmV2aWV3ICgjMjApXG4gICAgICAgICMgW05vdGVdIGh0dHBzOi8vZ2l0aHViLmNvbS9lbGVjdHJvbi9lbGVjdHJvbi9pc3N1ZXMvNDg4MlxuICAgICAgICAkKEBwcmV2aWV3LnNoYWRvd1Jvb3QpLmFwcGVuZCgnPHN0eWxlPm9iamVjdHttaW4td2lkdGg6MDttaW4taGVpZ2h0OjA7fTwvc3R5bGU+JylcblxuICAgICAgIyB3ZWJ2aWV3IOOBi+OCieOBrumAmuS/oeOCkuWPl+OBkeWPluOCiyAnaXBjLW1lc3NhZ2UnXG4gICAgICAub24gJ2lwYy1tZXNzYWdlJywgKGV2KSA9PlxuICAgICAgICBlID0gZXYub3JpZ2luYWxFdmVudFxuXG4gICAgICAgIHN3aXRjaCBlLmNoYW5uZWxcbiAgICAgICAgICB3aGVuICdydWxlckNoYW5nZWQnXG4gICAgICAgICAgICBAcmVmcmVzaFBhZ2UgZS5hcmdzWzBdXG4gICAgICAgICAgd2hlbiAnbGlua1RvJ1xuICAgICAgICAgICAgQG9wZW5MaW5rIGUuYXJnc1swXVxuICAgICAgICAgIHdoZW4gJ3JlbmRlcmVkJ1xuICAgICAgICAgICAgQGxhc3RSZW5kZXJlZCA9IGUuYXJnc1swXVxuICAgICAgICAgICAgdW5sZXNzIEBwcmV2aWV3SW5pdGlhbGl6ZWRcbiAgICAgICAgICAgICAgTWRzUmVuZGVyZXIuc2VuZFRvTWFpbiAncHJldmlld0luaXRpYWxpemVkJ1xuXG4gICAgICAgICAgICAgIEBwcmV2aWV3SW5pdGlhbGl6ZWQgPSB0cnVlXG4gICAgICAgICAgICAgICQoJ2JvZHknKS5hZGRDbGFzcyAnaW5pdGlhbGl6ZWQtc2xpZGUnXG4gICAgICAgICAgZWxzZVxuICAgICAgICAgICAgTWRzUmVuZGVyZXIuX2NhbGxfZXZlbnQgZS5jaGFubmVsLCBlLmFyZ3MuLi5cbiAgICAgICMgdXJs44KS44Kv44Oq44OD44Kv44GX44Gm5paw44GX44GE44Km44Kk44Oz44OJ44Km44GM6ZaL44GL44KM44KL5pmCXG4gICAgICAub24gJ25ldy13aW5kb3cnLCAoZSkgPT5cbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpXG4gICAgICAgIEBvcGVuTGluayBlLm9yaWdpbmFsRXZlbnQudXJsXG5cbiAgICAgIC5vbiAnZGlkLWZpbmlzaC1sb2FkJywgKGUpID0+XG4gICAgICAgIEBwcmV2aWV3LnNlbmQgJ2N1cnJlbnRQYWdlJywgMVxuICAgICAgICBAcHJldmlldy5zZW5kICdzZXRJbWFnZURpcmVjdG9yeScsIEBfaW1hZ2VEaXJlY3RvcnlcbiAgICAgICAgQHByZXZpZXcuc2VuZCAncmVuZGVyJywgQGNvZGVNaXJyb3IuZ2V0VmFsdWUoKSAgIyByZW5kZXIg44Kk44OZ44Oz44OI6YCB5L+h44GncnVsZXLnorroqo3jgZfjgabjg5rjg7zjgrjliIfjgormm7/jgo/jgopcblxuICBvcGVuTGluazogKGxpbmspID0+XG4gICAgc2hlbGwub3BlbkV4dGVybmFsIGxpbmsgaWYgL15odHRwcz86XFwvXFwvLisvLnRlc3QobGluaylcblxuICBpbml0aWFsaXplRWRpdG9yOiA9PlxuICAgIEBjb2RlTWlycm9yLm9uICdjb250ZXh0bWVudScsIChjbSwgZSkgPT5cbiAgICAgIGUucHJldmVudERlZmF1bHQoKVxuICAgICAgQGNvZGVNaXJyb3IuZm9jdXMoKVxuICAgICAgQG1lbnUucG9wdXAoKVxuICAgICAgZmFsc2VcblxuICAgIEBjb2RlTWlycm9yLm9uICdjaGFuZ2UnLCAoY20sIGNoZykgPT5cbiAgICAgIEBwcmV2aWV3LnNlbmQgJ3JlbmRlcicsIGNtLmdldFZhbHVlKClcbiAgICAgIE1kc1JlbmRlcmVyLnNlbmRUb01haW4gJ3NldENoYW5nZWRTdGF0dXMnLCB0cnVlIGlmICFAX2xvY2tDaGFuZ2VkU3RhdHVzXG5cbiAgICBAY29kZU1pcnJvci5vbiAnY3Vyc29yQWN0aXZpdHknLCAoY20pID0+IHdpbmRvdy5zZXRUaW1lb3V0ICg9PiBAcmVmcmVzaFBhZ2UoKSksIDVcblxuICBzZXRJbWFnZURpcmVjdG9yeTogKGRpcmVjdG9yeSkgPT5cbiAgICBpZiBAcHJldmlld0luaXRpYWxpemVkXG4gICAgICBAcHJldmlldy5zZW5kICdzZXRJbWFnZURpcmVjdG9yeScsIGRpcmVjdG9yeVxuICAgICAgQHByZXZpZXcuc2VuZCAncmVuZGVyJywgQGNvZGVNaXJyb3IuZ2V0VmFsdWUoKVxuICAgIGVsc2VcbiAgICAgIEBfaW1hZ2VEaXJlY3RvcnkgPSBkaXJlY3RvcnlcblxuICBpbnNlcnRJbWFnZTogKGZpbGVQYXRoKSA9PiBAY29kZU1pcnJvci5yZXBsYWNlU2VsZWN0aW9uKFwiIVtdKCN7ZmlsZVBhdGgucmVwbGFjZSgvIC9nLCAnJTIwJyl9KVxcblwiKVxuXG4gICMqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlRPRE8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gIGluc2VydFZpZGVvOiAoZmlsZVBhdGgpID0+XG4gICAgY29uc29sZS5sb2cgZmlsZVBhdGhcbiAgIyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcblxuICAjIHBhZ2Xmr47jgavliKXjgozjgZ/jgrPjg6Hjg7Pjg4jjga7jg6rjgrnjg4jjgpLov5TjgZlcbiAgcGlja1VwQ29tbWVudCA6ICgpID0+XG4gICAgcGFnZU1heCA9IEBydWxlcnMubGVuZ3RoICsgMVxuICAgIENvbW1lbnRFYWNoUGFnZSA9IFtdXG4gICAgZm9yIGkgaW4gWzEuLi5wYWdlTWF4KzFdXG4gICAgICBDb21tZW50RWFjaFBhZ2UucHVzaChAcGlja1VwQ29tbWVudEZyb21QYWdlKGkpKVxuICAgIHJldHVybiBDb21tZW50RWFjaFBhZ2VcblxuXG4gICMgeyMjICMjfSDjgaflm7Ljgb7jgozjgZ/jgrPjg6Hjg7Pjg4jpg6jliIbjgpLmipzjgY3lh7rjgZlcbiAgIyDjg5bjg63jg4Pjgq/jgrPjg6Hjg7Pjg4jjga7loLTlkIjjga97IyMgIyN944Gu5YmN5b6M44Gr5pS56KGM44GM5YWl44Gj44Gm44GE44Gq44GR44KM44Gw44Gq44KJ44Gq44GEXG4gICMgcGlja1VwQ29tbWVudEZyb21QYWdlKE51bWJlcikgLT4gU3RyaW5nXG4gIHBpY2tVcENvbW1lbnRGcm9tUGFnZSA6IChwYWdlKSA9PlxuICAgIGlmIHBhZ2U9PTFcbiAgICAgIHBhZ2VTdGFydExpbmUgPSAwXG4gICAgICBwYWdlRW5kTGluZSAgID0gQHJ1bGVyc1swXVxuICAgIGVsc2UgaWYgcGFnZSA9PSBAcnVsZXJzLmxlbmd0aCArIDFcbiAgICAgIHBhZ2VTdGFydExpbmUgPSBAcnVsZXJzW0BydWxlcnMubGVuZ3RoLTFdXG4gICAgICBwYWdlRW5kTGluZSAgID0gQGNvZGVNaXJyb3IubGluZUNvdW50KClcbiAgICBlbHNlXG4gICAgICBwYWdlU3RhcnRMaW5lID0gQHJ1bGVyc1twYWdlLTJdICsgMVxuICAgICAgcGFnZUVuZExpbmUgICA9IEBydWxlcnNbcGFnZS0xXSArIDFcblxuICAgIFRleHRJbkVkaXRvciA9IEBjb2RlTWlycm9yLmdldFJhbmdlIHtcImxpbmVcIjpwYWdlU3RhcnRMaW5lICwgXCJjaFwiOiAwfSx7XCJsaW5lXCI6cGFnZUVuZExpbmUtMSAsIFwiY2hcIjowIH1cbiAgICByZSA9IC9cXHsjI1tcXHNcXG5dKiguKilbXFxzXFxuXSojI1xcfS9cbiAgICByZXN1bHQgPSBUZXh0SW5FZGl0b3IubWF0Y2gocmUpXG4gICAgY29tbWVudCA9ICcnXG4gICAgaWYocmVzdWx0KVxuICAgICAgY29tbWVudCA9IHJlc3VsdFsxXVxuICAgICAgcmV0dXJuIGNvbW1lbnRcbiAgICBlbHNlXG4gICAgICByZXR1cm4gY29tbWVudFxuXG4gIHVwZGF0ZUdsb2JhbFNldHRpbmc6IChwcm9wLCB2YWx1ZSkgPT5cbiAgICBsYXRlc3RQb3MgPSBudWxsXG5cbiAgICBmb3Igb2JqIGluIChAbGFzdFJlbmRlcmVkPy5zZXR0aW5nc1Bvc2l0aW9uIHx8IFtdKVxuICAgICAgbGF0ZXN0UG9zID0gb2JqIGlmIG9iai5wcm9wZXJ0eSBpcyBwcm9wXG5cbiAgICBpZiBsYXRlc3RQb3M/XG4gICAgICBAY29kZU1pcnJvci5yZXBsYWNlUmFuZ2UoXG4gICAgICAgIFwiI3twcm9wfTogI3t2YWx1ZX1cIixcbiAgICAgICAgQ29kZU1pcnJvci5Qb3MobGF0ZXN0UG9zLmxpbmVJZHgsIGxhdGVzdFBvcy5mcm9tKSxcbiAgICAgICAgQ29kZU1pcnJvci5Qb3MobGF0ZXN0UG9zLmxpbmVJZHgsIGxhdGVzdFBvcy5mcm9tICsgbGF0ZXN0UG9zLmxlbmd0aCksXG4gICAgICApXG4gICAgZWxzZVxuICAgICAgQGNvZGVNaXJyb3IucmVwbGFjZVJhbmdlKFxuICAgICAgICBcIjwhLS0gI3twcm9wfTogI3t2YWx1ZX0gLS0+XFxuXFxuXCIsXG4gICAgICAgIENvZGVNaXJyb3IuUG9zKEBjb2RlTWlycm9yLmZpcnN0TGluZSgpLCAwKVxuICAgICAgKVxuXG5sb2FkaW5nU3RhdGUgPSAnbG9hZGluZydcblxuXG5cbiMgdGV4dGxpbnQgcnVsZXMgc2V0dGluZ1xuXG5ub0FidXNhZ2UgPSByZXF1aXJlICd0ZXh0bGludC1ydWxlLWphLW5vLWFidXNhZ2UnXG5taXhlZFBlcmlvZCA9IHJlcXVpcmUgJ3RleHRsaW50LXJ1bGUtamEtbm8tbWl4ZWQtcGVyaW9kJ1xuc3VjY2Vzc2l2ZVdvcmQgPSByZXF1aXJlICd0ZXh0bGludC1ydWxlLWphLW5vLXN1Y2Nlc3NpdmUtd29yZCdcbndlYWtQaHJhc2UgPSByZXF1aXJlICd0ZXh0bGludC1ydWxlLWphLW5vLXdlYWstcGhyYXNlJ1xubWF4Q29tbWEgPSByZXF1aXJlICd0ZXh0bGludC1ydWxlLW1heC1jb21tYSdcbmthbmppQ29udGludW91c0xlbiA9IHJlcXVpcmUgJ3RleHRsaW50LXJ1bGUtbWF4LWthbmppLWNvbnRpbnVvdXMtbGVuJ1xubWF4VGVuID0gcmVxdWlyZSAndGV4dGxpbnQtcnVsZS1tYXgtdGVuJ1xubm9Eb3VibGVOZWdhdGl2ZUphID0gcmVxdWlyZSAndGV4dGxpbnQtcnVsZS1uby1kb3VibGUtbmVnYXRpdmUtamEnXG5ub0RvdWJsZWRDb25qdW5jdGlvbiA9IHJlcXVpcmUgJ3RleHRsaW50LXJ1bGUtbm8tZG91YmxlZC1jb25qdW5jdGlvbidcbm5vRG91YmxlZENvbmp1bmN0aXZlUGFydGljbGVHYSA9IHJlcXVpcmUgJ3RleHRsaW50LXJ1bGUtbm8tZG91YmxlZC1jb25qdW5jdGl2ZS1wYXJ0aWNsZS1nYSdcbm5vRG91YmxlZEpvc2hpID0gcmVxdWlyZSAndGV4dGxpbnQtcnVsZS1uby1kb3VibGVkLWpvc2hpJ1xubm9Ecm9wcGluZ1RoZVJhID0gcmVxdWlyZSAndGV4dGxpbnQtcnVsZS1uby1kcm9wcGluZy10aGUtcmEnXG5ub0V4Y2xhbWF0aW9uUXVlc3Rpb25NYXJrID0gcmVxdWlyZSAndGV4dGxpbnQtcnVsZS1uby1leGNsYW1hdGlvbi1xdWVzdGlvbi1tYXJrJ1xubm9IYW5rYWt1S2FuYSA9IHJlcXVpcmUgJ3RleHRsaW50LXJ1bGUtbm8taGFua2FrdS1rYW5hJ1xubm9NaXhEZWFydURlc3VtYXN1ID0gcmVxdWlyZSAndGV4dGxpbnQtcnVsZS1uby1taXgtZGVhcnUtZGVzdW1hc3UnXG5ub05mZCA9IHJlcXVpcmUgJ3RleHRsaW50LXJ1bGUtbm8tbmZkJ1xubm9TdGFydER1cGxpY2F0ZWRDb25qdW5jdGlvbiA9IHJlcXVpcmUgJ3RleHRsaW50LXJ1bGUtbm8tc3RhcnQtZHVwbGljYXRlZC1jb25qdW5jdGlvbidcblxudmFsaWRhdG9yID0gY3JlYXRlVmFsaWRhdG9yKHtcbiAgcnVsZXM6IHtcbiAgICAnbm9BYnVzYWdlJyA6IG5vQWJ1c2FnZSxcbiAgICAnbWl4ZWRQZXJpb2QnIDogbWl4ZWRQZXJpb2QsXG4gICAgJ3N1Y2Nlc3NpdmVXb3JkJyA6IHN1Y2Nlc3NpdmVXb3JkLFxuICAgICd3ZWFrUGhyYXNlJyA6IHdlYWtQaHJhc2UsXG4gICAgJ21heENvbW1hJyA6IG1heENvbW1hLFxuICAgICdrYW5qaUNvbnRpbnVvdXNMZW4nIDoga2FuamlDb250aW51b3VzTGVuLFxuICAgICdtYXhUZW4nIDogbWF4VGVuLFxuICAgICdub0RvdWJsZWROZWdhdGl2ZUphJyA6IG5vRG91YmxlTmVnYXRpdmVKYSxcbiAgICAnbm9Eb3VibGVkQ29uanVuY3Rpb24nIDogbm9Eb3VibGVkQ29uanVuY3Rpb24sXG4gICAgJ25vRG91YmxlZENvbmp1bmN0aXZlUGFydGljbGVHYScgOiBub0RvdWJsZWRDb25qdW5jdGl2ZVBhcnRpY2xlR2EsXG4gICAgJ25vRG91YmxlZEpvc2hpJyA6IG5vRG91YmxlZEpvc2hpLFxuICAgICdub0Ryb3BwaW5nVGhlUmEnIDogbm9Ecm9wcGluZ1RoZVJhLFxuICAgICdub0V4Y2xhbWF0aW9uUXVlc3Rpb25NYXJrJyA6IG5vRXhjbGFtYXRpb25RdWVzdGlvbk1hcmssXG4gICAgJ25vSGFua2FrdUthbmEnIDogbm9IYW5rYWt1S2FuYSxcbiAgICAnbm9NaXhEZWFydURlc3VtYXN1JyA6IG5vTWl4RGVhcnVEZXN1bWFzdSxcbiAgICAnbm9OZmQnIDogbm9OZmQsXG4gICAgJ25vU3RhcnREdXBsaWNhdGVkQ29uanVuY3Rpb24nIDogbm9TdGFydER1cGxpY2F0ZWRDb25qdW5jdGlvblxuICB9XG4gIH0pO1xuZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lciBcIkRPTUNvbnRlbnRMb2FkZWRcIiwgKGV2ZW50KT0+XG5cbiAgIyBjbGllbnQuc2VuZCBcIm1vcm5pbmdcIixcbiAgIyAgIFwiZnJvbVwiOiBzZXR0aW5nLmlkLFxuICAjICAgXCJ0b1wiIDogXCJsYW5kXCIsXG4gICMgICBcImJvZHlcIjpcbiAgIyAgICAgXCJjb250ZW50XCI6IFwiaGVsbG8hIGxhbmQhIGknbSBpbmRleFwiXG5cblxuZG8gLT5cbiAgc2xpZGVIVE1MID0gXCJcIlxuICBlZGl0b3JTdGF0ZXMgPSBuZXcgRWRpdG9yU3RhdGVzKFxuICAgIENvZGVNaXJyb3IuZnJvbVRleHRBcmVhKCQoJyNlZGl0b3InKVswXSxcbiAgICAgICMgZ2ZtIDogR2l0aHViIEZsYXZvcmVkIE1vZGVcbiAgICAgIG1vZGU6ICdnZm0nXG4gICAgICAjdGhlbWU6ICdiYXNlMTYtbGlnaHQnXG4gICAgICBsaW5lV3JhcHBpbmc6IHRydWVcbiAgICAgIGxpbmVOdW1iZXJzOiB0cnVlXG4gICAgICBkcmFnRHJvcDogZmFsc2VcbiAgICAgIGd1dHRlcnM6IFtcIkNvZGVNaXJyb3ItbGludC1tYXJrZXJzXCJdXG4gICAgICBsaW50OiB7XG4gICAgICAgICBcImdldEFubm90YXRpb25zXCI6IHZhbGlkYXRvcixcbiAgICAgICAgIFwiYXN5bmNcIjogdHJ1ZVxuICAgICAgfVxuICAgICAgZXh0cmFLZXlzOlxuICAgICAgICBFbnRlcjogJ25ld2xpbmVBbmRJbmRlbnRDb250aW51ZU1hcmtkb3duTGlzdCdcbiAgICApLFxuICAgICQoJyNwcmV2aWV3JylbMF1cbiAgKVxuXG4gIHNldHRpbmcgPVxuICAgIFwiaWRcIjogXCJpbmRleFwiXG4gICAgXCJ1cmxcIjogXCJ3czovL2FwcHMud2lzZG9td2ViLm5ldDo2NDI2MC93cy9taWtcIlxuICAgIFwic2l0ZVwiOiBcInRlc3RcIlxuICAgIFwidG9rZW5cIjogXCJQYWQ6OTk0OFwiXG4gIGNsaWVudCA9IG5ldyBNaWNrckNsaWVudChzZXR0aW5nKVxuXG4gIGNsaWVudC5vbiBcImNhblJlY2VpdmVDb21tZW50XCIsICgpPT5cbiAgICBjbGllbnQuc2VuZCBcInNlbmRDb21tZW50XCIsIHtcbiAgICAgIFwidG9cIjogXCJwcmVzZW5JbmRleFwiLFxuICAgICAgXCJib2R5XCI6XG4gICAgICAgIFwiY29udGVudFwiOiBlZGl0b3JTdGF0ZXMucGlja1VwQ29tbWVudCgpXG4gICAgfVxuXG5cbiAgIyBWaWV3IG1vZGVzXG4gICQoJy52aWV3bW9kZS1idG5bZGF0YS12aWV3bW9kZV0nKS5jbGljayAtPiBNZHNSZW5kZXJlci5zZW5kVG9NYWluKCd2aWV3TW9kZScsICQodGhpcykuYXR0cignZGF0YS12aWV3bW9kZScpKVxuXG4gICMgUERGIEV4cG9ydCBidXR0b25cbiAgJCgnI3BkZi1leHBvcnQnKS5jbGljayAtPiBpcGMuc2VuZCAnUGRmRXhwb3J0J1xuXG4gICMgRmlsZSBEJkRcbiAgJChkb2N1bWVudClcbiAgICAub24gJ2RyYWdvdmVyJywgIC0+IGZhbHNlXG4gICAgLm9uICdkcmFnbGVhdmUnLCAtPiBmYWxzZVxuICAgIC5vbiAnZHJhZ2VuZCcsICAgLT4gZmFsc2VcbiAgICAub24gJ2Ryb3AnLCAgICAgIChlKSA9PlxuICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpXG4gICAgICByZXR1cm4gZmFsc2UgdW5sZXNzIChmID0gZS5vcmlnaW5hbEV2ZW50LmRhdGFUcmFuc2Zlcj8uZmlsZXM/WzBdKT9cbiAgICAgIGNvbnNvbGUubG9nIGZcbiAgICAgIGlmIGYudHlwZS5zdGFydHNXaXRoKCdpbWFnZScpXG4gICAgICAgIGVkaXRvclN0YXRlcy5pbnNlcnRJbWFnZSBmLnBhdGhcbiAgICAgIGVsc2UgaWYgZi50eXBlLnN0YXJ0c1dpdGgoJ3RleHQnKSB8fCBmLnR5cGUgaXMgJydcbiAgICAgICAgTWRzUmVuZGVyZXIuc2VuZFRvTWFpbiAnbG9hZEZyb21GaWxlJywgZi5wYXRoIGlmIGYucGF0aD9cbiAgICAgIGVsc2UgaWYgZi50eXBlLnN0YXJ0c1dpdGgoJ3ZpZGVvJylcbiAgICAgICAgZWRpdG9yU3RhdGVzLmluc2VydFZpZGVvIGYucGF0aFxuXG4gICAgICBmYWxzZVxuXG4gICMgU3BsaXR0ZXJcbiAgZHJhZ2dpbmdTcGxpdHRlciAgICAgID0gZmFsc2VcbiAgZHJhZ2dpbmdTcGxpdFBvc2l0aW9uID0gdW5kZWZpbmVkXG5cbiAgc2V0U3BsaXR0ZXIgPSAoc3BsaXRQb2ludCkgLT5cbiAgICBzcGxpdFBvaW50ID0gTWF0aC5taW4oMC44LCBNYXRoLm1heCgwLjIsIHBhcnNlRmxvYXQoc3BsaXRQb2ludCkpKVxuXG4gICAgJCgnLnBhbmUubWFya2Rvd24nKS5jc3MoJ2ZsZXgtZ3JvdycsIHNwbGl0UG9pbnQgKiAxMDApXG4gICAgJCgnLnBhbmUucHJldmlldycpLmNzcygnZmxleC1ncm93JywgKDEgLSBzcGxpdFBvaW50KSAqIDEwMClcblxuICAgIHJldHVybiBzcGxpdFBvaW50XG5cbiAgc2V0RWRpdG9yQ29uZmlnID0gKGVkaXRvckNvbmZpZykgLT5cbiAgICBlZGl0b3IgPSAkKGVkaXRvclN0YXRlcy5jb2RlTWlycm9yPy5nZXRXcmFwcGVyRWxlbWVudCgpKVxuICAgIGVkaXRvci5jc3MoJ2ZvbnQtZmFtaWx5JywgZWRpdG9yQ29uZmlnLmZvbnRGYW1pbHkpIGlmIGVkaXRvcj9cbiAgICBlZGl0b3IuY3NzKCdmb250LXNpemUnLCBlZGl0b3JDb25maWcuZm9udFNpemUpIGlmIGVkaXRvcj9cblxuICAkKCcucGFuZS1zcGxpdHRlcicpXG4gICAgLm1vdXNlZG93biAtPlxuICAgICAgZHJhZ2dpbmdTcGxpdHRlciA9IHRydWVcbiAgICAgIGRyYWdnaW5nU3BsaXRQb3NpdGlvbiA9IHVuZGVmaW5lZFxuXG4gICAgLmRibGNsaWNrIC0+XG4gICAgICBNZHNSZW5kZXJlci5zZW5kVG9NYWluICdzZXRDb25maWcnLCAnc3BsaXR0ZXJQb3NpdGlvbicsIHNldFNwbGl0dGVyKDAuNSlcblxuICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lciAnbW91c2Vtb3ZlJywgKGUpIC0+XG4gICAgaWYgZHJhZ2dpbmdTcGxpdHRlclxuICAgICAgZHJhZ2dpbmdTcGxpdFBvc2l0aW9uID0gc2V0U3BsaXR0ZXIgTWF0aC5taW4oTWF0aC5tYXgoMCwgZS5jbGllbnRYKSwgZG9jdW1lbnQuYm9keS5jbGllbnRXaWR0aCkgLyBkb2N1bWVudC5ib2R5LmNsaWVudFdpZHRoXG4gICwgZmFsc2VcblxuICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lciAnbW91c2V1cCcsIChlKSAtPlxuICAgIGRyYWdnaW5nU3BsaXR0ZXIgPSBmYWxzZVxuICAgIE1kc1JlbmRlcmVyLnNlbmRUb01haW4gJ3NldENvbmZpZycsICdzcGxpdHRlclBvc2l0aW9uJywgZHJhZ2dpbmdTcGxpdFBvc2l0aW9uIGlmIGRyYWdnaW5nU3BsaXRQb3NpdGlvbj9cbiAgLCBmYWxzZVxuXG4gIHJlc3BvbnNlUGRmT3B0cyA9IG51bGxcblxuICAjIEV2ZW50c1xuICBNZHNSZW5kZXJlclxuICAgIC5vbiAncHVibGlzaFBkZicsIChmbmFtZSkgLT5cbiAgICAgIGVkaXRvclN0YXRlcy5jb2RlTWlycm9yLmdldElucHV0RmllbGQoKS5ibHVyKClcbiAgICAgICQoJ2JvZHknKS5hZGRDbGFzcyAnZXhwb3J0aW5nLXBkZidcblxuICAgICAgZWRpdG9yU3RhdGVzLnByZXZpZXcuc2VuZCAncmVxdWVzdFBkZk9wdGlvbnMnLCB7IGZpbGVuYW1lOiBmbmFtZSB9XG5cbiAgICAub24gJ3Jlc3BvbnNlUGRmT3B0aW9ucycsIChvcHRzKSAtPlxuICAgICAgIyBXYWl0IGxvYWRpbmcgcmVzb3VyY2VzXG4gICAgICBzdGFydFB1Ymxpc2ggPSAtPlxuICAgICAgICBpZiBsb2FkaW5nU3RhdGUgaXMgJ2xvYWRpbmcnXG4gICAgICAgICAgc2V0VGltZW91dCBzdGFydFB1Ymxpc2gsIDI1MFxuICAgICAgICBlbHNlXG4gICAgICAgICAgZWRpdG9yU3RhdGVzLnByZXZpZXcucHJpbnRUb1BERlxuICAgICAgICAgICAgbWFyZ2luc1R5cGU6IDFcbiAgICAgICAgICAgIHBhZ2VTaXplOiBvcHRzLmV4cG9ydFNpemVcbiAgICAgICAgICAgIHByaW50QmFja2dyb3VuZDogdHJ1ZVxuICAgICAgICAgICwgKGVyciwgZGF0YSkgLT5cbiAgICAgICAgICAgIHVubGVzcyBlcnJcbiAgICAgICAgICAgICAgTWRzUmVuZGVyZXIuc2VuZFRvTWFpbiAnd3JpdGVGaWxlJywgb3B0cy5maWxlbmFtZSwgZGF0YSwgeyBmaW5hbGl6ZWQ6ICd1bmZyZWV6ZScgfVxuICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICBNZHNSZW5kZXJlci5zZW5kVG9NYWluICd1bmZyZWV6ZSdcblxuICAgICAgc2V0VGltZW91dCBzdGFydFB1Ymxpc2gsIDUwMFxuXG4gICAgLm9uICd1bmZyZWV6ZWQnLCAtPlxuICAgICAgZWRpdG9yU3RhdGVzLnByZXZpZXcuc2VuZCAndW5mcmVlemUnXG4gICAgICAkKCdib2R5JykucmVtb3ZlQ2xhc3MgJ2V4cG9ydGluZy1wZGYnXG5cbiAgICAub24gJ2xvYWRUZXh0JywgKGJ1ZmZlcikgLT5cbiAgICAgIGVkaXRvclN0YXRlcy5fbG9ja0NoYW5nZWRTdGF0dXMgPSB0cnVlXG4gICAgICBlZGl0b3JTdGF0ZXMuY29kZU1pcnJvci5zZXRWYWx1ZSBidWZmZXJcbiAgICAgIGVkaXRvclN0YXRlcy5jb2RlTWlycm9yLmNsZWFySGlzdG9yeSgpXG4gICAgICBlZGl0b3JTdGF0ZXMuX2xvY2tDaGFuZ2VkU3RhdHVzID0gZmFsc2VcblxuICAgIC5vbiAnc2V0SW1hZ2VEaXJlY3RvcnknLCAoZGlyZWN0b3JpZXMpIC0+IGVkaXRvclN0YXRlcy5zZXRJbWFnZURpcmVjdG9yeSBkaXJlY3Rvcmllc1xuXG4gICAgIyBzZW5kIHRleHQgdG8gc2F2ZSB0byBtYWluIHByb2Nlc3MgYW5kIHJlbG9hZFxuICAgIC5vbiAnc2F2ZScsIChmbmFtZSwgdHJpZ2dlcnMgPSB7fSkgLT5cbiAgICAgIE1kc1JlbmRlcmVyLnNlbmRUb01haW4gJ3dyaXRlRmlsZScsIGZuYW1lLCBlZGl0b3JTdGF0ZXMuY29kZU1pcnJvci5nZXRWYWx1ZSgpLCB0cmlnZ2Vyc1xuICAgICAgTWRzUmVuZGVyZXIuc2VuZFRvTWFpbiAnaW5pdGlhbGl6ZVN0YXRlJywgZm5hbWVcblxuICAgIC5vbiAndmlld01vZGUnLCAobW9kZSkgLT5cbiAgICAgIHN3aXRjaCBtb2RlXG4gICAgICAgIHdoZW4gJ21hcmtkb3duJ1xuICAgICAgICAgIGVkaXRvclN0YXRlcy5wcmV2aWV3LnNlbmQgJ3NldENsYXNzJywgJydcbiAgICAgICAgd2hlbiAnc2NyZWVuJ1xuICAgICAgICAgIGVkaXRvclN0YXRlcy5wcmV2aWV3LnNlbmQgJ3NldENsYXNzJywgJ3NsaWRlLXZpZXcgc2NyZWVuJ1xuICAgICAgICB3aGVuICdsaXN0J1xuICAgICAgICAgIGVkaXRvclN0YXRlcy5wcmV2aWV3LnNlbmQgJ3NldENsYXNzJywgJ3NsaWRlLXZpZXcgbGlzdCdcbiAgICAgICAgd2hlbiAncHJlc2VuLWRldidcbiAgICAgICAgICBlZGl0b3JTdGF0ZXMucHJldmlldy5zZW5kICdzZXRDbGFzcycsICdzbGlkZS12aWV3IHByZXNlbi1kZXYnXG5cbiAgICAgICQoJyNwcmV2aWV3LW1vZGVzJykucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJylcbiAgICAgICQoJy52aWV3bW9kZS1idG5bZGF0YS12aWV3bW9kZV0nKS5yZW1vdmVDbGFzcygnYWN0aXZlJylcbiAgICAgICAgLmZpbHRlcihcIltkYXRhLXZpZXdtb2RlPScje21vZGV9J11cIikuYWRkQ2xhc3MoJ2FjdGl2ZScpXG5cbiAgICAub24gJ2VkaXRDb21tYW5kJywgKGNvbW1hbmQpIC0+IGVkaXRvclN0YXRlcy5jb2RlTWlycm9yLmV4ZWNDb21tYW5kKGNvbW1hbmQpXG5cbiAgICAub24gJ29wZW5EZXZUb29sJywgLT5cbiAgICAgIGlmIGVkaXRvclN0YXRlcy5wcmV2aWV3LmlzRGV2VG9vbHNPcGVuZWQoKVxuICAgICAgICBlZGl0b3JTdGF0ZXMucHJldmlldy5jbG9zZURldlRvb2xzKClcbiAgICAgIGVsc2VcbiAgICAgICAgZWRpdG9yU3RhdGVzLnByZXZpZXcub3BlbkRldlRvb2xzKClcblxuICAgIC5vbiAnc2V0RWRpdG9yQ29uZmlnJywgKGVkaXRvckNvbmZpZykgLT4gc2V0RWRpdG9yQ29uZmlnIGVkaXRvckNvbmZpZ1xuICAgIC5vbiAnc2V0U3BsaXR0ZXInLCAoc3BsaWl0ZXJQb3MpIC0+IHNldFNwbGl0dGVyIHNwbGlpdGVyUG9zXG4gICAgLm9uICdzZXRUaGVtZScsICh0aGVtZSkgLT4gZWRpdG9yU3RhdGVzLnVwZGF0ZUdsb2JhbFNldHRpbmcgJyR0aGVtZScsIHRoZW1lXG4gICAgLm9uICd0aGVtZUNoYW5nZWQnLCAodGhlbWUpIC0+IE1kc1JlbmRlcmVyLnNlbmRUb01haW4gJ3RoZW1lQ2hhbmdlZCcsIHRoZW1lXG4gICAgLm9uICdyZXNvdXJjZVN0YXRlJywgKHN0YXRlKSAtPiBsb2FkaW5nU3RhdGUgPSBzdGF0ZVxuIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcbiAgd2VidmlldyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNwcmV2aWV3JylcbiAgIyBzaW1wbGUgcHJlc2VudGF0aW9uIG1vZGUgb24hXG4gICMgJCgnI3ByZXNlbnRhdGlvbicpLm9uICdjbGljaycsICgpID0+XG4gICMgICB3ZWJ2aWV3LndlYmtpdFJlcXVlc3RGdWxsU2NyZWVuKClcblxuICAjICQoJyNwcmVzZW50YXRpb24nKS5vbiAnY2xpY2snLCAoKSA9PlxuICAjICAgJCgnLnBhbmUubWFya2Rvd24nKS50b2dnbGUoKVxuICAjICAgaXBjLnNlbmQoJ1ByZXNlbnRhdGlvbicpXG5cbiAgIyBpcGMub24gJ2luaXRpYWxpemUnICgpID0+XG5cblxuICAjIGlwYy5vbiBcInByZXNlbnRhdGlvblwiLCAoKSAtPlxuICAjICAgY29uc29sZS5sb2cgXCJyZWNpZXZlIHByZXNlbnRhdGlvblwiXG4gICMgICBpcGMuc2VuZCBcInRleHRTZW5kXCIsIGVkaXRvclN0YXRlcy5jb2RlTWlycm9yLmdldFZhbHVlKClcbiAgIyAgIGNvbnNvbGUubG9nICdzZW5kIHRleHRTZW5kJ1xuXG4gICQoJyNwcmVzZW50YXRpb24nKS5vbiAnY2xpY2snLCAoKSA9PlxuICAgICMgJCgnLnBhbmUubWFya2Rvd24nKS50b2dnbGUoKVxuICAgICMgJCgnLnRvb2xiYXItZm9vdGVyJykudG9nZ2xlKClcbiAgICB3ZWJ2aWV3LnNlbmQgJ3JlcXVlc3RTbGlkZUluZm8nXG4gICAgY29uc29sZS5sb2cgJ3NlbmQgcmVxdWVzdFNsaWRlSW5mbydcblxuICB3ZWJ2aWV3LmFkZEV2ZW50TGlzdGVuZXIgJ2lwYy1tZXNzYWdlJywgKGV2ZW50KSA9PlxuICAgICBzd2l0Y2ggZXZlbnQuY2hhbm5lbFxuICAgICAgIHdoZW4gXCJzZW5kU2xpZGVJbmZvXCIgICAjIHdlYnZpZXcg44GL44KJ44K544Op44Kk44OJ5oOF5aCx44KS5Y+X5L+hXG4gICAgICAgIHNsaWRlSW5mbyA9IGV2ZW50LmFyZ3NbMF1cbiAgICAgICAgY29uc29sZS5sb2cgJ3JlY2VpdmUgc2VuZFNsaWRlSW5mbydcbiAgICAgICAgY29uc29sZS5sb2cgc2xpZGVJbmZvXG4gICAgICAgIGlwYy5zZW5kICd0ZXh0U2VuZCcsIHNsaWRlSW5mb1xuICAgICAgICBjb25zb2xlLmxvZyAnc2VuZCB0ZXh0U2VuZCdcbiAgICAgICAgYnJlYWtcblxuICAgICAgIHdoZW4gXCJyZXF1ZXN0U2xpZGVIVE1MXCJcbiAgICAgICAgd2Vidmlldy5zZW5kICdzZXRTbGlkZScsIHNsaWRlSFRNTFxuICAgICAgICBjb25zb2xlLmxvZyAnc2VuZCBzZXRTbGlkZSdcbiAgICAgICAgYnJlYWtcblxuICBpcGMub24gJ3ByZXNlbkRldkluaXRpYWxpemUnLCAoZSwgdGV4dCkgPT5cbiAgICAgIGNvbnNvbGUubG9nICdyZWNlaXZlIHByZXNlbkRldkluaXRpYWxpemUnXG4gICAgICBjb25zb2xlLmxvZyB0ZXh0XG4gICAgICBzbGlkZUhUTUwgPSB0ZXh0XG5cbiAgaXBjLm9uICdnb1RvUGFnZScsIChlLCBwYWdlKSA9PlxuICAgIGNvbnNvbGUubG9nIHBhZ2VcbiAgICB3ZWJ2aWV3LnNlbmQgJ2dvVG9QYWdlJywgcGFnZVxuXG4gICAgICAjIHdlYnZpZXcg44Gu5rqW5YKZ44GM44Gn44GN44Gm44Gq44GEXG4gICAgICAjIHdlYnZpZXcuc2VuZCAnc2V0U2xpZGUnLCB0ZXh0XG4gICAgICAjIGNvbnNvbGUubG9nICdzZW5kIHNldFNsaWRlJ1xuICAjIGlwYy5vbiAnaW5pdGlhbGl6ZScsICgpID0+XG4gICMgICAkKCcucGFuZS5tYXJrZG93bicpLmh0bWwoKVxuIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG5cblxuICAjIEluaXRpYWxpemVcbiAgZWRpdG9yU3RhdGVzLmNvZGVNaXJyb3IuZm9jdXMoKVxuICBlZGl0b3JTdGF0ZXMucmVmcmVzaFBhZ2UoKVxuIl19
