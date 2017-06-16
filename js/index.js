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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VzIjpbImluZGV4LmNvZmZlZSJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxJQUFBLGtjQUFBO0VBQUE7OztBQUFBLEdBQUEsR0FBTSxPQUFBLENBQVEsVUFBUixDQUFtQixDQUFDOztBQUMxQixNQUFvQixPQUFBLENBQVEsVUFBUixDQUFwQixFQUFDLGlCQUFELEVBQVE7O0FBQ1IsT0FBQSxHQUFvQixPQUFBLENBQVEsdUJBQVI7O0FBQ3BCLGNBQUEsR0FBb0IsT0FBQSxDQUFRLDJCQUFSOztBQUNwQixlQUFBLEdBQW9CLE9BQUEsQ0FBUSxxQkFBUjs7QUFDcEIsV0FBQSxHQUFvQixJQUFJOztBQUN4QixFQUFBLEdBQW9CLE9BQUEsQ0FBUSxJQUFSOztBQUNwQixJQUFBLEdBQW9CLE9BQUEsQ0FBUSxvQkFBUjs7QUFFcEIsV0FBVyxDQUFDLGFBQVosQ0FBQTs7QUFFQSxRQUFRLENBQUMsa0JBQVQsQ0FBNEIsQ0FBNUIsRUFBK0IsQ0FBL0I7O0FBRUEsVUFBQSxHQUFhLE9BQUEsQ0FBUSxZQUFSOztBQUNiLE9BQUEsQ0FBUSx5QkFBUjs7QUFDQSxPQUFBLENBQVEsbUNBQVI7O0FBQ0EsT0FBQSxDQUFRLHlCQUFSOztBQUNBLE9BQUEsQ0FBUSxvQ0FBUjs7QUFDQSxPQUFBLENBQVEsNEJBQVI7O0FBQ0EsV0FBQSxHQUFjLE9BQUEsQ0FBUSx1QkFBUjs7QUFFUjtBQUNKLE1BQUE7O3lCQUFBLE1BQUEsR0FBUTs7eUJBQ1IsV0FBQSxHQUFhOzt5QkFDYixrQkFBQSxHQUFvQjs7eUJBQ3BCLFlBQUEsR0FBYzs7eUJBRWQsa0JBQUEsR0FBb0I7O3lCQUNwQixlQUFBLEdBQWlCOztFQUVKLHNCQUFDLFVBQUQsRUFBYyxPQUFkO0lBQUMsSUFBQyxDQUFBLGFBQUQ7SUFBYSxJQUFDLENBQUEsVUFBRDs7Ozs7Ozs7Ozs7O0lBQ3pCLE9BQU8sQ0FBQyxHQUFSLENBQVksRUFBQSxHQUFHLFNBQWY7SUFDQSxJQUFDLENBQUEsZ0JBQUQsQ0FB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QUFZLENBQUMsV0FBYixDQUFBO0FBN09DLENBQUEsQ0FBSCxDQUFBIiwic291cmNlc0NvbnRlbnQiOlsiaXBjID0gcmVxdWlyZSgnZWxlY3Ryb24nKS5pcGNSZW5kZXJlclxue3NoZWxsLCB3ZWJGcmFtZX0gPSByZXF1aXJlICdlbGVjdHJvbidcbk1kc01lbnUgICAgICAgICAgID0gcmVxdWlyZSAnLi9qcy9jbGFzc2VzL21kc19tZW51J1xuY2xzTWRzUmVuZGVyZXIgICAgPSByZXF1aXJlICcuL2pzL2NsYXNzZXMvbWRzX3JlbmRlcmVyJ1xuY3JlYXRlVmFsaWRhdG9yICAgPSByZXF1aXJlICdjb2RlbWlycm9yLXRleHRsaW50J1xuTWRzUmVuZGVyZXIgICAgICAgPSBuZXcgY2xzTWRzUmVuZGVyZXJcbmZzICAgICAgICAgICAgICAgID0gcmVxdWlyZSAnZnMnXG5QUFRYICAgICAgICAgICAgICA9IHJlcXVpcmUgJy4vanMtcHB0eC9saWIvcHB0eCdcblxuTWRzUmVuZGVyZXIucmVxdWVzdEFjY2VwdCgpXG5cbndlYkZyYW1lLnNldFpvb21MZXZlbExpbWl0cygxLCAxKVxuXG5Db2RlTWlycm9yID0gcmVxdWlyZSAnY29kZW1pcnJvcidcbnJlcXVpcmUgJ2NvZGVtaXJyb3IvbW9kZS94bWwveG1sJ1xucmVxdWlyZSAnY29kZW1pcnJvci9tb2RlL21hcmtkb3duL21hcmtkb3duJ1xucmVxdWlyZSAnY29kZW1pcnJvci9tb2RlL2dmbS9nZm0nXG5yZXF1aXJlICdjb2RlbWlycm9yL2FkZG9uL2VkaXQvY29udGludWVsaXN0J1xucmVxdWlyZSBcImNvZGVtaXJyb3IvYWRkb24vbGludC9saW50XCJcbk1pY2tyQ2xpZW50ID0gcmVxdWlyZSAnLi9tb2R1bGVzL01pY2tyQ2xpZW50J1xuXG5jbGFzcyBFZGl0b3JTdGF0ZXNcbiAgcnVsZXJzOiBbXVxuICBjdXJyZW50UGFnZTogbnVsbFxuICBwcmV2aWV3SW5pdGlhbGl6ZWQ6IGZhbHNlXG4gIGxhc3RSZW5kZXJlZDoge31cblxuICBfbG9ja0NoYW5nZWRTdGF0dXM6IGZhbHNlXG4gIF9pbWFnZURpcmVjdG9yeTogbnVsbFxuXG4gIGNvbnN0cnVjdG9yOiAoQGNvZGVNaXJyb3IsIEBwcmV2aWV3KSAtPlxuICAgIGNvbnNvbGUubG9nIFwiI3tfX2Rpcm5hbWV9XCJcbiAgICBAaW5pdGlhbGl6ZUVkaXRvcigpXG4gICAgQGluaXRpYWxpemVQcmV2aWV3KClcblxuICAgIEBtZW51ID0gbmV3IE1kc01lbnUgW1xuICAgICAgeyBsYWJlbDogJyZVbmRvJywgYWNjZWxlcmF0b3I6ICdDbWRPckN0cmwrWicsIGNsaWNrOiAoaSwgdykgPT4gQGNvZGVNaXJyb3IuZXhlY0NvbW1hbmQgJ3VuZG8nIGlmIHcgYW5kICF3Lm1kc1dpbmRvdy5mcmVlemUgfVxuICAgICAge1xuICAgICAgICBsYWJlbDogJyZSZWRvJ1xuICAgICAgICBhY2NlbGVyYXRvcjogZG8gLT4gaWYgcHJvY2Vzcy5wbGF0Zm9ybSBpcyAnd2luMzInIHRoZW4gJ0NvbnRyb2wrWScgZWxzZSAnU2hpZnQrQ21kT3JDdHJsK1onXG4gICAgICAgIGNsaWNrOiAoaSwgdykgPT4gQGNvZGVNaXJyb3IuZXhlY0NvbW1hbmQgJ3JlZG8nIGlmIHcgYW5kICF3Lm1kc1dpbmRvdy5mcmVlemVcbiAgICAgIH1cbiAgICAgIHsgdHlwZTogJ3NlcGFyYXRvcicgfVxuICAgICAgeyBsYWJlbDogJ0N1JnQnLCBhY2NlbGVyYXRvcjogJ0NtZE9yQ3RybCtYJywgcm9sZTogJ2N1dCcgfVxuICAgICAgeyBsYWJlbDogJyZDb3B5JywgYWNjZWxlcmF0b3I6ICdDbWRPckN0cmwrQycsIHJvbGU6ICdjb3B5JyB9XG4gICAgICB7IGxhYmVsOiAnJlBhc3RlJywgYWNjZWxlcmF0b3I6ICdDbWRPckN0cmwrVicsIHJvbGU6ICdwYXN0ZScgfVxuICAgICAgeyBsYWJlbDogJyZEZWxldGUnLCByb2xlOiAnZGVsZXRlJyB9XG4gICAgICB7IGxhYmVsOiAnU2VsZWN0ICZBbGwnLCBhY2NlbGVyYXRvcjogJ0NtZE9yQ3RybCtBJywgY2xpY2s6IChpLCB3KSA9PiBAY29kZU1pcnJvci5leGVjQ29tbWFuZCAnc2VsZWN0QWxsJyBpZiB3IGFuZCAhdy5tZHNXaW5kb3cuZnJlZXplIH1cbiAgICAgIHsgdHlwZTogJ3NlcGFyYXRvcicsIHBsYXRmb3JtOiAnZGFyd2luJyB9XG4gICAgICB7IGxhYmVsOiAnU2VydmljZXMnLCByb2xlOiAnc2VydmljZXMnLCBzdWJtZW51OiBbXSwgcGxhdGZvcm06ICdkYXJ3aW4nIH1cbiAgICBdXG5cbiAgIyDjg5rjg7zjgrjjgqvjgqbjg7Pjg4jlvozjgIF3ZWJ2aWV344G444Gd44KM44KS6YCB5L+hXG4gIHJlZnJlc2hQYWdlOiAocnVsZXJzKSA9PlxuICAgICMgRWRpdG9yU3RhdGVz44Kv44Op44K544Gu5aSJ5pWwcnVsZXJz44Oq44K544OI44G45YWl44KM44Gm44CB5LiA5pem44Oa44O844K444KS77yR44Gr44GZ44KLXG4gICAgQHJ1bGVycyA9IHJ1bGVycyBpZiBydWxlcnM/XG4gICAgcGFnZSAgICA9IDFcbiAgICMgY29uc29sZS5sb2cgXCJjb21tZW50IDFwYWdlID0gXCIgKyBAcGlja1VwQ29tbWVudEZyb21QYWdlKDEpXG4gICAgY29uc29sZS5sb2cgXCJydWxlcnMubGVuZ3RoID0gXCIgKyBAcnVsZXJzLmxlbmd0aFxuICAgIGNvbnNvbGUubG9nIEBwaWNrVXBDb21tZW50KClcbiAgICAjIGNvbnNvbGUubG9nIFwibGFzdCBwYWdlID0gXCIgKyBAcGlja1VwQ29tbWVudEZyb21QYWdlKEBydWxlcnMubGVuZ3RoKzEpXG4gICAgI2NvbnNvbGUubG9nIEBwaWNrVXBDb21tZW50KClcblxuICAgICMgcnVsZXJMaW5l44Gr44GvJy0tLSfjga7ooYzkvY3nva7jgYzoqJjjgZXjgozjgabjgYrjgorjgIHjgZ3jgozjgajjgqjjg4fjgqPjgr/kuIrjga7jgqvjg7zjgr3jg6vkvY3nva7jgpLmr5TovIPjgZfjgaZwYWdl44KS5rG644KB44KLXG4gICAgbGluZU51bWJlciA9IEBjb2RlTWlycm9yLmdldEN1cnNvcigpLmxpbmUgfHwgMFxuICAgIGZvciBydWxlckxpbmUgaW4gQHJ1bGVyc1xuICAgICAgcGFnZSsrIGlmIHJ1bGVyTGluZSA8PSBsaW5lTnVtYmVyXG5cbiAgICAjIHJ1bGVy6KiI566X5b6M44Gr44Oa44O844K444Gu5aKX5rib44GM44GC44Gj44Gf5aC05ZCI44CB5q2j44GX44GE44Oa44O844K45oOF5aCx44KSd2Vidmlld+OBuOmAgeS/oVxuICAgIGlmIEBjdXJyZW50UGFnZSAhPSBwYWdlXG4gICAgICBAY3VycmVudFBhZ2UgPSBwYWdlXG4gICAgICBAcHJldmlldy5zZW5kICdjdXJyZW50UGFnZScsIEBjdXJyZW50UGFnZSBpZiBAcHJldmlld0luaXRpYWxpemVkXG5cbiAgICAkKCcjcGFnZS1pbmRpY2F0b3InKS50ZXh0IFwiUGFnZSAje0BjdXJyZW50UGFnZX0gLyAje0BydWxlcnMubGVuZ3RoICsgMX1cIlxuXG4gIGluaXRpYWxpemVQcmV2aWV3OiA9PlxuICAgICQoQHByZXZpZXcpXG4gICAgICAub24gJ2RvbS1yZWFkeScsID0+XG4gICAgICAgICMgRml4IG1pbmltaXplZCBwcmV2aWV3ICgjMjApXG4gICAgICAgICMgW05vdGVdIGh0dHBzOi8vZ2l0aHViLmNvbS9lbGVjdHJvbi9lbGVjdHJvbi9pc3N1ZXMvNDg4MlxuICAgICAgICAkKEBwcmV2aWV3LnNoYWRvd1Jvb3QpLmFwcGVuZCgnPHN0eWxlPm9iamVjdHttaW4td2lkdGg6MDttaW4taGVpZ2h0OjA7fTwvc3R5bGU+JylcblxuICAgICAgIyB3ZWJ2aWV3IOOBi+OCieOBrumAmuS/oeOCkuWPl+OBkeWPluOCiyAnaXBjLW1lc3NhZ2UnXG4gICAgICAub24gJ2lwYy1tZXNzYWdlJywgKGV2KSA9PlxuICAgICAgICBlID0gZXYub3JpZ2luYWxFdmVudFxuXG4gICAgICAgIHN3aXRjaCBlLmNoYW5uZWxcbiAgICAgICAgICB3aGVuICdydWxlckNoYW5nZWQnXG4gICAgICAgICAgICBAcmVmcmVzaFBhZ2UgZS5hcmdzWzBdXG4gICAgICAgICAgd2hlbiAnbGlua1RvJ1xuICAgICAgICAgICAgQG9wZW5MaW5rIGUuYXJnc1swXVxuICAgICAgICAgIHdoZW4gJ3JlbmRlcmVkJ1xuICAgICAgICAgICAgQGxhc3RSZW5kZXJlZCA9IGUuYXJnc1swXVxuICAgICAgICAgICAgdW5sZXNzIEBwcmV2aWV3SW5pdGlhbGl6ZWRcbiAgICAgICAgICAgICAgTWRzUmVuZGVyZXIuc2VuZFRvTWFpbiAncHJldmlld0luaXRpYWxpemVkJ1xuXG4gICAgICAgICAgICAgIEBwcmV2aWV3SW5pdGlhbGl6ZWQgPSB0cnVlXG4gICAgICAgICAgICAgICQoJ2JvZHknKS5hZGRDbGFzcyAnaW5pdGlhbGl6ZWQtc2xpZGUnXG4gICAgICAgICAgZWxzZVxuICAgICAgICAgICAgTWRzUmVuZGVyZXIuX2NhbGxfZXZlbnQgZS5jaGFubmVsLCBlLmFyZ3MuLi5cbiAgICAgICMgdXJs44KS44Kv44Oq44OD44Kv44GX44Gm5paw44GX44GE44Km44Kk44Oz44OJ44Km44GM6ZaL44GL44KM44KL5pmCXG4gICAgICAub24gJ25ldy13aW5kb3cnLCAoZSkgPT5cbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpXG4gICAgICAgIEBvcGVuTGluayBlLm9yaWdpbmFsRXZlbnQudXJsXG5cbiAgICAgIC5vbiAnZGlkLWZpbmlzaC1sb2FkJywgKGUpID0+XG4gICAgICAgIEBwcmV2aWV3LnNlbmQgJ2N1cnJlbnRQYWdlJywgMVxuICAgICAgICBAcHJldmlldy5zZW5kICdzZXRJbWFnZURpcmVjdG9yeScsIEBfaW1hZ2VEaXJlY3RvcnlcbiAgICAgICAgQHByZXZpZXcuc2VuZCAncmVuZGVyJywgQGNvZGVNaXJyb3IuZ2V0VmFsdWUoKSAgIyByZW5kZXIg44Kk44OZ44Oz44OI6YCB5L+h44GncnVsZXLnorroqo3jgZfjgabjg5rjg7zjgrjliIfjgormm7/jgo/jgopcblxuICBvcGVuTGluazogKGxpbmspID0+XG4gICAgc2hlbGwub3BlbkV4dGVybmFsIGxpbmsgaWYgL15odHRwcz86XFwvXFwvLisvLnRlc3QobGluaylcblxuICBpbml0aWFsaXplRWRpdG9yOiA9PlxuICAgIEBjb2RlTWlycm9yLm9uICdjb250ZXh0bWVudScsIChjbSwgZSkgPT5cbiAgICAgIGUucHJldmVudERlZmF1bHQoKVxuICAgICAgQGNvZGVNaXJyb3IuZm9jdXMoKVxuICAgICAgQG1lbnUucG9wdXAoKVxuICAgICAgZmFsc2VcblxuICAgIEBjb2RlTWlycm9yLm9uICdjaGFuZ2UnLCAoY20sIGNoZykgPT5cbiAgICAgIEBwcmV2aWV3LnNlbmQgJ3JlbmRlcicsIGNtLmdldFZhbHVlKClcbiAgICAgIE1kc1JlbmRlcmVyLnNlbmRUb01haW4gJ3NldENoYW5nZWRTdGF0dXMnLCB0cnVlIGlmICFAX2xvY2tDaGFuZ2VkU3RhdHVzXG5cbiAgICBAY29kZU1pcnJvci5vbiAnY3Vyc29yQWN0aXZpdHknLCAoY20pID0+IHdpbmRvdy5zZXRUaW1lb3V0ICg9PiBAcmVmcmVzaFBhZ2UoKSksIDVcblxuICBzZXRJbWFnZURpcmVjdG9yeTogKGRpcmVjdG9yeSkgPT5cbiAgICBpZiBAcHJldmlld0luaXRpYWxpemVkXG4gICAgICBAcHJldmlldy5zZW5kICdzZXRJbWFnZURpcmVjdG9yeScsIGRpcmVjdG9yeVxuICAgICAgQHByZXZpZXcuc2VuZCAncmVuZGVyJywgQGNvZGVNaXJyb3IuZ2V0VmFsdWUoKVxuICAgIGVsc2VcbiAgICAgIEBfaW1hZ2VEaXJlY3RvcnkgPSBkaXJlY3RvcnlcblxuICBpbnNlcnRJbWFnZTogKGZpbGVQYXRoKSA9PiBAY29kZU1pcnJvci5yZXBsYWNlU2VsZWN0aW9uKFwiIVtdKCN7ZmlsZVBhdGgucmVwbGFjZSgvIC9nLCAnJTIwJyl9KVxcblwiKVxuXG4gICMqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlRPRE8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gIGluc2VydFZpZGVvOiAoZmlsZVBhdGgpID0+XG4gICAgY29uc29sZS5sb2cgZmlsZVBhdGhcblxuXG4gICMgLnBwdHgg44OV44Kh44Kk44Or44KS44OJ44Op44OD44Kw77yG44OJ44Ot44OD44OX44Gn44Ot44O844OJXG4gIGxvYWRGcm9tUFBUWDogKGZpbGVQYXRoKSA9PlxuICAgIElORklMRSA9IGZpbGVQYXRoO1xuICAgIGZzLnJlYWRGaWxlIElORklMRSwgKGVyciwgZGF0YSkgPT5cbiAgICAgIGlmIChlcnIpXG4gICAgICAgIHRocm93IGVyclxuICAgICAgcHB0eCA9IG5ldyBQUFRYLlByZXNlbnRhdGlvbigpXG4gICAgICBwcHR4LmxvYWQgZGF0YSwgKGVycikgPT5cbiAgICAgICAgYm9keSA9IFtdXG5cbiAgICAgICAgZm9yIGkgaW4gWzEuLi5wcHR4LmdldFNsaWRlQ291bnQoKV1cbiAgICAgICAgICBzbGlkZSA9IHBwdHguZ2V0U2xpZGUoXCJzbGlkZSN7aX1cIilcbiAgICAgICAgICBjb25zb2xlLmxvZyAnc2xpZGUnICsgaVxuICAgICAgICAgIHRpdGxlID0gcGlja1VwVGl0bGVGcm9tUFBUWChzbGlkZSlcbiAgICAgICAgICB0aXRsZSA9IHRpdGxlLnJlcGxhY2UgL1xcbi9nLCAnXFxuIyAnXG4gICAgICAgICAgYm9keS5wdXNoKCcjICcgKyB0aXRsZSArICdcXG4nICsgcGlja1VwQm9keUZyb21QUFRYKHNsaWRlKSlcblxuICAgICAgICAjICNjb25zb2xlLmxvZyBib2R5XG4gICAgICAgIEBjb2RlTWlycm9yLnNldFZhbHVlKGJvZHkuam9pbihcIlxcblxcbi0tLVxcblxcblwiKSlcbiAgICAgICAgIyAjY29uc29sZS5sb2cgSlNPTi5zdHJpbmdpZnkoYm9keSwgbnVsbCwgJyAnKVxuXG4gIHBpY2tVcFRpdGxlRnJvbVBQVFggPSAoc2xpZGUpID0+XG4gICAgdGl0bGUgPSBbXTtcbiAgICB0YXJnZXQgPSBhcihzbGlkZSk7XG4gICAgZm9yIGkgaW4gWzAuLi50YXJnZXQubGVuZ3RoXVxuICAgICAgI2NvbnNvbGUubG9nIFwidGl0bGUgOiBcIiArIHRhcmdldFtpXVsnYTp0J11cbiAgICAgIGlmKHRhcmdldFtpXVsnYTp0J11bMF0gPT0gJycpXG4gICAgICAgIHRpdGxlLnB1c2goJ1xcbicpXG4gICAgICBlbHNlXG4gICAgICAgIHRpdGxlLnB1c2godGFyZ2V0W2ldWydhOnQnXSlcbiAgICBjb25zb2xlLmxvZyB0aXRsZVxuICAgIHJldHVybiB0aXRsZS5qb2luKCcnKVxuXG4gIHBpY2tVcEJvZHlGcm9tUFBUWCA9IChzbGlkZSkgPT5cbiAgICBib2R5ID0gW107XG4gICAgdGFyZ2V0ID0gcHNwKHNsaWRlKVsxXVsncDp0eEJvZHknXVswXVsnYTpwJ107XG4gICAgZm9yIGkgaW4gWzAuLi50YXJnZXQubGVuZ3RoXVxuICAgICAgcHVzaGVkID0gXCJcIjtcbiAgICAgIGlmKHRhcmdldFtpXVsnYTpyJ10gPT0gbnVsbClcbiAgICAgICAgcHVzaGVkID0gXCJcIjtcbiAgICAgICAgYm9keS5wdXNoKHB1c2hlZClcbiAgICAgICAgY29udGludWVcbiAgICAgIGVsc2UgaWYgdGFyZ2V0W2ldWydhOnBQciddIGFuZCB0YXJnZXRbaV1bJ2E6ciddXG4gICAgICAgIHB1c2hlZCA9IFwiXFxuLSBcIjtcbiAgICAgIGlmKHRhcmdldFtpXVsnYTpyJ10pXG4gICAgICAgIHRtcCA9IFtdO1xuICAgICAgICBhciA9IHRhcmdldFtpXVsnYTpyJ107XG5cbiAgICAgICAgZm9yIGsgaW4gWzAuLi5hci5sZW5ndGhdXG4gICAgICAgICAgdG1wLnB1c2goYXJba11bJ2E6dCddKTtcbiAgICAgICAgcHVzaGVkID0gcHVzaGVkICsgdG1wLmpvaW4oJycpO1xuICAgICAgaWYodGFyZ2V0W2ldWydhOmVuZFBhcmFSUHInXSlcbiAgICAgICAgcHVzaGVkID0gcHVzaGVkICsgJ1xcbic7XG4gICAgICBib2R5LnB1c2gocHVzaGVkKVxuICAgICAgY29uc29sZS5sb2cgcHVzaGVkXG4gICAgcmV0dXJuIGJvZHkuam9pbignJylcblxuXG4gIGFyID0gKHNsaWRlKSA9PlxuICAgIHJldHVybiBhcChzbGlkZSlbMF1bJ2E6ciddO1xuXG4gIGFwID0gKHNsaWRlKSA9PlxuXG4gICAgcmV0dXJuIHB0eEJvZHkoc2xpZGUpWzBdWydhOnAnXTtcbiAgcHR4Qm9keSA9IChzbGlkZSkgPT5cbiAgICByZXR1cm4gcHNwKHNsaWRlKVswXVsncDp0eEJvZHknXTtcblxuICBwc3BUcmVlID0gKHNsaWRlKSA9PlxuICAgIHJldHVybiBwY1NsZChzbGlkZSlbMF1bJ3A6c3BUcmVlJ107XG5cbiAgcHNwID0gKHNsaWRlKSA9PlxuICAgIHJldHVybiBwc3BUcmVlKHNsaWRlKVswXVsncDpzcCddO1xuXG4gIHBjU2xkID0gKHNsaWRlKSA9PlxuICAgIHJldHVybiBwc2xkKHNsaWRlKVsncDpjU2xkJ107XG5cbiAgcHNsZCA9IChzbGlkZSkgPT5cbiAgICByZXR1cm4gc2xpZGUuY29udGVudFsncDpzbGQnXTtcblxuICAjKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuXG4gICMgcGFnZeavjuOBq+WIpeOCjOOBn+OCs+ODoeODs+ODiOOBruODquOCueODiOOCkui/lOOBmVxuICBwaWNrVXBDb21tZW50IDogKCkgPT5cbiAgICBwYWdlTWF4ID0gQHJ1bGVycy5sZW5ndGggKyAxXG4gICAgQ29tbWVudEVhY2hQYWdlID0gW11cbiAgICBmb3IgaSBpbiBbMS4uLnBhZ2VNYXgrMV1cbiAgICAgIGNvbnNvbGUubG9nIGlcbiAgICAgIENvbW1lbnRFYWNoUGFnZS5wdXNoKEBwaWNrVXBDb21tZW50RnJvbVBhZ2UoaSkpXG4gICAgcmV0dXJuIENvbW1lbnRFYWNoUGFnZVxuXG5cbiAgIyB7IyMgIyN9IOOBp+WbsuOBvuOCjOOBn+OCs+ODoeODs+ODiOmDqOWIhuOCkuaKnOOBjeWHuuOBmVxuICAjIOODluODreODg+OCr+OCs+ODoeODs+ODiOOBruWgtOWQiOOBr3sjIyAjI33jga7liY3lvozjgavmlLnooYzjgYzlhaXjgaPjgabjgYTjgarjgZHjgozjgbDjgarjgonjgarjgYRcbiAgIyBwaWNrVXBDb21tZW50RnJvbVBhZ2UoTnVtYmVyKSAtPiBTdHJpbmdcbiAgcGlja1VwQ29tbWVudEZyb21QYWdlIDogKHBhZ2UpID0+XG4gICAgaWYgcGFnZT09MSBhbmQgbm90IEBydWxlcnMubGVuZ3RoXG4gICAgICBwYWdlU3RhcnRMaW5lID0gMFxuICAgICAgcGFnZUVuZExpbmUgICA9IEBjb2RlTWlycm9yLmxpbmVDb3VudCgpXG4gICAgICBjb25zb2xlLmxvZyBcInBhZ2VFbmRMaW5lID0gXCIgKyBwYWdlRW5kTGluZVxuICAgIGVsc2UgaWYgcGFnZSA9PSAxIGFuZCBAcnVsZXJzLmxlbmd0aCAhPSAwXG4gICAgICBwYWdlU3RhcnRMaW5lID0gMFxuICAgICAgcGFnZUVuZExpbmUgICA9IEBydWxlcnNbMF1cbiAgICBlbHNlIGlmIHBhZ2UgPT0gQHJ1bGVycy5sZW5ndGggKyAxXG4gICAgICBwYWdlU3RhcnRMaW5lID0gQHJ1bGVyc1tAcnVsZXJzLmxlbmd0aC0xXVxuICAgICAgcGFnZUVuZExpbmUgICA9IEBjb2RlTWlycm9yLmxpbmVDb3VudCgpXG4gICAgZWxzZVxuICAgICAgcGFnZVN0YXJ0TGluZSA9IEBydWxlcnNbcGFnZS0yXSArIDFcbiAgICAgIHBhZ2VFbmRMaW5lICAgPSBAcnVsZXJzW3BhZ2UtMV0gKyAxXG5cbiAgICBUZXh0SW5FZGl0b3IgPSBAY29kZU1pcnJvci5nZXRSYW5nZSB7XCJsaW5lXCI6cGFnZVN0YXJ0TGluZSAsIFwiY2hcIjogMH0se1wibGluZVwiOnBhZ2VFbmRMaW5lLTEgLCBcImNoXCI6MCB9XG4gICAgcmUgPSAvXFx7IyNbXFxzXFxuXSooLiopW1xcc1xcbl0qIyNcXH0vXG4gICAgcmVzdWx0ID0gVGV4dEluRWRpdG9yLm1hdGNoKHJlKVxuICAgIGNvbW1lbnQgPSAnJ1xuICAgIGlmKHJlc3VsdClcbiAgICAgIGNvbW1lbnQgPSByZXN1bHRbMV1cbiAgICByZXR1cm4gY29tbWVudFxuXG4gIHVwZGF0ZUdsb2JhbFNldHRpbmc6IChwcm9wLCB2YWx1ZSkgPT5cbiAgICBsYXRlc3RQb3MgPSBudWxsXG5cbiAgICBmb3Igb2JqIGluIChAbGFzdFJlbmRlcmVkPy5zZXR0aW5nc1Bvc2l0aW9uIHx8IFtdKVxuICAgICAgbGF0ZXN0UG9zID0gb2JqIGlmIG9iai5wcm9wZXJ0eSBpcyBwcm9wXG5cbiAgICBpZiBsYXRlc3RQb3M/XG4gICAgICBAY29kZU1pcnJvci5yZXBsYWNlUmFuZ2UoXG4gICAgICAgIFwiI3twcm9wfTogI3t2YWx1ZX1cIixcbiAgICAgICAgQ29kZU1pcnJvci5Qb3MobGF0ZXN0UG9zLmxpbmVJZHgsIGxhdGVzdFBvcy5mcm9tKSxcbiAgICAgICAgQ29kZU1pcnJvci5Qb3MobGF0ZXN0UG9zLmxpbmVJZHgsIGxhdGVzdFBvcy5mcm9tICsgbGF0ZXN0UG9zLmxlbmd0aCksXG4gICAgICApXG4gICAgZWxzZVxuICAgICAgQGNvZGVNaXJyb3IucmVwbGFjZVJhbmdlKFxuICAgICAgICBcIjwhLS0gI3twcm9wfTogI3t2YWx1ZX0gLS0+XFxuXFxuXCIsXG4gICAgICAgIENvZGVNaXJyb3IuUG9zKEBjb2RlTWlycm9yLmZpcnN0TGluZSgpLCAwKVxuICAgICAgKVxuXG5sb2FkaW5nU3RhdGUgPSAnbG9hZGluZydcblxuXG5cbiMgdGV4dGxpbnQgcnVsZXMgc2V0dGluZ1xuXG5ub0FidXNhZ2UgPSByZXF1aXJlICd0ZXh0bGludC1ydWxlLWphLW5vLWFidXNhZ2UnXG5taXhlZFBlcmlvZCA9IHJlcXVpcmUgJ3RleHRsaW50LXJ1bGUtamEtbm8tbWl4ZWQtcGVyaW9kJ1xuc3VjY2Vzc2l2ZVdvcmQgPSByZXF1aXJlICd0ZXh0bGludC1ydWxlLWphLW5vLXN1Y2Nlc3NpdmUtd29yZCdcbndlYWtQaHJhc2UgPSByZXF1aXJlICd0ZXh0bGludC1ydWxlLWphLW5vLXdlYWstcGhyYXNlJ1xubWF4Q29tbWEgPSByZXF1aXJlICd0ZXh0bGludC1ydWxlLW1heC1jb21tYSdcbmthbmppQ29udGludW91c0xlbiA9IHJlcXVpcmUgJ3RleHRsaW50LXJ1bGUtbWF4LWthbmppLWNvbnRpbnVvdXMtbGVuJ1xubWF4VGVuID0gcmVxdWlyZSAndGV4dGxpbnQtcnVsZS1tYXgtdGVuJ1xubm9Eb3VibGVOZWdhdGl2ZUphID0gcmVxdWlyZSAndGV4dGxpbnQtcnVsZS1uby1kb3VibGUtbmVnYXRpdmUtamEnXG5ub0RvdWJsZWRDb25qdW5jdGlvbiA9IHJlcXVpcmUgJ3RleHRsaW50LXJ1bGUtbm8tZG91YmxlZC1jb25qdW5jdGlvbidcbm5vRG91YmxlZENvbmp1bmN0aXZlUGFydGljbGVHYSA9IHJlcXVpcmUgJ3RleHRsaW50LXJ1bGUtbm8tZG91YmxlZC1jb25qdW5jdGl2ZS1wYXJ0aWNsZS1nYSdcbm5vRG91YmxlZEpvc2hpID0gcmVxdWlyZSAndGV4dGxpbnQtcnVsZS1uby1kb3VibGVkLWpvc2hpJ1xubm9Ecm9wcGluZ1RoZVJhID0gcmVxdWlyZSAndGV4dGxpbnQtcnVsZS1uby1kcm9wcGluZy10aGUtcmEnXG5ub0V4Y2xhbWF0aW9uUXVlc3Rpb25NYXJrID0gcmVxdWlyZSAndGV4dGxpbnQtcnVsZS1uby1leGNsYW1hdGlvbi1xdWVzdGlvbi1tYXJrJ1xubm9IYW5rYWt1S2FuYSA9IHJlcXVpcmUgJ3RleHRsaW50LXJ1bGUtbm8taGFua2FrdS1rYW5hJ1xubm9NaXhEZWFydURlc3VtYXN1ID0gcmVxdWlyZSAndGV4dGxpbnQtcnVsZS1uby1taXgtZGVhcnUtZGVzdW1hc3UnXG5ub05mZCA9IHJlcXVpcmUgJ3RleHRsaW50LXJ1bGUtbm8tbmZkJ1xubm9TdGFydER1cGxpY2F0ZWRDb25qdW5jdGlvbiA9IHJlcXVpcmUgJ3RleHRsaW50LXJ1bGUtbm8tc3RhcnQtZHVwbGljYXRlZC1jb25qdW5jdGlvbidcblxudmFsaWRhdG9yID0gY3JlYXRlVmFsaWRhdG9yKHtcbiAgcnVsZXM6IHtcbiAgICAnbm9BYnVzYWdlJyA6IG5vQWJ1c2FnZSxcbiAgICAnbWl4ZWRQZXJpb2QnIDogbWl4ZWRQZXJpb2QsXG4gICAgJ3N1Y2Nlc3NpdmVXb3JkJyA6IHN1Y2Nlc3NpdmVXb3JkLFxuICAgICd3ZWFrUGhyYXNlJyA6IHdlYWtQaHJhc2UsXG4gICAgJ21heENvbW1hJyA6IG1heENvbW1hLFxuICAgICdrYW5qaUNvbnRpbnVvdXNMZW4nIDoga2FuamlDb250aW51b3VzTGVuLFxuICAgICdtYXhUZW4nIDogbWF4VGVuLFxuICAgICdub0RvdWJsZWROZWdhdGl2ZUphJyA6IG5vRG91YmxlTmVnYXRpdmVKYSxcbiAgICAnbm9Eb3VibGVkQ29uanVuY3Rpb24nIDogbm9Eb3VibGVkQ29uanVuY3Rpb24sXG4gICAgJ25vRG91YmxlZENvbmp1bmN0aXZlUGFydGljbGVHYScgOiBub0RvdWJsZWRDb25qdW5jdGl2ZVBhcnRpY2xlR2EsXG4gICAgJ25vRG91YmxlZEpvc2hpJyA6IG5vRG91YmxlZEpvc2hpLFxuICAgICdub0Ryb3BwaW5nVGhlUmEnIDogbm9Ecm9wcGluZ1RoZVJhLFxuICAgICdub0V4Y2xhbWF0aW9uUXVlc3Rpb25NYXJrJyA6IG5vRXhjbGFtYXRpb25RdWVzdGlvbk1hcmssXG4gICAgJ25vSGFua2FrdUthbmEnIDogbm9IYW5rYWt1S2FuYSxcbiAgICAnbm9NaXhEZWFydURlc3VtYXN1JyA6IG5vTWl4RGVhcnVEZXN1bWFzdSxcbiAgICAnbm9OZmQnIDogbm9OZmQsXG4gICAgJ25vU3RhcnREdXBsaWNhdGVkQ29uanVuY3Rpb24nIDogbm9TdGFydER1cGxpY2F0ZWRDb25qdW5jdGlvblxuICB9XG4gIH0pO1xuZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lciBcIkRPTUNvbnRlbnRMb2FkZWRcIiwgKGV2ZW50KT0+XG5cbiAgIyBjbGllbnQuc2VuZCBcIm1vcm5pbmdcIixcbiAgIyAgIFwiZnJvbVwiOiBzZXR0aW5nLmlkLFxuICAjICAgXCJ0b1wiIDogXCJsYW5kXCIsXG4gICMgICBcImJvZHlcIjpcbiAgIyAgICAgXCJjb250ZW50XCI6IFwiaGVsbG8hIGxhbmQhIGknbSBpbmRleFwiXG5cblxuZG8gLT5cbiAgc2xpZGVIVE1MID0gXCJcIlxuICBlZGl0b3JTdGF0ZXMgPSBuZXcgRWRpdG9yU3RhdGVzKFxuICAgIENvZGVNaXJyb3IuZnJvbVRleHRBcmVhKCQoJyNlZGl0b3InKVswXSxcbiAgICAgICMgZ2ZtIDogR2l0aHViIEZsYXZvcmVkIE1vZGVcbiAgICAgIG1vZGU6ICdnZm0nXG4gICAgICAjdGhlbWU6ICdiYXNlMTYtbGlnaHQnXG4gICAgICBsaW5lV3JhcHBpbmc6IHRydWVcbiAgICAgIGxpbmVOdW1iZXJzOiB0cnVlXG4gICAgICBkcmFnRHJvcDogZmFsc2VcbiAgICAgIGd1dHRlcnM6IFtcIkNvZGVNaXJyb3ItbGludC1tYXJrZXJzXCJdXG4gICAgICBsaW50OiB7XG4gICAgICAgICBcImdldEFubm90YXRpb25zXCI6IHZhbGlkYXRvcixcbiAgICAgICAgIFwiYXN5bmNcIjogdHJ1ZVxuICAgICAgfVxuICAgICAgZXh0cmFLZXlzOlxuICAgICAgICBFbnRlcjogJ25ld2xpbmVBbmRJbmRlbnRDb250aW51ZU1hcmtkb3duTGlzdCdcbiAgICApLFxuICAgICQoJyNwcmV2aWV3JylbMF1cbiAgKVxuXG5cblxuICAjIFZpZXcgbW9kZXNcbiAgJCgnLnZpZXdtb2RlLWJ0bltkYXRhLXZpZXdtb2RlXScpLmNsaWNrIC0+IE1kc1JlbmRlcmVyLnNlbmRUb01haW4oJ3ZpZXdNb2RlJywgJCh0aGlzKS5hdHRyKCdkYXRhLXZpZXdtb2RlJykpXG5cbiAgIyBQREYgRXhwb3J0IGJ1dHRvblxuICAkKCcjcGRmLWV4cG9ydCcpLmNsaWNrIC0+IGlwYy5zZW5kICdQZGZFeHBvcnQnXG5cbiAgIyBGaWxlIEQmRFxuICAkKGRvY3VtZW50KVxuICAgIC5vbiAnZHJhZ292ZXInLCAgLT4gZmFsc2VcbiAgICAub24gJ2RyYWdsZWF2ZScsIC0+IGZhbHNlXG4gICAgLm9uICdkcmFnZW5kJywgICAtPiBmYWxzZVxuICAgIC5vbiAnZHJvcCcsICAgICAgKGUpID0+XG4gICAgICBlLnByZXZlbnREZWZhdWx0KClcbiAgICAgIHJldHVybiBmYWxzZSB1bmxlc3MgKGYgPSBlLm9yaWdpbmFsRXZlbnQuZGF0YVRyYW5zZmVyPy5maWxlcz9bMF0pP1xuICAgICAgIyBjb25zb2xlLmxvZyBmLnR5cGVcbiAgICAgICMgY29uc29sZS5sb2cgZi5wYXRoXG4gICAgICAjIOODkeODr+ODneOBriAucHB0eOODleOCoeOCpOODq+OBoOOBo+OBn+OCiVxuICAgICAgaWYgZi50eXBlID09IFwiYXBwbGljYXRpb24vdm5kLm9wZW54bWxmb3JtYXRzLW9mZmljZWRvY3VtZW50LnByZXNlbnRhdGlvbm1sLnByZXNlbnRhdGlvblwiXG4gICAgICAgIGVkaXRvclN0YXRlcy5sb2FkRnJvbVBQVFggZi5wYXRoXG4gICAgICBlbHNlIGlmIGYudHlwZS5zdGFydHNXaXRoKCdpbWFnZScpXG4gICAgICAgIGVkaXRvclN0YXRlcy5pbnNlcnRJbWFnZSBmLnBhdGhcbiAgICAgIGVsc2UgaWYgZi50eXBlLnN0YXJ0c1dpdGgoJ3RleHQnKSB8fCBmLnR5cGUgaXMgJydcbiAgICAgICAgTWRzUmVuZGVyZXIuc2VuZFRvTWFpbiAnbG9hZEZyb21GaWxlJywgZi5wYXRoIGlmIGYucGF0aD9cbiAgICAgIGVsc2UgaWYgZi50eXBlLnN0YXJ0c1dpdGgoJ3ZpZGVvJylcbiAgICAgICAgZWRpdG9yU3RhdGVzLmluc2VydFZpZGVvIGYucGF0aFxuXG4gICAgICBmYWxzZVxuXG4gICMgU3BsaXR0ZXJcbiAgZHJhZ2dpbmdTcGxpdHRlciAgICAgID0gZmFsc2VcbiAgZHJhZ2dpbmdTcGxpdFBvc2l0aW9uID0gdW5kZWZpbmVkXG5cbiAgc2V0U3BsaXR0ZXIgPSAoc3BsaXRQb2ludCkgLT5cbiAgICBzcGxpdFBvaW50ID0gTWF0aC5taW4oMC44LCBNYXRoLm1heCgwLjIsIHBhcnNlRmxvYXQoc3BsaXRQb2ludCkpKVxuXG4gICAgJCgnLnBhbmUubWFya2Rvd24nKS5jc3MoJ2ZsZXgtZ3JvdycsIHNwbGl0UG9pbnQgKiAxMDApXG4gICAgJCgnLnBhbmUucHJldmlldycpLmNzcygnZmxleC1ncm93JywgKDEgLSBzcGxpdFBvaW50KSAqIDEwMClcblxuICAgIHJldHVybiBzcGxpdFBvaW50XG5cbiAgc2V0RWRpdG9yQ29uZmlnID0gKGVkaXRvckNvbmZpZykgLT5cbiAgICBlZGl0b3IgPSAkKGVkaXRvclN0YXRlcy5jb2RlTWlycm9yPy5nZXRXcmFwcGVyRWxlbWVudCgpKVxuICAgIGVkaXRvci5jc3MoJ2ZvbnQtZmFtaWx5JywgZWRpdG9yQ29uZmlnLmZvbnRGYW1pbHkpIGlmIGVkaXRvcj9cbiAgICBlZGl0b3IuY3NzKCdmb250LXNpemUnLCBlZGl0b3JDb25maWcuZm9udFNpemUpIGlmIGVkaXRvcj9cblxuICAkKCcucGFuZS1zcGxpdHRlcicpXG4gICAgLm1vdXNlZG93biAtPlxuICAgICAgZHJhZ2dpbmdTcGxpdHRlciA9IHRydWVcbiAgICAgIGRyYWdnaW5nU3BsaXRQb3NpdGlvbiA9IHVuZGVmaW5lZFxuXG4gICAgLmRibGNsaWNrIC0+XG4gICAgICBNZHNSZW5kZXJlci5zZW5kVG9NYWluICdzZXRDb25maWcnLCAnc3BsaXR0ZXJQb3NpdGlvbicsIHNldFNwbGl0dGVyKDAuNSlcblxuICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lciAnbW91c2Vtb3ZlJywgKGUpIC0+XG4gICAgaWYgZHJhZ2dpbmdTcGxpdHRlclxuICAgICAgZHJhZ2dpbmdTcGxpdFBvc2l0aW9uID0gc2V0U3BsaXR0ZXIgTWF0aC5taW4oTWF0aC5tYXgoMCwgZS5jbGllbnRYKSwgZG9jdW1lbnQuYm9keS5jbGllbnRXaWR0aCkgLyBkb2N1bWVudC5ib2R5LmNsaWVudFdpZHRoXG4gICwgZmFsc2VcblxuICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lciAnbW91c2V1cCcsIChlKSAtPlxuICAgIGRyYWdnaW5nU3BsaXR0ZXIgPSBmYWxzZVxuICAgIE1kc1JlbmRlcmVyLnNlbmRUb01haW4gJ3NldENvbmZpZycsICdzcGxpdHRlclBvc2l0aW9uJywgZHJhZ2dpbmdTcGxpdFBvc2l0aW9uIGlmIGRyYWdnaW5nU3BsaXRQb3NpdGlvbj9cbiAgLCBmYWxzZVxuXG4gIHJlc3BvbnNlUGRmT3B0cyA9IG51bGxcblxuICAjIEV2ZW50c1xuICBNZHNSZW5kZXJlclxuICAgIC5vbiAncHVibGlzaFBkZicsIChmbmFtZSkgLT5cbiAgICAgIGVkaXRvclN0YXRlcy5jb2RlTWlycm9yLmdldElucHV0RmllbGQoKS5ibHVyKClcbiAgICAgICQoJ2JvZHknKS5hZGRDbGFzcyAnZXhwb3J0aW5nLXBkZidcblxuICAgICAgZWRpdG9yU3RhdGVzLnByZXZpZXcuc2VuZCAncmVxdWVzdFBkZk9wdGlvbnMnLCB7IGZpbGVuYW1lOiBmbmFtZSB9XG5cbiAgICAub24gJ3Jlc3BvbnNlUGRmT3B0aW9ucycsIChvcHRzKSAtPlxuICAgICAgIyBXYWl0IGxvYWRpbmcgcmVzb3VyY2VzXG4gICAgICBzdGFydFB1Ymxpc2ggPSAtPlxuICAgICAgICBpZiBsb2FkaW5nU3RhdGUgaXMgJ2xvYWRpbmcnXG4gICAgICAgICAgc2V0VGltZW91dCBzdGFydFB1Ymxpc2gsIDI1MFxuICAgICAgICBlbHNlXG4gICAgICAgICAgZWRpdG9yU3RhdGVzLnByZXZpZXcucHJpbnRUb1BERlxuICAgICAgICAgICAgbWFyZ2luc1R5cGU6IDFcbiAgICAgICAgICAgIHBhZ2VTaXplOiBvcHRzLmV4cG9ydFNpemVcbiAgICAgICAgICAgIHByaW50QmFja2dyb3VuZDogdHJ1ZVxuICAgICAgICAgICwgKGVyciwgZGF0YSkgLT5cbiAgICAgICAgICAgIHVubGVzcyBlcnJcbiAgICAgICAgICAgICAgTWRzUmVuZGVyZXIuc2VuZFRvTWFpbiAnd3JpdGVGaWxlJywgb3B0cy5maWxlbmFtZSwgZGF0YSwgeyBmaW5hbGl6ZWQ6ICd1bmZyZWV6ZScgfVxuICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICBNZHNSZW5kZXJlci5zZW5kVG9NYWluICd1bmZyZWV6ZSdcblxuICAgICAgc2V0VGltZW91dCBzdGFydFB1Ymxpc2gsIDUwMFxuXG4gICAgLm9uICd1bmZyZWV6ZWQnLCAtPlxuICAgICAgZWRpdG9yU3RhdGVzLnByZXZpZXcuc2VuZCAndW5mcmVlemUnXG4gICAgICAkKCdib2R5JykucmVtb3ZlQ2xhc3MgJ2V4cG9ydGluZy1wZGYnXG5cbiAgICAub24gJ2xvYWRUZXh0JywgKGJ1ZmZlcikgLT5cbiAgICAgIGVkaXRvclN0YXRlcy5fbG9ja0NoYW5nZWRTdGF0dXMgPSB0cnVlXG4gICAgICBlZGl0b3JTdGF0ZXMuY29kZU1pcnJvci5zZXRWYWx1ZSBidWZmZXJcbiAgICAgIGVkaXRvclN0YXRlcy5jb2RlTWlycm9yLmNsZWFySGlzdG9yeSgpXG4gICAgICBlZGl0b3JTdGF0ZXMuX2xvY2tDaGFuZ2VkU3RhdHVzID0gZmFsc2VcblxuICAgIC5vbiAnc2V0SW1hZ2VEaXJlY3RvcnknLCAoZGlyZWN0b3JpZXMpIC0+IGVkaXRvclN0YXRlcy5zZXRJbWFnZURpcmVjdG9yeSBkaXJlY3Rvcmllc1xuXG4gICAgIyBzZW5kIHRleHQgdG8gc2F2ZSB0byBtYWluIHByb2Nlc3MgYW5kIHJlbG9hZFxuICAgIC5vbiAnc2F2ZScsIChmbmFtZSwgdHJpZ2dlcnMgPSB7fSkgLT5cbiAgICAgIE1kc1JlbmRlcmVyLnNlbmRUb01haW4gJ3dyaXRlRmlsZScsIGZuYW1lLCBlZGl0b3JTdGF0ZXMuY29kZU1pcnJvci5nZXRWYWx1ZSgpLCB0cmlnZ2Vyc1xuICAgICAgTWRzUmVuZGVyZXIuc2VuZFRvTWFpbiAnaW5pdGlhbGl6ZVN0YXRlJywgZm5hbWVcblxuICAgIC5vbiAndmlld01vZGUnLCAobW9kZSkgLT5cbiAgICAgIHN3aXRjaCBtb2RlXG4gICAgICAgIHdoZW4gJ21hcmtkb3duJ1xuICAgICAgICAgIGVkaXRvclN0YXRlcy5wcmV2aWV3LnNlbmQgJ3NldENsYXNzJywgJydcbiAgICAgICAgd2hlbiAnc2NyZWVuJ1xuICAgICAgICAgIGVkaXRvclN0YXRlcy5wcmV2aWV3LnNlbmQgJ3NldENsYXNzJywgJ3NsaWRlLXZpZXcgc2NyZWVuJ1xuICAgICAgICB3aGVuICdsaXN0J1xuICAgICAgICAgIGVkaXRvclN0YXRlcy5wcmV2aWV3LnNlbmQgJ3NldENsYXNzJywgJ3NsaWRlLXZpZXcgbGlzdCdcbiAgICAgICAgd2hlbiAncHJlc2VuLWRldidcbiAgICAgICAgICBlZGl0b3JTdGF0ZXMucHJldmlldy5zZW5kICdzZXRDbGFzcycsICdzbGlkZS12aWV3IHByZXNlbi1kZXYnXG5cbiAgICAgICQoJyNwcmV2aWV3LW1vZGVzJykucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJylcbiAgICAgICQoJy52aWV3bW9kZS1idG5bZGF0YS12aWV3bW9kZV0nKS5yZW1vdmVDbGFzcygnYWN0aXZlJylcbiAgICAgICAgLmZpbHRlcihcIltkYXRhLXZpZXdtb2RlPScje21vZGV9J11cIikuYWRkQ2xhc3MoJ2FjdGl2ZScpXG5cbiAgICAub24gJ2VkaXRDb21tYW5kJywgKGNvbW1hbmQpIC0+IGVkaXRvclN0YXRlcy5jb2RlTWlycm9yLmV4ZWNDb21tYW5kKGNvbW1hbmQpXG5cbiAgICAub24gJ29wZW5EZXZUb29sJywgLT5cbiAgICAgIGlmIGVkaXRvclN0YXRlcy5wcmV2aWV3LmlzRGV2VG9vbHNPcGVuZWQoKVxuICAgICAgICBlZGl0b3JTdGF0ZXMucHJldmlldy5jbG9zZURldlRvb2xzKClcbiAgICAgIGVsc2VcbiAgICAgICAgZWRpdG9yU3RhdGVzLnByZXZpZXcub3BlbkRldlRvb2xzKClcblxuICAgIC5vbiAnc2V0RWRpdG9yQ29uZmlnJywgKGVkaXRvckNvbmZpZykgLT4gc2V0RWRpdG9yQ29uZmlnIGVkaXRvckNvbmZpZ1xuICAgIC5vbiAnc2V0U3BsaXR0ZXInLCAoc3BsaWl0ZXJQb3MpIC0+IHNldFNwbGl0dGVyIHNwbGlpdGVyUG9zXG4gICAgLm9uICdzZXRUaGVtZScsICh0aGVtZSkgLT4gZWRpdG9yU3RhdGVzLnVwZGF0ZUdsb2JhbFNldHRpbmcgJyR0aGVtZScsIHRoZW1lXG4gICAgLm9uICd0aGVtZUNoYW5nZWQnLCAodGhlbWUpIC0+IE1kc1JlbmRlcmVyLnNlbmRUb01haW4gJ3RoZW1lQ2hhbmdlZCcsIHRoZW1lXG4gICAgLm9uICdyZXNvdXJjZVN0YXRlJywgKHN0YXRlKSAtPiBsb2FkaW5nU3RhdGUgPSBzdGF0ZVxuICAjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuXG4gIHNldHRpbmcgPVxuICAgIFwiaWRcIjogXCJpbmRleFwiXG4gICAgXCJ1cmxcIjogXCJ3czovL2FwcHMud2lzZG9td2ViLm5ldDo2NDI2MC93cy9taWtcIlxuICAgIFwic2l0ZVwiOiBcInRlc3RcIlxuICAgIFwidG9rZW5cIjogXCJQYWQ6OTk0OFwiXG4gIGNsaWVudCA9IG5ldyBNaWNrckNsaWVudChzZXR0aW5nKVxuXG4gIGNsaWVudC5vbiBcImNhblJlY2VpdmVFZGl0b3JUZXh0XCIsICgpPT5cbiAgICBjbGllbnQuc2VuZCBcInNlbmRFZGl0b3JUZXh0XCIsIHtcbiAgICAgIFwidG9cIjogXCJwcmVzZW5JbmRleFwiXG4gICAgICBcImJvZHlcIjpcbiAgICAgICAgXCJjb250ZW50XCI6IGVkaXRvclN0YXRlcy5jb2RlTWlycm9yLmdldFZhbHVlKClcbiAgICB9XG4gIGNsaWVudC5vbiBcImNhblJlY2VpdmVDb21tZW50XCIsICgpPT5cbiAgIGNsaWVudC5zZW5kIFwic2VuZENvbW1lbnRcIiwge1xuICAgICBcInRvXCI6IFwicHJlc2VuRGV2SW5kZXhcIixcbiAgICAgXCJib2R5XCI6XG4gICAgICAgXCJjb250ZW50XCI6IGVkaXRvclN0YXRlcy5waWNrVXBDb21tZW50KClcbiAgIH1cblxuICB3ZWJ2aWV3ID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI3ByZXZpZXcnKVxuICAjIHNpbXBsZSBwcmVzZW50YXRpb24gbW9kZSBvbiFcbiAgIyAkKCcjcHJlc2VudGF0aW9uJykub24gJ2NsaWNrJywgKCkgPT5cbiAgIyAgIHdlYnZpZXcud2Via2l0UmVxdWVzdEZ1bGxTY3JlZW4oKVxuXG4gICMgJCgnI3ByZXNlbnRhdGlvbicpLm9uICdjbGljaycsICgpID0+XG4gICMgICAkKCcucGFuZS5tYXJrZG93bicpLnRvZ2dsZSgpXG4gICMgICBpcGMuc2VuZCgnUHJlc2VudGF0aW9uJylcblxuICAjIGlwYy5vbiAnaW5pdGlhbGl6ZScgKCkgPT5cblxuXG4gICMgaXBjLm9uIFwicHJlc2VudGF0aW9uXCIsICgpIC0+XG4gICMgICBjb25zb2xlLmxvZyBcInJlY2lldmUgcHJlc2VudGF0aW9uXCJcbiAgIyAgIGlwYy5zZW5kIFwidGV4dFNlbmRcIiwgZWRpdG9yU3RhdGVzLmNvZGVNaXJyb3IuZ2V0VmFsdWUoKVxuICAjICAgY29uc29sZS5sb2cgJ3NlbmQgdGV4dFNlbmQnXG5cbiAgJCgnI3ByZXNlbnRhdGlvbicpLm9uICdjbGljaycsICgpID0+XG4gICAgd2Vidmlldy5zZW5kICdyZXF1ZXN0U2xpZGVJbmZvJ1xuICAgIGNvbnNvbGUubG9nICdzZW5kIHJlcXVlc3RTbGlkZUluZm8nXG5cblxuICB3ZWJ2aWV3LmFkZEV2ZW50TGlzdGVuZXIgJ2lwYy1tZXNzYWdlJywgKGV2ZW50KSA9PlxuICAgICBzd2l0Y2ggZXZlbnQuY2hhbm5lbFxuICAgICAgIHdoZW4gXCJzZW5kU2xpZGVJbmZvXCIgICAjIHdlYnZpZXcg44GL44KJ44K544Op44Kk44OJ5oOF5aCx44KS5Y+X5L+hXG4gICAgICAgIHNsaWRlSW5mbyA9IGV2ZW50LmFyZ3NbMF1cbiAgICAgICAgY29uc29sZS5sb2cgJ3JlY2VpdmUgc2VuZFNsaWRlSW5mbydcbiAgICAgICAgY29uc29sZS5sb2cgc2xpZGVJbmZvXG4gICAgICAgIGlwYy5zZW5kICd0ZXh0U2VuZCcsIHNsaWRlSW5mb1xuICAgICAgICBjb25zb2xlLmxvZyAnc2VuZCB0ZXh0U2VuZCdcbiAgICAgICAgYnJlYWtcblxuICAgICAgIHdoZW4gXCJyZXF1ZXN0U2xpZGVIVE1MXCJcbiAgICAgICAgd2Vidmlldy5zZW5kICdzZXRTbGlkZScsIHNsaWRlSFRNTFxuICAgICAgICBjb25zb2xlLmxvZyAnc2VuZCBzZXRTbGlkZSdcbiAgICAgICAgYnJlYWtcblxuICBpcGMub24gJ3ByZXNlbkRldkluaXRpYWxpemUnLCAoZSwgdGV4dCkgPT5cbiAgICAgIGNvbnNvbGUubG9nICdyZWNlaXZlIHByZXNlbkRldkluaXRpYWxpemUnXG4gICAgICBjb25zb2xlLmxvZyB0ZXh0XG4gICAgICBzbGlkZUhUTUwgPSB0ZXh0XG5cbiAgaXBjLm9uICdnb1RvUGFnZScsIChlLCBwYWdlKSA9PlxuICAgIGNvbnNvbGUubG9nIHBhZ2VcbiAgICB3ZWJ2aWV3LnNlbmQgJ2dvVG9QYWdlJywgcGFnZVxuXG4gICAgICAjIHdlYnZpZXcg44Gu5rqW5YKZ44GM44Gn44GN44Gm44Gq44GEXG4gICAgICAjIHdlYnZpZXcuc2VuZCAnc2V0U2xpZGUnLCB0ZXh0XG4gICAgICAjIGNvbnNvbGUubG9nICdzZW5kIHNldFNsaWRlJ1xuICAjIGlwYy5vbiAnaW5pdGlhbGl6ZScsICgpID0+XG4gICMgICAkKCcucGFuZS5tYXJrZG93bicpLmh0bWwoKVxuIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG5cblxuICAjIEluaXRpYWxpemVcbiAgZWRpdG9yU3RhdGVzLmNvZGVNaXJyb3IuZm9jdXMoKVxuICBlZGl0b3JTdGF0ZXMucmVmcmVzaFBhZ2UoKVxuIl19
