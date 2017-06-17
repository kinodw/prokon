var CodeMirror, EditorStates, MdsMenu, MdsRenderer, MickrClient, PPTX, clsMdsRenderer, createValidator, fs, ipc, kanjiContinuousLen, loadingState, maxComma, maxTen, mixedPeriod, noAbusage, noDoubleNegativeJa, noDoubledConjunction, noDoubledConjunctiveParticleGa, noDoubledJoshi, noDroppingTheRa, noExclamationQuestionMark, noHankakuKana, noMixDearuDesumasu, noNfd, noStartDuplicatedConjunction, ref, shell, successiveWord, validator, weakPhrase, webFrame,
  bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  slice = [].slice;

ipc = require('electron').ipcRenderer;

ref = require('electron'), shell = ref.shell, webFrame = ref.webFrame;

MdsMenu = require('./js/classes/mds_menu');

clsMdsRenderer = require('./js/classes/mds_renderer');

createValidator = require('codemirror-textlint');

MdsRenderer = new clsMdsRenderer;

fs = require('fs');

PPTX = require('./js-pptx/lib/pptx');

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
  var ap, ar, pcSld, pickUpBodyFromPPTX, pickUpTitleFromPPTX, psld, psp, pspTree, ptxBody;

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
    this.loadFromPPTX = bind(this.loadFromPPTX, this);
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

  EditorStates.prototype.loadFromPPTX = function(filePath) {
    var INFILE;
    INFILE = filePath;
    return fs.readFile(INFILE, (function(_this) {
      return function(err, data) {
        var pptx;
        if (err) {
          throw err;
        }
        pptx = new PPTX.Presentation();
        return pptx.load(data, function(err) {
          var body, i, j, ref1, slide, title;
          body = [];
          for (i = j = 1, ref1 = pptx.getSlideCount(); 1 <= ref1 ? j < ref1 : j > ref1; i = 1 <= ref1 ? ++j : --j) {
            slide = pptx.getSlide("slide" + i);
            console.log('slide' + i);
            title = pickUpTitleFromPPTX(slide);
            title = title.replace(/\n/g, '\n# ');
            body.push('# ' + title + '\n' + pickUpBodyFromPPTX(slide));
          }
          return _this.codeMirror.setValue(body.join("\n\n---\n\n"));
        });
      };
    })(this));
  };

  pickUpTitleFromPPTX = function(slide) {
    var i, j, ref1, target, title;
    title = [];
    target = ar(slide);
    for (i = j = 0, ref1 = target.length; 0 <= ref1 ? j < ref1 : j > ref1; i = 0 <= ref1 ? ++j : --j) {
      if (target[i]['a:t'][0] === '') {
        title.push('\n');
      } else {
        title.push(target[i]['a:t']);
      }
    }
    console.log(title);
    return title.join('');
  };

  pickUpBodyFromPPTX = function(slide) {
    var ar, body, i, j, k, l, pushed, ref1, ref2, target, tmp;
    body = [];
    target = psp(slide)[1]['p:txBody'][0]['a:p'];
    for (i = j = 0, ref1 = target.length; 0 <= ref1 ? j < ref1 : j > ref1; i = 0 <= ref1 ? ++j : --j) {
      pushed = "";
      if (target[i]['a:r'] === null) {
        pushed = "";
        body.push(pushed);
        continue;
      } else if (target[i]['a:pPr'] && target[i]['a:r']) {
        pushed = "\n- ";
      }
      if (target[i]['a:r']) {
        tmp = [];
        ar = target[i]['a:r'];
        for (k = l = 0, ref2 = ar.length; 0 <= ref2 ? l < ref2 : l > ref2; k = 0 <= ref2 ? ++l : --l) {
          tmp.push(ar[k]['a:t']);
        }
        pushed = pushed + tmp.join('');
      }
      if (target[i]['a:endParaRPr']) {
        pushed = pushed + '\n';
      }
      body.push(pushed);
      console.log(pushed);
    }
    return body.join('');
  };

  ar = function(slide) {
    return ap(slide)[0]['a:r'];
  };

  ap = function(slide) {
    return ptxBody(slide)[0]['a:p'];
  };

  ptxBody = function(slide) {
    return psp(slide)[0]['p:txBody'];
  };

  pspTree = function(slide) {
    return pcSld(slide)[0]['p:spTree'];
  };

  psp = function(slide) {
    return pspTree(slide)[0]['p:sp'];
  };

  pcSld = function(slide) {
    return psld(slide)['p:cSld'];
  };

  psld = function(slide) {
    return slide.content['p:sld'];
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
      if (f.type === "application/vnd.openxmlformats-officedocument.presentationml.presentation") {
        editorStates.loadFromPPTX(f.path);
      } else if (f.type.startsWith('image')) {
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VzIjpbImluZGV4LmNvZmZlZSJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxJQUFBLGtjQUFBO0VBQUE7OztBQUFBLEdBQUEsR0FBTSxPQUFBLENBQVEsVUFBUixDQUFtQixDQUFDOztBQUMxQixNQUFvQixPQUFBLENBQVEsVUFBUixDQUFwQixFQUFDLGlCQUFELEVBQVE7O0FBQ1IsT0FBQSxHQUFvQixPQUFBLENBQVEsdUJBQVI7O0FBQ3BCLGNBQUEsR0FBb0IsT0FBQSxDQUFRLDJCQUFSOztBQUNwQixlQUFBLEdBQW9CLE9BQUEsQ0FBUSxxQkFBUjs7QUFDcEIsV0FBQSxHQUFvQixJQUFJOztBQUN4QixFQUFBLEdBQW9CLE9BQUEsQ0FBUSxJQUFSOztBQUNwQixJQUFBLEdBQW9CLE9BQUEsQ0FBUSxvQkFBUjs7QUFFcEIsV0FBVyxDQUFDLGFBQVosQ0FBQTs7QUFFQSxRQUFRLENBQUMsa0JBQVQsQ0FBNEIsQ0FBNUIsRUFBK0IsQ0FBL0I7O0FBRUEsVUFBQSxHQUFhLE9BQUEsQ0FBUSxZQUFSOztBQUNiLE9BQUEsQ0FBUSx5QkFBUjs7QUFDQSxPQUFBLENBQVEsbUNBQVI7O0FBQ0EsT0FBQSxDQUFRLHlCQUFSOztBQUNBLE9BQUEsQ0FBUSxvQ0FBUjs7QUFDQSxPQUFBLENBQVEsNEJBQVI7O0FBQ0EsV0FBQSxHQUFjLE9BQUEsQ0FBUSx1QkFBUjs7QUFFUjtBQUNKLE1BQUE7O3lCQUFBLE1BQUEsR0FBUTs7eUJBQ1IsV0FBQSxHQUFhOzt5QkFDYixrQkFBQSxHQUFvQjs7eUJBQ3BCLFlBQUEsR0FBYzs7eUJBRWQsa0JBQUEsR0FBb0I7O3lCQUNwQixlQUFBLEdBQWlCOztFQUVKLHNCQUFDLFVBQUQsRUFBYyxPQUFkO0lBQUMsSUFBQyxDQUFBLGFBQUQ7SUFBYSxJQUFDLENBQUEsVUFBRDs7Ozs7Ozs7Ozs7O0lBQ3pCLElBQUMsQ0FBQSxnQkFBRCxDQUFBO0lBQ0EsSUFBQyxDQUFBLGlCQUFELENBQUE7SUFFQSxJQUFDLENB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LCJzb3VyY2VzQ29udGVudCI6WyJpcGMgPSByZXF1aXJlKCdlbGVjdHJvbicpLmlwY1JlbmRlcmVyXG57c2hlbGwsIHdlYkZyYW1lfSA9IHJlcXVpcmUgJ2VsZWN0cm9uJ1xuTWRzTWVudSAgICAgICAgICAgPSByZXF1aXJlICcuL2pzL2NsYXNzZXMvbWRzX21lbnUnXG5jbHNNZHNSZW5kZXJlciAgICA9IHJlcXVpcmUgJy4vanMvY2xhc3Nlcy9tZHNfcmVuZGVyZXInXG5jcmVhdGVWYWxpZGF0b3IgICA9IHJlcXVpcmUgJ2NvZGVtaXJyb3ItdGV4dGxpbnQnXG5NZHNSZW5kZXJlciAgICAgICA9IG5ldyBjbHNNZHNSZW5kZXJlclxuZnMgICAgICAgICAgICAgICAgPSByZXF1aXJlICdmcydcblBQVFggICAgICAgICAgICAgID0gcmVxdWlyZSAnLi9qcy1wcHR4L2xpYi9wcHR4J1xuXG5NZHNSZW5kZXJlci5yZXF1ZXN0QWNjZXB0KClcblxud2ViRnJhbWUuc2V0Wm9vbUxldmVsTGltaXRzKDEsIDEpXG5cbkNvZGVNaXJyb3IgPSByZXF1aXJlICdjb2RlbWlycm9yJ1xucmVxdWlyZSAnY29kZW1pcnJvci9tb2RlL3htbC94bWwnXG5yZXF1aXJlICdjb2RlbWlycm9yL21vZGUvbWFya2Rvd24vbWFya2Rvd24nXG5yZXF1aXJlICdjb2RlbWlycm9yL21vZGUvZ2ZtL2dmbSdcbnJlcXVpcmUgJ2NvZGVtaXJyb3IvYWRkb24vZWRpdC9jb250aW51ZWxpc3QnXG5yZXF1aXJlIFwiY29kZW1pcnJvci9hZGRvbi9saW50L2xpbnRcIlxuTWlja3JDbGllbnQgPSByZXF1aXJlICcuL21vZHVsZXMvTWlja3JDbGllbnQnXG5cbmNsYXNzIEVkaXRvclN0YXRlc1xuICBydWxlcnM6IFtdXG4gIGN1cnJlbnRQYWdlOiBudWxsXG4gIHByZXZpZXdJbml0aWFsaXplZDogZmFsc2VcbiAgbGFzdFJlbmRlcmVkOiB7fVxuXG4gIF9sb2NrQ2hhbmdlZFN0YXR1czogZmFsc2VcbiAgX2ltYWdlRGlyZWN0b3J5OiBudWxsXG5cbiAgY29uc3RydWN0b3I6IChAY29kZU1pcnJvciwgQHByZXZpZXcpIC0+XG4gICAgQGluaXRpYWxpemVFZGl0b3IoKVxuICAgIEBpbml0aWFsaXplUHJldmlldygpXG5cbiAgICBAbWVudSA9IG5ldyBNZHNNZW51IFtcbiAgICAgIHsgbGFiZWw6ICcmVW5kbycsIGFjY2VsZXJhdG9yOiAnQ21kT3JDdHJsK1onLCBjbGljazogKGksIHcpID0+IEBjb2RlTWlycm9yLmV4ZWNDb21tYW5kICd1bmRvJyBpZiB3IGFuZCAhdy5tZHNXaW5kb3cuZnJlZXplIH1cbiAgICAgIHtcbiAgICAgICAgbGFiZWw6ICcmUmVkbydcbiAgICAgICAgYWNjZWxlcmF0b3I6IGRvIC0+IGlmIHByb2Nlc3MucGxhdGZvcm0gaXMgJ3dpbjMyJyB0aGVuICdDb250cm9sK1knIGVsc2UgJ1NoaWZ0K0NtZE9yQ3RybCtaJ1xuICAgICAgICBjbGljazogKGksIHcpID0+IEBjb2RlTWlycm9yLmV4ZWNDb21tYW5kICdyZWRvJyBpZiB3IGFuZCAhdy5tZHNXaW5kb3cuZnJlZXplXG4gICAgICB9XG4gICAgICB7IHR5cGU6ICdzZXBhcmF0b3InIH1cbiAgICAgIHsgbGFiZWw6ICdDdSZ0JywgYWNjZWxlcmF0b3I6ICdDbWRPckN0cmwrWCcsIHJvbGU6ICdjdXQnIH1cbiAgICAgIHsgbGFiZWw6ICcmQ29weScsIGFjY2VsZXJhdG9yOiAnQ21kT3JDdHJsK0MnLCByb2xlOiAnY29weScgfVxuICAgICAgeyBsYWJlbDogJyZQYXN0ZScsIGFjY2VsZXJhdG9yOiAnQ21kT3JDdHJsK1YnLCByb2xlOiAncGFzdGUnIH1cbiAgICAgIHsgbGFiZWw6ICcmRGVsZXRlJywgcm9sZTogJ2RlbGV0ZScgfVxuICAgICAgeyBsYWJlbDogJ1NlbGVjdCAmQWxsJywgYWNjZWxlcmF0b3I6ICdDbWRPckN0cmwrQScsIGNsaWNrOiAoaSwgdykgPT4gQGNvZGVNaXJyb3IuZXhlY0NvbW1hbmQgJ3NlbGVjdEFsbCcgaWYgdyBhbmQgIXcubWRzV2luZG93LmZyZWV6ZSB9XG4gICAgICB7IHR5cGU6ICdzZXBhcmF0b3InLCBwbGF0Zm9ybTogJ2RhcndpbicgfVxuICAgICAgeyBsYWJlbDogJ1NlcnZpY2VzJywgcm9sZTogJ3NlcnZpY2VzJywgc3VibWVudTogW10sIHBsYXRmb3JtOiAnZGFyd2luJyB9XG4gICAgXVxuXG4gICMg44Oa44O844K444Kr44Km44Oz44OI5b6M44CBd2Vidmlld+OBuOOBneOCjOOCkumAgeS/oVxuICByZWZyZXNoUGFnZTogKHJ1bGVycykgPT5cbiAgICAjIEVkaXRvclN0YXRlc+OCr+ODqeOCueOBruWkieaVsHJ1bGVyc+ODquOCueODiOOBuOWFpeOCjOOBpuOAgeS4gOaXpuODmuODvOOCuOOCku+8keOBq+OBmeOCi1xuICAgIEBydWxlcnMgPSBydWxlcnMgaWYgcnVsZXJzP1xuICAgIHBhZ2UgICAgPSAxXG4gICAjIGNvbnNvbGUubG9nIFwiY29tbWVudCAxcGFnZSA9IFwiICsgQHBpY2tVcENvbW1lbnRGcm9tUGFnZSgxKVxuICAgIGNvbnNvbGUubG9nIFwicnVsZXJzLmxlbmd0aCA9IFwiICsgQHJ1bGVycy5sZW5ndGhcbiAgICBjb25zb2xlLmxvZyBAcGlja1VwQ29tbWVudCgpXG4gICAgIyBjb25zb2xlLmxvZyBcImxhc3QgcGFnZSA9IFwiICsgQHBpY2tVcENvbW1lbnRGcm9tUGFnZShAcnVsZXJzLmxlbmd0aCsxKVxuICAgICNjb25zb2xlLmxvZyBAcGlja1VwQ29tbWVudCgpXG5cbiAgICAjIHJ1bGVyTGluZeOBq+OBryctLS0n44Gu6KGM5L2N572u44GM6KiY44GV44KM44Gm44GK44KK44CB44Gd44KM44Go44Ko44OH44Kj44K/5LiK44Gu44Kr44O844K944Or5L2N572u44KS5q+U6LyD44GX44GmcGFnZeOCkuaxuuOCgeOCi1xuICAgIGxpbmVOdW1iZXIgPSBAY29kZU1pcnJvci5nZXRDdXJzb3IoKS5saW5lIHx8IDBcbiAgICBmb3IgcnVsZXJMaW5lIGluIEBydWxlcnNcbiAgICAgIHBhZ2UrKyBpZiBydWxlckxpbmUgPD0gbGluZU51bWJlclxuXG4gICAgIyBydWxlcuioiOeul+W+jOOBq+ODmuODvOOCuOOBruWil+a4m+OBjOOBguOBo+OBn+WgtOWQiOOAgeato+OBl+OBhOODmuODvOOCuOaDheWgseOCkndlYnZpZXfjgbjpgIHkv6FcbiAgICBpZiBAY3VycmVudFBhZ2UgIT0gcGFnZVxuICAgICAgQGN1cnJlbnRQYWdlID0gcGFnZVxuICAgICAgQHByZXZpZXcuc2VuZCAnY3VycmVudFBhZ2UnLCBAY3VycmVudFBhZ2UgaWYgQHByZXZpZXdJbml0aWFsaXplZFxuXG4gICAgJCgnI3BhZ2UtaW5kaWNhdG9yJykudGV4dCBcIlBhZ2UgI3tAY3VycmVudFBhZ2V9IC8gI3tAcnVsZXJzLmxlbmd0aCArIDF9XCJcblxuICBpbml0aWFsaXplUHJldmlldzogPT5cbiAgICAkKEBwcmV2aWV3KVxuICAgICAgLm9uICdkb20tcmVhZHknLCA9PlxuICAgICAgICAjIEZpeCBtaW5pbWl6ZWQgcHJldmlldyAoIzIwKVxuICAgICAgICAjIFtOb3RlXSBodHRwczovL2dpdGh1Yi5jb20vZWxlY3Ryb24vZWxlY3Ryb24vaXNzdWVzLzQ4ODJcbiAgICAgICAgJChAcHJldmlldy5zaGFkb3dSb290KS5hcHBlbmQoJzxzdHlsZT5vYmplY3R7bWluLXdpZHRoOjA7bWluLWhlaWdodDowO308L3N0eWxlPicpXG5cbiAgICAgICMgd2VidmlldyDjgYvjgonjga7pgJrkv6HjgpLlj5fjgZHlj5bjgosgJ2lwYy1tZXNzYWdlJ1xuICAgICAgLm9uICdpcGMtbWVzc2FnZScsIChldikgPT5cbiAgICAgICAgZSA9IGV2Lm9yaWdpbmFsRXZlbnRcblxuICAgICAgICBzd2l0Y2ggZS5jaGFubmVsXG4gICAgICAgICAgd2hlbiAncnVsZXJDaGFuZ2VkJ1xuICAgICAgICAgICAgQHJlZnJlc2hQYWdlIGUuYXJnc1swXVxuICAgICAgICAgIHdoZW4gJ2xpbmtUbydcbiAgICAgICAgICAgIEBvcGVuTGluayBlLmFyZ3NbMF1cbiAgICAgICAgICB3aGVuICdyZW5kZXJlZCdcbiAgICAgICAgICAgIEBsYXN0UmVuZGVyZWQgPSBlLmFyZ3NbMF1cbiAgICAgICAgICAgIHVubGVzcyBAcHJldmlld0luaXRpYWxpemVkXG4gICAgICAgICAgICAgIE1kc1JlbmRlcmVyLnNlbmRUb01haW4gJ3ByZXZpZXdJbml0aWFsaXplZCdcblxuICAgICAgICAgICAgICBAcHJldmlld0luaXRpYWxpemVkID0gdHJ1ZVxuICAgICAgICAgICAgICAkKCdib2R5JykuYWRkQ2xhc3MgJ2luaXRpYWxpemVkLXNsaWRlJ1xuICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgIE1kc1JlbmRlcmVyLl9jYWxsX2V2ZW50IGUuY2hhbm5lbCwgZS5hcmdzLi4uXG4gICAgICAjIHVybOOCkuOCr+ODquODg+OCr+OBl+OBpuaWsOOBl+OBhOOCpuOCpOODs+ODieOCpuOBjOmWi+OBi+OCjOOCi+aZglxuICAgICAgLm9uICduZXctd2luZG93JywgKGUpID0+XG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKVxuICAgICAgICBAb3BlbkxpbmsgZS5vcmlnaW5hbEV2ZW50LnVybFxuXG4gICAgICAub24gJ2RpZC1maW5pc2gtbG9hZCcsIChlKSA9PlxuICAgICAgICBAcHJldmlldy5zZW5kICdjdXJyZW50UGFnZScsIDFcbiAgICAgICAgQHByZXZpZXcuc2VuZCAnc2V0SW1hZ2VEaXJlY3RvcnknLCBAX2ltYWdlRGlyZWN0b3J5XG4gICAgICAgIEBwcmV2aWV3LnNlbmQgJ3JlbmRlcicsIEBjb2RlTWlycm9yLmdldFZhbHVlKCkgICMgcmVuZGVyIOOCpOODmeODs+ODiOmAgeS/oeOBp3J1bGVy56K66KqN44GX44Gm44Oa44O844K45YiH44KK5pu/44KP44KKXG5cbiAgb3Blbkxpbms6IChsaW5rKSA9PlxuICAgIHNoZWxsLm9wZW5FeHRlcm5hbCBsaW5rIGlmIC9eaHR0cHM/OlxcL1xcLy4rLy50ZXN0KGxpbmspXG5cbiAgaW5pdGlhbGl6ZUVkaXRvcjogPT5cbiAgICBAY29kZU1pcnJvci5vbiAnY29udGV4dG1lbnUnLCAoY20sIGUpID0+XG4gICAgICBlLnByZXZlbnREZWZhdWx0KClcbiAgICAgIEBjb2RlTWlycm9yLmZvY3VzKClcbiAgICAgIEBtZW51LnBvcHVwKClcbiAgICAgIGZhbHNlXG5cbiAgICBAY29kZU1pcnJvci5vbiAnY2hhbmdlJywgKGNtLCBjaGcpID0+XG4gICAgICBAcHJldmlldy5zZW5kICdyZW5kZXInLCBjbS5nZXRWYWx1ZSgpXG4gICAgICBNZHNSZW5kZXJlci5zZW5kVG9NYWluICdzZXRDaGFuZ2VkU3RhdHVzJywgdHJ1ZSBpZiAhQF9sb2NrQ2hhbmdlZFN0YXR1c1xuXG4gICAgQGNvZGVNaXJyb3Iub24gJ2N1cnNvckFjdGl2aXR5JywgKGNtKSA9PiB3aW5kb3cuc2V0VGltZW91dCAoPT4gQHJlZnJlc2hQYWdlKCkpLCA1XG5cbiAgc2V0SW1hZ2VEaXJlY3Rvcnk6IChkaXJlY3RvcnkpID0+XG4gICAgaWYgQHByZXZpZXdJbml0aWFsaXplZFxuICAgICAgQHByZXZpZXcuc2VuZCAnc2V0SW1hZ2VEaXJlY3RvcnknLCBkaXJlY3RvcnlcbiAgICAgIEBwcmV2aWV3LnNlbmQgJ3JlbmRlcicsIEBjb2RlTWlycm9yLmdldFZhbHVlKClcbiAgICBlbHNlXG4gICAgICBAX2ltYWdlRGlyZWN0b3J5ID0gZGlyZWN0b3J5XG5cbiAgaW5zZXJ0SW1hZ2U6IChmaWxlUGF0aCkgPT4gQGNvZGVNaXJyb3IucmVwbGFjZVNlbGVjdGlvbihcIiFbXSgje2ZpbGVQYXRoLnJlcGxhY2UoLyAvZywgJyUyMCcpfSlcXG5cIilcblxuICAjKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipUT0RPKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuICBpbnNlcnRWaWRlbzogKGZpbGVQYXRoKSA9PlxuICAgIGNvbnNvbGUubG9nIGZpbGVQYXRoXG5cblxuICAjIC5wcHR4IOODleOCoeOCpOODq+OCkuODieODqeODg+OCsO+8huODieODreODg+ODl+OBp+ODreODvOODiVxuICBsb2FkRnJvbVBQVFg6IChmaWxlUGF0aCkgPT5cbiAgICBJTkZJTEUgPSBmaWxlUGF0aDtcbiAgICBmcy5yZWFkRmlsZSBJTkZJTEUsIChlcnIsIGRhdGEpID0+XG4gICAgICBpZiAoZXJyKVxuICAgICAgICB0aHJvdyBlcnJcbiAgICAgIHBwdHggPSBuZXcgUFBUWC5QcmVzZW50YXRpb24oKVxuICAgICAgcHB0eC5sb2FkIGRhdGEsIChlcnIpID0+XG4gICAgICAgIGJvZHkgPSBbXVxuXG4gICAgICAgIGZvciBpIGluIFsxLi4ucHB0eC5nZXRTbGlkZUNvdW50KCldXG4gICAgICAgICAgc2xpZGUgPSBwcHR4LmdldFNsaWRlKFwic2xpZGUje2l9XCIpXG4gICAgICAgICAgY29uc29sZS5sb2cgJ3NsaWRlJyArIGlcbiAgICAgICAgICB0aXRsZSA9IHBpY2tVcFRpdGxlRnJvbVBQVFgoc2xpZGUpXG4gICAgICAgICAgdGl0bGUgPSB0aXRsZS5yZXBsYWNlIC9cXG4vZywgJ1xcbiMgJ1xuICAgICAgICAgIGJvZHkucHVzaCgnIyAnICsgdGl0bGUgKyAnXFxuJyArIHBpY2tVcEJvZHlGcm9tUFBUWChzbGlkZSkpXG5cbiAgICAgICAgIyAjY29uc29sZS5sb2cgYm9keVxuICAgICAgICBAY29kZU1pcnJvci5zZXRWYWx1ZShib2R5LmpvaW4oXCJcXG5cXG4tLS1cXG5cXG5cIikpXG4gICAgICAgICMgI2NvbnNvbGUubG9nIEpTT04uc3RyaW5naWZ5KGJvZHksIG51bGwsICcgJylcblxuICBwaWNrVXBUaXRsZUZyb21QUFRYID0gKHNsaWRlKSA9PlxuICAgIHRpdGxlID0gW107XG4gICAgdGFyZ2V0ID0gYXIoc2xpZGUpO1xuICAgIGZvciBpIGluIFswLi4udGFyZ2V0Lmxlbmd0aF1cbiAgICAgICNjb25zb2xlLmxvZyBcInRpdGxlIDogXCIgKyB0YXJnZXRbaV1bJ2E6dCddXG4gICAgICBpZih0YXJnZXRbaV1bJ2E6dCddWzBdID09ICcnKVxuICAgICAgICB0aXRsZS5wdXNoKCdcXG4nKVxuICAgICAgZWxzZVxuICAgICAgICB0aXRsZS5wdXNoKHRhcmdldFtpXVsnYTp0J10pXG4gICAgY29uc29sZS5sb2cgdGl0bGVcbiAgICByZXR1cm4gdGl0bGUuam9pbignJylcblxuICBwaWNrVXBCb2R5RnJvbVBQVFggPSAoc2xpZGUpID0+XG4gICAgYm9keSA9IFtdO1xuICAgIHRhcmdldCA9IHBzcChzbGlkZSlbMV1bJ3A6dHhCb2R5J11bMF1bJ2E6cCddO1xuICAgIGZvciBpIGluIFswLi4udGFyZ2V0Lmxlbmd0aF1cbiAgICAgIHB1c2hlZCA9IFwiXCI7XG4gICAgICBpZih0YXJnZXRbaV1bJ2E6ciddID09IG51bGwpXG4gICAgICAgIHB1c2hlZCA9IFwiXCI7XG4gICAgICAgIGJvZHkucHVzaChwdXNoZWQpXG4gICAgICAgIGNvbnRpbnVlXG4gICAgICBlbHNlIGlmIHRhcmdldFtpXVsnYTpwUHInXSBhbmQgdGFyZ2V0W2ldWydhOnInXVxuICAgICAgICBwdXNoZWQgPSBcIlxcbi0gXCI7XG4gICAgICBpZih0YXJnZXRbaV1bJ2E6ciddKVxuICAgICAgICB0bXAgPSBbXTtcbiAgICAgICAgYXIgPSB0YXJnZXRbaV1bJ2E6ciddO1xuXG4gICAgICAgIGZvciBrIGluIFswLi4uYXIubGVuZ3RoXVxuICAgICAgICAgIHRtcC5wdXNoKGFyW2tdWydhOnQnXSk7XG4gICAgICAgIHB1c2hlZCA9IHB1c2hlZCArIHRtcC5qb2luKCcnKTtcbiAgICAgIGlmKHRhcmdldFtpXVsnYTplbmRQYXJhUlByJ10pXG4gICAgICAgIHB1c2hlZCA9IHB1c2hlZCArICdcXG4nO1xuICAgICAgYm9keS5wdXNoKHB1c2hlZClcbiAgICAgIGNvbnNvbGUubG9nIHB1c2hlZFxuICAgIHJldHVybiBib2R5LmpvaW4oJycpXG5cblxuICBhciA9IChzbGlkZSkgPT5cbiAgICByZXR1cm4gYXAoc2xpZGUpWzBdWydhOnInXTtcblxuICBhcCA9IChzbGlkZSkgPT5cblxuICAgIHJldHVybiBwdHhCb2R5KHNsaWRlKVswXVsnYTpwJ107XG4gIHB0eEJvZHkgPSAoc2xpZGUpID0+XG4gICAgcmV0dXJuIHBzcChzbGlkZSlbMF1bJ3A6dHhCb2R5J107XG5cbiAgcHNwVHJlZSA9IChzbGlkZSkgPT5cbiAgICByZXR1cm4gcGNTbGQoc2xpZGUpWzBdWydwOnNwVHJlZSddO1xuXG4gIHBzcCA9IChzbGlkZSkgPT5cbiAgICByZXR1cm4gcHNwVHJlZShzbGlkZSlbMF1bJ3A6c3AnXTtcblxuICBwY1NsZCA9IChzbGlkZSkgPT5cbiAgICByZXR1cm4gcHNsZChzbGlkZSlbJ3A6Y1NsZCddO1xuXG4gIHBzbGQgPSAoc2xpZGUpID0+XG4gICAgcmV0dXJuIHNsaWRlLmNvbnRlbnRbJ3A6c2xkJ107XG5cbiAgIyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcblxuICAjIHBhZ2Xmr47jgavliKXjgozjgZ/jgrPjg6Hjg7Pjg4jjga7jg6rjgrnjg4jjgpLov5TjgZlcbiAgcGlja1VwQ29tbWVudCA6ICgpID0+XG4gICAgcGFnZU1heCA9IEBydWxlcnMubGVuZ3RoICsgMVxuICAgIENvbW1lbnRFYWNoUGFnZSA9IFtdXG4gICAgZm9yIGkgaW4gWzEuLi5wYWdlTWF4KzFdXG4gICAgICBjb25zb2xlLmxvZyBpXG4gICAgICBDb21tZW50RWFjaFBhZ2UucHVzaChAcGlja1VwQ29tbWVudEZyb21QYWdlKGkpKVxuICAgIHJldHVybiBDb21tZW50RWFjaFBhZ2VcblxuXG4gICMgeyMjICMjfSDjgaflm7Ljgb7jgozjgZ/jgrPjg6Hjg7Pjg4jpg6jliIbjgpLmipzjgY3lh7rjgZlcbiAgIyDjg5bjg63jg4Pjgq/jgrPjg6Hjg7Pjg4jjga7loLTlkIjjga97IyMgIyN944Gu5YmN5b6M44Gr5pS56KGM44GM5YWl44Gj44Gm44GE44Gq44GR44KM44Gw44Gq44KJ44Gq44GEXG4gICMgcGlja1VwQ29tbWVudEZyb21QYWdlKE51bWJlcikgLT4gU3RyaW5nXG4gIHBpY2tVcENvbW1lbnRGcm9tUGFnZSA6IChwYWdlKSA9PlxuICAgIGlmIHBhZ2U9PTEgYW5kIG5vdCBAcnVsZXJzLmxlbmd0aFxuICAgICAgcGFnZVN0YXJ0TGluZSA9IDBcbiAgICAgIHBhZ2VFbmRMaW5lICAgPSBAY29kZU1pcnJvci5saW5lQ291bnQoKVxuICAgICAgY29uc29sZS5sb2cgXCJwYWdlRW5kTGluZSA9IFwiICsgcGFnZUVuZExpbmVcbiAgICBlbHNlIGlmIHBhZ2UgPT0gMSBhbmQgQHJ1bGVycy5sZW5ndGggIT0gMFxuICAgICAgcGFnZVN0YXJ0TGluZSA9IDBcbiAgICAgIHBhZ2VFbmRMaW5lICAgPSBAcnVsZXJzWzBdXG4gICAgZWxzZSBpZiBwYWdlID09IEBydWxlcnMubGVuZ3RoICsgMVxuICAgICAgcGFnZVN0YXJ0TGluZSA9IEBydWxlcnNbQHJ1bGVycy5sZW5ndGgtMV1cbiAgICAgIHBhZ2VFbmRMaW5lICAgPSBAY29kZU1pcnJvci5saW5lQ291bnQoKVxuICAgIGVsc2VcbiAgICAgIHBhZ2VTdGFydExpbmUgPSBAcnVsZXJzW3BhZ2UtMl0gKyAxXG4gICAgICBwYWdlRW5kTGluZSAgID0gQHJ1bGVyc1twYWdlLTFdICsgMVxuXG4gICAgVGV4dEluRWRpdG9yID0gQGNvZGVNaXJyb3IuZ2V0UmFuZ2Uge1wibGluZVwiOnBhZ2VTdGFydExpbmUgLCBcImNoXCI6IDB9LHtcImxpbmVcIjpwYWdlRW5kTGluZS0xICwgXCJjaFwiOjAgfVxuICAgIHJlID0gL1xceyMjW1xcc1xcbl0qKC4qKVtcXHNcXG5dKiMjXFx9L1xuICAgIHJlc3VsdCA9IFRleHRJbkVkaXRvci5tYXRjaChyZSlcbiAgICBjb21tZW50ID0gJydcbiAgICBpZihyZXN1bHQpXG4gICAgICBjb21tZW50ID0gcmVzdWx0WzFdXG4gICAgcmV0dXJuIGNvbW1lbnRcblxuICB1cGRhdGVHbG9iYWxTZXR0aW5nOiAocHJvcCwgdmFsdWUpID0+XG4gICAgbGF0ZXN0UG9zID0gbnVsbFxuXG4gICAgZm9yIG9iaiBpbiAoQGxhc3RSZW5kZXJlZD8uc2V0dGluZ3NQb3NpdGlvbiB8fCBbXSlcbiAgICAgIGxhdGVzdFBvcyA9IG9iaiBpZiBvYmoucHJvcGVydHkgaXMgcHJvcFxuXG4gICAgaWYgbGF0ZXN0UG9zP1xuICAgICAgQGNvZGVNaXJyb3IucmVwbGFjZVJhbmdlKFxuICAgICAgICBcIiN7cHJvcH06ICN7dmFsdWV9XCIsXG4gICAgICAgIENvZGVNaXJyb3IuUG9zKGxhdGVzdFBvcy5saW5lSWR4LCBsYXRlc3RQb3MuZnJvbSksXG4gICAgICAgIENvZGVNaXJyb3IuUG9zKGxhdGVzdFBvcy5saW5lSWR4LCBsYXRlc3RQb3MuZnJvbSArIGxhdGVzdFBvcy5sZW5ndGgpLFxuICAgICAgKVxuICAgIGVsc2VcbiAgICAgIEBjb2RlTWlycm9yLnJlcGxhY2VSYW5nZShcbiAgICAgICAgXCI8IS0tICN7cHJvcH06ICN7dmFsdWV9IC0tPlxcblxcblwiLFxuICAgICAgICBDb2RlTWlycm9yLlBvcyhAY29kZU1pcnJvci5maXJzdExpbmUoKSwgMClcbiAgICAgIClcblxubG9hZGluZ1N0YXRlID0gJ2xvYWRpbmcnXG5cblxuXG4jIHRleHRsaW50IHJ1bGVzIHNldHRpbmdcblxubm9BYnVzYWdlID0gcmVxdWlyZSAndGV4dGxpbnQtcnVsZS1qYS1uby1hYnVzYWdlJ1xubWl4ZWRQZXJpb2QgPSByZXF1aXJlICd0ZXh0bGludC1ydWxlLWphLW5vLW1peGVkLXBlcmlvZCdcbnN1Y2Nlc3NpdmVXb3JkID0gcmVxdWlyZSAndGV4dGxpbnQtcnVsZS1qYS1uby1zdWNjZXNzaXZlLXdvcmQnXG53ZWFrUGhyYXNlID0gcmVxdWlyZSAndGV4dGxpbnQtcnVsZS1qYS1uby13ZWFrLXBocmFzZSdcbm1heENvbW1hID0gcmVxdWlyZSAndGV4dGxpbnQtcnVsZS1tYXgtY29tbWEnXG5rYW5qaUNvbnRpbnVvdXNMZW4gPSByZXF1aXJlICd0ZXh0bGludC1ydWxlLW1heC1rYW5qaS1jb250aW51b3VzLWxlbidcbm1heFRlbiA9IHJlcXVpcmUgJ3RleHRsaW50LXJ1bGUtbWF4LXRlbidcbm5vRG91YmxlTmVnYXRpdmVKYSA9IHJlcXVpcmUgJ3RleHRsaW50LXJ1bGUtbm8tZG91YmxlLW5lZ2F0aXZlLWphJ1xubm9Eb3VibGVkQ29uanVuY3Rpb24gPSByZXF1aXJlICd0ZXh0bGludC1ydWxlLW5vLWRvdWJsZWQtY29uanVuY3Rpb24nXG5ub0RvdWJsZWRDb25qdW5jdGl2ZVBhcnRpY2xlR2EgPSByZXF1aXJlICd0ZXh0bGludC1ydWxlLW5vLWRvdWJsZWQtY29uanVuY3RpdmUtcGFydGljbGUtZ2EnXG5ub0RvdWJsZWRKb3NoaSA9IHJlcXVpcmUgJ3RleHRsaW50LXJ1bGUtbm8tZG91YmxlZC1qb3NoaSdcbm5vRHJvcHBpbmdUaGVSYSA9IHJlcXVpcmUgJ3RleHRsaW50LXJ1bGUtbm8tZHJvcHBpbmctdGhlLXJhJ1xubm9FeGNsYW1hdGlvblF1ZXN0aW9uTWFyayA9IHJlcXVpcmUgJ3RleHRsaW50LXJ1bGUtbm8tZXhjbGFtYXRpb24tcXVlc3Rpb24tbWFyaydcbm5vSGFua2FrdUthbmEgPSByZXF1aXJlICd0ZXh0bGludC1ydWxlLW5vLWhhbmtha3Uta2FuYSdcbm5vTWl4RGVhcnVEZXN1bWFzdSA9IHJlcXVpcmUgJ3RleHRsaW50LXJ1bGUtbm8tbWl4LWRlYXJ1LWRlc3VtYXN1J1xubm9OZmQgPSByZXF1aXJlICd0ZXh0bGludC1ydWxlLW5vLW5mZCdcbm5vU3RhcnREdXBsaWNhdGVkQ29uanVuY3Rpb24gPSByZXF1aXJlICd0ZXh0bGludC1ydWxlLW5vLXN0YXJ0LWR1cGxpY2F0ZWQtY29uanVuY3Rpb24nXG5cbnZhbGlkYXRvciA9IGNyZWF0ZVZhbGlkYXRvcih7XG4gIHJ1bGVzOiB7XG4gICAgJ25vQWJ1c2FnZScgOiBub0FidXNhZ2UsXG4gICAgJ21peGVkUGVyaW9kJyA6IG1peGVkUGVyaW9kLFxuICAgICdzdWNjZXNzaXZlV29yZCcgOiBzdWNjZXNzaXZlV29yZCxcbiAgICAnd2Vha1BocmFzZScgOiB3ZWFrUGhyYXNlLFxuICAgICdtYXhDb21tYScgOiBtYXhDb21tYSxcbiAgICAna2FuamlDb250aW51b3VzTGVuJyA6IGthbmppQ29udGludW91c0xlbixcbiAgICAnbWF4VGVuJyA6IG1heFRlbixcbiAgICAnbm9Eb3VibGVkTmVnYXRpdmVKYScgOiBub0RvdWJsZU5lZ2F0aXZlSmEsXG4gICAgJ25vRG91YmxlZENvbmp1bmN0aW9uJyA6IG5vRG91YmxlZENvbmp1bmN0aW9uLFxuICAgICdub0RvdWJsZWRDb25qdW5jdGl2ZVBhcnRpY2xlR2EnIDogbm9Eb3VibGVkQ29uanVuY3RpdmVQYXJ0aWNsZUdhLFxuICAgICdub0RvdWJsZWRKb3NoaScgOiBub0RvdWJsZWRKb3NoaSxcbiAgICAnbm9Ecm9wcGluZ1RoZVJhJyA6IG5vRHJvcHBpbmdUaGVSYSxcbiAgICAnbm9FeGNsYW1hdGlvblF1ZXN0aW9uTWFyaycgOiBub0V4Y2xhbWF0aW9uUXVlc3Rpb25NYXJrLFxuICAgICdub0hhbmtha3VLYW5hJyA6IG5vSGFua2FrdUthbmEsXG4gICAgJ25vTWl4RGVhcnVEZXN1bWFzdScgOiBub01peERlYXJ1RGVzdW1hc3UsXG4gICAgJ25vTmZkJyA6IG5vTmZkLFxuICAgICdub1N0YXJ0RHVwbGljYXRlZENvbmp1bmN0aW9uJyA6IG5vU3RhcnREdXBsaWNhdGVkQ29uanVuY3Rpb25cbiAgfVxuICB9KTtcbmRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIgXCJET01Db250ZW50TG9hZGVkXCIsIChldmVudCk9PlxuXG4gICMgY2xpZW50LnNlbmQgXCJtb3JuaW5nXCIsXG4gICMgICBcImZyb21cIjogc2V0dGluZy5pZCxcbiAgIyAgIFwidG9cIiA6IFwibGFuZFwiLFxuICAjICAgXCJib2R5XCI6XG4gICMgICAgIFwiY29udGVudFwiOiBcImhlbGxvISBsYW5kISBpJ20gaW5kZXhcIlxuXG5cbmRvIC0+XG4gIHNsaWRlSFRNTCA9IFwiXCJcbiAgZWRpdG9yU3RhdGVzID0gbmV3IEVkaXRvclN0YXRlcyhcbiAgICBDb2RlTWlycm9yLmZyb21UZXh0QXJlYSgkKCcjZWRpdG9yJylbMF0sXG4gICAgICAjIGdmbSA6IEdpdGh1YiBGbGF2b3JlZCBNb2RlXG4gICAgICBtb2RlOiAnZ2ZtJ1xuICAgICAgI3RoZW1lOiAnYmFzZTE2LWxpZ2h0J1xuICAgICAgbGluZVdyYXBwaW5nOiB0cnVlXG4gICAgICBsaW5lTnVtYmVyczogdHJ1ZVxuICAgICAgZHJhZ0Ryb3A6IGZhbHNlXG4gICAgICBndXR0ZXJzOiBbXCJDb2RlTWlycm9yLWxpbnQtbWFya2Vyc1wiXVxuICAgICAgbGludDoge1xuICAgICAgICAgXCJnZXRBbm5vdGF0aW9uc1wiOiB2YWxpZGF0b3IsXG4gICAgICAgICBcImFzeW5jXCI6IHRydWVcbiAgICAgIH1cbiAgICAgIGV4dHJhS2V5czpcbiAgICAgICAgRW50ZXI6ICduZXdsaW5lQW5kSW5kZW50Q29udGludWVNYXJrZG93bkxpc3QnXG4gICAgKSxcbiAgICAkKCcjcHJldmlldycpWzBdXG4gIClcblxuXG5cbiAgIyBWaWV3IG1vZGVzXG4gICQoJy52aWV3bW9kZS1idG5bZGF0YS12aWV3bW9kZV0nKS5jbGljayAtPiBNZHNSZW5kZXJlci5zZW5kVG9NYWluKCd2aWV3TW9kZScsICQodGhpcykuYXR0cignZGF0YS12aWV3bW9kZScpKVxuXG4gICMgUERGIEV4cG9ydCBidXR0b25cbiAgJCgnI3BkZi1leHBvcnQnKS5jbGljayAtPiBpcGMuc2VuZCAnUGRmRXhwb3J0J1xuXG4gICMgRmlsZSBEJkRcbiAgJChkb2N1bWVudClcbiAgICAub24gJ2RyYWdvdmVyJywgIC0+IGZhbHNlXG4gICAgLm9uICdkcmFnbGVhdmUnLCAtPiBmYWxzZVxuICAgIC5vbiAnZHJhZ2VuZCcsICAgLT4gZmFsc2VcbiAgICAub24gJ2Ryb3AnLCAgICAgIChlKSA9PlxuICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpXG4gICAgICByZXR1cm4gZmFsc2UgdW5sZXNzIChmID0gZS5vcmlnaW5hbEV2ZW50LmRhdGFUcmFuc2Zlcj8uZmlsZXM/WzBdKT9cbiAgICAgICMgY29uc29sZS5sb2cgZi50eXBlXG4gICAgICAjIGNvbnNvbGUubG9nIGYucGF0aFxuICAgICAgIyDjg5Hjg6/jg53jga4gLnBwdHjjg5XjgqHjgqTjg6vjgaDjgaPjgZ/jgolcbiAgICAgIGlmIGYudHlwZSA9PSBcImFwcGxpY2F0aW9uL3ZuZC5vcGVueG1sZm9ybWF0cy1vZmZpY2Vkb2N1bWVudC5wcmVzZW50YXRpb25tbC5wcmVzZW50YXRpb25cIlxuICAgICAgICBlZGl0b3JTdGF0ZXMubG9hZEZyb21QUFRYIGYucGF0aFxuICAgICAgZWxzZSBpZiBmLnR5cGUuc3RhcnRzV2l0aCgnaW1hZ2UnKVxuICAgICAgICBlZGl0b3JTdGF0ZXMuaW5zZXJ0SW1hZ2UgZi5wYXRoXG4gICAgICBlbHNlIGlmIGYudHlwZS5zdGFydHNXaXRoKCd0ZXh0JykgfHwgZi50eXBlIGlzICcnXG4gICAgICAgIE1kc1JlbmRlcmVyLnNlbmRUb01haW4gJ2xvYWRGcm9tRmlsZScsIGYucGF0aCBpZiBmLnBhdGg/XG4gICAgICBlbHNlIGlmIGYudHlwZS5zdGFydHNXaXRoKCd2aWRlbycpXG4gICAgICAgIGVkaXRvclN0YXRlcy5pbnNlcnRWaWRlbyBmLnBhdGhcblxuICAgICAgZmFsc2VcblxuICAjIFNwbGl0dGVyXG4gIGRyYWdnaW5nU3BsaXR0ZXIgICAgICA9IGZhbHNlXG4gIGRyYWdnaW5nU3BsaXRQb3NpdGlvbiA9IHVuZGVmaW5lZFxuXG4gIHNldFNwbGl0dGVyID0gKHNwbGl0UG9pbnQpIC0+XG4gICAgc3BsaXRQb2ludCA9IE1hdGgubWluKDAuOCwgTWF0aC5tYXgoMC4yLCBwYXJzZUZsb2F0KHNwbGl0UG9pbnQpKSlcblxuICAgICQoJy5wYW5lLm1hcmtkb3duJykuY3NzKCdmbGV4LWdyb3cnLCBzcGxpdFBvaW50ICogMTAwKVxuICAgICQoJy5wYW5lLnByZXZpZXcnKS5jc3MoJ2ZsZXgtZ3JvdycsICgxIC0gc3BsaXRQb2ludCkgKiAxMDApXG5cbiAgICByZXR1cm4gc3BsaXRQb2ludFxuXG4gIHNldEVkaXRvckNvbmZpZyA9IChlZGl0b3JDb25maWcpIC0+XG4gICAgZWRpdG9yID0gJChlZGl0b3JTdGF0ZXMuY29kZU1pcnJvcj8uZ2V0V3JhcHBlckVsZW1lbnQoKSlcbiAgICBlZGl0b3IuY3NzKCdmb250LWZhbWlseScsIGVkaXRvckNvbmZpZy5mb250RmFtaWx5KSBpZiBlZGl0b3I/XG4gICAgZWRpdG9yLmNzcygnZm9udC1zaXplJywgZWRpdG9yQ29uZmlnLmZvbnRTaXplKSBpZiBlZGl0b3I/XG5cbiAgJCgnLnBhbmUtc3BsaXR0ZXInKVxuICAgIC5tb3VzZWRvd24gLT5cbiAgICAgIGRyYWdnaW5nU3BsaXR0ZXIgPSB0cnVlXG4gICAgICBkcmFnZ2luZ1NwbGl0UG9zaXRpb24gPSB1bmRlZmluZWRcblxuICAgIC5kYmxjbGljayAtPlxuICAgICAgTWRzUmVuZGVyZXIuc2VuZFRvTWFpbiAnc2V0Q29uZmlnJywgJ3NwbGl0dGVyUG9zaXRpb24nLCBzZXRTcGxpdHRlcigwLjUpXG5cbiAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIgJ21vdXNlbW92ZScsIChlKSAtPlxuICAgIGlmIGRyYWdnaW5nU3BsaXR0ZXJcbiAgICAgIGRyYWdnaW5nU3BsaXRQb3NpdGlvbiA9IHNldFNwbGl0dGVyIE1hdGgubWluKE1hdGgubWF4KDAsIGUuY2xpZW50WCksIGRvY3VtZW50LmJvZHkuY2xpZW50V2lkdGgpIC8gZG9jdW1lbnQuYm9keS5jbGllbnRXaWR0aFxuICAsIGZhbHNlXG5cbiAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIgJ21vdXNldXAnLCAoZSkgLT5cbiAgICBkcmFnZ2luZ1NwbGl0dGVyID0gZmFsc2VcbiAgICBNZHNSZW5kZXJlci5zZW5kVG9NYWluICdzZXRDb25maWcnLCAnc3BsaXR0ZXJQb3NpdGlvbicsIGRyYWdnaW5nU3BsaXRQb3NpdGlvbiBpZiBkcmFnZ2luZ1NwbGl0UG9zaXRpb24/XG4gICwgZmFsc2VcblxuICByZXNwb25zZVBkZk9wdHMgPSBudWxsXG5cbiAgIyBFdmVudHNcbiAgTWRzUmVuZGVyZXJcbiAgICAub24gJ3B1Ymxpc2hQZGYnLCAoZm5hbWUpIC0+XG4gICAgICBlZGl0b3JTdGF0ZXMuY29kZU1pcnJvci5nZXRJbnB1dEZpZWxkKCkuYmx1cigpXG4gICAgICAkKCdib2R5JykuYWRkQ2xhc3MgJ2V4cG9ydGluZy1wZGYnXG5cbiAgICAgIGVkaXRvclN0YXRlcy5wcmV2aWV3LnNlbmQgJ3JlcXVlc3RQZGZPcHRpb25zJywgeyBmaWxlbmFtZTogZm5hbWUgfVxuXG4gICAgLm9uICdyZXNwb25zZVBkZk9wdGlvbnMnLCAob3B0cykgLT5cbiAgICAgICMgV2FpdCBsb2FkaW5nIHJlc291cmNlc1xuICAgICAgc3RhcnRQdWJsaXNoID0gLT5cbiAgICAgICAgaWYgbG9hZGluZ1N0YXRlIGlzICdsb2FkaW5nJ1xuICAgICAgICAgIHNldFRpbWVvdXQgc3RhcnRQdWJsaXNoLCAyNTBcbiAgICAgICAgZWxzZVxuICAgICAgICAgIGVkaXRvclN0YXRlcy5wcmV2aWV3LnByaW50VG9QREZcbiAgICAgICAgICAgIG1hcmdpbnNUeXBlOiAxXG4gICAgICAgICAgICBwYWdlU2l6ZTogb3B0cy5leHBvcnRTaXplXG4gICAgICAgICAgICBwcmludEJhY2tncm91bmQ6IHRydWVcbiAgICAgICAgICAsIChlcnIsIGRhdGEpIC0+XG4gICAgICAgICAgICB1bmxlc3MgZXJyXG4gICAgICAgICAgICAgIE1kc1JlbmRlcmVyLnNlbmRUb01haW4gJ3dyaXRlRmlsZScsIG9wdHMuZmlsZW5hbWUsIGRhdGEsIHsgZmluYWxpemVkOiAndW5mcmVlemUnIH1cbiAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgTWRzUmVuZGVyZXIuc2VuZFRvTWFpbiAndW5mcmVlemUnXG5cbiAgICAgIHNldFRpbWVvdXQgc3RhcnRQdWJsaXNoLCA1MDBcblxuICAgIC5vbiAndW5mcmVlemVkJywgLT5cbiAgICAgIGVkaXRvclN0YXRlcy5wcmV2aWV3LnNlbmQgJ3VuZnJlZXplJ1xuICAgICAgJCgnYm9keScpLnJlbW92ZUNsYXNzICdleHBvcnRpbmctcGRmJ1xuXG4gICAgLm9uICdsb2FkVGV4dCcsIChidWZmZXIpIC0+XG4gICAgICBlZGl0b3JTdGF0ZXMuX2xvY2tDaGFuZ2VkU3RhdHVzID0gdHJ1ZVxuICAgICAgZWRpdG9yU3RhdGVzLmNvZGVNaXJyb3Iuc2V0VmFsdWUgYnVmZmVyXG4gICAgICBlZGl0b3JTdGF0ZXMuY29kZU1pcnJvci5jbGVhckhpc3RvcnkoKVxuICAgICAgZWRpdG9yU3RhdGVzLl9sb2NrQ2hhbmdlZFN0YXR1cyA9IGZhbHNlXG5cbiAgICAub24gJ3NldEltYWdlRGlyZWN0b3J5JywgKGRpcmVjdG9yaWVzKSAtPiBlZGl0b3JTdGF0ZXMuc2V0SW1hZ2VEaXJlY3RvcnkgZGlyZWN0b3JpZXNcblxuICAgICMgc2VuZCB0ZXh0IHRvIHNhdmUgdG8gbWFpbiBwcm9jZXNzIGFuZCByZWxvYWRcbiAgICAub24gJ3NhdmUnLCAoZm5hbWUsIHRyaWdnZXJzID0ge30pIC0+XG4gICAgICBNZHNSZW5kZXJlci5zZW5kVG9NYWluICd3cml0ZUZpbGUnLCBmbmFtZSwgZWRpdG9yU3RhdGVzLmNvZGVNaXJyb3IuZ2V0VmFsdWUoKSwgdHJpZ2dlcnNcbiAgICAgIE1kc1JlbmRlcmVyLnNlbmRUb01haW4gJ2luaXRpYWxpemVTdGF0ZScsIGZuYW1lXG5cbiAgICAub24gJ3ZpZXdNb2RlJywgKG1vZGUpIC0+XG4gICAgICBzd2l0Y2ggbW9kZVxuICAgICAgICB3aGVuICdtYXJrZG93bidcbiAgICAgICAgICBlZGl0b3JTdGF0ZXMucHJldmlldy5zZW5kICdzZXRDbGFzcycsICcnXG4gICAgICAgIHdoZW4gJ3NjcmVlbidcbiAgICAgICAgICBlZGl0b3JTdGF0ZXMucHJldmlldy5zZW5kICdzZXRDbGFzcycsICdzbGlkZS12aWV3IHNjcmVlbidcbiAgICAgICAgd2hlbiAnbGlzdCdcbiAgICAgICAgICBlZGl0b3JTdGF0ZXMucHJldmlldy5zZW5kICdzZXRDbGFzcycsICdzbGlkZS12aWV3IGxpc3QnXG4gICAgICAgIHdoZW4gJ3ByZXNlbi1kZXYnXG4gICAgICAgICAgZWRpdG9yU3RhdGVzLnByZXZpZXcuc2VuZCAnc2V0Q2xhc3MnLCAnc2xpZGUtdmlldyBwcmVzZW4tZGV2J1xuXG4gICAgICAkKCcjcHJldmlldy1tb2RlcycpLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpXG4gICAgICAkKCcudmlld21vZGUtYnRuW2RhdGEtdmlld21vZGVdJykucmVtb3ZlQ2xhc3MoJ2FjdGl2ZScpXG4gICAgICAgIC5maWx0ZXIoXCJbZGF0YS12aWV3bW9kZT0nI3ttb2RlfSddXCIpLmFkZENsYXNzKCdhY3RpdmUnKVxuXG4gICAgLm9uICdlZGl0Q29tbWFuZCcsIChjb21tYW5kKSAtPiBlZGl0b3JTdGF0ZXMuY29kZU1pcnJvci5leGVjQ29tbWFuZChjb21tYW5kKVxuXG4gICAgLm9uICdvcGVuRGV2VG9vbCcsIC0+XG4gICAgICBpZiBlZGl0b3JTdGF0ZXMucHJldmlldy5pc0RldlRvb2xzT3BlbmVkKClcbiAgICAgICAgZWRpdG9yU3RhdGVzLnByZXZpZXcuY2xvc2VEZXZUb29scygpXG4gICAgICBlbHNlXG4gICAgICAgIGVkaXRvclN0YXRlcy5wcmV2aWV3Lm9wZW5EZXZUb29scygpXG5cbiAgICAub24gJ3NldEVkaXRvckNvbmZpZycsIChlZGl0b3JDb25maWcpIC0+IHNldEVkaXRvckNvbmZpZyBlZGl0b3JDb25maWdcbiAgICAub24gJ3NldFNwbGl0dGVyJywgKHNwbGlpdGVyUG9zKSAtPiBzZXRTcGxpdHRlciBzcGxpaXRlclBvc1xuICAgIC5vbiAnc2V0VGhlbWUnLCAodGhlbWUpIC0+IGVkaXRvclN0YXRlcy51cGRhdGVHbG9iYWxTZXR0aW5nICckdGhlbWUnLCB0aGVtZVxuICAgIC5vbiAndGhlbWVDaGFuZ2VkJywgKHRoZW1lKSAtPiBNZHNSZW5kZXJlci5zZW5kVG9NYWluICd0aGVtZUNoYW5nZWQnLCB0aGVtZVxuICAgIC5vbiAncmVzb3VyY2VTdGF0ZScsIChzdGF0ZSkgLT4gbG9hZGluZ1N0YXRlID0gc3RhdGVcbiAgIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcblxuICBzZXR0aW5nID1cbiAgICBcImlkXCI6IFwiaW5kZXhcIlxuICAgIFwidXJsXCI6IFwid3M6Ly9hcHBzLndpc2RvbXdlYi5uZXQ6NjQyNjAvd3MvbWlrXCJcbiAgICBcInNpdGVcIjogXCJ0ZXN0XCJcbiAgICBcInRva2VuXCI6IFwiUGFkOjk5NDhcIlxuICBjbGllbnQgPSBuZXcgTWlja3JDbGllbnQoc2V0dGluZylcblxuICBjbGllbnQub24gXCJjYW5SZWNlaXZlRWRpdG9yVGV4dFwiLCAoKT0+XG4gICAgY2xpZW50LnNlbmQgXCJzZW5kRWRpdG9yVGV4dFwiLCB7XG4gICAgICBcInRvXCI6IFwicHJlc2VuSW5kZXhcIlxuICAgICAgXCJib2R5XCI6XG4gICAgICAgIFwiY29udGVudFwiOiBlZGl0b3JTdGF0ZXMuY29kZU1pcnJvci5nZXRWYWx1ZSgpXG4gICAgfVxuICBjbGllbnQub24gXCJjYW5SZWNlaXZlQ29tbWVudFwiLCAoKT0+XG4gICBjbGllbnQuc2VuZCBcInNlbmRDb21tZW50XCIsIHtcbiAgICAgXCJ0b1wiOiBcInByZXNlbkRldkluZGV4XCIsXG4gICAgIFwiYm9keVwiOlxuICAgICAgIFwiY29udGVudFwiOiBlZGl0b3JTdGF0ZXMucGlja1VwQ29tbWVudCgpXG4gICB9XG5cbiAgd2VidmlldyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNwcmV2aWV3JylcbiAgIyBzaW1wbGUgcHJlc2VudGF0aW9uIG1vZGUgb24hXG4gICMgJCgnI3ByZXNlbnRhdGlvbicpLm9uICdjbGljaycsICgpID0+XG4gICMgICB3ZWJ2aWV3LndlYmtpdFJlcXVlc3RGdWxsU2NyZWVuKClcblxuICAjICQoJyNwcmVzZW50YXRpb24nKS5vbiAnY2xpY2snLCAoKSA9PlxuICAjICAgJCgnLnBhbmUubWFya2Rvd24nKS50b2dnbGUoKVxuICAjICAgaXBjLnNlbmQoJ1ByZXNlbnRhdGlvbicpXG5cbiAgIyBpcGMub24gJ2luaXRpYWxpemUnICgpID0+XG5cblxuICAjIGlwYy5vbiBcInByZXNlbnRhdGlvblwiLCAoKSAtPlxuICAjICAgY29uc29sZS5sb2cgXCJyZWNpZXZlIHByZXNlbnRhdGlvblwiXG4gICMgICBpcGMuc2VuZCBcInRleHRTZW5kXCIsIGVkaXRvclN0YXRlcy5jb2RlTWlycm9yLmdldFZhbHVlKClcbiAgIyAgIGNvbnNvbGUubG9nICdzZW5kIHRleHRTZW5kJ1xuXG4gICQoJyNwcmVzZW50YXRpb24nKS5vbiAnY2xpY2snLCAoKSA9PlxuICAgIHdlYnZpZXcuc2VuZCAncmVxdWVzdFNsaWRlSW5mbydcbiAgICBjb25zb2xlLmxvZyAnc2VuZCByZXF1ZXN0U2xpZGVJbmZvJ1xuXG5cbiAgd2Vidmlldy5hZGRFdmVudExpc3RlbmVyICdpcGMtbWVzc2FnZScsIChldmVudCkgPT5cbiAgICAgc3dpdGNoIGV2ZW50LmNoYW5uZWxcbiAgICAgICB3aGVuIFwic2VuZFNsaWRlSW5mb1wiICAgIyB3ZWJ2aWV3IOOBi+OCieOCueODqeOCpOODieaDheWgseOCkuWPl+S/oVxuICAgICAgICBzbGlkZUluZm8gPSBldmVudC5hcmdzWzBdXG4gICAgICAgIGNvbnNvbGUubG9nICdyZWNlaXZlIHNlbmRTbGlkZUluZm8nXG4gICAgICAgIGNvbnNvbGUubG9nIHNsaWRlSW5mb1xuICAgICAgICBpcGMuc2VuZCAndGV4dFNlbmQnLCBzbGlkZUluZm9cbiAgICAgICAgY29uc29sZS5sb2cgJ3NlbmQgdGV4dFNlbmQnXG4gICAgICAgIGJyZWFrXG5cbiAgICAgICB3aGVuIFwicmVxdWVzdFNsaWRlSFRNTFwiXG4gICAgICAgIHdlYnZpZXcuc2VuZCAnc2V0U2xpZGUnLCBzbGlkZUhUTUxcbiAgICAgICAgY29uc29sZS5sb2cgJ3NlbmQgc2V0U2xpZGUnXG4gICAgICAgIGJyZWFrXG5cbiAgaXBjLm9uICdwcmVzZW5EZXZJbml0aWFsaXplJywgKGUsIHRleHQpID0+XG4gICAgICBjb25zb2xlLmxvZyAncmVjZWl2ZSBwcmVzZW5EZXZJbml0aWFsaXplJ1xuICAgICAgY29uc29sZS5sb2cgdGV4dFxuICAgICAgc2xpZGVIVE1MID0gdGV4dFxuXG4gIGlwYy5vbiAnZ29Ub1BhZ2UnLCAoZSwgcGFnZSkgPT5cbiAgICBjb25zb2xlLmxvZyBwYWdlXG4gICAgd2Vidmlldy5zZW5kICdnb1RvUGFnZScsIHBhZ2VcblxuICAgICAgIyB3ZWJ2aWV3IOOBrua6luWCmeOBjOOBp+OBjeOBpuOBquOBhFxuICAgICAgIyB3ZWJ2aWV3LnNlbmQgJ3NldFNsaWRlJywgdGV4dFxuICAgICAgIyBjb25zb2xlLmxvZyAnc2VuZCBzZXRTbGlkZSdcbiAgIyBpcGMub24gJ2luaXRpYWxpemUnLCAoKSA9PlxuICAjICAgJCgnLnBhbmUubWFya2Rvd24nKS5odG1sKClcbiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuXG5cbiAgIyBJbml0aWFsaXplXG4gIGVkaXRvclN0YXRlcy5jb2RlTWlycm9yLmZvY3VzKClcbiAgZWRpdG9yU3RhdGVzLnJlZnJlc2hQYWdlKClcbiJdfQ==
