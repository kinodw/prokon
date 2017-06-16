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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VzIjpbImluZGV4LmNvZmZlZSJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxJQUFBLGtjQUFBO0VBQUE7OztBQUFBLEdBQUEsR0FBTSxPQUFBLENBQVEsVUFBUixDQUFtQixDQUFDOztBQUMxQixNQUFvQixPQUFBLENBQVEsVUFBUixDQUFwQixFQUFDLGlCQUFELEVBQVE7O0FBQ1IsT0FBQSxHQUFvQixPQUFBLENBQVEsdUJBQVI7O0FBQ3BCLGNBQUEsR0FBb0IsT0FBQSxDQUFRLDJCQUFSOztBQUNwQixlQUFBLEdBQW9CLE9BQUEsQ0FBUSxxQkFBUjs7QUFDcEIsV0FBQSxHQUFvQixJQUFJOztBQUN4QixFQUFBLEdBQW9CLE9BQUEsQ0FBUSxJQUFSOztBQUNwQixJQUFBLEdBQW9CLE9BQUEsQ0FBUSxvQkFBUjs7QUFFcEIsV0FBVyxDQUFDLGFBQVosQ0FBQTs7QUFFQSxRQUFRLENBQUMsa0JBQVQsQ0FBNEIsQ0FBNUIsRUFBK0IsQ0FBL0I7O0FBRUEsVUFBQSxHQUFhLE9BQUEsQ0FBUSxZQUFSOztBQUNiLE9BQUEsQ0FBUSx5QkFBUjs7QUFDQSxPQUFBLENBQVEsbUNBQVI7O0FBQ0EsT0FBQSxDQUFRLHlCQUFSOztBQUNBLE9BQUEsQ0FBUSxvQ0FBUjs7QUFDQSxPQUFBLENBQVEsNEJBQVI7O0FBQ0EsV0FBQSxHQUFjLE9BQUEsQ0FBUSx1QkFBUjs7QUFFUjtBQUNKLE1BQUE7O3lCQUFBLE1BQUEsR0FBUTs7eUJBQ1IsV0FBQSxHQUFhOzt5QkFDYixrQkFBQSxHQUFvQjs7eUJBQ3BCLFlBQUEsR0FBYzs7eUJBRWQsa0JBQUEsR0FBb0I7O3lCQUNwQixlQUFBLEdBQWlCOztFQUVKLHNCQUFDLFVBQUQsRUFBYyxPQUFkO0lBQUMsSUFBQyxDQUFBLGFBQUQ7SUFBYSxJQUFDLENBQUEsVUFBRDs7Ozs7Ozs7Ozs7O0lBQ3pCLE9BQU8sQ0FBQyxHQUFSLENBQVksRUFBQSxHQUFHLFNBQWY7SUFDQSxJQUFDLENBQUEsZ0JBQUQsQ0FBQTtJQUNBLElBQUMsQ0FBQSxpQkFBRCxDQUFBO0lBRUEsSUFBQyxDQUFBLElBQUQsR0FBUSxJQUFJLE9BQUosQ0FBWTtNQUNsQjtRQUFFLEtBQUEsRUFBTyxPQUFUO1FBQWtCLFdBQUEsRUFBYSxhQUEvQjtRQUE4QyxLQUFBLEVBQU8sQ0FBQSxTQUFBLEtBQUE7aUJBQUEsU0FBQyxDQUFELEVBQUksQ0FBSjtZQUFVLElBQWtDLENBQUEsSUFBTSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsTUFBckQ7cUJBQUEsS0FBQyxDQUFBLFVBQVUsQ0FBQyxXQUFaLENBQXdCLE1BQXhCLEVBQUE7O1VBQVY7UUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBQXJEO09BRGtCLEVBRWxCO1FBQ0UsS0FBQSxFQUFPLE9BRFQ7UUFFRSxXQUFBLEVBQWdCLENBQUEsU0FBQTtVQUFHLElBQUcsT0FBTyxDQUFDLFFBQVIsS0FBb0IsT0FBdkI7bUJBQW9DLFlBQXBDO1dBQUEsTUFBQTttQkFBcUQsb0JBQXJEOztRQUFILENBQUEsQ0FBSCxDQUFBLENBRmY7UUFHRSxLQUFBLEVBQU8sQ0FBQSxTQUFBLEtBQUE7aUJBQUEsU0FBQyxDQUFELEVBQUksQ0FBSjtZQUFVLElBQWtDLENBQUEsSUFBTSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsTUFBckQ7cUJBQUEsS0FBQyxDQUFBLFVBQVUsQ0FBQyxXQUFaLENBQXdCLE1BQXhCLEVBQUE7O1VBQVY7UUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBSFQ7T0FGa0IsRUFPbEI7UUFBRSxJQUFBLEVBQU0sV0FBUjtPQVBrQixFQVFsQjtRQUFFLEtBQUEsRUFBTyxNQUFUO1FBQWlCLFdBQUEsRUFBYSxhQUE5QjtRQUE2QyxJQUFBLEVBQU0sS0FBbkQ7T0FSa0IsRUFTbEI7UUFBRSxLQUFBLEVBQU8sT0FBVDtRQUFrQixXQUFBLEVBQWEsYUFBL0I7UUFBOEMsSUFBQSxFQUFNLE1BQXBEO09BVGtCLEVBVWxCO1FBQUUsS0FBQSxFQUFPLFFBQVQ7UUFBbUIsV0FBQSxFQUFhLGFBQWhDO1FBQStDLElBQUEsRUFBTSxPQUFyRDtPQVZrQixFQVdsQjtRQUFFLEtBQUEsRUFBTyxTQUFUO1FBQW9CLElBQUEsRUFBTSxRQUExQjtPQVhrQixFQVlsQjtRQUFFLEtBQUEsRUFBTyxhQUFUO1FBQXdCLFdBQUEsRUFBYSxhQUFyQztRQUFvRCxLQUFBLEVBQU8sQ0FBQSxTQUFBLEtBQUE7aUJBQUEsU0FBQyxDQUFELEVBQUksQ0FBSjtZQUFVLElBQXVDLENBQUEsSUFBTSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsTUFBMUQ7cUJBQUEsS0FBQyxDQUFBLFVBQVUsQ0FBQyxXQUFaLENBQXdCLFdBQXhCLEVBQUE7O1VBQVY7UUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBQTNEO09BWmtCLEVBYWxCO1FBQUUsSUFBQSxFQUFNLFdBQVI7UUFBcUIsUUFBQSxFQUFVLFFBQS9CO09BYmtCLEVBY2xCO1FBQUUsS0FBQSxFQUFPLFVBQVQ7UUFBcUIsSUFBQSxFQUFNLFVBQTNCO1FBQXVDLE9BQUEsRUFBUyxFQUFoRDtRQUFvRCxRQUFBLEVBQVUsUUFBOUQ7T0Fka0I7S0FBWjtFQUxHOzt5QkF1QmIsV0FBQSxHQUFhLFNBQUMsTUFBRDtBQUVYLFFBQUE7SUFBQSxJQUFvQixjQUFwQjtNQUFBLElBQUMsQ0FBQSxNQUFELEdBQVUsT0FBVjs7SUFDQSxJQUFBLEdBQVU7SUFFVixPQUFPLENBQUMsR0FBUixDQUFZLGtCQUFBLEdBQXFCLElBQUMsQ0FBQSxNQUFNLENBQUMsTUFBekM7SUFDQSxPQUFPLENBQUMsR0FBUixDQUFZLElBQUMsQ0FBQSxhQUFELENBQUEsQ0FBWjtJQUtBLFVBQUEsR0FBYSxJQUFDLENBQUEsVUFBVSxDQUFDLFNBQVosQ0FBQSxDQUF1QixDQUFDLElBQXhCLElBQWdDO0FBQzdDO0FBQUEsU0FBQSxzQ0FBQTs7TUFDRSxJQUFVLFNBQUEsSUFBYSxVQUF2QjtRQUFBLElBQUEsR0FBQTs7QUFERjtJQUlBLElBQUcsSUFBQyxDQUFBLFdBQUQsS0FBZ0IsSUFBbkI7TUFDRSxJQUFDLENBQUEsV0FBRCxHQUFlO01BQ2YsSUFBNkMsSUFBQyxDQUFBLGtCQUE5QztRQUFBLElBQUMsQ0FBQSxPQUFPLENBQUMsSUFBVCxDQUFjLGFBQWQsRUFBNkIsSUFBQyxDQUFBLFdBQTlCLEVBQUE7T0FGRjs7V0FJQSxDQUFBLENBQUUsaUJBQUYsQ0FBb0IsQ0FBQyxJQUFyQixDQUEwQixPQUFBLEdBQVEsSUFBQyxDQUFBLFdBQVQsR0FBcUIsS0FBckIsR0FBeUIsQ0FBQyxJQUFDLENBQUEsTUFBTSxDQUFDLE1BQVIsR0FBaUIsQ0FBbEIsQ0FBbkQ7RUFwQlc7O3lCQXNCYixpQkFBQSxHQUFtQixTQUFBO1dBQ2pCLENBQUEsQ0FBRSxJQUFDLENBQUEsT0FBSCxDQUNFLENBQUMsRUFESCxDQUNNLFdBRE4sRUFDbUIsQ0FBQSxTQUFBLEtBQUE7YUFBQSxTQUFBO2VBR2YsQ0FBQSxDQUFFLEtBQUMsQ0FBQSxPQUFPLENBQUMsVUFBWCxDQUFzQixDQUFDLE1BQXZCLENBQThCLGtEQUE5QjtNQUhlO0lBQUEsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQURuQixDQU9FLENBQUMsRUFQSCxDQU9NLGFBUE4sRUFPcUIsQ0FBQSxTQUFBLEtBQUE7YUFBQSxTQUFDLEVBQUQ7QUFDakIsWUFBQTtRQUFBLENBQUEsR0FBSSxFQUFFLENBQUM7QUFFUCxnQkFBTyxDQUFDLENBQUMsT0FBVDtBQUFBLGVBQ08sY0FEUDttQkFFSSxLQUFDLENBQUEsV0FBRCxDQUFhLENBQUMsQ0FBQyxJQUFLLENBQUEsQ0FBQSxDQUFwQjtBQUZKLGVBR08sUUFIUDttQkFJSSxLQUFDLENBQUEsUUFBRCxDQUFVLENBQUMsQ0FBQyxJQUFLLENBQUEsQ0FBQSxDQUFqQjtBQUpKLGVBS08sVUFMUDtZQU1JLEtBQUMsQ0FBQSxZQUFELEdBQWdCLENBQUMsQ0FBQyxJQUFLLENBQUEsQ0FBQTtZQUN2QixJQUFBLENBQU8sS0FBQyxDQUFBLGtCQUFSO2NBQ0UsV0FBVyxDQUFDLFVBQVosQ0FBdUIsb0JBQXZCO2NBRUEsS0FBQyxDQUFBLGtCQUFELEdBQXNCO3FCQUN0QixDQUFBLENBQUUsTUFBRixDQUFTLENBQUMsUUFBVixDQUFtQixtQkFBbkIsRUFKRjs7QUFGRztBQUxQO21CQWFJLFdBQVcsQ0FBQyxXQUFaLG9CQUF3QixDQUFBLENBQUMsQ0FBQyxPQUFTLFNBQUEsV0FBQSxDQUFDLENBQUMsSUFBRixDQUFBLENBQW5DO0FBYko7TUFIaUI7SUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBUHJCLENBeUJFLENBQUMsRUF6QkgsQ0F5Qk0sWUF6Qk4sRUF5Qm9CLENBQUEsU0FBQSxLQUFBO2FBQUEsU0FBQyxDQUFEO1FBQ2hCLENBQUMsQ0FBQyxjQUFGLENBQUE7ZUFDQSxLQUFDLENBQUEsUUFBRCxDQUFVLENBQUMsQ0FBQyxhQUFhLENBQUMsR0FBMUI7TUFGZ0I7SUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBekJwQixDQTZCRSxDQUFDLEVBN0JILENBNkJNLGlCQTdCTixFQTZCeUIsQ0FBQSxTQUFBLEtBQUE7YUFBQSxTQUFDLENBQUQ7UUFDckIsS0FBQyxDQUFBLE9BQU8sQ0FBQyxJQUFULENBQWMsYUFBZCxFQUE2QixDQUE3QjtRQUNBLEtBQUMsQ0FBQSxPQUFPLENBQUMsSUFBVCxDQUFjLG1CQUFkLEVBQW1DLEtBQUMsQ0FBQSxlQUFwQztlQUNBLEtBQUMsQ0FBQSxPQUFPLENBQUMsSUFBVCxDQUFjLFFBQWQsRUFBd0IsS0FBQyxDQUFBLFVBQVUsQ0FBQyxRQUFaLENBQUEsQ0FBeEI7TUFIcUI7SUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBN0J6QjtFQURpQjs7eUJBbUNuQixRQUFBLEdBQVUsU0FBQyxJQUFEO0lBQ1IsSUFBMkIsZ0JBQWdCLENBQUMsSUFBakIsQ0FBc0IsSUFBdEIsQ0FBM0I7YUFBQSxLQUFLLENBQUMsWUFBTixDQUFtQixJQUFuQixFQUFBOztFQURROzt5QkFHVixnQkFBQSxHQUFrQixTQUFBO0lBQ2hCLElBQUMsQ0FBQSxVQUFVLENBQUMsRUFBWixDQUFlLGFBQWYsRUFBOEIsQ0FBQSxTQUFBLEtBQUE7YUFBQSxTQUFDLEVBQUQsRUFBSyxDQUFMO1FBQzVCLENBQUMsQ0FBQyxjQUFGLENBQUE7UUFDQSxLQUFDLENBQUEsVUFBVSxDQUFDLEtBQVosQ0FBQTtRQUNBLEtBQUMsQ0FBQSxJQUFJLENBQUMsS0FBTixDQUFBO2VBQ0E7TUFKNEI7SUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBQTlCO0lBTUEsSUFBQyxDQUFBLFVBQVUsQ0FBQyxFQUFaLENBQWUsUUFBZixFQUF5QixDQUFBLFNBQUEsS0FBQTthQUFBLFNBQUMsRUFBRCxFQUFLLEdBQUw7UUFDdkIsS0FBQyxDQUFBLE9BQU8sQ0FBQyxJQUFULENBQWMsUUFBZCxFQUF3QixFQUFFLENBQUMsUUFBSCxDQUFBLENBQXhCO1FBQ0EsSUFBbUQsQ0FBQyxLQUFDLENBQUEsa0JBQXJEO2lCQUFBLFdBQVcsQ0FBQyxVQUFaLENBQXVCLGtCQUF2QixFQUEyQyxJQUEzQyxFQUFBOztNQUZ1QjtJQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBekI7V0FJQSxJQUFDLENBQUEsVUFBVSxDQUFDLEVBQVosQ0FBZSxnQkFBZixFQUFpQyxDQUFBLFNBQUEsS0FBQTthQUFBLFNBQUMsRUFBRDtlQUFRLE1BQU0sQ0FBQyxVQUFQLENBQWtCLENBQUMsU0FBQTtpQkFBRyxLQUFDLENBQUEsV0FBRCxDQUFBO1FBQUgsQ0FBRCxDQUFsQixFQUF1QyxDQUF2QztNQUFSO0lBQUEsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQUFqQztFQVhnQjs7eUJBYWxCLGlCQUFBLEdBQW1CLFNBQUMsU0FBRDtJQUNqQixJQUFHLElBQUMsQ0FBQSxrQkFBSjtNQUNFLElBQUMsQ0FBQSxPQUFPLENBQUMsSUFBVCxDQUFjLG1CQUFkLEVBQW1DLFNBQW5DO2FBQ0EsSUFBQyxDQUFBLE9BQU8sQ0FBQyxJQUFULENBQWMsUUFBZCxFQUF3QixJQUFDLENBQUEsVUFBVSxDQUFDLFFBQVosQ0FBQSxDQUF4QixFQUZGO0tBQUEsTUFBQTthQUlFLElBQUMsQ0FBQSxlQUFELEdBQW1CLFVBSnJCOztFQURpQjs7eUJBT25CLFdBQUEsR0FBYSxTQUFDLFFBQUQ7V0FBYyxJQUFDLENBQUEsVUFBVSxDQUFDLGdCQUFaLENBQTZCLE1BQUEsR0FBTSxDQUFDLFFBQVEsQ0FBQyxPQUFULENBQWlCLElBQWpCLEVBQXVCLEtBQXZCLENBQUQsQ0FBTixHQUFxQyxLQUFsRTtFQUFkOzt5QkFHYixXQUFBLEdBQWEsU0FBQyxRQUFEO1dBQ1gsT0FBTyxDQUFDLEdBQVIsQ0FBWSxRQUFaO0VBRFc7O3lCQUtiLFlBQUEsR0FBYyxTQUFDLFFBQUQ7QUFDWixRQUFBO0lBQUEsTUFBQSxHQUFTO1dBQ1QsRUFBRSxDQUFDLFFBQUgsQ0FBWSxNQUFaLEVBQW9CLENBQUEsU0FBQSxLQUFBO2FBQUEsU0FBQyxHQUFELEVBQU0sSUFBTjtBQUNsQixZQUFBO1FBQUEsSUFBSSxHQUFKO0FBQ0UsZ0JBQU0sSUFEUjs7UUFFQSxJQUFBLEdBQU8sSUFBSSxJQUFJLENBQUMsWUFBVCxDQUFBO2VBQ1AsSUFBSSxDQUFDLElBQUwsQ0FBVSxJQUFWLEVBQWdCLFNBQUMsR0FBRDtBQUNkLGNBQUE7VUFBQSxJQUFBLEdBQU87QUFFUCxlQUFTLGtHQUFUO1lBQ0UsS0FBQSxHQUFRLElBQUksQ0FBQyxRQUFMLENBQWMsT0FBQSxHQUFRLENBQXRCO1lBQ1IsT0FBTyxDQUFDLEdBQVIsQ0FBWSxPQUFBLEdBQVUsQ0FBdEI7WUFDQSxLQUFBLEdBQVEsbUJBQUEsQ0FBb0IsS0FBcEI7WUFDUixLQUFBLEdBQVEsS0FBSyxDQUFDLE9BQU4sQ0FBYyxLQUFkLEVBQXFCLE1BQXJCO1lBQ1IsSUFBSSxDQUFDLElBQUwsQ0FBVSxJQUFBLEdBQU8sS0FBUCxHQUFlLElBQWYsR0FBc0Isa0JBQUEsQ0FBbUIsS0FBbkIsQ0FBaEM7QUFMRjtpQkFRQSxLQUFDLENBQUEsVUFBVSxDQUFDLFFBQVosQ0FBcUIsSUFBSSxDQUFDLElBQUwsQ0FBVSxhQUFWLENBQXJCO1FBWGMsQ0FBaEI7TUFKa0I7SUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBQXBCO0VBRlk7O0VBb0JkLG1CQUFBLEdBQXNCLFNBQUMsS0FBRDtBQUNwQixRQUFBO0lBQUEsS0FBQSxHQUFRO0lBQ1IsTUFBQSxHQUFTLEVBQUEsQ0FBRyxLQUFIO0FBQ1QsU0FBUywyRkFBVDtNQUVFLElBQUcsTUFBTyxDQUFBLENBQUEsQ0FBRyxDQUFBLEtBQUEsQ0FBTyxDQUFBLENBQUEsQ0FBakIsS0FBdUIsRUFBMUI7UUFDRSxLQUFLLENBQUMsSUFBTixDQUFXLElBQVgsRUFERjtPQUFBLE1BQUE7UUFHRSxLQUFLLENBQUMsSUFBTixDQUFXLE1BQU8sQ0FBQSxDQUFBLENBQUcsQ0FBQSxLQUFBLENBQXJCLEVBSEY7O0FBRkY7SUFNQSxPQUFPLENBQUMsR0FBUixDQUFZLEtBQVo7QUFDQSxXQUFPLEtBQUssQ0FBQyxJQUFOLENBQVcsRUFBWDtFQVZhOztFQVl0QixrQkFBQSxHQUFxQixTQUFDLEtBQUQ7QUFDbkIsUUFBQTtJQUFBLElBQUEsR0FBTztJQUNQLE1BQUEsR0FBUyxHQUFBLENBQUksS0FBSixDQUFXLENBQUEsQ0FBQSxDQUFHLENBQUEsVUFBQSxDQUFZLENBQUEsQ0FBQSxDQUFHLENBQUEsS0FBQTtBQUN0QyxTQUFTLDJGQUFUO01BQ0UsTUFBQSxHQUFTO01BQ1QsSUFBRyxNQUFPLENBQUEsQ0FBQSxDQUFHLENBQUEsS0FBQSxDQUFWLEtBQW9CLElBQXZCO1FBQ0UsTUFBQSxHQUFTO1FBQ1QsSUFBSSxDQUFDLElBQUwsQ0FBVSxNQUFWO0FBQ0EsaUJBSEY7T0FBQSxNQUlLLElBQUcsTUFBTyxDQUFBLENBQUEsQ0FBRyxDQUFBLE9BQUEsQ0FBVixJQUF1QixNQUFPLENBQUEsQ0FBQSxDQUFHLENBQUEsS0FBQSxDQUFwQztRQUNILE1BQUEsR0FBUyxPQUROOztNQUVMLElBQUcsTUFBTyxDQUFBLENBQUEsQ0FBRyxDQUFBLEtBQUEsQ0FBYjtRQUNFLEdBQUEsR0FBTTtRQUNOLEVBQUEsR0FBSyxNQUFPLENBQUEsQ0FBQSxDQUFHLENBQUEsS0FBQTtBQUVmLGFBQVMsdUZBQVQ7VUFDRSxHQUFHLENBQUMsSUFBSixDQUFTLEVBQUcsQ0FBQSxDQUFBLENBQUcsQ0FBQSxLQUFBLENBQWY7QUFERjtRQUVBLE1BQUEsR0FBUyxNQUFBLEdBQVMsR0FBRyxDQUFDLElBQUosQ0FBUyxFQUFULEVBTnBCOztNQU9BLElBQUcsTUFBTyxDQUFBLENBQUEsQ0FBRyxDQUFBLGNBQUEsQ0FBYjtRQUNFLE1BQUEsR0FBUyxNQUFBLEdBQVMsS0FEcEI7O01BRUEsSUFBSSxDQUFDLElBQUwsQ0FBVSxNQUFWO01BQ0EsT0FBTyxDQUFDLEdBQVIsQ0FBWSxNQUFaO0FBbEJGO0FBbUJBLFdBQU8sSUFBSSxDQUFDLElBQUwsQ0FBVSxFQUFWO0VBdEJZOztFQXlCckIsRUFBQSxHQUFLLFNBQUMsS0FBRDtBQUNILFdBQU8sRUFBQSxDQUFHLEtBQUgsQ0FBVSxDQUFBLENBQUEsQ0FBRyxDQUFBLEtBQUE7RUFEakI7O0VBR0wsRUFBQSxHQUFLLFNBQUMsS0FBRDtBQUVILFdBQU8sT0FBQSxDQUFRLEtBQVIsQ0FBZSxDQUFBLENBQUEsQ0FBRyxDQUFBLEtBQUE7RUFGdEI7O0VBR0wsT0FBQSxHQUFVLFNBQUMsS0FBRDtBQUNSLFdBQU8sR0FBQSxDQUFJLEtBQUosQ0FBVyxDQUFBLENBQUEsQ0FBRyxDQUFBLFVBQUE7RUFEYjs7RUFHVixPQUFBLEdBQVUsU0FBQyxLQUFEO0FBQ1IsV0FBTyxLQUFBLENBQU0sS0FBTixDQUFhLENBQUEsQ0FBQSxDQUFHLENBQUEsVUFBQTtFQURmOztFQUdWLEdBQUEsR0FBTSxTQUFDLEtBQUQ7QUFDSixXQUFPLE9BQUEsQ0FBUSxLQUFSLENBQWUsQ0FBQSxDQUFBLENBQUcsQ0FBQSxNQUFBO0VBRHJCOztFQUdOLEtBQUEsR0FBUSxTQUFDLEtBQUQ7QUFDTixXQUFPLElBQUEsQ0FBSyxLQUFMLENBQVksQ0FBQSxRQUFBO0VBRGI7O0VBR1IsSUFBQSxHQUFPLFNBQUMsS0FBRDtBQUNMLFdBQU8sS0FBSyxDQUFDLE9BQVEsQ0FBQSxPQUFBO0VBRGhCOzt5QkFNUCxhQUFBLEdBQWdCLFNBQUE7QUFDZCxRQUFBO0lBQUEsT0FBQSxHQUFVLElBQUMsQ0FBQSxNQUFNLENBQUMsTUFBUixHQUFpQjtJQUMzQixlQUFBLEdBQWtCO0FBQ2xCLFNBQVMseUZBQVQ7TUFDRSxPQUFPLENBQUMsR0FBUixDQUFZLENBQVo7TUFDQSxlQUFlLENBQUMsSUFBaEIsQ0FBcUIsSUFBQyxDQUFBLHFCQUFELENBQXVCLENBQXZCLENBQXJCO0FBRkY7QUFHQSxXQUFPO0VBTk87O3lCQVloQixxQkFBQSxHQUF3QixTQUFDLElBQUQ7QUFDdEIsUUFBQTtJQUFBLElBQUcsSUFBQSxLQUFNLENBQU4sSUFBWSxDQUFJLElBQUMsQ0FBQSxNQUFNLENBQUMsTUFBM0I7TUFDRSxhQUFBLEdBQWdCO01BQ2hCLFdBQUEsR0FBZ0IsSUFBQyxDQUFBLFVBQVUsQ0FBQyxTQUFaLENBQUE7TUFDaEIsT0FBTyxDQUFDLEdBQVIsQ0FBWSxnQkFBQSxHQUFtQixXQUEvQixFQUhGO0tBQUEsTUFJSyxJQUFHLElBQUEsS0FBUSxDQUFSLElBQWMsSUFBQyxDQUFBLE1BQU0sQ0FBQyxNQUFSLEtBQWtCLENBQW5DO01BQ0gsYUFBQSxHQUFnQjtNQUNoQixXQUFBLEdBQWdCLElBQUMsQ0FBQSxNQUFPLENBQUEsQ0FBQSxFQUZyQjtLQUFBLE1BR0EsSUFBRyxJQUFBLEtBQVEsSUFBQyxDQUFBLE1BQU0sQ0FBQyxNQUFSLEdBQWlCLENBQTVCO01BQ0gsYUFBQSxHQUFnQixJQUFDLENBQUEsTUFBTyxDQUFBLElBQUMsQ0FBQSxNQUFNLENBQUMsTUFBUixHQUFlLENBQWY7TUFDeEIsV0FBQSxHQUFnQixJQUFDLENBQUEsVUFBVSxDQUFDLFNBQVosQ0FBQSxFQUZiO0tBQUEsTUFBQTtNQUlILGFBQUEsR0FBZ0IsSUFBQyxDQUFBLE1BQU8sQ0FBQSxJQUFBLEdBQUssQ0FBTCxDQUFSLEdBQWtCO01BQ2xDLFdBQUEsR0FBZ0IsSUFBQyxDQUFBLE1BQU8sQ0FBQSxJQUFBLEdBQUssQ0FBTCxDQUFSLEdBQWtCLEVBTC9COztJQU9MLFlBQUEsR0FBZSxJQUFDLENBQUEsVUFBVSxDQUFDLFFBQVosQ0FBcUI7TUFBQyxNQUFBLEVBQU8sYUFBUjtNQUF3QixJQUFBLEVBQU0sQ0FBOUI7S0FBckIsRUFBc0Q7TUFBQyxNQUFBLEVBQU8sV0FBQSxHQUFZLENBQXBCO01BQXdCLElBQUEsRUFBSyxDQUE3QjtLQUF0RDtJQUNmLEVBQUEsR0FBSztJQUNMLE1BQUEsR0FBUyxZQUFZLENBQUMsS0FBYixDQUFtQixFQUFuQjtJQUNULE9BQUEsR0FBVTtJQUNWLElBQUcsTUFBSDtNQUNFLE9BQUEsR0FBVSxNQUFPLENBQUEsQ0FBQSxFQURuQjs7QUFFQSxXQUFPO0VBckJlOzt5QkF1QnhCLG1CQUFBLEdBQXFCLFNBQUMsSUFBRCxFQUFPLEtBQVA7QUFDbkIsUUFBQTtJQUFBLFNBQUEsR0FBWTtBQUVaO0FBQUEsU0FBQSxzQ0FBQTs7TUFDRSxJQUFtQixHQUFHLENBQUMsUUFBSixLQUFnQixJQUFuQztRQUFBLFNBQUEsR0FBWSxJQUFaOztBQURGO0lBR0EsSUFBRyxpQkFBSDthQUNFLElBQUMsQ0FBQSxVQUFVLENBQUMsWUFBWixDQUNLLElBQUQsR0FBTSxJQUFOLEdBQVUsS0FEZCxFQUVFLFVBQVUsQ0FBQyxHQUFYLENBQWUsU0FBUyxDQUFDLE9BQXpCLEVBQWtDLFNBQVMsQ0FBQyxJQUE1QyxDQUZGLEVBR0UsVUFBVSxDQUFDLEdBQVgsQ0FBZSxTQUFTLENBQUMsT0FBekIsRUFBa0MsU0FBUyxDQUFDLElBQVYsR0FBaUIsU0FBUyxDQUFDLE1BQTdELENBSEYsRUFERjtLQUFBLE1BQUE7YUFPRSxJQUFDLENBQUEsVUFBVSxDQUFDLFlBQVosQ0FDRSxPQUFBLEdBQVEsSUFBUixHQUFhLElBQWIsR0FBaUIsS0FBakIsR0FBdUIsVUFEekIsRUFFRSxVQUFVLENBQUMsR0FBWCxDQUFlLElBQUMsQ0FBQSxVQUFVLENBQUMsU0FBWixDQUFBLENBQWYsRUFBd0MsQ0FBeEMsQ0FGRixFQVBGOztFQU5tQjs7Ozs7O0FBa0J2QixZQUFBLEdBQWU7O0FBTWYsU0FBQSxHQUFZLE9BQUEsQ0FBUSw2QkFBUjs7QUFDWixXQUFBLEdBQWMsT0FBQSxDQUFRLGtDQUFSOztBQUNkLGNBQUEsR0FBaUIsT0FBQSxDQUFRLHFDQUFSOztBQUNqQixVQUFBLEdBQWEsT0FBQSxDQUFRLGlDQUFSOztBQUNiLFFBQUEsR0FBVyxPQUFBLENBQVEseUJBQVI7O0FBQ1gsa0JBQUEsR0FBcUIsT0FBQSxDQUFRLHdDQUFSOztBQUNyQixNQUFBLEdBQVMsT0FBQSxDQUFRLHVCQUFSOztBQUNULGtCQUFBLEdBQXFCLE9BQUEsQ0FBUSxxQ0FBUjs7QUFDckIsb0JBQUEsR0FBdUIsT0FBQSxDQUFRLHNDQUFSOztBQUN2Qiw4QkFBQSxHQUFpQyxPQUFBLENBQVEsa0RBQVI7O0FBQ2pDLGNBQUEsR0FBaUIsT0FBQSxDQUFRLGdDQUFSOztBQUNqQixlQUFBLEdBQWtCLE9BQUEsQ0FBUSxrQ0FBUjs7QUFDbEIseUJBQUEsR0FBNEIsT0FBQSxDQUFRLDRDQUFSOztBQUM1QixhQUFBLEdBQWdCLE9BQUEsQ0FBUSwrQkFBUjs7QUFDaEIsa0JBQUEsR0FBcUIsT0FBQSxDQUFRLHFDQUFSOztBQUNyQixLQUFBLEdBQVEsT0FBQSxDQUFRLHNCQUFSOztBQUNSLDRCQUFBLEdBQStCLE9BQUEsQ0FBUSwrQ0FBUjs7QUFFL0IsU0FBQSxHQUFZLGVBQUEsQ0FBZ0I7RUFDMUIsS0FBQSxFQUFPO0lBQ0wsV0FBQSxFQUFjLFNBRFQ7SUFFTCxhQUFBLEVBQWdCLFdBRlg7SUFHTCxnQkFBQSxFQUFtQixjQUhkO0lBSUwsWUFBQSxFQUFlLFVBSlY7SUFLTCxVQUFBLEVBQWEsUUFMUjtJQU1MLG9CQUFBLEVBQXVCLGtCQU5sQjtJQU9MLFFBQUEsRUFBVyxNQVBOO0lBUUwscUJBQUEsRUFBd0Isa0JBUm5CO0lBU0wsc0JBQUEsRUFBeUIsb0JBVHBCO0lBVUwsZ0NBQUEsRUFBbUMsOEJBVjlCO0lBV0wsZ0JBQUEsRUFBbUIsY0FYZDtJQVlMLGlCQUFBLEVBQW9CLGVBWmY7SUFhTCwyQkFBQSxFQUE4Qix5QkFiekI7SUFjTCxlQUFBLEVBQWtCLGFBZGI7SUFlTCxvQkFBQSxFQUF1QixrQkFmbEI7SUFnQkwsT0FBQSxFQUFVLEtBaEJMO0lBaUJMLDhCQUFBLEVBQWlDLDRCQWpCNUI7R0FEbUI7Q0FBaEI7O0FBcUJaLFFBQVEsQ0FBQyxnQkFBVCxDQUEwQixrQkFBMUIsRUFBOEMsQ0FBQSxTQUFBLEtBQUE7U0FBQSxTQUFDLEtBQUQsR0FBQTtBQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBOUM7O0FBU0csQ0FBQSxTQUFBO0FBQ0QsTUFBQTtFQUFBLFNBQUEsR0FBWTtFQUNaLFlBQUEsR0FBZSxJQUFJLFlBQUosQ0FDYixVQUFVLENBQUMsWUFBWCxDQUF3QixDQUFBLENBQUUsU0FBRixDQUFhLENBQUEsQ0FBQSxDQUFyQyxFQUVFO0lBQUEsSUFBQSxFQUFNLEtBQU47SUFFQSxZQUFBLEVBQWMsSUFGZDtJQUdBLFdBQUEsRUFBYSxJQUhiO0lBSUEsUUFBQSxFQUFVLEtBSlY7SUFLQSxPQUFBLEVBQVMsQ0FBQyx5QkFBRCxDQUxUO0lBTUEsSUFBQSxFQUFNO01BQ0gsZ0JBQUEsRUFBa0IsU0FEZjtNQUVILE9BQUEsRUFBUyxJQUZOO0tBTk47SUFVQSxTQUFBLEVBQ0U7TUFBQSxLQUFBLEVBQU8sc0NBQVA7S0FYRjtHQUZGLENBRGEsRUFnQmIsQ0FBQSxDQUFFLFVBQUYsQ0FBYyxDQUFBLENBQUEsQ0FoQkQ7RUFzQmYsQ0FBQSxDQUFFLDhCQUFGLENBQWlDLENBQUMsS0FBbEMsQ0FBd0MsU0FBQTtXQUFHLFdBQVcsQ0FBQyxVQUFaLENBQXVCLFVBQXZCLEVBQW1DLENBQUEsQ0FBRSxJQUFGLENBQU8sQ0FBQyxJQUFSLENBQWEsZUFBYixDQUFuQztFQUFILENBQXhDO0VBR0EsQ0FBQSxDQUFFLGFBQUYsQ0FBZ0IsQ0FBQyxLQUFqQixDQUF1QixTQUFBO1dBQUcsR0FBRyxDQUFDLElBQUosQ0FBUyxXQUFUO0VBQUgsQ0FBdkI7RUFHQSxDQUFBLENBQUUsUUFBRixDQUNFLENBQUMsRUFESCxDQUNNLFVBRE4sRUFDbUIsU0FBQTtXQUFHO0VBQUgsQ0FEbkIsQ0FFRSxDQUFDLEVBRkgsQ0FFTSxXQUZOLEVBRW1CLFNBQUE7V0FBRztFQUFILENBRm5CLENBR0UsQ0FBQyxFQUhILENBR00sU0FITixFQUdtQixTQUFBO1dBQUc7RUFBSCxDQUhuQixDQUlFLENBQUMsRUFKSCxDQUlNLE1BSk4sRUFJbUIsQ0FBQSxTQUFBLEtBQUE7V0FBQSxTQUFDLENBQUQ7QUFDZixVQUFBO01BQUEsQ0FBQyxDQUFDLGNBQUYsQ0FBQTtNQUNBLElBQW9CLHFIQUFwQjtBQUFBLGVBQU8sTUFBUDs7TUFJQSxJQUFHLENBQUMsQ0FBQyxJQUFGLEtBQVUsMkVBQWI7UUFDRSxZQUFZLENBQUMsWUFBYixDQUEwQixDQUFDLENBQUMsSUFBNUIsRUFERjtPQUFBLE1BRUssSUFBRyxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQVAsQ0FBa0IsT0FBbEIsQ0FBSDtRQUNILFlBQVksQ0FBQyxXQUFiLENBQXlCLENBQUMsQ0FBQyxJQUEzQixFQURHO09BQUEsTUFFQSxJQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBUCxDQUFrQixNQUFsQixDQUFBLElBQTZCLENBQUMsQ0FBQyxJQUFGLEtBQVUsRUFBMUM7UUFDSCxJQUFpRCxjQUFqRDtVQUFBLFdBQVcsQ0FBQyxVQUFaLENBQXVCLGNBQXZCLEVBQXVDLENBQUMsQ0FBQyxJQUF6QyxFQUFBO1NBREc7T0FBQSxNQUVBLElBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFQLENBQWtCLE9BQWxCLENBQUg7UUFDSCxZQUFZLENBQUMsV0FBYixDQUF5QixDQUFDLENBQUMsSUFBM0IsRUFERzs7YUFHTDtJQWZlO0VBQUEsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQUpuQjtFQXNCQSxnQkFBQSxHQUF3QjtFQUN4QixxQkFBQSxHQUF3QjtFQUV4QixXQUFBLEdBQWMsU0FBQyxVQUFEO0lBQ1osVUFBQSxHQUFhLElBQUksQ0FBQyxHQUFMLENBQVMsR0FBVCxFQUFjLElBQUksQ0FBQyxHQUFMLENBQVMsR0FBVCxFQUFjLFVBQUEsQ0FBVyxVQUFYLENBQWQsQ0FBZDtJQUViLENBQUEsQ0FBRSxnQkFBRixDQUFtQixDQUFDLEdBQXBCLENBQXdCLFdBQXhCLEVBQXFDLFVBQUEsR0FBYSxHQUFsRDtJQUNBLENBQUEsQ0FBRSxlQUFGLENBQWtCLENBQUMsR0FBbkIsQ0FBdUIsV0FBdkIsRUFBb0MsQ0FBQyxDQUFBLEdBQUksVUFBTCxDQUFBLEdBQW1CLEdBQXZEO0FBRUEsV0FBTztFQU5LO0VBUWQsZUFBQSxHQUFrQixTQUFDLFlBQUQ7QUFDaEIsUUFBQTtJQUFBLE1BQUEsR0FBUyxDQUFBLGdEQUF5QixDQUFFLGlCQUF6QixDQUFBLFVBQUY7SUFDVCxJQUFzRCxjQUF0RDtNQUFBLE1BQU0sQ0FBQyxHQUFQLENBQVcsYUFBWCxFQUEwQixZQUFZLENBQUMsVUFBdkMsRUFBQTs7SUFDQSxJQUFrRCxjQUFsRDthQUFBLE1BQU0sQ0FBQyxHQUFQLENBQVcsV0FBWCxFQUF3QixZQUFZLENBQUMsUUFBckMsRUFBQTs7RUFIZ0I7RUFLbEIsQ0FBQSxDQUFFLGdCQUFGLENBQ0UsQ0FBQyxTQURILENBQ2EsU0FBQTtJQUNULGdCQUFBLEdBQW1CO1dBQ25CLHFCQUFBLEdBQXdCO0VBRmYsQ0FEYixDQUtFLENBQUMsUUFMSCxDQUtZLFNBQUE7V0FDUixXQUFXLENBQUMsVUFBWixDQUF1QixXQUF2QixFQUFvQyxrQkFBcEMsRUFBd0QsV0FBQSxDQUFZLEdBQVosQ0FBeEQ7RUFEUSxDQUxaO0VBUUEsTUFBTSxDQUFDLGdCQUFQLENBQXdCLFdBQXhCLEVBQXFDLFNBQUMsQ0FBRDtJQUNuQyxJQUFHLGdCQUFIO2FBQ0UscUJBQUEsR0FBd0IsV0FBQSxDQUFZLElBQUksQ0FBQyxHQUFMLENBQVMsSUFBSSxDQUFDLEdBQUwsQ0FBUyxDQUFULEVBQVksQ0FBQyxDQUFDLE9BQWQsQ0FBVCxFQUFpQyxRQUFRLENBQUMsSUFBSSxDQUFDLFdBQS9DLENBQUEsR0FBOEQsUUFBUSxDQUFDLElBQUksQ0FBQyxXQUF4RixFQUQxQjs7RUFEbUMsQ0FBckMsRUFHRSxLQUhGO0VBS0EsTUFBTSxDQUFDLGdCQUFQLENBQXdCLFNBQXhCLEVBQW1DLFNBQUMsQ0FBRDtJQUNqQyxnQkFBQSxHQUFtQjtJQUNuQixJQUFpRiw2QkFBakY7YUFBQSxXQUFXLENBQUMsVUFBWixDQUF1QixXQUF2QixFQUFvQyxrQkFBcEMsRUFBd0QscUJBQXhELEVBQUE7O0VBRmlDLENBQW5DLEVBR0UsS0FIRjtFQUtBLGVBQUEsR0FBa0I7RUFHbEIsV0FDRSxDQUFDLEVBREgsQ0FDTSxZQUROLEVBQ29CLFNBQUMsS0FBRDtJQUNoQixZQUFZLENBQUMsVUFBVSxDQUFDLGFBQXhCLENBQUEsQ0FBdUMsQ0FBQyxJQUF4QyxDQUFBO0lBQ0EsQ0FBQSxDQUFFLE1BQUYsQ0FBUyxDQUFDLFFBQVYsQ0FBbUIsZUFBbkI7V0FFQSxZQUFZLENBQUMsT0FBTyxDQUFDLElBQXJCLENBQTBCLG1CQUExQixFQUErQztNQUFFLFFBQUEsRUFBVSxLQUFaO0tBQS9DO0VBSmdCLENBRHBCLENBT0UsQ0FBQyxFQVBILENBT00sb0JBUE4sRUFPNEIsU0FBQyxJQUFEO0FBRXhCLFFBQUE7SUFBQSxZQUFBLEdBQWUsU0FBQTtNQUNiLElBQUcsWUFBQSxLQUFnQixTQUFuQjtlQUNFLFVBQUEsQ0FBVyxZQUFYLEVBQXlCLEdBQXpCLEVBREY7T0FBQSxNQUFBO2VBR0UsWUFBWSxDQUFDLE9BQU8sQ0FBQyxVQUFyQixDQUNFO1VBQUEsV0FBQSxFQUFhLENBQWI7VUFDQSxRQUFBLEVBQVUsSUFBSSxDQUFDLFVBRGY7VUFFQSxlQUFBLEVBQWlCLElBRmpCO1NBREYsRUFJRSxTQUFDLEdBQUQsRUFBTSxJQUFOO1VBQ0EsSUFBQSxDQUFPLEdBQVA7bUJBQ0UsV0FBVyxDQUFDLFVBQVosQ0FBdUIsV0FBdkIsRUFBb0MsSUFBSSxDQUFDLFFBQXpDLEVBQW1ELElBQW5ELEVBQXlEO2NBQUUsU0FBQSxFQUFXLFVBQWI7YUFBekQsRUFERjtXQUFBLE1BQUE7bUJBR0UsV0FBVyxDQUFDLFVBQVosQ0FBdUIsVUFBdkIsRUFIRjs7UUFEQSxDQUpGLEVBSEY7O0lBRGE7V0FjZixVQUFBLENBQVcsWUFBWCxFQUF5QixHQUF6QjtFQWhCd0IsQ0FQNUIsQ0F5QkUsQ0FBQyxFQXpCSCxDQXlCTSxXQXpCTixFQXlCbUIsU0FBQTtJQUNmLFlBQVksQ0FBQyxPQUFPLENBQUMsSUFBckIsQ0FBMEIsVUFBMUI7V0FDQSxDQUFBLENBQUUsTUFBRixDQUFTLENBQUMsV0FBVixDQUFzQixlQUF0QjtFQUZlLENBekJuQixDQTZCRSxDQUFDLEVBN0JILENBNkJNLFVBN0JOLEVBNkJrQixTQUFDLE1BQUQ7SUFDZCxZQUFZLENBQUMsa0JBQWIsR0FBa0M7SUFDbEMsWUFBWSxDQUFDLFVBQVUsQ0FBQyxRQUF4QixDQUFpQyxNQUFqQztJQUNBLFlBQVksQ0FBQyxVQUFVLENBQUMsWUFBeEIsQ0FBQTtXQUNBLFlBQVksQ0FBQyxrQkFBYixHQUFrQztFQUpwQixDQTdCbEIsQ0FtQ0UsQ0FBQyxFQW5DSCxDQW1DTSxtQkFuQ04sRUFtQzJCLFNBQUMsV0FBRDtXQUFpQixZQUFZLENBQUMsaUJBQWIsQ0FBK0IsV0FBL0I7RUFBakIsQ0FuQzNCLENBc0NFLENBQUMsRUF0Q0gsQ0FzQ00sTUF0Q04sRUFzQ2MsU0FBQyxLQUFELEVBQVEsUUFBUjs7TUFBUSxXQUFXOztJQUM3QixXQUFXLENBQUMsVUFBWixDQUF1QixXQUF2QixFQUFvQyxLQUFwQyxFQUEyQyxZQUFZLENBQUMsVUFBVSxDQUFDLFFBQXhCLENBQUEsQ0FBM0MsRUFBK0UsUUFBL0U7V0FDQSxXQUFXLENBQUMsVUFBWixDQUF1QixpQkFBdkIsRUFBMEMsS0FBMUM7RUFGVSxDQXRDZCxDQTBDRSxDQUFDLEVBMUNILENBMENNLFVBMUNOLEVBMENrQixTQUFDLElBQUQ7QUFDZCxZQUFPLElBQVA7QUFBQSxXQUNPLFVBRFA7UUFFSSxZQUFZLENBQUMsT0FBTyxDQUFDLElBQXJCLENBQTBCLFVBQTFCLEVBQXNDLEVBQXRDO0FBREc7QUFEUCxXQUdPLFFBSFA7UUFJSSxZQUFZLENBQUMsT0FBTyxDQUFDLElBQXJCLENBQTBCLFVBQTFCLEVBQXNDLG1CQUF0QztBQURHO0FBSFAsV0FLTyxNQUxQO1FBTUksWUFBWSxDQUFDLE9BQU8sQ0FBQyxJQUFyQixDQUEwQixVQUExQixFQUFzQyxpQkFBdEM7QUFERztBQUxQLFdBT08sWUFQUDtRQVFJLFlBQVksQ0FBQyxPQUFPLENBQUMsSUFBckIsQ0FBMEIsVUFBMUIsRUFBc0MsdUJBQXRDO0FBUko7SUFVQSxDQUFBLENBQUUsZ0JBQUYsQ0FBbUIsQ0FBQyxXQUFwQixDQUFnQyxVQUFoQztXQUNBLENBQUEsQ0FBRSw4QkFBRixDQUFpQyxDQUFDLFdBQWxDLENBQThDLFFBQTlDLENBQ0UsQ0FBQyxNQURILENBQ1Usa0JBQUEsR0FBbUIsSUFBbkIsR0FBd0IsSUFEbEMsQ0FDc0MsQ0FBQyxRQUR2QyxDQUNnRCxRQURoRDtFQVpjLENBMUNsQixDQXlERSxDQUFDLEVBekRILENBeURNLGFBekROLEVBeURxQixTQUFDLE9BQUQ7V0FBYSxZQUFZLENBQUMsVUFBVSxDQUFDLFdBQXhCLENBQW9DLE9BQXBDO0VBQWIsQ0F6RHJCLENBMkRFLENBQUMsRUEzREgsQ0EyRE0sYUEzRE4sRUEyRHFCLFNBQUE7SUFDakIsSUFBRyxZQUFZLENBQUMsT0FBTyxDQUFDLGdCQUFyQixDQUFBLENBQUg7YUFDRSxZQUFZLENBQUMsT0FBTyxDQUFDLGFBQXJCLENBQUEsRUFERjtLQUFBLE1BQUE7YUFHRSxZQUFZLENBQUMsT0FBTyxDQUFDLFlBQXJCLENBQUEsRUFIRjs7RUFEaUIsQ0EzRHJCLENBaUVFLENBQUMsRUFqRUgsQ0FpRU0saUJBakVOLEVBaUV5QixTQUFDLFlBQUQ7V0FBa0IsZUFBQSxDQUFnQixZQUFoQjtFQUFsQixDQWpFekIsQ0FrRUUsQ0FBQyxFQWxFSCxDQWtFTSxhQWxFTixFQWtFcUIsU0FBQyxXQUFEO1dBQWlCLFdBQUEsQ0FBWSxXQUFaO0VBQWpCLENBbEVyQixDQW1FRSxDQUFDLEVBbkVILENBbUVNLFVBbkVOLEVBbUVrQixTQUFDLEtBQUQ7V0FBVyxZQUFZLENBQUMsbUJBQWIsQ0FBaUMsUUFBakMsRUFBMkMsS0FBM0M7RUFBWCxDQW5FbEIsQ0FvRUUsQ0FBQyxFQXBFSCxDQW9FTSxjQXBFTixFQW9Fc0IsU0FBQyxLQUFEO1dBQVcsV0FBVyxDQUFDLFVBQVosQ0FBdUIsY0FBdkIsRUFBdUMsS0FBdkM7RUFBWCxDQXBFdEIsQ0FxRUUsQ0FBQyxFQXJFSCxDQXFFTSxlQXJFTixFQXFFdUIsU0FBQyxLQUFEO1dBQVcsWUFBQSxHQUFlO0VBQTFCLENBckV2QjtFQXdFQSxPQUFBLEdBQ0U7SUFBQSxJQUFBLEVBQU0sT0FBTjtJQUNBLEtBQUEsRUFBTyxzQ0FEUDtJQUVBLE1BQUEsRUFBUSxNQUZSO0lBR0EsT0FBQSxFQUFTLFVBSFQ7O0VBSUYsTUFBQSxHQUFTLElBQUksV0FBSixDQUFnQixPQUFoQjtFQUVULE1BQU0sQ0FBQyxFQUFQLENBQVUsc0JBQVYsRUFBa0MsQ0FBQSxTQUFBLEtBQUE7V0FBQSxTQUFBO2FBQ2hDLE1BQU0sQ0FBQyxJQUFQLENBQVksZ0JBQVosRUFBOEI7UUFDNUIsSUFBQSxFQUFNLGFBRHNCO1FBRTVCLE1BQUEsRUFDRTtVQUFBLFNBQUEsRUFBVyxZQUFZLENBQUMsVUFBVSxDQUFDLFFBQXhCLENBQUEsQ0FBWDtTQUgwQjtPQUE5QjtJQURnQztFQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBbEM7RUFNQSxNQUFNLENBQUMsRUFBUCxDQUFVLG1CQUFWLEVBQStCLENBQUEsU0FBQSxLQUFBO1dBQUEsU0FBQTthQUM5QixNQUFNLENBQUMsSUFBUCxDQUFZLGFBQVosRUFBMkI7UUFDekIsSUFBQSxFQUFNLGdCQURtQjtRQUV6QixNQUFBLEVBQ0U7VUFBQSxTQUFBLEVBQVcsWUFBWSxDQUFDLGFBQWIsQ0FBQSxDQUFYO1NBSHVCO09BQTNCO0lBRDhCO0VBQUEsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQUEvQjtFQU9BLE9BQUEsR0FBVSxRQUFRLENBQUMsYUFBVCxDQUF1QixVQUF2QjtFQWlCVixDQUFBLENBQUUsZUFBRixDQUFrQixDQUFDLEVBQW5CLENBQXNCLE9BQXRCLEVBQStCLENBQUEsU0FBQSxLQUFBO1dBQUEsU0FBQTtNQUc3QixPQUFPLENBQUMsSUFBUixDQUFhLGtCQUFiO2FBQ0EsT0FBTyxDQUFDLEdBQVIsQ0FBWSx1QkFBWjtJQUo2QjtFQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBL0I7RUFNQSxPQUFPLENBQUMsZ0JBQVIsQ0FBeUIsYUFBekIsRUFBd0MsQ0FBQSxTQUFBLEtBQUE7V0FBQSxTQUFDLEtBQUQ7QUFDckMsVUFBQTtBQUFBLGNBQU8sS0FBSyxDQUFDLE9BQWI7QUFBQSxhQUNPLGVBRFA7VUFFRyxTQUFBLEdBQVksS0FBSyxDQUFDLElBQUssQ0FBQSxDQUFBO1VBQ3ZCLE9BQU8sQ0FBQyxHQUFSLENBQVksdUJBQVo7VUFDQSxPQUFPLENBQUMsR0FBUixDQUFZLFNBQVo7VUFDQSxHQUFHLENBQUMsSUFBSixDQUFTLFVBQVQsRUFBcUIsU0FBckI7VUFDQSxPQUFPLENBQUMsR0FBUixDQUFZLGVBQVo7QUFDQTtBQVBILGFBU08sa0JBVFA7VUFVRyxPQUFPLENBQUMsSUFBUixDQUFhLFVBQWIsRUFBeUIsU0FBekI7VUFDQSxPQUFPLENBQUMsR0FBUixDQUFZLGVBQVo7QUFDQTtBQVpIO0lBRHFDO0VBQUEsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQUF4QztFQWVBLEdBQUcsQ0FBQyxFQUFKLENBQU8scUJBQVAsRUFBOEIsQ0FBQSxTQUFBLEtBQUE7V0FBQSxTQUFDLENBQUQsRUFBSSxJQUFKO01BQzFCLE9BQU8sQ0FBQyxHQUFSLENBQVksNkJBQVo7TUFDQSxPQUFPLENBQUMsR0FBUixDQUFZLElBQVo7YUFDQSxTQUFBLEdBQVk7SUFIYztFQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBOUI7RUFLQSxHQUFHLENBQUMsRUFBSixDQUFPLFVBQVAsRUFBbUIsQ0FBQSxTQUFBLEtBQUE7V0FBQSxTQUFDLENBQUQsRUFBSSxJQUFKO01BQ2pCLE9BQU8sQ0FBQyxHQUFSLENBQVksSUFBWjthQUNBLE9BQU8sQ0FBQyxJQUFSLENBQWEsVUFBYixFQUF5QixJQUF6QjtJQUZpQjtFQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBbkI7RUFhQSxZQUFZLENBQUMsVUFBVSxDQUFDLEtBQXhCLENBQUE7U0FDQSxZQUFZLENBQUMsV0FBYixDQUFBO0FBOU9DLENBQUEsQ0FBSCxDQUFBIiwic291cmNlc0NvbnRlbnQiOlsiaXBjID0gcmVxdWlyZSgnZWxlY3Ryb24nKS5pcGNSZW5kZXJlclxue3NoZWxsLCB3ZWJGcmFtZX0gPSByZXF1aXJlICdlbGVjdHJvbidcbk1kc01lbnUgICAgICAgICAgID0gcmVxdWlyZSAnLi9qcy9jbGFzc2VzL21kc19tZW51J1xuY2xzTWRzUmVuZGVyZXIgICAgPSByZXF1aXJlICcuL2pzL2NsYXNzZXMvbWRzX3JlbmRlcmVyJ1xuY3JlYXRlVmFsaWRhdG9yICAgPSByZXF1aXJlICdjb2RlbWlycm9yLXRleHRsaW50J1xuTWRzUmVuZGVyZXIgICAgICAgPSBuZXcgY2xzTWRzUmVuZGVyZXJcbmZzICAgICAgICAgICAgICAgID0gcmVxdWlyZSAnZnMnXG5QUFRYICAgICAgICAgICAgICA9IHJlcXVpcmUgJy4vanMtcHB0eC9saWIvcHB0eCdcblxuTWRzUmVuZGVyZXIucmVxdWVzdEFjY2VwdCgpXG5cbndlYkZyYW1lLnNldFpvb21MZXZlbExpbWl0cygxLCAxKVxuXG5Db2RlTWlycm9yID0gcmVxdWlyZSAnY29kZW1pcnJvcidcbnJlcXVpcmUgJ2NvZGVtaXJyb3IvbW9kZS94bWwveG1sJ1xucmVxdWlyZSAnY29kZW1pcnJvci9tb2RlL21hcmtkb3duL21hcmtkb3duJ1xucmVxdWlyZSAnY29kZW1pcnJvci9tb2RlL2dmbS9nZm0nXG5yZXF1aXJlICdjb2RlbWlycm9yL2FkZG9uL2VkaXQvY29udGludWVsaXN0J1xucmVxdWlyZSBcImNvZGVtaXJyb3IvYWRkb24vbGludC9saW50XCJcbk1pY2tyQ2xpZW50ID0gcmVxdWlyZSAnLi9tb2R1bGVzL01pY2tyQ2xpZW50J1xuXG5jbGFzcyBFZGl0b3JTdGF0ZXNcbiAgcnVsZXJzOiBbXVxuICBjdXJyZW50UGFnZTogbnVsbFxuICBwcmV2aWV3SW5pdGlhbGl6ZWQ6IGZhbHNlXG4gIGxhc3RSZW5kZXJlZDoge31cblxuICBfbG9ja0NoYW5nZWRTdGF0dXM6IGZhbHNlXG4gIF9pbWFnZURpcmVjdG9yeTogbnVsbFxuXG4gIGNvbnN0cnVjdG9yOiAoQGNvZGVNaXJyb3IsIEBwcmV2aWV3KSAtPlxuICAgIGNvbnNvbGUubG9nIFwiI3tfX2Rpcm5hbWV9XCJcbiAgICBAaW5pdGlhbGl6ZUVkaXRvcigpXG4gICAgQGluaXRpYWxpemVQcmV2aWV3KClcblxuICAgIEBtZW51ID0gbmV3IE1kc01lbnUgW1xuICAgICAgeyBsYWJlbDogJyZVbmRvJywgYWNjZWxlcmF0b3I6ICdDbWRPckN0cmwrWicsIGNsaWNrOiAoaSwgdykgPT4gQGNvZGVNaXJyb3IuZXhlY0NvbW1hbmQgJ3VuZG8nIGlmIHcgYW5kICF3Lm1kc1dpbmRvdy5mcmVlemUgfVxuICAgICAge1xuICAgICAgICBsYWJlbDogJyZSZWRvJ1xuICAgICAgICBhY2NlbGVyYXRvcjogZG8gLT4gaWYgcHJvY2Vzcy5wbGF0Zm9ybSBpcyAnd2luMzInIHRoZW4gJ0NvbnRyb2wrWScgZWxzZSAnU2hpZnQrQ21kT3JDdHJsK1onXG4gICAgICAgIGNsaWNrOiAoaSwgdykgPT4gQGNvZGVNaXJyb3IuZXhlY0NvbW1hbmQgJ3JlZG8nIGlmIHcgYW5kICF3Lm1kc1dpbmRvdy5mcmVlemVcbiAgICAgIH1cbiAgICAgIHsgdHlwZTogJ3NlcGFyYXRvcicgfVxuICAgICAgeyBsYWJlbDogJ0N1JnQnLCBhY2NlbGVyYXRvcjogJ0NtZE9yQ3RybCtYJywgcm9sZTogJ2N1dCcgfVxuICAgICAgeyBsYWJlbDogJyZDb3B5JywgYWNjZWxlcmF0b3I6ICdDbWRPckN0cmwrQycsIHJvbGU6ICdjb3B5JyB9XG4gICAgICB7IGxhYmVsOiAnJlBhc3RlJywgYWNjZWxlcmF0b3I6ICdDbWRPckN0cmwrVicsIHJvbGU6ICdwYXN0ZScgfVxuICAgICAgeyBsYWJlbDogJyZEZWxldGUnLCByb2xlOiAnZGVsZXRlJyB9XG4gICAgICB7IGxhYmVsOiAnU2VsZWN0ICZBbGwnLCBhY2NlbGVyYXRvcjogJ0NtZE9yQ3RybCtBJywgY2xpY2s6IChpLCB3KSA9PiBAY29kZU1pcnJvci5leGVjQ29tbWFuZCAnc2VsZWN0QWxsJyBpZiB3IGFuZCAhdy5tZHNXaW5kb3cuZnJlZXplIH1cbiAgICAgIHsgdHlwZTogJ3NlcGFyYXRvcicsIHBsYXRmb3JtOiAnZGFyd2luJyB9XG4gICAgICB7IGxhYmVsOiAnU2VydmljZXMnLCByb2xlOiAnc2VydmljZXMnLCBzdWJtZW51OiBbXSwgcGxhdGZvcm06ICdkYXJ3aW4nIH1cbiAgICBdXG5cbiAgIyDjg5rjg7zjgrjjgqvjgqbjg7Pjg4jlvozjgIF3ZWJ2aWV344G444Gd44KM44KS6YCB5L+hXG4gIHJlZnJlc2hQYWdlOiAocnVsZXJzKSA9PlxuICAgICMgRWRpdG9yU3RhdGVz44Kv44Op44K544Gu5aSJ5pWwcnVsZXJz44Oq44K544OI44G45YWl44KM44Gm44CB5LiA5pem44Oa44O844K444KS77yR44Gr44GZ44KLXG4gICAgQHJ1bGVycyA9IHJ1bGVycyBpZiBydWxlcnM/XG4gICAgcGFnZSAgICA9IDFcbiAgICMgY29uc29sZS5sb2cgXCJjb21tZW50IDFwYWdlID0gXCIgKyBAcGlja1VwQ29tbWVudEZyb21QYWdlKDEpXG4gICAgY29uc29sZS5sb2cgXCJydWxlcnMubGVuZ3RoID0gXCIgKyBAcnVsZXJzLmxlbmd0aFxuICAgIGNvbnNvbGUubG9nIEBwaWNrVXBDb21tZW50KClcbiAgICAjIGNvbnNvbGUubG9nIFwibGFzdCBwYWdlID0gXCIgKyBAcGlja1VwQ29tbWVudEZyb21QYWdlKEBydWxlcnMubGVuZ3RoKzEpXG4gICAgI2NvbnNvbGUubG9nIEBwaWNrVXBDb21tZW50KClcblxuICAgICMgcnVsZXJMaW5l44Gr44GvJy0tLSfjga7ooYzkvY3nva7jgYzoqJjjgZXjgozjgabjgYrjgorjgIHjgZ3jgozjgajjgqjjg4fjgqPjgr/kuIrjga7jgqvjg7zjgr3jg6vkvY3nva7jgpLmr5TovIPjgZfjgaZwYWdl44KS5rG644KB44KLXG4gICAgbGluZU51bWJlciA9IEBjb2RlTWlycm9yLmdldEN1cnNvcigpLmxpbmUgfHwgMFxuICAgIGZvciBydWxlckxpbmUgaW4gQHJ1bGVyc1xuICAgICAgcGFnZSsrIGlmIHJ1bGVyTGluZSA8PSBsaW5lTnVtYmVyXG5cbiAgICAjIHJ1bGVy6KiI566X5b6M44Gr44Oa44O844K444Gu5aKX5rib44GM44GC44Gj44Gf5aC05ZCI44CB5q2j44GX44GE44Oa44O844K45oOF5aCx44KSd2Vidmlld+OBuOmAgeS/oVxuICAgIGlmIEBjdXJyZW50UGFnZSAhPSBwYWdlXG4gICAgICBAY3VycmVudFBhZ2UgPSBwYWdlXG4gICAgICBAcHJldmlldy5zZW5kICdjdXJyZW50UGFnZScsIEBjdXJyZW50UGFnZSBpZiBAcHJldmlld0luaXRpYWxpemVkXG5cbiAgICAkKCcjcGFnZS1pbmRpY2F0b3InKS50ZXh0IFwiUGFnZSAje0BjdXJyZW50UGFnZX0gLyAje0BydWxlcnMubGVuZ3RoICsgMX1cIlxuXG4gIGluaXRpYWxpemVQcmV2aWV3OiA9PlxuICAgICQoQHByZXZpZXcpXG4gICAgICAub24gJ2RvbS1yZWFkeScsID0+XG4gICAgICAgICMgRml4IG1pbmltaXplZCBwcmV2aWV3ICgjMjApXG4gICAgICAgICMgW05vdGVdIGh0dHBzOi8vZ2l0aHViLmNvbS9lbGVjdHJvbi9lbGVjdHJvbi9pc3N1ZXMvNDg4MlxuICAgICAgICAkKEBwcmV2aWV3LnNoYWRvd1Jvb3QpLmFwcGVuZCgnPHN0eWxlPm9iamVjdHttaW4td2lkdGg6MDttaW4taGVpZ2h0OjA7fTwvc3R5bGU+JylcblxuICAgICAgIyB3ZWJ2aWV3IOOBi+OCieOBrumAmuS/oeOCkuWPl+OBkeWPluOCiyAnaXBjLW1lc3NhZ2UnXG4gICAgICAub24gJ2lwYy1tZXNzYWdlJywgKGV2KSA9PlxuICAgICAgICBlID0gZXYub3JpZ2luYWxFdmVudFxuXG4gICAgICAgIHN3aXRjaCBlLmNoYW5uZWxcbiAgICAgICAgICB3aGVuICdydWxlckNoYW5nZWQnXG4gICAgICAgICAgICBAcmVmcmVzaFBhZ2UgZS5hcmdzWzBdXG4gICAgICAgICAgd2hlbiAnbGlua1RvJ1xuICAgICAgICAgICAgQG9wZW5MaW5rIGUuYXJnc1swXVxuICAgICAgICAgIHdoZW4gJ3JlbmRlcmVkJ1xuICAgICAgICAgICAgQGxhc3RSZW5kZXJlZCA9IGUuYXJnc1swXVxuICAgICAgICAgICAgdW5sZXNzIEBwcmV2aWV3SW5pdGlhbGl6ZWRcbiAgICAgICAgICAgICAgTWRzUmVuZGVyZXIuc2VuZFRvTWFpbiAncHJldmlld0luaXRpYWxpemVkJ1xuXG4gICAgICAgICAgICAgIEBwcmV2aWV3SW5pdGlhbGl6ZWQgPSB0cnVlXG4gICAgICAgICAgICAgICQoJ2JvZHknKS5hZGRDbGFzcyAnaW5pdGlhbGl6ZWQtc2xpZGUnXG4gICAgICAgICAgZWxzZVxuICAgICAgICAgICAgTWRzUmVuZGVyZXIuX2NhbGxfZXZlbnQgZS5jaGFubmVsLCBlLmFyZ3MuLi5cbiAgICAgICMgdXJs44KS44Kv44Oq44OD44Kv44GX44Gm5paw44GX44GE44Km44Kk44Oz44OJ44Km44GM6ZaL44GL44KM44KL5pmCXG4gICAgICAub24gJ25ldy13aW5kb3cnLCAoZSkgPT5cbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpXG4gICAgICAgIEBvcGVuTGluayBlLm9yaWdpbmFsRXZlbnQudXJsXG5cbiAgICAgIC5vbiAnZGlkLWZpbmlzaC1sb2FkJywgKGUpID0+XG4gICAgICAgIEBwcmV2aWV3LnNlbmQgJ2N1cnJlbnRQYWdlJywgMVxuICAgICAgICBAcHJldmlldy5zZW5kICdzZXRJbWFnZURpcmVjdG9yeScsIEBfaW1hZ2VEaXJlY3RvcnlcbiAgICAgICAgQHByZXZpZXcuc2VuZCAncmVuZGVyJywgQGNvZGVNaXJyb3IuZ2V0VmFsdWUoKSAgIyByZW5kZXIg44Kk44OZ44Oz44OI6YCB5L+h44GncnVsZXLnorroqo3jgZfjgabjg5rjg7zjgrjliIfjgormm7/jgo/jgopcblxuICBvcGVuTGluazogKGxpbmspID0+XG4gICAgc2hlbGwub3BlbkV4dGVybmFsIGxpbmsgaWYgL15odHRwcz86XFwvXFwvLisvLnRlc3QobGluaylcblxuICBpbml0aWFsaXplRWRpdG9yOiA9PlxuICAgIEBjb2RlTWlycm9yLm9uICdjb250ZXh0bWVudScsIChjbSwgZSkgPT5cbiAgICAgIGUucHJldmVudERlZmF1bHQoKVxuICAgICAgQGNvZGVNaXJyb3IuZm9jdXMoKVxuICAgICAgQG1lbnUucG9wdXAoKVxuICAgICAgZmFsc2VcblxuICAgIEBjb2RlTWlycm9yLm9uICdjaGFuZ2UnLCAoY20sIGNoZykgPT5cbiAgICAgIEBwcmV2aWV3LnNlbmQgJ3JlbmRlcicsIGNtLmdldFZhbHVlKClcbiAgICAgIE1kc1JlbmRlcmVyLnNlbmRUb01haW4gJ3NldENoYW5nZWRTdGF0dXMnLCB0cnVlIGlmICFAX2xvY2tDaGFuZ2VkU3RhdHVzXG5cbiAgICBAY29kZU1pcnJvci5vbiAnY3Vyc29yQWN0aXZpdHknLCAoY20pID0+IHdpbmRvdy5zZXRUaW1lb3V0ICg9PiBAcmVmcmVzaFBhZ2UoKSksIDVcblxuICBzZXRJbWFnZURpcmVjdG9yeTogKGRpcmVjdG9yeSkgPT5cbiAgICBpZiBAcHJldmlld0luaXRpYWxpemVkXG4gICAgICBAcHJldmlldy5zZW5kICdzZXRJbWFnZURpcmVjdG9yeScsIGRpcmVjdG9yeVxuICAgICAgQHByZXZpZXcuc2VuZCAncmVuZGVyJywgQGNvZGVNaXJyb3IuZ2V0VmFsdWUoKVxuICAgIGVsc2VcbiAgICAgIEBfaW1hZ2VEaXJlY3RvcnkgPSBkaXJlY3RvcnlcblxuICBpbnNlcnRJbWFnZTogKGZpbGVQYXRoKSA9PiBAY29kZU1pcnJvci5yZXBsYWNlU2VsZWN0aW9uKFwiIVtdKCN7ZmlsZVBhdGgucmVwbGFjZSgvIC9nLCAnJTIwJyl9KVxcblwiKVxuXG4gICMqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlRPRE8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gIGluc2VydFZpZGVvOiAoZmlsZVBhdGgpID0+XG4gICAgY29uc29sZS5sb2cgZmlsZVBhdGhcblxuXG5cbiAgbG9hZEZyb21QUFRYOiAoZmlsZVBhdGgpID0+XG4gICAgSU5GSUxFID0gZmlsZVBhdGg7XG4gICAgZnMucmVhZEZpbGUgSU5GSUxFLCAoZXJyLCBkYXRhKSA9PlxuICAgICAgaWYgKGVycilcbiAgICAgICAgdGhyb3cgZXJyXG4gICAgICBwcHR4ID0gbmV3IFBQVFguUHJlc2VudGF0aW9uKClcbiAgICAgIHBwdHgubG9hZCBkYXRhLCAoZXJyKSA9PlxuICAgICAgICBib2R5ID0gW11cblxuICAgICAgICBmb3IgaSBpbiBbMS4uLnBwdHguZ2V0U2xpZGVDb3VudCgpXVxuICAgICAgICAgIHNsaWRlID0gcHB0eC5nZXRTbGlkZShcInNsaWRlI3tpfVwiKVxuICAgICAgICAgIGNvbnNvbGUubG9nICdzbGlkZScgKyBpXG4gICAgICAgICAgdGl0bGUgPSBwaWNrVXBUaXRsZUZyb21QUFRYKHNsaWRlKVxuICAgICAgICAgIHRpdGxlID0gdGl0bGUucmVwbGFjZSAvXFxuL2csICdcXG4jICdcbiAgICAgICAgICBib2R5LnB1c2goJyMgJyArIHRpdGxlICsgJ1xcbicgKyBwaWNrVXBCb2R5RnJvbVBQVFgoc2xpZGUpKVxuXG4gICAgICAgICMgI2NvbnNvbGUubG9nIGJvZHlcbiAgICAgICAgQGNvZGVNaXJyb3Iuc2V0VmFsdWUoYm9keS5qb2luKFwiXFxuXFxuLS0tXFxuXFxuXCIpKVxuICAgICAgICAjICNjb25zb2xlLmxvZyBKU09OLnN0cmluZ2lmeShib2R5LCBudWxsLCAnICcpXG5cbiAgcGlja1VwVGl0bGVGcm9tUFBUWCA9IChzbGlkZSkgPT5cbiAgICB0aXRsZSA9IFtdO1xuICAgIHRhcmdldCA9IGFyKHNsaWRlKTtcbiAgICBmb3IgaSBpbiBbMC4uLnRhcmdldC5sZW5ndGhdXG4gICAgICAjY29uc29sZS5sb2cgXCJ0aXRsZSA6IFwiICsgdGFyZ2V0W2ldWydhOnQnXVxuICAgICAgaWYodGFyZ2V0W2ldWydhOnQnXVswXSA9PSAnJylcbiAgICAgICAgdGl0bGUucHVzaCgnXFxuJylcbiAgICAgIGVsc2VcbiAgICAgICAgdGl0bGUucHVzaCh0YXJnZXRbaV1bJ2E6dCddKVxuICAgIGNvbnNvbGUubG9nIHRpdGxlXG4gICAgcmV0dXJuIHRpdGxlLmpvaW4oJycpXG5cbiAgcGlja1VwQm9keUZyb21QUFRYID0gKHNsaWRlKSA9PlxuICAgIGJvZHkgPSBbXTtcbiAgICB0YXJnZXQgPSBwc3Aoc2xpZGUpWzFdWydwOnR4Qm9keSddWzBdWydhOnAnXTtcbiAgICBmb3IgaSBpbiBbMC4uLnRhcmdldC5sZW5ndGhdXG4gICAgICBwdXNoZWQgPSBcIlwiO1xuICAgICAgaWYodGFyZ2V0W2ldWydhOnInXSA9PSBudWxsKVxuICAgICAgICBwdXNoZWQgPSBcIlwiO1xuICAgICAgICBib2R5LnB1c2gocHVzaGVkKVxuICAgICAgICBjb250aW51ZVxuICAgICAgZWxzZSBpZiB0YXJnZXRbaV1bJ2E6cFByJ10gYW5kIHRhcmdldFtpXVsnYTpyJ11cbiAgICAgICAgcHVzaGVkID0gXCJcXG4tIFwiO1xuICAgICAgaWYodGFyZ2V0W2ldWydhOnInXSlcbiAgICAgICAgdG1wID0gW107XG4gICAgICAgIGFyID0gdGFyZ2V0W2ldWydhOnInXTtcblxuICAgICAgICBmb3IgayBpbiBbMC4uLmFyLmxlbmd0aF1cbiAgICAgICAgICB0bXAucHVzaChhcltrXVsnYTp0J10pO1xuICAgICAgICBwdXNoZWQgPSBwdXNoZWQgKyB0bXAuam9pbignJyk7XG4gICAgICBpZih0YXJnZXRbaV1bJ2E6ZW5kUGFyYVJQciddKVxuICAgICAgICBwdXNoZWQgPSBwdXNoZWQgKyAnXFxuJztcbiAgICAgIGJvZHkucHVzaChwdXNoZWQpXG4gICAgICBjb25zb2xlLmxvZyBwdXNoZWRcbiAgICByZXR1cm4gYm9keS5qb2luKCcnKVxuXG5cbiAgYXIgPSAoc2xpZGUpID0+XG4gICAgcmV0dXJuIGFwKHNsaWRlKVswXVsnYTpyJ107XG5cbiAgYXAgPSAoc2xpZGUpID0+XG5cbiAgICByZXR1cm4gcHR4Qm9keShzbGlkZSlbMF1bJ2E6cCddO1xuICBwdHhCb2R5ID0gKHNsaWRlKSA9PlxuICAgIHJldHVybiBwc3Aoc2xpZGUpWzBdWydwOnR4Qm9keSddO1xuXG4gIHBzcFRyZWUgPSAoc2xpZGUpID0+XG4gICAgcmV0dXJuIHBjU2xkKHNsaWRlKVswXVsncDpzcFRyZWUnXTtcblxuICBwc3AgPSAoc2xpZGUpID0+XG4gICAgcmV0dXJuIHBzcFRyZWUoc2xpZGUpWzBdWydwOnNwJ107XG5cbiAgcGNTbGQgPSAoc2xpZGUpID0+XG4gICAgcmV0dXJuIHBzbGQoc2xpZGUpWydwOmNTbGQnXTtcblxuICBwc2xkID0gKHNsaWRlKSA9PlxuICAgIHJldHVybiBzbGlkZS5jb250ZW50WydwOnNsZCddO1xuXG4gICMqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG5cbiAgIyBwYWdl5q+O44Gr5Yil44KM44Gf44Kz44Oh44Oz44OI44Gu44Oq44K544OI44KS6L+U44GZXG4gIHBpY2tVcENvbW1lbnQgOiAoKSA9PlxuICAgIHBhZ2VNYXggPSBAcnVsZXJzLmxlbmd0aCArIDFcbiAgICBDb21tZW50RWFjaFBhZ2UgPSBbXVxuICAgIGZvciBpIGluIFsxLi4ucGFnZU1heCsxXVxuICAgICAgY29uc29sZS5sb2cgaVxuICAgICAgQ29tbWVudEVhY2hQYWdlLnB1c2goQHBpY2tVcENvbW1lbnRGcm9tUGFnZShpKSlcbiAgICByZXR1cm4gQ29tbWVudEVhY2hQYWdlXG5cblxuICAjIHsjIyAjI30g44Gn5Zuy44G+44KM44Gf44Kz44Oh44Oz44OI6YOo5YiG44KS5oqc44GN5Ye644GZXG4gICMg44OW44Ot44OD44Kv44Kz44Oh44Oz44OI44Gu5aC05ZCI44GveyMjICMjfeOBruWJjeW+jOOBq+aUueihjOOBjOWFpeOBo+OBpuOBhOOBquOBkeOCjOOBsOOBquOCieOBquOBhFxuICAjIHBpY2tVcENvbW1lbnRGcm9tUGFnZShOdW1iZXIpIC0+IFN0cmluZ1xuICBwaWNrVXBDb21tZW50RnJvbVBhZ2UgOiAocGFnZSkgPT5cbiAgICBpZiBwYWdlPT0xIGFuZCBub3QgQHJ1bGVycy5sZW5ndGhcbiAgICAgIHBhZ2VTdGFydExpbmUgPSAwXG4gICAgICBwYWdlRW5kTGluZSAgID0gQGNvZGVNaXJyb3IubGluZUNvdW50KClcbiAgICAgIGNvbnNvbGUubG9nIFwicGFnZUVuZExpbmUgPSBcIiArIHBhZ2VFbmRMaW5lXG4gICAgZWxzZSBpZiBwYWdlID09IDEgYW5kIEBydWxlcnMubGVuZ3RoICE9IDBcbiAgICAgIHBhZ2VTdGFydExpbmUgPSAwXG4gICAgICBwYWdlRW5kTGluZSAgID0gQHJ1bGVyc1swXVxuICAgIGVsc2UgaWYgcGFnZSA9PSBAcnVsZXJzLmxlbmd0aCArIDFcbiAgICAgIHBhZ2VTdGFydExpbmUgPSBAcnVsZXJzW0BydWxlcnMubGVuZ3RoLTFdXG4gICAgICBwYWdlRW5kTGluZSAgID0gQGNvZGVNaXJyb3IubGluZUNvdW50KClcbiAgICBlbHNlXG4gICAgICBwYWdlU3RhcnRMaW5lID0gQHJ1bGVyc1twYWdlLTJdICsgMVxuICAgICAgcGFnZUVuZExpbmUgICA9IEBydWxlcnNbcGFnZS0xXSArIDFcblxuICAgIFRleHRJbkVkaXRvciA9IEBjb2RlTWlycm9yLmdldFJhbmdlIHtcImxpbmVcIjpwYWdlU3RhcnRMaW5lICwgXCJjaFwiOiAwfSx7XCJsaW5lXCI6cGFnZUVuZExpbmUtMSAsIFwiY2hcIjowIH1cbiAgICByZSA9IC9cXHsjI1tcXHNcXG5dKiguKilbXFxzXFxuXSojI1xcfS9cbiAgICByZXN1bHQgPSBUZXh0SW5FZGl0b3IubWF0Y2gocmUpXG4gICAgY29tbWVudCA9ICcnXG4gICAgaWYocmVzdWx0KVxuICAgICAgY29tbWVudCA9IHJlc3VsdFsxXVxuICAgIHJldHVybiBjb21tZW50XG5cbiAgdXBkYXRlR2xvYmFsU2V0dGluZzogKHByb3AsIHZhbHVlKSA9PlxuICAgIGxhdGVzdFBvcyA9IG51bGxcblxuICAgIGZvciBvYmogaW4gKEBsYXN0UmVuZGVyZWQ/LnNldHRpbmdzUG9zaXRpb24gfHwgW10pXG4gICAgICBsYXRlc3RQb3MgPSBvYmogaWYgb2JqLnByb3BlcnR5IGlzIHByb3BcblxuICAgIGlmIGxhdGVzdFBvcz9cbiAgICAgIEBjb2RlTWlycm9yLnJlcGxhY2VSYW5nZShcbiAgICAgICAgXCIje3Byb3B9OiAje3ZhbHVlfVwiLFxuICAgICAgICBDb2RlTWlycm9yLlBvcyhsYXRlc3RQb3MubGluZUlkeCwgbGF0ZXN0UG9zLmZyb20pLFxuICAgICAgICBDb2RlTWlycm9yLlBvcyhsYXRlc3RQb3MubGluZUlkeCwgbGF0ZXN0UG9zLmZyb20gKyBsYXRlc3RQb3MubGVuZ3RoKSxcbiAgICAgIClcbiAgICBlbHNlXG4gICAgICBAY29kZU1pcnJvci5yZXBsYWNlUmFuZ2UoXG4gICAgICAgIFwiPCEtLSAje3Byb3B9OiAje3ZhbHVlfSAtLT5cXG5cXG5cIixcbiAgICAgICAgQ29kZU1pcnJvci5Qb3MoQGNvZGVNaXJyb3IuZmlyc3RMaW5lKCksIDApXG4gICAgICApXG5cbmxvYWRpbmdTdGF0ZSA9ICdsb2FkaW5nJ1xuXG5cblxuIyB0ZXh0bGludCBydWxlcyBzZXR0aW5nXG5cbm5vQWJ1c2FnZSA9IHJlcXVpcmUgJ3RleHRsaW50LXJ1bGUtamEtbm8tYWJ1c2FnZSdcbm1peGVkUGVyaW9kID0gcmVxdWlyZSAndGV4dGxpbnQtcnVsZS1qYS1uby1taXhlZC1wZXJpb2QnXG5zdWNjZXNzaXZlV29yZCA9IHJlcXVpcmUgJ3RleHRsaW50LXJ1bGUtamEtbm8tc3VjY2Vzc2l2ZS13b3JkJ1xud2Vha1BocmFzZSA9IHJlcXVpcmUgJ3RleHRsaW50LXJ1bGUtamEtbm8td2Vhay1waHJhc2UnXG5tYXhDb21tYSA9IHJlcXVpcmUgJ3RleHRsaW50LXJ1bGUtbWF4LWNvbW1hJ1xua2FuamlDb250aW51b3VzTGVuID0gcmVxdWlyZSAndGV4dGxpbnQtcnVsZS1tYXgta2FuamktY29udGludW91cy1sZW4nXG5tYXhUZW4gPSByZXF1aXJlICd0ZXh0bGludC1ydWxlLW1heC10ZW4nXG5ub0RvdWJsZU5lZ2F0aXZlSmEgPSByZXF1aXJlICd0ZXh0bGludC1ydWxlLW5vLWRvdWJsZS1uZWdhdGl2ZS1qYSdcbm5vRG91YmxlZENvbmp1bmN0aW9uID0gcmVxdWlyZSAndGV4dGxpbnQtcnVsZS1uby1kb3VibGVkLWNvbmp1bmN0aW9uJ1xubm9Eb3VibGVkQ29uanVuY3RpdmVQYXJ0aWNsZUdhID0gcmVxdWlyZSAndGV4dGxpbnQtcnVsZS1uby1kb3VibGVkLWNvbmp1bmN0aXZlLXBhcnRpY2xlLWdhJ1xubm9Eb3VibGVkSm9zaGkgPSByZXF1aXJlICd0ZXh0bGludC1ydWxlLW5vLWRvdWJsZWQtam9zaGknXG5ub0Ryb3BwaW5nVGhlUmEgPSByZXF1aXJlICd0ZXh0bGludC1ydWxlLW5vLWRyb3BwaW5nLXRoZS1yYSdcbm5vRXhjbGFtYXRpb25RdWVzdGlvbk1hcmsgPSByZXF1aXJlICd0ZXh0bGludC1ydWxlLW5vLWV4Y2xhbWF0aW9uLXF1ZXN0aW9uLW1hcmsnXG5ub0hhbmtha3VLYW5hID0gcmVxdWlyZSAndGV4dGxpbnQtcnVsZS1uby1oYW5rYWt1LWthbmEnXG5ub01peERlYXJ1RGVzdW1hc3UgPSByZXF1aXJlICd0ZXh0bGludC1ydWxlLW5vLW1peC1kZWFydS1kZXN1bWFzdSdcbm5vTmZkID0gcmVxdWlyZSAndGV4dGxpbnQtcnVsZS1uby1uZmQnXG5ub1N0YXJ0RHVwbGljYXRlZENvbmp1bmN0aW9uID0gcmVxdWlyZSAndGV4dGxpbnQtcnVsZS1uby1zdGFydC1kdXBsaWNhdGVkLWNvbmp1bmN0aW9uJ1xuXG52YWxpZGF0b3IgPSBjcmVhdGVWYWxpZGF0b3Ioe1xuICBydWxlczoge1xuICAgICdub0FidXNhZ2UnIDogbm9BYnVzYWdlLFxuICAgICdtaXhlZFBlcmlvZCcgOiBtaXhlZFBlcmlvZCxcbiAgICAnc3VjY2Vzc2l2ZVdvcmQnIDogc3VjY2Vzc2l2ZVdvcmQsXG4gICAgJ3dlYWtQaHJhc2UnIDogd2Vha1BocmFzZSxcbiAgICAnbWF4Q29tbWEnIDogbWF4Q29tbWEsXG4gICAgJ2thbmppQ29udGludW91c0xlbicgOiBrYW5qaUNvbnRpbnVvdXNMZW4sXG4gICAgJ21heFRlbicgOiBtYXhUZW4sXG4gICAgJ25vRG91YmxlZE5lZ2F0aXZlSmEnIDogbm9Eb3VibGVOZWdhdGl2ZUphLFxuICAgICdub0RvdWJsZWRDb25qdW5jdGlvbicgOiBub0RvdWJsZWRDb25qdW5jdGlvbixcbiAgICAnbm9Eb3VibGVkQ29uanVuY3RpdmVQYXJ0aWNsZUdhJyA6IG5vRG91YmxlZENvbmp1bmN0aXZlUGFydGljbGVHYSxcbiAgICAnbm9Eb3VibGVkSm9zaGknIDogbm9Eb3VibGVkSm9zaGksXG4gICAgJ25vRHJvcHBpbmdUaGVSYScgOiBub0Ryb3BwaW5nVGhlUmEsXG4gICAgJ25vRXhjbGFtYXRpb25RdWVzdGlvbk1hcmsnIDogbm9FeGNsYW1hdGlvblF1ZXN0aW9uTWFyayxcbiAgICAnbm9IYW5rYWt1S2FuYScgOiBub0hhbmtha3VLYW5hLFxuICAgICdub01peERlYXJ1RGVzdW1hc3UnIDogbm9NaXhEZWFydURlc3VtYXN1LFxuICAgICdub05mZCcgOiBub05mZCxcbiAgICAnbm9TdGFydER1cGxpY2F0ZWRDb25qdW5jdGlvbicgOiBub1N0YXJ0RHVwbGljYXRlZENvbmp1bmN0aW9uXG4gIH1cbiAgfSk7XG5kb2N1bWVudC5hZGRFdmVudExpc3RlbmVyIFwiRE9NQ29udGVudExvYWRlZFwiLCAoZXZlbnQpPT5cblxuICAjIGNsaWVudC5zZW5kIFwibW9ybmluZ1wiLFxuICAjICAgXCJmcm9tXCI6IHNldHRpbmcuaWQsXG4gICMgICBcInRvXCIgOiBcImxhbmRcIixcbiAgIyAgIFwiYm9keVwiOlxuICAjICAgICBcImNvbnRlbnRcIjogXCJoZWxsbyEgbGFuZCEgaSdtIGluZGV4XCJcblxuXG5kbyAtPlxuICBzbGlkZUhUTUwgPSBcIlwiXG4gIGVkaXRvclN0YXRlcyA9IG5ldyBFZGl0b3JTdGF0ZXMoXG4gICAgQ29kZU1pcnJvci5mcm9tVGV4dEFyZWEoJCgnI2VkaXRvcicpWzBdLFxuICAgICAgIyBnZm0gOiBHaXRodWIgRmxhdm9yZWQgTW9kZVxuICAgICAgbW9kZTogJ2dmbSdcbiAgICAgICN0aGVtZTogJ2Jhc2UxNi1saWdodCdcbiAgICAgIGxpbmVXcmFwcGluZzogdHJ1ZVxuICAgICAgbGluZU51bWJlcnM6IHRydWVcbiAgICAgIGRyYWdEcm9wOiBmYWxzZVxuICAgICAgZ3V0dGVyczogW1wiQ29kZU1pcnJvci1saW50LW1hcmtlcnNcIl1cbiAgICAgIGxpbnQ6IHtcbiAgICAgICAgIFwiZ2V0QW5ub3RhdGlvbnNcIjogdmFsaWRhdG9yLFxuICAgICAgICAgXCJhc3luY1wiOiB0cnVlXG4gICAgICB9XG4gICAgICBleHRyYUtleXM6XG4gICAgICAgIEVudGVyOiAnbmV3bGluZUFuZEluZGVudENvbnRpbnVlTWFya2Rvd25MaXN0J1xuICAgICksXG4gICAgJCgnI3ByZXZpZXcnKVswXVxuICApXG5cblxuXG4gICMgVmlldyBtb2Rlc1xuICAkKCcudmlld21vZGUtYnRuW2RhdGEtdmlld21vZGVdJykuY2xpY2sgLT4gTWRzUmVuZGVyZXIuc2VuZFRvTWFpbigndmlld01vZGUnLCAkKHRoaXMpLmF0dHIoJ2RhdGEtdmlld21vZGUnKSlcblxuICAjIFBERiBFeHBvcnQgYnV0dG9uXG4gICQoJyNwZGYtZXhwb3J0JykuY2xpY2sgLT4gaXBjLnNlbmQgJ1BkZkV4cG9ydCdcblxuICAjIEZpbGUgRCZEXG4gICQoZG9jdW1lbnQpXG4gICAgLm9uICdkcmFnb3ZlcicsICAtPiBmYWxzZVxuICAgIC5vbiAnZHJhZ2xlYXZlJywgLT4gZmFsc2VcbiAgICAub24gJ2RyYWdlbmQnLCAgIC0+IGZhbHNlXG4gICAgLm9uICdkcm9wJywgICAgICAoZSkgPT5cbiAgICAgIGUucHJldmVudERlZmF1bHQoKVxuICAgICAgcmV0dXJuIGZhbHNlIHVubGVzcyAoZiA9IGUub3JpZ2luYWxFdmVudC5kYXRhVHJhbnNmZXI/LmZpbGVzP1swXSk/XG4gICAgICAjIGNvbnNvbGUubG9nIGYudHlwZVxuICAgICAgIyBjb25zb2xlLmxvZyBmLnBhdGhcbiAgICAgICMg44OR44Ov44Od44GuIC5wcHR444OV44Kh44Kk44Or44Gg44Gj44Gf44KJXG4gICAgICBpZiBmLnR5cGUgPT0gXCJhcHBsaWNhdGlvbi92bmQub3BlbnhtbGZvcm1hdHMtb2ZmaWNlZG9jdW1lbnQucHJlc2VudGF0aW9ubWwucHJlc2VudGF0aW9uXCJcbiAgICAgICAgZWRpdG9yU3RhdGVzLmxvYWRGcm9tUFBUWCBmLnBhdGhcbiAgICAgIGVsc2UgaWYgZi50eXBlLnN0YXJ0c1dpdGgoJ2ltYWdlJylcbiAgICAgICAgZWRpdG9yU3RhdGVzLmluc2VydEltYWdlIGYucGF0aFxuICAgICAgZWxzZSBpZiBmLnR5cGUuc3RhcnRzV2l0aCgndGV4dCcpIHx8IGYudHlwZSBpcyAnJ1xuICAgICAgICBNZHNSZW5kZXJlci5zZW5kVG9NYWluICdsb2FkRnJvbUZpbGUnLCBmLnBhdGggaWYgZi5wYXRoP1xuICAgICAgZWxzZSBpZiBmLnR5cGUuc3RhcnRzV2l0aCgndmlkZW8nKVxuICAgICAgICBlZGl0b3JTdGF0ZXMuaW5zZXJ0VmlkZW8gZi5wYXRoXG5cbiAgICAgIGZhbHNlXG5cbiAgIyBTcGxpdHRlclxuICBkcmFnZ2luZ1NwbGl0dGVyICAgICAgPSBmYWxzZVxuICBkcmFnZ2luZ1NwbGl0UG9zaXRpb24gPSB1bmRlZmluZWRcblxuICBzZXRTcGxpdHRlciA9IChzcGxpdFBvaW50KSAtPlxuICAgIHNwbGl0UG9pbnQgPSBNYXRoLm1pbigwLjgsIE1hdGgubWF4KDAuMiwgcGFyc2VGbG9hdChzcGxpdFBvaW50KSkpXG5cbiAgICAkKCcucGFuZS5tYXJrZG93bicpLmNzcygnZmxleC1ncm93Jywgc3BsaXRQb2ludCAqIDEwMClcbiAgICAkKCcucGFuZS5wcmV2aWV3JykuY3NzKCdmbGV4LWdyb3cnLCAoMSAtIHNwbGl0UG9pbnQpICogMTAwKVxuXG4gICAgcmV0dXJuIHNwbGl0UG9pbnRcblxuICBzZXRFZGl0b3JDb25maWcgPSAoZWRpdG9yQ29uZmlnKSAtPlxuICAgIGVkaXRvciA9ICQoZWRpdG9yU3RhdGVzLmNvZGVNaXJyb3I/LmdldFdyYXBwZXJFbGVtZW50KCkpXG4gICAgZWRpdG9yLmNzcygnZm9udC1mYW1pbHknLCBlZGl0b3JDb25maWcuZm9udEZhbWlseSkgaWYgZWRpdG9yP1xuICAgIGVkaXRvci5jc3MoJ2ZvbnQtc2l6ZScsIGVkaXRvckNvbmZpZy5mb250U2l6ZSkgaWYgZWRpdG9yP1xuXG4gICQoJy5wYW5lLXNwbGl0dGVyJylcbiAgICAubW91c2Vkb3duIC0+XG4gICAgICBkcmFnZ2luZ1NwbGl0dGVyID0gdHJ1ZVxuICAgICAgZHJhZ2dpbmdTcGxpdFBvc2l0aW9uID0gdW5kZWZpbmVkXG5cbiAgICAuZGJsY2xpY2sgLT5cbiAgICAgIE1kc1JlbmRlcmVyLnNlbmRUb01haW4gJ3NldENvbmZpZycsICdzcGxpdHRlclBvc2l0aW9uJywgc2V0U3BsaXR0ZXIoMC41KVxuXG4gIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyICdtb3VzZW1vdmUnLCAoZSkgLT5cbiAgICBpZiBkcmFnZ2luZ1NwbGl0dGVyXG4gICAgICBkcmFnZ2luZ1NwbGl0UG9zaXRpb24gPSBzZXRTcGxpdHRlciBNYXRoLm1pbihNYXRoLm1heCgwLCBlLmNsaWVudFgpLCBkb2N1bWVudC5ib2R5LmNsaWVudFdpZHRoKSAvIGRvY3VtZW50LmJvZHkuY2xpZW50V2lkdGhcbiAgLCBmYWxzZVxuXG4gIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyICdtb3VzZXVwJywgKGUpIC0+XG4gICAgZHJhZ2dpbmdTcGxpdHRlciA9IGZhbHNlXG4gICAgTWRzUmVuZGVyZXIuc2VuZFRvTWFpbiAnc2V0Q29uZmlnJywgJ3NwbGl0dGVyUG9zaXRpb24nLCBkcmFnZ2luZ1NwbGl0UG9zaXRpb24gaWYgZHJhZ2dpbmdTcGxpdFBvc2l0aW9uP1xuICAsIGZhbHNlXG5cbiAgcmVzcG9uc2VQZGZPcHRzID0gbnVsbFxuXG4gICMgRXZlbnRzXG4gIE1kc1JlbmRlcmVyXG4gICAgLm9uICdwdWJsaXNoUGRmJywgKGZuYW1lKSAtPlxuICAgICAgZWRpdG9yU3RhdGVzLmNvZGVNaXJyb3IuZ2V0SW5wdXRGaWVsZCgpLmJsdXIoKVxuICAgICAgJCgnYm9keScpLmFkZENsYXNzICdleHBvcnRpbmctcGRmJ1xuXG4gICAgICBlZGl0b3JTdGF0ZXMucHJldmlldy5zZW5kICdyZXF1ZXN0UGRmT3B0aW9ucycsIHsgZmlsZW5hbWU6IGZuYW1lIH1cblxuICAgIC5vbiAncmVzcG9uc2VQZGZPcHRpb25zJywgKG9wdHMpIC0+XG4gICAgICAjIFdhaXQgbG9hZGluZyByZXNvdXJjZXNcbiAgICAgIHN0YXJ0UHVibGlzaCA9IC0+XG4gICAgICAgIGlmIGxvYWRpbmdTdGF0ZSBpcyAnbG9hZGluZydcbiAgICAgICAgICBzZXRUaW1lb3V0IHN0YXJ0UHVibGlzaCwgMjUwXG4gICAgICAgIGVsc2VcbiAgICAgICAgICBlZGl0b3JTdGF0ZXMucHJldmlldy5wcmludFRvUERGXG4gICAgICAgICAgICBtYXJnaW5zVHlwZTogMVxuICAgICAgICAgICAgcGFnZVNpemU6IG9wdHMuZXhwb3J0U2l6ZVxuICAgICAgICAgICAgcHJpbnRCYWNrZ3JvdW5kOiB0cnVlXG4gICAgICAgICAgLCAoZXJyLCBkYXRhKSAtPlxuICAgICAgICAgICAgdW5sZXNzIGVyclxuICAgICAgICAgICAgICBNZHNSZW5kZXJlci5zZW5kVG9NYWluICd3cml0ZUZpbGUnLCBvcHRzLmZpbGVuYW1lLCBkYXRhLCB7IGZpbmFsaXplZDogJ3VuZnJlZXplJyB9XG4gICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgIE1kc1JlbmRlcmVyLnNlbmRUb01haW4gJ3VuZnJlZXplJ1xuXG4gICAgICBzZXRUaW1lb3V0IHN0YXJ0UHVibGlzaCwgNTAwXG5cbiAgICAub24gJ3VuZnJlZXplZCcsIC0+XG4gICAgICBlZGl0b3JTdGF0ZXMucHJldmlldy5zZW5kICd1bmZyZWV6ZSdcbiAgICAgICQoJ2JvZHknKS5yZW1vdmVDbGFzcyAnZXhwb3J0aW5nLXBkZidcblxuICAgIC5vbiAnbG9hZFRleHQnLCAoYnVmZmVyKSAtPlxuICAgICAgZWRpdG9yU3RhdGVzLl9sb2NrQ2hhbmdlZFN0YXR1cyA9IHRydWVcbiAgICAgIGVkaXRvclN0YXRlcy5jb2RlTWlycm9yLnNldFZhbHVlIGJ1ZmZlclxuICAgICAgZWRpdG9yU3RhdGVzLmNvZGVNaXJyb3IuY2xlYXJIaXN0b3J5KClcbiAgICAgIGVkaXRvclN0YXRlcy5fbG9ja0NoYW5nZWRTdGF0dXMgPSBmYWxzZVxuXG4gICAgLm9uICdzZXRJbWFnZURpcmVjdG9yeScsIChkaXJlY3RvcmllcykgLT4gZWRpdG9yU3RhdGVzLnNldEltYWdlRGlyZWN0b3J5IGRpcmVjdG9yaWVzXG5cbiAgICAjIHNlbmQgdGV4dCB0byBzYXZlIHRvIG1haW4gcHJvY2VzcyBhbmQgcmVsb2FkXG4gICAgLm9uICdzYXZlJywgKGZuYW1lLCB0cmlnZ2VycyA9IHt9KSAtPlxuICAgICAgTWRzUmVuZGVyZXIuc2VuZFRvTWFpbiAnd3JpdGVGaWxlJywgZm5hbWUsIGVkaXRvclN0YXRlcy5jb2RlTWlycm9yLmdldFZhbHVlKCksIHRyaWdnZXJzXG4gICAgICBNZHNSZW5kZXJlci5zZW5kVG9NYWluICdpbml0aWFsaXplU3RhdGUnLCBmbmFtZVxuXG4gICAgLm9uICd2aWV3TW9kZScsIChtb2RlKSAtPlxuICAgICAgc3dpdGNoIG1vZGVcbiAgICAgICAgd2hlbiAnbWFya2Rvd24nXG4gICAgICAgICAgZWRpdG9yU3RhdGVzLnByZXZpZXcuc2VuZCAnc2V0Q2xhc3MnLCAnJ1xuICAgICAgICB3aGVuICdzY3JlZW4nXG4gICAgICAgICAgZWRpdG9yU3RhdGVzLnByZXZpZXcuc2VuZCAnc2V0Q2xhc3MnLCAnc2xpZGUtdmlldyBzY3JlZW4nXG4gICAgICAgIHdoZW4gJ2xpc3QnXG4gICAgICAgICAgZWRpdG9yU3RhdGVzLnByZXZpZXcuc2VuZCAnc2V0Q2xhc3MnLCAnc2xpZGUtdmlldyBsaXN0J1xuICAgICAgICB3aGVuICdwcmVzZW4tZGV2J1xuICAgICAgICAgIGVkaXRvclN0YXRlcy5wcmV2aWV3LnNlbmQgJ3NldENsYXNzJywgJ3NsaWRlLXZpZXcgcHJlc2VuLWRldidcblxuICAgICAgJCgnI3ByZXZpZXctbW9kZXMnKS5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKVxuICAgICAgJCgnLnZpZXdtb2RlLWJ0bltkYXRhLXZpZXdtb2RlXScpLnJlbW92ZUNsYXNzKCdhY3RpdmUnKVxuICAgICAgICAuZmlsdGVyKFwiW2RhdGEtdmlld21vZGU9JyN7bW9kZX0nXVwiKS5hZGRDbGFzcygnYWN0aXZlJylcblxuICAgIC5vbiAnZWRpdENvbW1hbmQnLCAoY29tbWFuZCkgLT4gZWRpdG9yU3RhdGVzLmNvZGVNaXJyb3IuZXhlY0NvbW1hbmQoY29tbWFuZClcblxuICAgIC5vbiAnb3BlbkRldlRvb2wnLCAtPlxuICAgICAgaWYgZWRpdG9yU3RhdGVzLnByZXZpZXcuaXNEZXZUb29sc09wZW5lZCgpXG4gICAgICAgIGVkaXRvclN0YXRlcy5wcmV2aWV3LmNsb3NlRGV2VG9vbHMoKVxuICAgICAgZWxzZVxuICAgICAgICBlZGl0b3JTdGF0ZXMucHJldmlldy5vcGVuRGV2VG9vbHMoKVxuXG4gICAgLm9uICdzZXRFZGl0b3JDb25maWcnLCAoZWRpdG9yQ29uZmlnKSAtPiBzZXRFZGl0b3JDb25maWcgZWRpdG9yQ29uZmlnXG4gICAgLm9uICdzZXRTcGxpdHRlcicsIChzcGxpaXRlclBvcykgLT4gc2V0U3BsaXR0ZXIgc3BsaWl0ZXJQb3NcbiAgICAub24gJ3NldFRoZW1lJywgKHRoZW1lKSAtPiBlZGl0b3JTdGF0ZXMudXBkYXRlR2xvYmFsU2V0dGluZyAnJHRoZW1lJywgdGhlbWVcbiAgICAub24gJ3RoZW1lQ2hhbmdlZCcsICh0aGVtZSkgLT4gTWRzUmVuZGVyZXIuc2VuZFRvTWFpbiAndGhlbWVDaGFuZ2VkJywgdGhlbWVcbiAgICAub24gJ3Jlc291cmNlU3RhdGUnLCAoc3RhdGUpIC0+IGxvYWRpbmdTdGF0ZSA9IHN0YXRlXG4gICMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG5cbiAgc2V0dGluZyA9XG4gICAgXCJpZFwiOiBcImluZGV4XCJcbiAgICBcInVybFwiOiBcIndzOi8vYXBwcy53aXNkb213ZWIubmV0OjY0MjYwL3dzL21pa1wiXG4gICAgXCJzaXRlXCI6IFwidGVzdFwiXG4gICAgXCJ0b2tlblwiOiBcIlBhZDo5OTQ4XCJcbiAgY2xpZW50ID0gbmV3IE1pY2tyQ2xpZW50KHNldHRpbmcpXG5cbiAgY2xpZW50Lm9uIFwiY2FuUmVjZWl2ZUVkaXRvclRleHRcIiwgKCk9PlxuICAgIGNsaWVudC5zZW5kIFwic2VuZEVkaXRvclRleHRcIiwge1xuICAgICAgXCJ0b1wiOiBcInByZXNlbkluZGV4XCJcbiAgICAgIFwiYm9keVwiOlxuICAgICAgICBcImNvbnRlbnRcIjogZWRpdG9yU3RhdGVzLmNvZGVNaXJyb3IuZ2V0VmFsdWUoKVxuICAgIH1cbiAgY2xpZW50Lm9uIFwiY2FuUmVjZWl2ZUNvbW1lbnRcIiwgKCk9PlxuICAgY2xpZW50LnNlbmQgXCJzZW5kQ29tbWVudFwiLCB7XG4gICAgIFwidG9cIjogXCJwcmVzZW5EZXZJbmRleFwiLFxuICAgICBcImJvZHlcIjpcbiAgICAgICBcImNvbnRlbnRcIjogZWRpdG9yU3RhdGVzLnBpY2tVcENvbW1lbnQoKVxuICAgfVxuXG4gIHdlYnZpZXcgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjcHJldmlldycpXG4gICMgc2ltcGxlIHByZXNlbnRhdGlvbiBtb2RlIG9uIVxuICAjICQoJyNwcmVzZW50YXRpb24nKS5vbiAnY2xpY2snLCAoKSA9PlxuICAjICAgd2Vidmlldy53ZWJraXRSZXF1ZXN0RnVsbFNjcmVlbigpXG5cbiAgIyAkKCcjcHJlc2VudGF0aW9uJykub24gJ2NsaWNrJywgKCkgPT5cbiAgIyAgICQoJy5wYW5lLm1hcmtkb3duJykudG9nZ2xlKClcbiAgIyAgIGlwYy5zZW5kKCdQcmVzZW50YXRpb24nKVxuXG4gICMgaXBjLm9uICdpbml0aWFsaXplJyAoKSA9PlxuXG5cbiAgIyBpcGMub24gXCJwcmVzZW50YXRpb25cIiwgKCkgLT5cbiAgIyAgIGNvbnNvbGUubG9nIFwicmVjaWV2ZSBwcmVzZW50YXRpb25cIlxuICAjICAgaXBjLnNlbmQgXCJ0ZXh0U2VuZFwiLCBlZGl0b3JTdGF0ZXMuY29kZU1pcnJvci5nZXRWYWx1ZSgpXG4gICMgICBjb25zb2xlLmxvZyAnc2VuZCB0ZXh0U2VuZCdcblxuICAkKCcjcHJlc2VudGF0aW9uJykub24gJ2NsaWNrJywgKCkgPT5cbiAgICAjICQoJy5wYW5lLm1hcmtkb3duJykudG9nZ2xlKClcbiAgICAjICQoJy50b29sYmFyLWZvb3RlcicpLnRvZ2dsZSgpXG4gICAgd2Vidmlldy5zZW5kICdyZXF1ZXN0U2xpZGVJbmZvJ1xuICAgIGNvbnNvbGUubG9nICdzZW5kIHJlcXVlc3RTbGlkZUluZm8nXG5cbiAgd2Vidmlldy5hZGRFdmVudExpc3RlbmVyICdpcGMtbWVzc2FnZScsIChldmVudCkgPT5cbiAgICAgc3dpdGNoIGV2ZW50LmNoYW5uZWxcbiAgICAgICB3aGVuIFwic2VuZFNsaWRlSW5mb1wiICAgIyB3ZWJ2aWV3IOOBi+OCieOCueODqeOCpOODieaDheWgseOCkuWPl+S/oVxuICAgICAgICBzbGlkZUluZm8gPSBldmVudC5hcmdzWzBdXG4gICAgICAgIGNvbnNvbGUubG9nICdyZWNlaXZlIHNlbmRTbGlkZUluZm8nXG4gICAgICAgIGNvbnNvbGUubG9nIHNsaWRlSW5mb1xuICAgICAgICBpcGMuc2VuZCAndGV4dFNlbmQnLCBzbGlkZUluZm9cbiAgICAgICAgY29uc29sZS5sb2cgJ3NlbmQgdGV4dFNlbmQnXG4gICAgICAgIGJyZWFrXG5cbiAgICAgICB3aGVuIFwicmVxdWVzdFNsaWRlSFRNTFwiXG4gICAgICAgIHdlYnZpZXcuc2VuZCAnc2V0U2xpZGUnLCBzbGlkZUhUTUxcbiAgICAgICAgY29uc29sZS5sb2cgJ3NlbmQgc2V0U2xpZGUnXG4gICAgICAgIGJyZWFrXG5cbiAgaXBjLm9uICdwcmVzZW5EZXZJbml0aWFsaXplJywgKGUsIHRleHQpID0+XG4gICAgICBjb25zb2xlLmxvZyAncmVjZWl2ZSBwcmVzZW5EZXZJbml0aWFsaXplJ1xuICAgICAgY29uc29sZS5sb2cgdGV4dFxuICAgICAgc2xpZGVIVE1MID0gdGV4dFxuXG4gIGlwYy5vbiAnZ29Ub1BhZ2UnLCAoZSwgcGFnZSkgPT5cbiAgICBjb25zb2xlLmxvZyBwYWdlXG4gICAgd2Vidmlldy5zZW5kICdnb1RvUGFnZScsIHBhZ2VcblxuICAgICAgIyB3ZWJ2aWV3IOOBrua6luWCmeOBjOOBp+OBjeOBpuOBquOBhFxuICAgICAgIyB3ZWJ2aWV3LnNlbmQgJ3NldFNsaWRlJywgdGV4dFxuICAgICAgIyBjb25zb2xlLmxvZyAnc2VuZCBzZXRTbGlkZSdcbiAgIyBpcGMub24gJ2luaXRpYWxpemUnLCAoKSA9PlxuICAjICAgJCgnLnBhbmUubWFya2Rvd24nKS5odG1sKClcbiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuXG5cbiAgIyBJbml0aWFsaXplXG4gIGVkaXRvclN0YXRlcy5jb2RlTWlycm9yLmZvY3VzKClcbiAgZWRpdG9yU3RhdGVzLnJlZnJlc2hQYWdlKClcbiJdfQ==
