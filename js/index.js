var CodeMirror, EditorStates, MdsMenu, MdsRenderer, clsMdsRenderer, createValidator, ipc, kanjiContinuousLen, loadingState, maxComma, maxTen, mixedPeriod, noAbusage, noDoubleNegativeJa, noDoubledConjunction, noDoubledConjunctiveParticleGa, noDoubledJoshi, noDroppingTheRa, noExclamationQuestionMark, noHankakuKana, noMixDearuDesumasu, noNfd, noStartDuplicatedConjunction, ref, shell, successiveWord, validator, weakPhrase, webFrame,
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

  EditorStates.prototype.refreshPage = function(rulers) {
    var j, len, lineNumber, page, ref1, rulerLine;
    if (rulers != null) {
      this.rulers = rulers;
    }
    page = 1;
    console.log(this.rulers);
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

(function() {
  var draggingSplitPosition, draggingSplitter, editorStates, responsePdfOpts, setEditorConfig, setSplitter, slideHTML, webview;
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
  webview = document.querySelector('#preview');
  $('#presentation').on('click', (function(_this) {
    return function() {
      $('.pane.markdown').toggle();
      $('.toolbar-footer').toggle();
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VzIjpbImluZGV4LmNvZmZlZSJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxJQUFBLDJhQUFBO0VBQUE7OztBQUFBLEdBQUEsR0FBTSxPQUFBLENBQVEsVUFBUixDQUFtQixDQUFDOztBQUMxQixNQUFvQixPQUFBLENBQVEsVUFBUixDQUFwQixFQUFDLGlCQUFELEVBQVE7O0FBQ1IsT0FBQSxHQUFvQixPQUFBLENBQVEsdUJBQVI7O0FBQ3BCLGNBQUEsR0FBb0IsT0FBQSxDQUFRLDJCQUFSOztBQUNwQixlQUFBLEdBQW9CLE9BQUEsQ0FBUSxxQkFBUjs7QUFDcEIsV0FBQSxHQUFvQixJQUFJOztBQUN4QixXQUFXLENBQUMsYUFBWixDQUFBOztBQUVBLFFBQVEsQ0FBQyxrQkFBVCxDQUE0QixDQUE1QixFQUErQixDQUEvQjs7QUFFQSxVQUFBLEdBQWEsT0FBQSxDQUFRLFlBQVI7O0FBQ2IsT0FBQSxDQUFRLHlCQUFSOztBQUNBLE9BQUEsQ0FBUSxtQ0FBUjs7QUFDQSxPQUFBLENBQVEseUJBQVI7O0FBQ0EsT0FBQSxDQUFRLG9DQUFSOztBQUNBLE9BQUEsQ0FBUSw0QkFBUjs7QUFFTTt5QkFDSixNQUFBLEdBQVE7O3lCQUNSLFdBQUEsR0FBYTs7eUJBQ2Isa0JBQUEsR0FBb0I7O3lCQUNwQixZQUFBLEdBQWM7O3lCQUVkLGtCQUFBLEdBQW9COzt5QkFDcEIsZUFBQSxHQUFpQjs7RUFFSixzQkFBQyxVQUFELEVBQWMsT0FBZDtJQUFDLElBQUMsQ0FBQSxhQUFEO0lBQWEsSUFBQyxDQUFBLFVBQUQ7Ozs7Ozs7OztJQUN6QixJQUFDLENBQUEsZ0JBQUQsQ0FBQTtJQUNBLElBQUMsQ0FBQSxpQkFBRCxDQUFBO0lBRUEsSUFBQyxDQUFBLElBQUQsR0FBUSxJQUFJLE9BQUosQ0FBWTtNQUNsQjtRQUFFLEtBQUEsRUFBTyxPQUFUO1FBQWtCLFdBQUEsRUFBYSxhQUEvQjtRQUE4QyxLQUFBLEVBQU8sQ0FBQSxTQUFBLEtBQUE7aUJBQUEs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dGVudCI6WyJpcGMgPSByZXF1aXJlKCdlbGVjdHJvbicpLmlwY1JlbmRlcmVyXG57c2hlbGwsIHdlYkZyYW1lfSA9IHJlcXVpcmUgJ2VsZWN0cm9uJ1xuTWRzTWVudSAgICAgICAgICAgPSByZXF1aXJlICcuL2pzL2NsYXNzZXMvbWRzX21lbnUnXG5jbHNNZHNSZW5kZXJlciAgICA9IHJlcXVpcmUgJy4vanMvY2xhc3Nlcy9tZHNfcmVuZGVyZXInXG5jcmVhdGVWYWxpZGF0b3IgICA9IHJlcXVpcmUgJ2NvZGVtaXJyb3ItdGV4dGxpbnQnXG5NZHNSZW5kZXJlciAgICAgICA9IG5ldyBjbHNNZHNSZW5kZXJlclxuTWRzUmVuZGVyZXIucmVxdWVzdEFjY2VwdCgpXG5cbndlYkZyYW1lLnNldFpvb21MZXZlbExpbWl0cygxLCAxKVxuXG5Db2RlTWlycm9yID0gcmVxdWlyZSAnY29kZW1pcnJvcidcbnJlcXVpcmUgJ2NvZGVtaXJyb3IvbW9kZS94bWwveG1sJ1xucmVxdWlyZSAnY29kZW1pcnJvci9tb2RlL21hcmtkb3duL21hcmtkb3duJ1xucmVxdWlyZSAnY29kZW1pcnJvci9tb2RlL2dmbS9nZm0nXG5yZXF1aXJlICdjb2RlbWlycm9yL2FkZG9uL2VkaXQvY29udGludWVsaXN0J1xucmVxdWlyZSBcImNvZGVtaXJyb3IvYWRkb24vbGludC9saW50XCJcblxuY2xhc3MgRWRpdG9yU3RhdGVzXG4gIHJ1bGVyczogW11cbiAgY3VycmVudFBhZ2U6IG51bGxcbiAgcHJldmlld0luaXRpYWxpemVkOiBmYWxzZVxuICBsYXN0UmVuZGVyZWQ6IHt9XG5cbiAgX2xvY2tDaGFuZ2VkU3RhdHVzOiBmYWxzZVxuICBfaW1hZ2VEaXJlY3Rvcnk6IG51bGxcblxuICBjb25zdHJ1Y3RvcjogKEBjb2RlTWlycm9yLCBAcHJldmlldykgLT5cbiAgICBAaW5pdGlhbGl6ZUVkaXRvcigpXG4gICAgQGluaXRpYWxpemVQcmV2aWV3KClcblxuICAgIEBtZW51ID0gbmV3IE1kc01lbnUgW1xuICAgICAgeyBsYWJlbDogJyZVbmRvJywgYWNjZWxlcmF0b3I6ICdDbWRPckN0cmwrWicsIGNsaWNrOiAoaSwgdykgPT4gQGNvZGVNaXJyb3IuZXhlY0NvbW1hbmQgJ3VuZG8nIGlmIHcgYW5kICF3Lm1kc1dpbmRvdy5mcmVlemUgfVxuICAgICAge1xuICAgICAgICBsYWJlbDogJyZSZWRvJ1xuICAgICAgICBhY2NlbGVyYXRvcjogZG8gLT4gaWYgcHJvY2Vzcy5wbGF0Zm9ybSBpcyAnd2luMzInIHRoZW4gJ0NvbnRyb2wrWScgZWxzZSAnU2hpZnQrQ21kT3JDdHJsK1onXG4gICAgICAgIGNsaWNrOiAoaSwgdykgPT4gQGNvZGVNaXJyb3IuZXhlY0NvbW1hbmQgJ3JlZG8nIGlmIHcgYW5kICF3Lm1kc1dpbmRvdy5mcmVlemVcbiAgICAgIH1cbiAgICAgIHsgdHlwZTogJ3NlcGFyYXRvcicgfVxuICAgICAgeyBsYWJlbDogJ0N1JnQnLCBhY2NlbGVyYXRvcjogJ0NtZE9yQ3RybCtYJywgcm9sZTogJ2N1dCcgfVxuICAgICAgeyBsYWJlbDogJyZDb3B5JywgYWNjZWxlcmF0b3I6ICdDbWRPckN0cmwrQycsIHJvbGU6ICdjb3B5JyB9XG4gICAgICB7IGxhYmVsOiAnJlBhc3RlJywgYWNjZWxlcmF0b3I6ICdDbWRPckN0cmwrVicsIHJvbGU6ICdwYXN0ZScgfVxuICAgICAgeyBsYWJlbDogJyZEZWxldGUnLCByb2xlOiAnZGVsZXRlJyB9XG4gICAgICB7IGxhYmVsOiAnU2VsZWN0ICZBbGwnLCBhY2NlbGVyYXRvcjogJ0NtZE9yQ3RybCtBJywgY2xpY2s6IChpLCB3KSA9PiBAY29kZU1pcnJvci5leGVjQ29tbWFuZCAnc2VsZWN0QWxsJyBpZiB3IGFuZCAhdy5tZHNXaW5kb3cuZnJlZXplIH1cbiAgICAgIHsgdHlwZTogJ3NlcGFyYXRvcicsIHBsYXRmb3JtOiAnZGFyd2luJyB9XG4gICAgICB7IGxhYmVsOiAnU2VydmljZXMnLCByb2xlOiAnc2VydmljZXMnLCBzdWJtZW51OiBbXSwgcGxhdGZvcm06ICdkYXJ3aW4nIH1cbiAgICBdXG5cbiAgIyDjg5rjg7zjgrjjgqvjgqbjg7Pjg4jlvozjgIF3ZWJ2aWV344G444Gd44KM44KS6YCB5L+hXG4gIHJlZnJlc2hQYWdlOiAocnVsZXJzKSA9PlxuICAgICMgRWRpdG9yU3RhdGVz44Kv44Op44K544Gu5aSJ5pWwcnVsZXJz44Oq44K544OI44G45YWl44KM44Gm44CB5LiA5pem44Oa44O844K444KS77yR44Gr44GZ44KLXG4gICAgQHJ1bGVycyA9IHJ1bGVycyBpZiBydWxlcnM/XG4gICAgcGFnZSAgICA9IDFcbiAgICBjb25zb2xlLmxvZyBAcnVsZXJzXG5cbiAgICAjIHJ1bGVyTGluZeOBq+OBryctLS0n44Gu6KGM5L2N572u44GM6KiY44GV44KM44Gm44GK44KK44CB44Gd44KM44Go44Ko44OH44Kj44K/5LiK44Gu44Kr44O844K944Or5L2N572u44KS5q+U6LyD44GX44GmcGFnZeOCkuaxuuOCgeOCi1xuICAgIGxpbmVOdW1iZXIgPSBAY29kZU1pcnJvci5nZXRDdXJzb3IoKS5saW5lIHx8IDBcbiAgICBmb3IgcnVsZXJMaW5lIGluIEBydWxlcnNcbiAgICAgIHBhZ2UrKyBpZiBydWxlckxpbmUgPD0gbGluZU51bWJlclxuXG4gICAgIyBydWxlcuioiOeul+W+jOOBq+ODmuODvOOCuOOBruWil+a4m+OBjOOBguOBo+OBn+WgtOWQiOOAgeato+OBl+OBhOODmuODvOOCuOaDheWgseOCkndlYnZpZXfjgbjpgIHkv6FcbiAgICBpZiBAY3VycmVudFBhZ2UgIT0gcGFnZVxuICAgICAgQGN1cnJlbnRQYWdlID0gcGFnZVxuICAgICAgQHByZXZpZXcuc2VuZCAnY3VycmVudFBhZ2UnLCBAY3VycmVudFBhZ2UgaWYgQHByZXZpZXdJbml0aWFsaXplZFxuXG4gICAgJCgnI3BhZ2UtaW5kaWNhdG9yJykudGV4dCBcIlBhZ2UgI3tAY3VycmVudFBhZ2V9IC8gI3tAcnVsZXJzLmxlbmd0aCArIDF9XCJcblxuICBpbml0aWFsaXplUHJldmlldzogPT5cbiAgICAkKEBwcmV2aWV3KVxuICAgICAgLm9uICdkb20tcmVhZHknLCA9PlxuICAgICAgICAjIEZpeCBtaW5pbWl6ZWQgcHJldmlldyAoIzIwKVxuICAgICAgICAjIFtOb3RlXSBodHRwczovL2dpdGh1Yi5jb20vZWxlY3Ryb24vZWxlY3Ryb24vaXNzdWVzLzQ4ODJcbiAgICAgICAgJChAcHJldmlldy5zaGFkb3dSb290KS5hcHBlbmQoJzxzdHlsZT5vYmplY3R7bWluLXdpZHRoOjA7bWluLWhlaWdodDowO308L3N0eWxlPicpXG5cbiAgICAgICMgd2VidmlldyDjgYvjgonjga7pgJrkv6HjgpLlj5fjgZHlj5bjgosgJ2lwYy1tZXNzYWdlJ1xuICAgICAgLm9uICdpcGMtbWVzc2FnZScsIChldikgPT5cbiAgICAgICAgZSA9IGV2Lm9yaWdpbmFsRXZlbnRcblxuICAgICAgICBzd2l0Y2ggZS5jaGFubmVsXG4gICAgICAgICAgd2hlbiAncnVsZXJDaGFuZ2VkJ1xuICAgICAgICAgICAgQHJlZnJlc2hQYWdlIGUuYXJnc1swXVxuICAgICAgICAgIHdoZW4gJ2xpbmtUbydcbiAgICAgICAgICAgIEBvcGVuTGluayBlLmFyZ3NbMF1cbiAgICAgICAgICB3aGVuICdyZW5kZXJlZCdcbiAgICAgICAgICAgIEBsYXN0UmVuZGVyZWQgPSBlLmFyZ3NbMF1cbiAgICAgICAgICAgIHVubGVzcyBAcHJldmlld0luaXRpYWxpemVkXG4gICAgICAgICAgICAgIE1kc1JlbmRlcmVyLnNlbmRUb01haW4gJ3ByZXZpZXdJbml0aWFsaXplZCdcblxuICAgICAgICAgICAgICBAcHJldmlld0luaXRpYWxpemVkID0gdHJ1ZVxuICAgICAgICAgICAgICAkKCdib2R5JykuYWRkQ2xhc3MgJ2luaXRpYWxpemVkLXNsaWRlJ1xuICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgIE1kc1JlbmRlcmVyLl9jYWxsX2V2ZW50IGUuY2hhbm5lbCwgZS5hcmdzLi4uXG4gICAgICAjIHVybOOCkuOCr+ODquODg+OCr+OBl+OBpuaWsOOBl+OBhOOCpuOCpOODs+ODieOCpuOBjOmWi+OBi+OCjOOCi+aZglxuICAgICAgLm9uICduZXctd2luZG93JywgKGUpID0+XG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKVxuICAgICAgICBAb3BlbkxpbmsgZS5vcmlnaW5hbEV2ZW50LnVybFxuXG4gICAgICAub24gJ2RpZC1maW5pc2gtbG9hZCcsIChlKSA9PlxuICAgICAgICBAcHJldmlldy5zZW5kICdjdXJyZW50UGFnZScsIDFcbiAgICAgICAgQHByZXZpZXcuc2VuZCAnc2V0SW1hZ2VEaXJlY3RvcnknLCBAX2ltYWdlRGlyZWN0b3J5XG4gICAgICAgIEBwcmV2aWV3LnNlbmQgJ3JlbmRlcicsIEBjb2RlTWlycm9yLmdldFZhbHVlKCkgICMgcmVuZGVyIOOCpOODmeODs+ODiOmAgeS/oeOBp3J1bGVy56K66KqN44GX44Gm44Oa44O844K45YiH44KK5pu/44KP44KKXG5cbiAgb3Blbkxpbms6IChsaW5rKSA9PlxuICAgIHNoZWxsLm9wZW5FeHRlcm5hbCBsaW5rIGlmIC9eaHR0cHM/OlxcL1xcLy4rLy50ZXN0KGxpbmspXG5cbiAgaW5pdGlhbGl6ZUVkaXRvcjogPT5cbiAgICBAY29kZU1pcnJvci5vbiAnY29udGV4dG1lbnUnLCAoY20sIGUpID0+XG4gICAgICBlLnByZXZlbnREZWZhdWx0KClcbiAgICAgIEBjb2RlTWlycm9yLmZvY3VzKClcbiAgICAgIEBtZW51LnBvcHVwKClcbiAgICAgIGZhbHNlXG5cbiAgICBAY29kZU1pcnJvci5vbiAnY2hhbmdlJywgKGNtLCBjaGcpID0+XG4gICAgICBAcHJldmlldy5zZW5kICdyZW5kZXInLCBjbS5nZXRWYWx1ZSgpXG4gICAgICBNZHNSZW5kZXJlci5zZW5kVG9NYWluICdzZXRDaGFuZ2VkU3RhdHVzJywgdHJ1ZSBpZiAhQF9sb2NrQ2hhbmdlZFN0YXR1c1xuXG4gICAgQGNvZGVNaXJyb3Iub24gJ2N1cnNvckFjdGl2aXR5JywgKGNtKSA9PiB3aW5kb3cuc2V0VGltZW91dCAoPT4gQHJlZnJlc2hQYWdlKCkpLCA1XG5cbiAgc2V0SW1hZ2VEaXJlY3Rvcnk6IChkaXJlY3RvcnkpID0+XG4gICAgaWYgQHByZXZpZXdJbml0aWFsaXplZFxuICAgICAgQHByZXZpZXcuc2VuZCAnc2V0SW1hZ2VEaXJlY3RvcnknLCBkaXJlY3RvcnlcbiAgICAgIEBwcmV2aWV3LnNlbmQgJ3JlbmRlcicsIEBjb2RlTWlycm9yLmdldFZhbHVlKClcbiAgICBlbHNlXG4gICAgICBAX2ltYWdlRGlyZWN0b3J5ID0gZGlyZWN0b3J5XG5cbiAgaW5zZXJ0SW1hZ2U6IChmaWxlUGF0aCkgPT4gQGNvZGVNaXJyb3IucmVwbGFjZVNlbGVjdGlvbihcIiFbXSgje2ZpbGVQYXRoLnJlcGxhY2UoLyAvZywgJyUyMCcpfSlcXG5cIilcblxuICAjKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipUT0RPKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuICBpbnNlcnRWaWRlbzogKGZpbGVQYXRoKSA9PlxuICAgIGNvbnNvbGUubG9nIGZpbGVQYXRoXG4gICMqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG5cbiAgdXBkYXRlR2xvYmFsU2V0dGluZzogKHByb3AsIHZhbHVlKSA9PlxuICAgIGxhdGVzdFBvcyA9IG51bGxcblxuICAgIGZvciBvYmogaW4gKEBsYXN0UmVuZGVyZWQ/LnNldHRpbmdzUG9zaXRpb24gfHwgW10pXG4gICAgICBsYXRlc3RQb3MgPSBvYmogaWYgb2JqLnByb3BlcnR5IGlzIHByb3BcblxuICAgIGlmIGxhdGVzdFBvcz9cbiAgICAgIEBjb2RlTWlycm9yLnJlcGxhY2VSYW5nZShcbiAgICAgICAgXCIje3Byb3B9OiAje3ZhbHVlfVwiLFxuICAgICAgICBDb2RlTWlycm9yLlBvcyhsYXRlc3RQb3MubGluZUlkeCwgbGF0ZXN0UG9zLmZyb20pLFxuICAgICAgICBDb2RlTWlycm9yLlBvcyhsYXRlc3RQb3MubGluZUlkeCwgbGF0ZXN0UG9zLmZyb20gKyBsYXRlc3RQb3MubGVuZ3RoKSxcbiAgICAgIClcbiAgICBlbHNlXG4gICAgICBAY29kZU1pcnJvci5yZXBsYWNlUmFuZ2UoXG4gICAgICAgIFwiPCEtLSAje3Byb3B9OiAje3ZhbHVlfSAtLT5cXG5cXG5cIixcbiAgICAgICAgQ29kZU1pcnJvci5Qb3MoQGNvZGVNaXJyb3IuZmlyc3RMaW5lKCksIDApXG4gICAgICApXG5cbmxvYWRpbmdTdGF0ZSA9ICdsb2FkaW5nJ1xuXG5cblxuIyB0ZXh0bGludCBydWxlcyBzZXR0aW5nXG5cbm5vQWJ1c2FnZSA9IHJlcXVpcmUgJ3RleHRsaW50LXJ1bGUtamEtbm8tYWJ1c2FnZSdcbm1peGVkUGVyaW9kID0gcmVxdWlyZSAndGV4dGxpbnQtcnVsZS1qYS1uby1taXhlZC1wZXJpb2QnXG5zdWNjZXNzaXZlV29yZCA9IHJlcXVpcmUgJ3RleHRsaW50LXJ1bGUtamEtbm8tc3VjY2Vzc2l2ZS13b3JkJ1xud2Vha1BocmFzZSA9IHJlcXVpcmUgJ3RleHRsaW50LXJ1bGUtamEtbm8td2Vhay1waHJhc2UnXG5tYXhDb21tYSA9IHJlcXVpcmUgJ3RleHRsaW50LXJ1bGUtbWF4LWNvbW1hJ1xua2FuamlDb250aW51b3VzTGVuID0gcmVxdWlyZSAndGV4dGxpbnQtcnVsZS1tYXgta2FuamktY29udGludW91cy1sZW4nXG5tYXhUZW4gPSByZXF1aXJlICd0ZXh0bGludC1ydWxlLW1heC10ZW4nXG5ub0RvdWJsZU5lZ2F0aXZlSmEgPSByZXF1aXJlICd0ZXh0bGludC1ydWxlLW5vLWRvdWJsZS1uZWdhdGl2ZS1qYSdcbm5vRG91YmxlZENvbmp1bmN0aW9uID0gcmVxdWlyZSAndGV4dGxpbnQtcnVsZS1uby1kb3VibGVkLWNvbmp1bmN0aW9uJ1xubm9Eb3VibGVkQ29uanVuY3RpdmVQYXJ0aWNsZUdhID0gcmVxdWlyZSAndGV4dGxpbnQtcnVsZS1uby1kb3VibGVkLWNvbmp1bmN0aXZlLXBhcnRpY2xlLWdhJ1xubm9Eb3VibGVkSm9zaGkgPSByZXF1aXJlICd0ZXh0bGludC1ydWxlLW5vLWRvdWJsZWQtam9zaGknXG5ub0Ryb3BwaW5nVGhlUmEgPSByZXF1aXJlICd0ZXh0bGludC1ydWxlLW5vLWRyb3BwaW5nLXRoZS1yYSdcbm5vRXhjbGFtYXRpb25RdWVzdGlvbk1hcmsgPSByZXF1aXJlICd0ZXh0bGludC1ydWxlLW5vLWV4Y2xhbWF0aW9uLXF1ZXN0aW9uLW1hcmsnXG5ub0hhbmtha3VLYW5hID0gcmVxdWlyZSAndGV4dGxpbnQtcnVsZS1uby1oYW5rYWt1LWthbmEnXG5ub01peERlYXJ1RGVzdW1hc3UgPSByZXF1aXJlICd0ZXh0bGludC1ydWxlLW5vLW1peC1kZWFydS1kZXN1bWFzdSdcbm5vTmZkID0gcmVxdWlyZSAndGV4dGxpbnQtcnVsZS1uby1uZmQnXG5ub1N0YXJ0RHVwbGljYXRlZENvbmp1bmN0aW9uID0gcmVxdWlyZSAndGV4dGxpbnQtcnVsZS1uby1zdGFydC1kdXBsaWNhdGVkLWNvbmp1bmN0aW9uJ1xuXG52YWxpZGF0b3IgPSBjcmVhdGVWYWxpZGF0b3Ioe1xuICBydWxlczoge1xuICAgICdub0FidXNhZ2UnIDogbm9BYnVzYWdlLFxuICAgICdtaXhlZFBlcmlvZCcgOiBtaXhlZFBlcmlvZCxcbiAgICAnc3VjY2Vzc2l2ZVdvcmQnIDogc3VjY2Vzc2l2ZVdvcmQsXG4gICAgJ3dlYWtQaHJhc2UnIDogd2Vha1BocmFzZSxcbiAgICAnbWF4Q29tbWEnIDogbWF4Q29tbWEsXG4gICAgJ2thbmppQ29udGludW91c0xlbicgOiBrYW5qaUNvbnRpbnVvdXNMZW4sXG4gICAgJ21heFRlbicgOiBtYXhUZW4sXG4gICAgJ25vRG91YmxlZE5lZ2F0aXZlSmEnIDogbm9Eb3VibGVOZWdhdGl2ZUphLFxuICAgICdub0RvdWJsZWRDb25qdW5jdGlvbicgOiBub0RvdWJsZWRDb25qdW5jdGlvbixcbiAgICAnbm9Eb3VibGVkQ29uanVuY3RpdmVQYXJ0aWNsZUdhJyA6IG5vRG91YmxlZENvbmp1bmN0aXZlUGFydGljbGVHYSxcbiAgICAnbm9Eb3VibGVkSm9zaGknIDogbm9Eb3VibGVkSm9zaGksXG4gICAgJ25vRHJvcHBpbmdUaGVSYScgOiBub0Ryb3BwaW5nVGhlUmEsXG4gICAgJ25vRXhjbGFtYXRpb25RdWVzdGlvbk1hcmsnIDogbm9FeGNsYW1hdGlvblF1ZXN0aW9uTWFyayxcbiAgICAnbm9IYW5rYWt1S2FuYScgOiBub0hhbmtha3VLYW5hLFxuICAgICdub01peERlYXJ1RGVzdW1hc3UnIDogbm9NaXhEZWFydURlc3VtYXN1LFxuICAgICdub05mZCcgOiBub05mZCxcbiAgICAnbm9TdGFydER1cGxpY2F0ZWRDb25qdW5jdGlvbicgOiBub1N0YXJ0RHVwbGljYXRlZENvbmp1bmN0aW9uXG4gIH1cbiAgfSk7XG5cbmRvIC0+XG4gIHNsaWRlSFRNTCA9IFwiXCJcbiAgZWRpdG9yU3RhdGVzID0gbmV3IEVkaXRvclN0YXRlcyhcbiAgICBDb2RlTWlycm9yLmZyb21UZXh0QXJlYSgkKCcjZWRpdG9yJylbMF0sXG4gICAgICAjIGdmbSA6IEdpdGh1YiBGbGF2b3JlZCBNb2RlXG4gICAgICBtb2RlOiAnZ2ZtJ1xuICAgICAgI3RoZW1lOiAnYmFzZTE2LWxpZ2h0J1xuICAgICAgbGluZVdyYXBwaW5nOiB0cnVlXG4gICAgICBsaW5lTnVtYmVyczogdHJ1ZVxuICAgICAgZHJhZ0Ryb3A6IGZhbHNlXG4gICAgICBndXR0ZXJzOiBbXCJDb2RlTWlycm9yLWxpbnQtbWFya2Vyc1wiXVxuICAgICAgbGludDoge1xuICAgICAgICAgXCJnZXRBbm5vdGF0aW9uc1wiOiB2YWxpZGF0b3IsXG4gICAgICAgICBcImFzeW5jXCI6IHRydWVcbiAgICAgIH1cbiAgICAgIGV4dHJhS2V5czpcbiAgICAgICAgRW50ZXI6ICduZXdsaW5lQW5kSW5kZW50Q29udGludWVNYXJrZG93bkxpc3QnXG4gICAgKSxcbiAgICAkKCcjcHJldmlldycpWzBdXG4gIClcblxuICAjIFZpZXcgbW9kZXNcbiAgJCgnLnZpZXdtb2RlLWJ0bltkYXRhLXZpZXdtb2RlXScpLmNsaWNrIC0+IE1kc1JlbmRlcmVyLnNlbmRUb01haW4oJ3ZpZXdNb2RlJywgJCh0aGlzKS5hdHRyKCdkYXRhLXZpZXdtb2RlJykpXG5cbiAgIyBQREYgRXhwb3J0IGJ1dHRvblxuICAkKCcjcGRmLWV4cG9ydCcpLmNsaWNrIC0+IGlwYy5zZW5kICdQZGZFeHBvcnQnXG5cbiAgIyBGaWxlIEQmRFxuICAkKGRvY3VtZW50KVxuICAgIC5vbiAnZHJhZ292ZXInLCAgLT4gZmFsc2VcbiAgICAub24gJ2RyYWdsZWF2ZScsIC0+IGZhbHNlXG4gICAgLm9uICdkcmFnZW5kJywgICAtPiBmYWxzZVxuICAgIC5vbiAnZHJvcCcsICAgICAgKGUpID0+XG4gICAgICBlLnByZXZlbnREZWZhdWx0KClcbiAgICAgIHJldHVybiBmYWxzZSB1bmxlc3MgKGYgPSBlLm9yaWdpbmFsRXZlbnQuZGF0YVRyYW5zZmVyPy5maWxlcz9bMF0pP1xuICAgICAgY29uc29sZS5sb2cgZlxuICAgICAgaWYgZi50eXBlLnN0YXJ0c1dpdGgoJ2ltYWdlJylcbiAgICAgICAgZWRpdG9yU3RhdGVzLmluc2VydEltYWdlIGYucGF0aFxuICAgICAgZWxzZSBpZiBmLnR5cGUuc3RhcnRzV2l0aCgndGV4dCcpIHx8IGYudHlwZSBpcyAnJ1xuICAgICAgICBNZHNSZW5kZXJlci5zZW5kVG9NYWluICdsb2FkRnJvbUZpbGUnLCBmLnBhdGggaWYgZi5wYXRoP1xuICAgICAgZWxzZSBpZiBmLnR5cGUuc3RhcnRzV2l0aCgndmlkZW8nKVxuICAgICAgICBlZGl0b3JTdGF0ZXMuaW5zZXJ0VmlkZW8gZi5wYXRoXG5cbiAgICAgIGZhbHNlXG5cbiAgIyBTcGxpdHRlclxuICBkcmFnZ2luZ1NwbGl0dGVyICAgICAgPSBmYWxzZVxuICBkcmFnZ2luZ1NwbGl0UG9zaXRpb24gPSB1bmRlZmluZWRcblxuICBzZXRTcGxpdHRlciA9IChzcGxpdFBvaW50KSAtPlxuICAgIHNwbGl0UG9pbnQgPSBNYXRoLm1pbigwLjgsIE1hdGgubWF4KDAuMiwgcGFyc2VGbG9hdChzcGxpdFBvaW50KSkpXG5cbiAgICAkKCcucGFuZS5tYXJrZG93bicpLmNzcygnZmxleC1ncm93Jywgc3BsaXRQb2ludCAqIDEwMClcbiAgICAkKCcucGFuZS5wcmV2aWV3JykuY3NzKCdmbGV4LWdyb3cnLCAoMSAtIHNwbGl0UG9pbnQpICogMTAwKVxuXG4gICAgcmV0dXJuIHNwbGl0UG9pbnRcblxuICBzZXRFZGl0b3JDb25maWcgPSAoZWRpdG9yQ29uZmlnKSAtPlxuICAgIGVkaXRvciA9ICQoZWRpdG9yU3RhdGVzLmNvZGVNaXJyb3I/LmdldFdyYXBwZXJFbGVtZW50KCkpXG4gICAgZWRpdG9yLmNzcygnZm9udC1mYW1pbHknLCBlZGl0b3JDb25maWcuZm9udEZhbWlseSkgaWYgZWRpdG9yP1xuICAgIGVkaXRvci5jc3MoJ2ZvbnQtc2l6ZScsIGVkaXRvckNvbmZpZy5mb250U2l6ZSkgaWYgZWRpdG9yP1xuXG4gICQoJy5wYW5lLXNwbGl0dGVyJylcbiAgICAubW91c2Vkb3duIC0+XG4gICAgICBkcmFnZ2luZ1NwbGl0dGVyID0gdHJ1ZVxuICAgICAgZHJhZ2dpbmdTcGxpdFBvc2l0aW9uID0gdW5kZWZpbmVkXG5cbiAgICAuZGJsY2xpY2sgLT5cbiAgICAgIE1kc1JlbmRlcmVyLnNlbmRUb01haW4gJ3NldENvbmZpZycsICdzcGxpdHRlclBvc2l0aW9uJywgc2V0U3BsaXR0ZXIoMC41KVxuXG4gIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyICdtb3VzZW1vdmUnLCAoZSkgLT5cbiAgICBpZiBkcmFnZ2luZ1NwbGl0dGVyXG4gICAgICBkcmFnZ2luZ1NwbGl0UG9zaXRpb24gPSBzZXRTcGxpdHRlciBNYXRoLm1pbihNYXRoLm1heCgwLCBlLmNsaWVudFgpLCBkb2N1bWVudC5ib2R5LmNsaWVudFdpZHRoKSAvIGRvY3VtZW50LmJvZHkuY2xpZW50V2lkdGhcbiAgLCBmYWxzZVxuXG4gIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyICdtb3VzZXVwJywgKGUpIC0+XG4gICAgZHJhZ2dpbmdTcGxpdHRlciA9IGZhbHNlXG4gICAgTWRzUmVuZGVyZXIuc2VuZFRvTWFpbiAnc2V0Q29uZmlnJywgJ3NwbGl0dGVyUG9zaXRpb24nLCBkcmFnZ2luZ1NwbGl0UG9zaXRpb24gaWYgZHJhZ2dpbmdTcGxpdFBvc2l0aW9uP1xuICAsIGZhbHNlXG5cbiAgcmVzcG9uc2VQZGZPcHRzID0gbnVsbFxuXG4gICMgRXZlbnRzXG4gIE1kc1JlbmRlcmVyXG4gICAgLm9uICdwdWJsaXNoUGRmJywgKGZuYW1lKSAtPlxuICAgICAgZWRpdG9yU3RhdGVzLmNvZGVNaXJyb3IuZ2V0SW5wdXRGaWVsZCgpLmJsdXIoKVxuICAgICAgJCgnYm9keScpLmFkZENsYXNzICdleHBvcnRpbmctcGRmJ1xuXG4gICAgICBlZGl0b3JTdGF0ZXMucHJldmlldy5zZW5kICdyZXF1ZXN0UGRmT3B0aW9ucycsIHsgZmlsZW5hbWU6IGZuYW1lIH1cblxuICAgIC5vbiAncmVzcG9uc2VQZGZPcHRpb25zJywgKG9wdHMpIC0+XG4gICAgICAjIFdhaXQgbG9hZGluZyByZXNvdXJjZXNcbiAgICAgIHN0YXJ0UHVibGlzaCA9IC0+XG4gICAgICAgIGlmIGxvYWRpbmdTdGF0ZSBpcyAnbG9hZGluZydcbiAgICAgICAgICBzZXRUaW1lb3V0IHN0YXJ0UHVibGlzaCwgMjUwXG4gICAgICAgIGVsc2VcbiAgICAgICAgICBlZGl0b3JTdGF0ZXMucHJldmlldy5wcmludFRvUERGXG4gICAgICAgICAgICBtYXJnaW5zVHlwZTogMVxuICAgICAgICAgICAgcGFnZVNpemU6IG9wdHMuZXhwb3J0U2l6ZVxuICAgICAgICAgICAgcHJpbnRCYWNrZ3JvdW5kOiB0cnVlXG4gICAgICAgICAgLCAoZXJyLCBkYXRhKSAtPlxuICAgICAgICAgICAgdW5sZXNzIGVyclxuICAgICAgICAgICAgICBNZHNSZW5kZXJlci5zZW5kVG9NYWluICd3cml0ZUZpbGUnLCBvcHRzLmZpbGVuYW1lLCBkYXRhLCB7IGZpbmFsaXplZDogJ3VuZnJlZXplJyB9XG4gICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgIE1kc1JlbmRlcmVyLnNlbmRUb01haW4gJ3VuZnJlZXplJ1xuXG4gICAgICBzZXRUaW1lb3V0IHN0YXJ0UHVibGlzaCwgNTAwXG5cbiAgICAub24gJ3VuZnJlZXplZCcsIC0+XG4gICAgICBlZGl0b3JTdGF0ZXMucHJldmlldy5zZW5kICd1bmZyZWV6ZSdcbiAgICAgICQoJ2JvZHknKS5yZW1vdmVDbGFzcyAnZXhwb3J0aW5nLXBkZidcblxuICAgIC5vbiAnbG9hZFRleHQnLCAoYnVmZmVyKSAtPlxuICAgICAgZWRpdG9yU3RhdGVzLl9sb2NrQ2hhbmdlZFN0YXR1cyA9IHRydWVcbiAgICAgIGVkaXRvclN0YXRlcy5jb2RlTWlycm9yLnNldFZhbHVlIGJ1ZmZlclxuICAgICAgZWRpdG9yU3RhdGVzLmNvZGVNaXJyb3IuY2xlYXJIaXN0b3J5KClcbiAgICAgIGVkaXRvclN0YXRlcy5fbG9ja0NoYW5nZWRTdGF0dXMgPSBmYWxzZVxuXG4gICAgLm9uICdzZXRJbWFnZURpcmVjdG9yeScsIChkaXJlY3RvcmllcykgLT4gZWRpdG9yU3RhdGVzLnNldEltYWdlRGlyZWN0b3J5IGRpcmVjdG9yaWVzXG5cbiAgICAjIHNlbmQgdGV4dCB0byBzYXZlIHRvIG1haW4gcHJvY2VzcyBhbmQgcmVsb2FkXG4gICAgLm9uICdzYXZlJywgKGZuYW1lLCB0cmlnZ2VycyA9IHt9KSAtPlxuICAgICAgTWRzUmVuZGVyZXIuc2VuZFRvTWFpbiAnd3JpdGVGaWxlJywgZm5hbWUsIGVkaXRvclN0YXRlcy5jb2RlTWlycm9yLmdldFZhbHVlKCksIHRyaWdnZXJzXG4gICAgICBNZHNSZW5kZXJlci5zZW5kVG9NYWluICdpbml0aWFsaXplU3RhdGUnLCBmbmFtZVxuXG4gICAgLm9uICd2aWV3TW9kZScsIChtb2RlKSAtPlxuICAgICAgc3dpdGNoIG1vZGVcbiAgICAgICAgd2hlbiAnbWFya2Rvd24nXG4gICAgICAgICAgZWRpdG9yU3RhdGVzLnByZXZpZXcuc2VuZCAnc2V0Q2xhc3MnLCAnJ1xuICAgICAgICB3aGVuICdzY3JlZW4nXG4gICAgICAgICAgZWRpdG9yU3RhdGVzLnByZXZpZXcuc2VuZCAnc2V0Q2xhc3MnLCAnc2xpZGUtdmlldyBzY3JlZW4nXG4gICAgICAgIHdoZW4gJ2xpc3QnXG4gICAgICAgICAgZWRpdG9yU3RhdGVzLnByZXZpZXcuc2VuZCAnc2V0Q2xhc3MnLCAnc2xpZGUtdmlldyBsaXN0J1xuICAgICAgICB3aGVuICdwcmVzZW4tZGV2J1xuICAgICAgICAgIGVkaXRvclN0YXRlcy5wcmV2aWV3LnNlbmQgJ3NldENsYXNzJywgJ3NsaWRlLXZpZXcgcHJlc2VuLWRldidcblxuICAgICAgJCgnI3ByZXZpZXctbW9kZXMnKS5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKVxuICAgICAgJCgnLnZpZXdtb2RlLWJ0bltkYXRhLXZpZXdtb2RlXScpLnJlbW92ZUNsYXNzKCdhY3RpdmUnKVxuICAgICAgICAuZmlsdGVyKFwiW2RhdGEtdmlld21vZGU9JyN7bW9kZX0nXVwiKS5hZGRDbGFzcygnYWN0aXZlJylcblxuICAgIC5vbiAnZWRpdENvbW1hbmQnLCAoY29tbWFuZCkgLT4gZWRpdG9yU3RhdGVzLmNvZGVNaXJyb3IuZXhlY0NvbW1hbmQoY29tbWFuZClcblxuICAgIC5vbiAnb3BlbkRldlRvb2wnLCAtPlxuICAgICAgaWYgZWRpdG9yU3RhdGVzLnByZXZpZXcuaXNEZXZUb29sc09wZW5lZCgpXG4gICAgICAgIGVkaXRvclN0YXRlcy5wcmV2aWV3LmNsb3NlRGV2VG9vbHMoKVxuICAgICAgZWxzZVxuICAgICAgICBlZGl0b3JTdGF0ZXMucHJldmlldy5vcGVuRGV2VG9vbHMoKVxuXG4gICAgLm9uICdzZXRFZGl0b3JDb25maWcnLCAoZWRpdG9yQ29uZmlnKSAtPiBzZXRFZGl0b3JDb25maWcgZWRpdG9yQ29uZmlnXG4gICAgLm9uICdzZXRTcGxpdHRlcicsIChzcGxpaXRlclBvcykgLT4gc2V0U3BsaXR0ZXIgc3BsaWl0ZXJQb3NcbiAgICAub24gJ3NldFRoZW1lJywgKHRoZW1lKSAtPiBlZGl0b3JTdGF0ZXMudXBkYXRlR2xvYmFsU2V0dGluZyAnJHRoZW1lJywgdGhlbWVcbiAgICAub24gJ3RoZW1lQ2hhbmdlZCcsICh0aGVtZSkgLT4gTWRzUmVuZGVyZXIuc2VuZFRvTWFpbiAndGhlbWVDaGFuZ2VkJywgdGhlbWVcbiAgICAub24gJ3Jlc291cmNlU3RhdGUnLCAoc3RhdGUpIC0+IGxvYWRpbmdTdGF0ZSA9IHN0YXRlXG4jIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuICB3ZWJ2aWV3ID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI3ByZXZpZXcnKVxuICAjIHNpbXBsZSBwcmVzZW50YXRpb24gbW9kZSBvbiFcbiAgIyAkKCcjcHJlc2VudGF0aW9uJykub24gJ2NsaWNrJywgKCkgPT5cbiAgIyAgIHdlYnZpZXcud2Via2l0UmVxdWVzdEZ1bGxTY3JlZW4oKVxuXG4gICMgJCgnI3ByZXNlbnRhdGlvbicpLm9uICdjbGljaycsICgpID0+XG4gICMgICAkKCcucGFuZS5tYXJrZG93bicpLnRvZ2dsZSgpXG4gICMgICBpcGMuc2VuZCgnUHJlc2VudGF0aW9uJylcblxuICAjIGlwYy5vbiAnaW5pdGlhbGl6ZScgKCkgPT5cblxuXG4gICMgaXBjLm9uIFwicHJlc2VudGF0aW9uXCIsICgpIC0+XG4gICMgICBjb25zb2xlLmxvZyBcInJlY2lldmUgcHJlc2VudGF0aW9uXCJcbiAgIyAgIGlwYy5zZW5kIFwidGV4dFNlbmRcIiwgZWRpdG9yU3RhdGVzLmNvZGVNaXJyb3IuZ2V0VmFsdWUoKVxuICAjICAgY29uc29sZS5sb2cgJ3NlbmQgdGV4dFNlbmQnXG5cbiAgJCgnI3ByZXNlbnRhdGlvbicpLm9uICdjbGljaycsICgpID0+XG4gICAgJCgnLnBhbmUubWFya2Rvd24nKS50b2dnbGUoKVxuICAgICQoJy50b29sYmFyLWZvb3RlcicpLnRvZ2dsZSgpXG4gICAgd2Vidmlldy5zZW5kICdyZXF1ZXN0U2xpZGVJbmZvJ1xuICAgIGNvbnNvbGUubG9nICdzZW5kIHJlcXVlc3RTbGlkZUluZm8nXG5cbiAgd2Vidmlldy5hZGRFdmVudExpc3RlbmVyICdpcGMtbWVzc2FnZScsIChldmVudCkgPT5cbiAgICAgc3dpdGNoIGV2ZW50LmNoYW5uZWxcbiAgICAgICB3aGVuIFwic2VuZFNsaWRlSW5mb1wiICAgIyB3ZWJ2aWV3IOOBi+OCieOCueODqeOCpOODieaDheWgseOCkuWPl+S/oVxuICAgICAgICBzbGlkZUluZm8gPSBldmVudC5hcmdzWzBdXG4gICAgICAgIGNvbnNvbGUubG9nICdyZWNlaXZlIHNlbmRTbGlkZUluZm8nXG4gICAgICAgIGNvbnNvbGUubG9nIHNsaWRlSW5mb1xuICAgICAgICBpcGMuc2VuZCAndGV4dFNlbmQnLCBzbGlkZUluZm9cbiAgICAgICAgY29uc29sZS5sb2cgJ3NlbmQgdGV4dFNlbmQnXG4gICAgICAgIGJyZWFrXG5cbiAgICAgICB3aGVuIFwicmVxdWVzdFNsaWRlSFRNTFwiXG4gICAgICAgIHdlYnZpZXcuc2VuZCAnc2V0U2xpZGUnLCBzbGlkZUhUTUxcbiAgICAgICAgY29uc29sZS5sb2cgJ3NlbmQgc2V0U2xpZGUnXG4gICAgICAgIGJyZWFrXG5cbiAgaXBjLm9uICdwcmVzZW5EZXZJbml0aWFsaXplJywgKGUsIHRleHQpID0+XG4gICAgICBjb25zb2xlLmxvZyAncmVjZWl2ZSBwcmVzZW5EZXZJbml0aWFsaXplJ1xuICAgICAgY29uc29sZS5sb2cgdGV4dFxuICAgICAgc2xpZGVIVE1MID0gdGV4dFxuXG4gIGlwYy5vbiAnZ29Ub1BhZ2UnLCAoZSwgcGFnZSkgPT5cbiAgICBjb25zb2xlLmxvZyBwYWdlXG4gICAgd2Vidmlldy5zZW5kICdnb1RvUGFnZScsIHBhZ2VcblxuICAgICAgIyB3ZWJ2aWV3IOOBrua6luWCmeOBjOOBp+OBjeOBpuOBquOBhFxuICAgICAgIyB3ZWJ2aWV3LnNlbmQgJ3NldFNsaWRlJywgdGV4dFxuICAgICAgIyBjb25zb2xlLmxvZyAnc2VuZCBzZXRTbGlkZSdcbiAgIyBpcGMub24gJ2luaXRpYWxpemUnLCAoKSA9PlxuICAjICAgJCgnLnBhbmUubWFya2Rvd24nKS5odG1sKClcbiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuXG5cbiAgIyBJbml0aWFsaXplXG4gIGVkaXRvclN0YXRlcy5jb2RlTWlycm9yLmZvY3VzKClcbiAgZWRpdG9yU3RhdGVzLnJlZnJlc2hQYWdlKClcbiJdfQ==
