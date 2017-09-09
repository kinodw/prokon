var CodeMirror, EditorStates, MdsMenu, MdsRenderer, MickrClient, PDF2Images, PPTX, clsMdsRenderer, createValidator, execSync, fs, ipc, kanjiContinuousLen, loadingState, maxComma, maxTen, mixedPeriod, noAbusage, noDoubleNegativeJa, noDoubledConjunction, noDoubledConjunctiveParticleGa, noDoubledJoshi, noDroppingTheRa, noExclamationQuestionMark, noHankakuKana, noMixDearuDesumasu, noNfd, noStartDuplicatedConjunction, readFile, ref, shell, successiveWord, validator, weakPhrase, webFrame,
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

readFile = require('./js/classes/mds_file').readFile;

PDF2Images = require('pdf2images-multiple');

execSync = require('child_process').execSync;

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
    this.loadFromPDF = bind(this.loadFromPDF, this);
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
    return $('#page-indicator').text(" " + this.currentPage + " / " + (this.rulers.length + 1));
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

  EditorStates.prototype.loadFromPDF = function(filePath) {
    var pdf2images;
    pdf2images = PDF2Images(filePath, {
      output_dir: './media/'
    });
    return pdf2images.pdf.convert((function(_this) {
      return function(err, image_path) {
        if (err) {
          return console.log(err);
        }
      };
    })(this), (function(_this) {
      return function(err, image_paths) {
        var index, j, len, results, value;
        image_paths.sort(function(a, b) {
          var fileNumber_a, fileNumber_b;
          fileNumber_a = a.match(".*-([0-9]+)")[1];
          fileNumber_b = b.match(".*-([0-9]+)")[1];
          return fileNumber_a - fileNumber_b;
        });
        console.log(image_paths);
        results = [];
        for (index = j = 0, len = image_paths.length; j < len; index = ++j) {
          value = image_paths[index];
          results.push(_this.codeMirror.replaceSelection("![](" + (value.replace(/ /g, '%20')) + ")\n\n---\n"));
        }
        return results;
      };
    })(this));
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
            console.log(slide);
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
    if (psp(slide)[0]['p:txBody'] != null) {
      target = ar(slide);
      for (i = j = 0, ref1 = target.length; 0 <= ref1 ? j < ref1 : j > ref1; i = 0 <= ref1 ? ++j : --j) {
        if (target[i]['a:t'][0] === '') {
          title.push('\n');
        } else {
          title.push(target[i]['a:t']);
        }
      }
      console.log("title = " + title);
      return title.join('');
    } else {
      return '';
    }
  };

  pickUpBodyFromPPTX = function(slide) {
    var ar, body, i, j, k, l, pushed, ref1, ref2, target, tmp;
    body = [];
    if (psp(slide)[1] != null) {
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
        console.log("body = " + pushed);
      }
      return body.join('');
    } else {
      return '';
    }
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

  psp = function(slide) {
    return pspTree(slide)[0]['p:sp'];
  };

  pspTree = function(slide) {
    return pcSld(slide)[0]['p:spTree'];
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
      console.log(f.type);
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
      } else if (f.type === 'application/pdf') {
        editorStates.loadFromPDF(f.path);
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
  ipc.on('sendUsedSlidePath', (function(_this) {
    return function(e, txt) {
      var webviewUsedSlide;
      console.log("usedSlidePath = " + txt);
      webviewUsedSlide = document.querySelector('#preview1');
      return webviewUsedSlide.send('sendUsedSlidePath', txt);
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VzIjpbImluZGV4LmNvZmZlZSJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxJQUFBLGtlQUFBO0VBQUE7OztBQUFBLEdBQUEsR0FBTSxPQUFBLENBQVEsVUFBUixDQUFtQixDQUFDOztBQUMxQixNQUFvQixPQUFBLENBQVEsVUFBUixDQUFwQixFQUFDLGlCQUFELEVBQVE7O0FBQ1IsT0FBQSxHQUFvQixPQUFBLENBQVEsdUJBQVI7O0FBQ3BCLGNBQUEsR0FBb0IsT0FBQSxDQUFRLDJCQUFSOztBQUNwQixlQUFBLEdBQW9CLE9BQUEsQ0FBUSxxQkFBUjs7QUFDcEIsV0FBQSxHQUFvQixJQUFJOztBQUN4QixFQUFBLEdBQW9CLE9BQUEsQ0FBUSxJQUFSOztBQUNwQixJQUFBLEdBQW9CLE9BQUEsQ0FBUSxvQkFBUjs7QUFDbkIsV0FBbUIsT0FBQSxDQUFRLHVCQUFSOztBQUNwQixVQUFBLEdBQXFCLE9BQUEsQ0FBUyxxQkFBVDs7QUFDckIsUUFBQSxHQUFXLE9BQUEsQ0FBUSxlQUFSLENBQXdCLENBQUM7O0FBSXBDLFdBQVcsQ0FBQyxhQUFaLENBQUE7O0FBRUEsUUFBUSxDQUFDLGtCQUFULENBQTRCLENBQTVCLEVBQStCLENBQS9COztBQUVBLFVBQUEsR0FBYSxPQUFBLENBQVEsWUFBUjs7QUFDYixPQUFBLENBQVEseUJBQVI7O0FBQ0EsT0FBQSxDQUFRLG1DQUFSOztBQUNBLE9BQUEsQ0FBUSx5QkFBUjs7QUFDQSxPQUFBLENBQVEsb0NBQVI7O0FBQ0EsT0FBQSxDQUFRLDRCQUFSOztBQUNBLFdBQUEsR0FBYyxPQUFBLENBQVEsdUJBQVI7O0FBS1I7QUFDSixNQUFBOzt5QkFBQSxNQUFBLEdBQVE7O3lCQUNSLFdBQUEsR0FBYTs7eUJBQ2Isa0JBQUEsR0FBb0I7O3lCQUNwQixZQUFBLEdBQWM7O3lCQUVkLGtCQUFBLEdBQW9COzt5QkFDcEIsZUFBQSxHQUFpQjs7RUFFSixzQkFBQyxVQUFELEVBQWMsT0FBZDtJQUFDLElBQUMs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Q0FBQSxJQUFBLENBQXhDO0VBZUEsR0FBRyxDQUFDLEVBQUosQ0FBTyxxQkFBUCxFQUE4QixDQUFBLFNBQUEsS0FBQTtXQUFBLFNBQUMsQ0FBRCxFQUFJLElBQUo7TUFDMUIsT0FBTyxDQUFDLEdBQVIsQ0FBWSw2QkFBWjtNQUNBLE9BQU8sQ0FBQyxHQUFSLENBQVksSUFBWjthQUNBLFNBQUEsR0FBWTtJQUhjO0VBQUEsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQUE5QjtFQUtBLEdBQUcsQ0FBQyxFQUFKLENBQU8sVUFBUCxFQUFtQixDQUFBLFNBQUEsS0FBQTtXQUFBLFNBQUMsQ0FBRCxFQUFJLElBQUo7TUFDakIsT0FBTyxDQUFDLEdBQVIsQ0FBWSxJQUFaO2FBQ0EsT0FBTyxDQUFDLElBQVIsQ0FBYSxVQUFiLEVBQXlCLElBQXpCO0lBRmlCO0VBQUEsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQUFuQjtFQWFBLFlBQVksQ0FBQyxVQUFVLENBQUMsS0FBeEIsQ0FBQTtTQUNBLFlBQVksQ0FBQyxXQUFiLENBQUE7QUFwUUMsQ0FBQSxDQUFILENBQUEiLCJzb3VyY2VzQ29udGVudCI6WyJpcGMgPSByZXF1aXJlKCdlbGVjdHJvbicpLmlwY1JlbmRlcmVyXG57c2hlbGwsIHdlYkZyYW1lfSA9IHJlcXVpcmUgJ2VsZWN0cm9uJ1xuTWRzTWVudSAgICAgICAgICAgPSByZXF1aXJlICcuL2pzL2NsYXNzZXMvbWRzX21lbnUnXG5jbHNNZHNSZW5kZXJlciAgICA9IHJlcXVpcmUgJy4vanMvY2xhc3Nlcy9tZHNfcmVuZGVyZXInXG5jcmVhdGVWYWxpZGF0b3IgICA9IHJlcXVpcmUgJ2NvZGVtaXJyb3ItdGV4dGxpbnQnXG5NZHNSZW5kZXJlciAgICAgICA9IG5ldyBjbHNNZHNSZW5kZXJlclxuZnMgICAgICAgICAgICAgICAgPSByZXF1aXJlICdmcydcblBQVFggICAgICAgICAgICAgID0gcmVxdWlyZSAnLi9qcy1wcHR4L2xpYi9wcHR4J1xue3JlYWRGaWxlfSAgICAgICAgPSByZXF1aXJlICcuL2pzL2NsYXNzZXMvbWRzX2ZpbGUnXG5QREYySW1hZ2VzICAgICAgICAgPSByZXF1aXJlICAncGRmMmltYWdlcy1tdWx0aXBsZSdcbmV4ZWNTeW5jID0gcmVxdWlyZSgnY2hpbGRfcHJvY2VzcycpLmV4ZWNTeW5jO1xuXG5cblxuTWRzUmVuZGVyZXIucmVxdWVzdEFjY2VwdCgpXG5cbndlYkZyYW1lLnNldFpvb21MZXZlbExpbWl0cygxLCAxKVxuXG5Db2RlTWlycm9yID0gcmVxdWlyZSAnY29kZW1pcnJvcidcbnJlcXVpcmUgJ2NvZGVtaXJyb3IvbW9kZS94bWwveG1sJ1xucmVxdWlyZSAnY29kZW1pcnJvci9tb2RlL21hcmtkb3duL21hcmtkb3duJ1xucmVxdWlyZSAnY29kZW1pcnJvci9tb2RlL2dmbS9nZm0nXG5yZXF1aXJlICdjb2RlbWlycm9yL2FkZG9uL2VkaXQvY29udGludWVsaXN0J1xucmVxdWlyZSBcImNvZGVtaXJyb3IvYWRkb24vbGludC9saW50XCJcbk1pY2tyQ2xpZW50ID0gcmVxdWlyZSAnLi9tb2R1bGVzL01pY2tyQ2xpZW50J1xuXG5cblxuXG5jbGFzcyBFZGl0b3JTdGF0ZXNcbiAgcnVsZXJzOiBbXVxuICBjdXJyZW50UGFnZTogbnVsbFxuICBwcmV2aWV3SW5pdGlhbGl6ZWQ6IGZhbHNlXG4gIGxhc3RSZW5kZXJlZDoge31cblxuICBfbG9ja0NoYW5nZWRTdGF0dXM6IGZhbHNlXG4gIF9pbWFnZURpcmVjdG9yeTogbnVsbFxuXG4gIGNvbnN0cnVjdG9yOiAoQGNvZGVNaXJyb3IsIEBwcmV2aWV3KSAtPlxuICAgIEBpbml0aWFsaXplRWRpdG9yKClcbiAgICBAaW5pdGlhbGl6ZVByZXZpZXcoKVxuXG4gICAgQG1lbnUgPSBuZXcgTWRzTWVudSBbXG4gICAgICB7IGxhYmVsOiAnJlVuZG8nLCBhY2NlbGVyYXRvcjogJ0NtZE9yQ3RybCtaJywgY2xpY2s6IChpLCB3KSA9PiBAY29kZU1pcnJvci5leGVjQ29tbWFuZCAndW5kbycgaWYgdyBhbmQgIXcubWRzV2luZG93LmZyZWV6ZSB9XG4gICAgICB7XG4gICAgICAgIGxhYmVsOiAnJlJlZG8nXG4gICAgICAgIGFjY2VsZXJhdG9yOiBkbyAtPiBpZiBwcm9jZXNzLnBsYXRmb3JtIGlzICd3aW4zMicgdGhlbiAnQ29udHJvbCtZJyBlbHNlICdTaGlmdCtDbWRPckN0cmwrWidcbiAgICAgICAgY2xpY2s6IChpLCB3KSA9PiBAY29kZU1pcnJvci5leGVjQ29tbWFuZCAncmVkbycgaWYgdyBhbmQgIXcubWRzV2luZG93LmZyZWV6ZVxuICAgICAgfVxuICAgICAgeyB0eXBlOiAnc2VwYXJhdG9yJyB9XG4gICAgICB7IGxhYmVsOiAnQ3UmdCcsIGFjY2VsZXJhdG9yOiAnQ21kT3JDdHJsK1gnLCByb2xlOiAnY3V0JyB9XG4gICAgICB7IGxhYmVsOiAnJkNvcHknLCBhY2NlbGVyYXRvcjogJ0NtZE9yQ3RybCtDJywgcm9sZTogJ2NvcHknIH1cbiAgICAgIHsgbGFiZWw6ICcmUGFzdGUnLCBhY2NlbGVyYXRvcjogJ0NtZE9yQ3RybCtWJywgcm9sZTogJ3Bhc3RlJyB9XG4gICAgICB7IGxhYmVsOiAnJkRlbGV0ZScsIHJvbGU6ICdkZWxldGUnIH1cbiAgICAgIHsgbGFiZWw6ICdTZWxlY3QgJkFsbCcsIGFjY2VsZXJhdG9yOiAnQ21kT3JDdHJsK0EnLCBjbGljazogKGksIHcpID0+IEBjb2RlTWlycm9yLmV4ZWNDb21tYW5kICdzZWxlY3RBbGwnIGlmIHcgYW5kICF3Lm1kc1dpbmRvdy5mcmVlemUgfVxuICAgICAgeyB0eXBlOiAnc2VwYXJhdG9yJywgcGxhdGZvcm06ICdkYXJ3aW4nIH1cbiAgICAgIHsgbGFiZWw6ICdTZXJ2aWNlcycsIHJvbGU6ICdzZXJ2aWNlcycsIHN1Ym1lbnU6IFtdLCBwbGF0Zm9ybTogJ2RhcndpbicgfVxuICAgIF1cblxuICAjIOODmuODvOOCuOOCq+OCpuODs+ODiOW+jOOAgXdlYnZpZXfjgbjjgZ3jgozjgpLpgIHkv6FcbiAgcmVmcmVzaFBhZ2U6IChydWxlcnMpID0+XG4gICAgIyBFZGl0b3JTdGF0ZXPjgq/jg6njgrnjga7lpInmlbBydWxlcnPjg6rjgrnjg4jjgbjlhaXjgozjgabjgIHkuIDml6bjg5rjg7zjgrjjgpLvvJHjgavjgZnjgotcbiAgICBAcnVsZXJzID0gcnVsZXJzIGlmIHJ1bGVycz9cbiAgICBwYWdlICAgID0gMVxuICAgIyBjb25zb2xlLmxvZyBcImNvbW1lbnQgMXBhZ2UgPSBcIiArIEBwaWNrVXBDb21tZW50RnJvbVBhZ2UoMSlcbiAgICBjb25zb2xlLmxvZyBcInJ1bGVycy5sZW5ndGggPSBcIiArIEBydWxlcnMubGVuZ3RoXG4gICAgY29uc29sZS5sb2cgQHBpY2tVcENvbW1lbnQoKVxuICAgICMgY29uc29sZS5sb2cgXCJsYXN0IHBhZ2UgPSBcIiArIEBwaWNrVXBDb21tZW50RnJvbVBhZ2UoQHJ1bGVycy5sZW5ndGgrMSlcbiAgICAjY29uc29sZS5sb2cgQHBpY2tVcENvbW1lbnQoKVxuXG4gICAgIyBydWxlckxpbmXjgavjga8nLS0tJ+OBruihjOS9jee9ruOBjOiomOOBleOCjOOBpuOBiuOCiuOAgeOBneOCjOOBqOOCqOODh+OCo+OCv+S4iuOBruOCq+ODvOOCveODq+S9jee9ruOCkuavlOi8g+OBl+OBpnBhZ2XjgpLmsbrjgoHjgotcbiAgICBsaW5lTnVtYmVyID0gQGNvZGVNaXJyb3IuZ2V0Q3Vyc29yKCkubGluZSB8fCAwXG4gICAgZm9yIHJ1bGVyTGluZSBpbiBAcnVsZXJzXG4gICAgICBwYWdlKysgaWYgcnVsZXJMaW5lIDw9IGxpbmVOdW1iZXJcblxuICAgICMgcnVsZXLoqIjnrpflvozjgavjg5rjg7zjgrjjga7lopfmuJvjgYzjgYLjgaPjgZ/loLTlkIjjgIHmraPjgZfjgYTjg5rjg7zjgrjmg4XloLHjgpJ3ZWJ2aWV344G46YCB5L+hXG4gICAgaWYgQGN1cnJlbnRQYWdlICE9IHBhZ2VcbiAgICAgIEBjdXJyZW50UGFnZSA9IHBhZ2VcbiAgICAgIEBwcmV2aWV3LnNlbmQgJ2N1cnJlbnRQYWdlJywgQGN1cnJlbnRQYWdlIGlmIEBwcmV2aWV3SW5pdGlhbGl6ZWRcblxuICAgICQoJyNwYWdlLWluZGljYXRvcicpLnRleHQgXCIgI3tAY3VycmVudFBhZ2V9IC8gI3tAcnVsZXJzLmxlbmd0aCArIDF9XCJcblxuICBpbml0aWFsaXplUHJldmlldzogPT5cbiAgICAkKEBwcmV2aWV3KVxuICAgICAgLm9uICdkb20tcmVhZHknLCA9PlxuICAgICAgICAjIEZpeCBtaW5pbWl6ZWQgcHJldmlldyAoIzIwKVxuICAgICAgICAjIFtOb3RlXSBodHRwczovL2dpdGh1Yi5jb20vZWxlY3Ryb24vZWxlY3Ryb24vaXNzdWVzLzQ4ODJcbiAgICAgICAgJChAcHJldmlldy5zaGFkb3dSb290KS5hcHBlbmQoJzxzdHlsZT5vYmplY3R7bWluLXdpZHRoOjA7bWluLWhlaWdodDowO308L3N0eWxlPicpXG5cbiAgICAgICMgd2VidmlldyDjgYvjgonjga7pgJrkv6HjgpLlj5fjgZHlj5bjgosgJ2lwYy1tZXNzYWdlJ1xuICAgICAgLm9uICdpcGMtbWVzc2FnZScsIChldikgPT5cbiAgICAgICAgZSA9IGV2Lm9yaWdpbmFsRXZlbnRcblxuICAgICAgICBzd2l0Y2ggZS5jaGFubmVsXG4gICAgICAgICAgd2hlbiAncnVsZXJDaGFuZ2VkJ1xuICAgICAgICAgICAgQHJlZnJlc2hQYWdlIGUuYXJnc1swXVxuICAgICAgICAgIHdoZW4gJ2xpbmtUbydcbiAgICAgICAgICAgIEBvcGVuTGluayBlLmFyZ3NbMF1cbiAgICAgICAgICB3aGVuICdyZW5kZXJlZCdcbiAgICAgICAgICAgIEBsYXN0UmVuZGVyZWQgPSBlLmFyZ3NbMF1cbiAgICAgICAgICAgIHVubGVzcyBAcHJldmlld0luaXRpYWxpemVkXG4gICAgICAgICAgICAgIE1kc1JlbmRlcmVyLnNlbmRUb01haW4gJ3ByZXZpZXdJbml0aWFsaXplZCdcblxuICAgICAgICAgICAgICBAcHJldmlld0luaXRpYWxpemVkID0gdHJ1ZVxuICAgICAgICAgICAgICAkKCdib2R5JykuYWRkQ2xhc3MgJ2luaXRpYWxpemVkLXNsaWRlJ1xuICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgIE1kc1JlbmRlcmVyLl9jYWxsX2V2ZW50IGUuY2hhbm5lbCwgZS5hcmdzLi4uXG4gICAgICAjIHVybOOCkuOCr+ODquODg+OCr+OBl+OBpuaWsOOBl+OBhOOCpuOCpOODs+ODieOCpuOBjOmWi+OBi+OCjOOCi+aZglxuICAgICAgLm9uICduZXctd2luZG93JywgKGUpID0+XG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKVxuICAgICAgICBAb3BlbkxpbmsgZS5vcmlnaW5hbEV2ZW50LnVybFxuXG4gICAgICAub24gJ2RpZC1maW5pc2gtbG9hZCcsIChlKSA9PlxuICAgICAgICBAcHJldmlldy5zZW5kICdjdXJyZW50UGFnZScsIDFcbiAgICAgICAgQHByZXZpZXcuc2VuZCAnc2V0SW1hZ2VEaXJlY3RvcnknLCBAX2ltYWdlRGlyZWN0b3J5XG4gICAgICAgIEBwcmV2aWV3LnNlbmQgJ3JlbmRlcicsIEBjb2RlTWlycm9yLmdldFZhbHVlKCkgICMgcmVuZGVyIOOCpOODmeODs+ODiOmAgeS/oeOBp3J1bGVy56K66KqN44GX44Gm44Oa44O844K45YiH44KK5pu/44KP44KKXG5cbiAgb3Blbkxpbms6IChsaW5rKSA9PlxuICAgIHNoZWxsLm9wZW5FeHRlcm5hbCBsaW5rIGlmIC9eaHR0cHM/OlxcL1xcLy4rLy50ZXN0KGxpbmspXG5cbiAgaW5pdGlhbGl6ZUVkaXRvcjogPT5cbiAgICBAY29kZU1pcnJvci5vbiAnY29udGV4dG1lbnUnLCAoY20sIGUpID0+XG4gICAgICBlLnByZXZlbnREZWZhdWx0KClcbiAgICAgIEBjb2RlTWlycm9yLmZvY3VzKClcbiAgICAgIEBtZW51LnBvcHVwKClcbiAgICAgIGZhbHNlXG5cbiAgICBAY29kZU1pcnJvci5vbiAnY2hhbmdlJywgKGNtLCBjaGcpID0+XG4gICAgICBAcHJldmlldy5zZW5kICdyZW5kZXInLCBjbS5nZXRWYWx1ZSgpXG4gICAgICBNZHNSZW5kZXJlci5zZW5kVG9NYWluICdzZXRDaGFuZ2VkU3RhdHVzJywgdHJ1ZSBpZiAhQF9sb2NrQ2hhbmdlZFN0YXR1c1xuXG4gICAgQGNvZGVNaXJyb3Iub24gJ2N1cnNvckFjdGl2aXR5JywgKGNtKSA9PiB3aW5kb3cuc2V0VGltZW91dCAoPT4gQHJlZnJlc2hQYWdlKCkpLCA1XG5cbiAgc2V0SW1hZ2VEaXJlY3Rvcnk6IChkaXJlY3RvcnkpID0+XG4gICAgaWYgQHByZXZpZXdJbml0aWFsaXplZFxuICAgICAgQHByZXZpZXcuc2VuZCAnc2V0SW1hZ2VEaXJlY3RvcnknLCBkaXJlY3RvcnlcbiAgICAgIEBwcmV2aWV3LnNlbmQgJ3JlbmRlcicsIEBjb2RlTWlycm9yLmdldFZhbHVlKClcbiAgICBlbHNlXG4gICAgICBAX2ltYWdlRGlyZWN0b3J5ID0gZGlyZWN0b3J5XG5cbiAgaW5zZXJ0SW1hZ2U6IChmaWxlUGF0aCkgPT4gQGNvZGVNaXJyb3IucmVwbGFjZVNlbGVjdGlvbihcIiFbXSgje2ZpbGVQYXRoLnJlcGxhY2UoLyAvZywgJyUyMCcpfSlcXG5cIilcblxuICAjKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipUT0RPKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuICBpbnNlcnRWaWRlbzogKGZpbGVQYXRoKSA9PlxuICAgIGNvbnNvbGUubG9nIGZpbGVQYXRoXG5cbiAgbG9hZEZyb21QREY6IChmaWxlUGF0aCkgPT5cbiAgICBwZGYyaW1hZ2VzID0gUERGMkltYWdlcyBmaWxlUGF0aCxcbiAgICAgIG91dHB1dF9kaXI6ICcuL21lZGlhLydcblxuICAgIHBkZjJpbWFnZXMucGRmLmNvbnZlcnQgKGVyciwgaW1hZ2VfcGF0aCkgPT5cbiAgICAgIGlmKGVycilcbiAgICAgICAgY29uc29sZS5sb2cgZXJyXG4gICAgICMgY29uc29sZS5sb2cgaW1hZ2VfcGF0aFxuICAgICwoZXJyLCBpbWFnZV9wYXRocykgPT5cbiAgICAgIGltYWdlX3BhdGhzLnNvcnQgKGEsIGIpIC0+XG4gICAgICAgIGZpbGVOdW1iZXJfYSA9IGEubWF0Y2goXCIuKi0oWzAtOV0rKVwiKVsxXVxuICAgICAgICBmaWxlTnVtYmVyX2IgPSBiLm1hdGNoKFwiLiotKFswLTldKylcIilbMV1cbiAgICAgICAgcmV0dXJuIGZpbGVOdW1iZXJfYSAtIGZpbGVOdW1iZXJfYlxuICAgICAjIGltYWdlX3BhdGhzLnJldmVyc2VcbiAgICAgIGNvbnNvbGUubG9nIGltYWdlX3BhdGhzXG4gICAgICBmb3IgdmFsdWUsIGluZGV4IGluIGltYWdlX3BhdGhzXG4gICAgICAgIEBjb2RlTWlycm9yLnJlcGxhY2VTZWxlY3Rpb24oXCIhW10oI3t2YWx1ZS5yZXBsYWNlKC8gL2csICclMjAnKX0pXFxuXFxuLS0tXFxuXCIpXG4gICAgIyBmaWxlTmFtZTog5ouh5by15a2Q44KS5ZCr44G+44Gq44GE44OV44Kh44Kk44Or5ZCNXG4gICAgIyA9IGZpbGVQYXRoLm1hdGNoKFwiLisvKC4rPylcXC5bYS16XSsoW1xcPyM7XS4qKT8kXCIpWzFdXG4gICAgI3JlYWRGaWxlKFwiI3tmaWxlTmFtZX0uaHRtbFwiKVxuXG4gICMgLnBwdHgg44OV44Kh44Kk44Or44KS44OJ44Op44OD44Kw77yG44OJ44Ot44OD44OX44Gn44Ot44O844OJXG4gIGxvYWRGcm9tUFBUWDogKGZpbGVQYXRoKSA9PlxuICAgIElORklMRSA9IGZpbGVQYXRoO1xuICAgIGZzLnJlYWRGaWxlIElORklMRSwgKGVyciwgZGF0YSkgPT5cbiAgICAgIGlmIChlcnIpXG4gICAgICAgIHRocm93IGVyclxuICAgICAgcHB0eCA9IG5ldyBQUFRYLlByZXNlbnRhdGlvbigpXG4gICAgICBwcHR4LmxvYWQgZGF0YSwgKGVycikgPT5cbiAgICAgICAgYm9keSA9IFtdXG5cbiAgICAgICAgZm9yIGkgaW4gWzEuLi5wcHR4LmdldFNsaWRlQ291bnQoKV1cbiAgICAgICAgICBzbGlkZSA9IHBwdHguZ2V0U2xpZGUoXCJzbGlkZSN7aX1cIilcbiAgICAgICAgICBjb25zb2xlLmxvZyAnc2xpZGUnICsgaVxuICAgICAgICAgIGNvbnNvbGUubG9nKHNsaWRlKVxuICAgICAgICAgIHRpdGxlID0gcGlja1VwVGl0bGVGcm9tUFBUWChzbGlkZSlcbiAgICAgICAgICB0aXRsZSA9IHRpdGxlLnJlcGxhY2UgL1xcbi9nLCAnXFxuIyAnXG4gICAgICAgICAgYm9keS5wdXNoKCcjICcgKyB0aXRsZSArICdcXG4nICsgcGlja1VwQm9keUZyb21QUFRYKHNsaWRlKSlcblxuICAgICAgICAjICNjb25zb2xlLmxvZyBib2R5XG4gICAgICAgIEBjb2RlTWlycm9yLnNldFZhbHVlKGJvZHkuam9pbihcIlxcblxcbi0tLVxcblxcblwiKSlcbiAgICAgICAgIyAjY29uc29sZS5sb2cgSlNPTi5zdHJpbmdpZnkoYm9keSwgbnVsbCwgJyAnKVxuXG4gIHBpY2tVcFRpdGxlRnJvbVBQVFggPSAoc2xpZGUpID0+XG4gICAgdGl0bGUgPSBbXTtcbiAgICBpZiBwc3Aoc2xpZGUpWzBdWydwOnR4Qm9keSddP1xuICAgICAgdGFyZ2V0ID0gYXIoc2xpZGUpO1xuICAgICAgZm9yIGkgaW4gWzAuLi50YXJnZXQubGVuZ3RoXVxuICAgICAgICAjY29uc29sZS5sb2cgXCJ0aXRsZSA6IFwiICsgdGFyZ2V0W2ldWydhOnQnXVxuICAgICAgICBpZih0YXJnZXRbaV1bJ2E6dCddWzBdID09ICcnKVxuICAgICAgICAgIHRpdGxlLnB1c2goJ1xcbicpXG4gICAgICAgIGVsc2VcbiAgICAgICAgICB0aXRsZS5wdXNoKHRhcmdldFtpXVsnYTp0J10pXG4gICAgICBjb25zb2xlLmxvZyBcInRpdGxlID0gXCIgKyB0aXRsZVxuICAgICAgcmV0dXJuIHRpdGxlLmpvaW4oJycpXG4gICAgZWxzZVxuICAgICAgcmV0dXJuICcnXG5cbiAgcGlja1VwQm9keUZyb21QUFRYID0gKHNsaWRlKSA9PlxuICAgIGJvZHkgPSBbXTtcbiAgICBpZiBwc3Aoc2xpZGUpWzFdPyAjIGJvZHnjgYznhKHjgYTloLTlkIjjgavjgqjjg6njg7zjgYznmbrnlJ/jgZnjgovjga7jgafjgIHjgZ3jga7lm57pgb9cbiAgICAgIHRhcmdldCA9IHBzcChzbGlkZSlbMV1bJ3A6dHhCb2R5J11bMF1bJ2E6cCddO1xuICAgICAgZm9yIGkgaW4gWzAuLi50YXJnZXQubGVuZ3RoXVxuICAgICAgICBwdXNoZWQgPSBcIlwiO1xuICAgICAgICBpZih0YXJnZXRbaV1bJ2E6ciddID09IG51bGwpXG4gICAgICAgICAgcHVzaGVkID0gXCJcIjtcbiAgICAgICAgICBib2R5LnB1c2gocHVzaGVkKVxuICAgICAgICAgIGNvbnRpbnVlXG4gICAgICAgIGVsc2UgaWYgdGFyZ2V0W2ldWydhOnBQciddIGFuZCB0YXJnZXRbaV1bJ2E6ciddXG4gICAgICAgICAgcHVzaGVkID0gXCJcXG4tIFwiO1xuICAgICAgICBpZih0YXJnZXRbaV1bJ2E6ciddKVxuICAgICAgICAgIHRtcCA9IFtdO1xuICAgICAgICAgIGFyID0gdGFyZ2V0W2ldWydhOnInXTtcblxuICAgICAgICAgIGZvciBrIGluIFswLi4uYXIubGVuZ3RoXVxuICAgICAgICAgICAgdG1wLnB1c2goYXJba11bJ2E6dCddKTtcbiAgICAgICAgICBwdXNoZWQgPSBwdXNoZWQgKyB0bXAuam9pbignJyk7XG4gICAgICAgIGlmKHRhcmdldFtpXVsnYTplbmRQYXJhUlByJ10pXG4gICAgICAgICAgcHVzaGVkID0gcHVzaGVkICsgJ1xcbic7XG4gICAgICAgIGJvZHkucHVzaChwdXNoZWQpXG4gICAgICAgIGNvbnNvbGUubG9nIFwiYm9keSA9IFwiICsgcHVzaGVkXG4gICAgICByZXR1cm4gYm9keS5qb2luKCcnKVxuICAgIGVsc2VcbiAgICAgIHJldHVybiAnJ1xuXG5cbiAgYXIgPSAoc2xpZGUpID0+XG4gICAgcmV0dXJuIGFwKHNsaWRlKVswXVsnYTpyJ107XG5cbiAgYXAgPSAoc2xpZGUpID0+XG4gICAgcmV0dXJuIHB0eEJvZHkoc2xpZGUpWzBdWydhOnAnXTtcblxuICBwdHhCb2R5ID0gKHNsaWRlKSA9PlxuICAgIHJldHVybiBwc3Aoc2xpZGUpWzBdWydwOnR4Qm9keSddO1xuXG4gIHBzcCA9IChzbGlkZSkgPT5cbiAgICByZXR1cm4gcHNwVHJlZShzbGlkZSlbMF1bJ3A6c3AnXTtcblxuICBwc3BUcmVlID0gKHNsaWRlKSA9PlxuICAgIHJldHVybiBwY1NsZChzbGlkZSlbMF1bJ3A6c3BUcmVlJ107XG5cbiAgcGNTbGQgPSAoc2xpZGUpID0+XG4gICAgcmV0dXJuIHBzbGQoc2xpZGUpWydwOmNTbGQnXTtcblxuICBwc2xkID0gKHNsaWRlKSA9PlxuICAgIHJldHVybiBzbGlkZS5jb250ZW50WydwOnNsZCddO1xuXG4gICMqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG5cbiAgIyBwYWdl5q+O44Gr5Yil44KM44Gf44Kz44Oh44Oz44OI44Gu44Oq44K544OI44KS6L+U44GZXG4gIHBpY2tVcENvbW1lbnQgOiAoKSA9PlxuICAgIHBhZ2VNYXggPSBAcnVsZXJzLmxlbmd0aCArIDFcbiAgICBDb21tZW50RWFjaFBhZ2UgPSBbXVxuICAgIGZvciBpIGluIFsxLi4ucGFnZU1heCsxXVxuICAgICAgY29uc29sZS5sb2cgaVxuICAgICAgQ29tbWVudEVhY2hQYWdlLnB1c2goQHBpY2tVcENvbW1lbnRGcm9tUGFnZShpKSlcbiAgICByZXR1cm4gQ29tbWVudEVhY2hQYWdlXG5cblxuICAjIHsjIyAjI30g44Gn5Zuy44G+44KM44Gf44Kz44Oh44Oz44OI6YOo5YiG44KS5oqc44GN5Ye644GZXG4gICMg44OW44Ot44OD44Kv44Kz44Oh44Oz44OI44Gu5aC05ZCI44GveyMjICMjfeOBruWJjeW+jOOBq+aUueihjOOBjOWFpeOBo+OBpuOBhOOBquOBkeOCjOOBsOOBquOCieOBquOBhFxuICAjIHBpY2tVcENvbW1lbnRGcm9tUGFnZShOdW1iZXIpIC0+IFN0cmluZ1xuICBwaWNrVXBDb21tZW50RnJvbVBhZ2UgOiAocGFnZSkgPT5cbiAgICBpZiBwYWdlPT0xIGFuZCBub3QgQHJ1bGVycy5sZW5ndGhcbiAgICAgIHBhZ2VTdGFydExpbmUgPSAwXG4gICAgICBwYWdlRW5kTGluZSAgID0gQGNvZGVNaXJyb3IubGluZUNvdW50KClcbiAgICAgIGNvbnNvbGUubG9nIFwicGFnZUVuZExpbmUgPSBcIiArIHBhZ2VFbmRMaW5lXG4gICAgZWxzZSBpZiBwYWdlID09IDEgYW5kIEBydWxlcnMubGVuZ3RoICE9IDBcbiAgICAgIHBhZ2VTdGFydExpbmUgPSAwXG4gICAgICBwYWdlRW5kTGluZSAgID0gQHJ1bGVyc1swXVxuICAgIGVsc2UgaWYgcGFnZSA9PSBAcnVsZXJzLmxlbmd0aCArIDFcbiAgICAgIHBhZ2VTdGFydExpbmUgPSBAcnVsZXJzW0BydWxlcnMubGVuZ3RoLTFdXG4gICAgICBwYWdlRW5kTGluZSAgID0gQGNvZGVNaXJyb3IubGluZUNvdW50KClcbiAgICBlbHNlXG4gICAgICBwYWdlU3RhcnRMaW5lID0gQHJ1bGVyc1twYWdlLTJdICsgMVxuICAgICAgcGFnZUVuZExpbmUgICA9IEBydWxlcnNbcGFnZS0xXSArIDFcblxuICAgIFRleHRJbkVkaXRvciA9IEBjb2RlTWlycm9yLmdldFJhbmdlIHtcImxpbmVcIjpwYWdlU3RhcnRMaW5lICwgXCJjaFwiOiAwfSx7XCJsaW5lXCI6cGFnZUVuZExpbmUtMSAsIFwiY2hcIjowIH1cbiAgICByZSA9IC9cXHsjI1tcXHNcXG5dKiguKilbXFxzXFxuXSojI1xcfS9cbiAgICByZXN1bHQgPSBUZXh0SW5FZGl0b3IubWF0Y2gocmUpXG4gICAgY29tbWVudCA9ICcnXG4gICAgaWYocmVzdWx0KVxuICAgICAgY29tbWVudCA9IHJlc3VsdFsxXVxuICAgIHJldHVybiBjb21tZW50XG5cbiAgdXBkYXRlR2xvYmFsU2V0dGluZzogKHByb3AsIHZhbHVlKSA9PlxuICAgIGxhdGVzdFBvcyA9IG51bGxcblxuICAgIGZvciBvYmogaW4gKEBsYXN0UmVuZGVyZWQ/LnNldHRpbmdzUG9zaXRpb24gfHwgW10pXG4gICAgICBsYXRlc3RQb3MgPSBvYmogaWYgb2JqLnByb3BlcnR5IGlzIHByb3BcblxuICAgIGlmIGxhdGVzdFBvcz9cbiAgICAgIEBjb2RlTWlycm9yLnJlcGxhY2VSYW5nZShcbiAgICAgICAgXCIje3Byb3B9OiAje3ZhbHVlfVwiLFxuICAgICAgICBDb2RlTWlycm9yLlBvcyhsYXRlc3RQb3MubGluZUlkeCwgbGF0ZXN0UG9zLmZyb20pLFxuICAgICAgICBDb2RlTWlycm9yLlBvcyhsYXRlc3RQb3MubGluZUlkeCwgbGF0ZXN0UG9zLmZyb20gKyBsYXRlc3RQb3MubGVuZ3RoKSxcbiAgICAgIClcbiAgICBlbHNlXG4gICAgICBAY29kZU1pcnJvci5yZXBsYWNlUmFuZ2UoXG4gICAgICAgIFwiPCEtLSAje3Byb3B9OiAje3ZhbHVlfSAtLT5cXG5cXG5cIixcbiAgICAgICAgQ29kZU1pcnJvci5Qb3MoQGNvZGVNaXJyb3IuZmlyc3RMaW5lKCksIDApXG4gICAgICApXG5cbmxvYWRpbmdTdGF0ZSA9ICdsb2FkaW5nJ1xuXG5cblxuIyB0ZXh0bGludCBydWxlcyBzZXR0aW5nXG5cbm5vQWJ1c2FnZSA9IHJlcXVpcmUgJ3RleHRsaW50LXJ1bGUtamEtbm8tYWJ1c2FnZSdcbm1peGVkUGVyaW9kID0gcmVxdWlyZSAndGV4dGxpbnQtcnVsZS1qYS1uby1taXhlZC1wZXJpb2QnXG5zdWNjZXNzaXZlV29yZCA9IHJlcXVpcmUgJ3RleHRsaW50LXJ1bGUtamEtbm8tc3VjY2Vzc2l2ZS13b3JkJ1xud2Vha1BocmFzZSA9IHJlcXVpcmUgJ3RleHRsaW50LXJ1bGUtamEtbm8td2Vhay1waHJhc2UnXG5tYXhDb21tYSA9IHJlcXVpcmUgJ3RleHRsaW50LXJ1bGUtbWF4LWNvbW1hJ1xua2FuamlDb250aW51b3VzTGVuID0gcmVxdWlyZSAndGV4dGxpbnQtcnVsZS1tYXgta2FuamktY29udGludW91cy1sZW4nXG5tYXhUZW4gPSByZXF1aXJlICd0ZXh0bGludC1ydWxlLW1heC10ZW4nXG5ub0RvdWJsZU5lZ2F0aXZlSmEgPSByZXF1aXJlICd0ZXh0bGludC1ydWxlLW5vLWRvdWJsZS1uZWdhdGl2ZS1qYSdcbm5vRG91YmxlZENvbmp1bmN0aW9uID0gcmVxdWlyZSAndGV4dGxpbnQtcnVsZS1uby1kb3VibGVkLWNvbmp1bmN0aW9uJ1xubm9Eb3VibGVkQ29uanVuY3RpdmVQYXJ0aWNsZUdhID0gcmVxdWlyZSAndGV4dGxpbnQtcnVsZS1uby1kb3VibGVkLWNvbmp1bmN0aXZlLXBhcnRpY2xlLWdhJ1xubm9Eb3VibGVkSm9zaGkgPSByZXF1aXJlICd0ZXh0bGludC1ydWxlLW5vLWRvdWJsZWQtam9zaGknXG5ub0Ryb3BwaW5nVGhlUmEgPSByZXF1aXJlICd0ZXh0bGludC1ydWxlLW5vLWRyb3BwaW5nLXRoZS1yYSdcbm5vRXhjbGFtYXRpb25RdWVzdGlvbk1hcmsgPSByZXF1aXJlICd0ZXh0bGludC1ydWxlLW5vLWV4Y2xhbWF0aW9uLXF1ZXN0aW9uLW1hcmsnXG5ub0hhbmtha3VLYW5hID0gcmVxdWlyZSAndGV4dGxpbnQtcnVsZS1uby1oYW5rYWt1LWthbmEnXG5ub01peERlYXJ1RGVzdW1hc3UgPSByZXF1aXJlICd0ZXh0bGludC1ydWxlLW5vLW1peC1kZWFydS1kZXN1bWFzdSdcbm5vTmZkID0gcmVxdWlyZSAndGV4dGxpbnQtcnVsZS1uby1uZmQnXG5ub1N0YXJ0RHVwbGljYXRlZENvbmp1bmN0aW9uID0gcmVxdWlyZSAndGV4dGxpbnQtcnVsZS1uby1zdGFydC1kdXBsaWNhdGVkLWNvbmp1bmN0aW9uJ1xuXG52YWxpZGF0b3IgPSBjcmVhdGVWYWxpZGF0b3Ioe1xuICBydWxlczoge1xuICAgICdub0FidXNhZ2UnIDogbm9BYnVzYWdlLFxuICAgICdtaXhlZFBlcmlvZCcgOiBtaXhlZFBlcmlvZCxcbiAgICAnc3VjY2Vzc2l2ZVdvcmQnIDogc3VjY2Vzc2l2ZVdvcmQsXG4gICAgJ3dlYWtQaHJhc2UnIDogd2Vha1BocmFzZSxcbiAgICAnbWF4Q29tbWEnIDogbWF4Q29tbWEsXG4gICAgJ2thbmppQ29udGludW91c0xlbicgOiBrYW5qaUNvbnRpbnVvdXNMZW4sXG4gICAgJ21heFRlbicgOiBtYXhUZW4sXG4gICAgJ25vRG91YmxlZE5lZ2F0aXZlSmEnIDogbm9Eb3VibGVOZWdhdGl2ZUphLFxuICAgICdub0RvdWJsZWRDb25qdW5jdGlvbicgOiBub0RvdWJsZWRDb25qdW5jdGlvbixcbiAgICAnbm9Eb3VibGVkQ29uanVuY3RpdmVQYXJ0aWNsZUdhJyA6IG5vRG91YmxlZENvbmp1bmN0aXZlUGFydGljbGVHYSxcbiAgICAnbm9Eb3VibGVkSm9zaGknIDogbm9Eb3VibGVkSm9zaGksXG4gICAgJ25vRHJvcHBpbmdUaGVSYScgOiBub0Ryb3BwaW5nVGhlUmEsXG4gICAgJ25vRXhjbGFtYXRpb25RdWVzdGlvbk1hcmsnIDogbm9FeGNsYW1hdGlvblF1ZXN0aW9uTWFyayxcbiAgICAnbm9IYW5rYWt1S2FuYScgOiBub0hhbmtha3VLYW5hLFxuICAgICdub01peERlYXJ1RGVzdW1hc3UnIDogbm9NaXhEZWFydURlc3VtYXN1LFxuICAgICdub05mZCcgOiBub05mZCxcbiAgICAnbm9TdGFydER1cGxpY2F0ZWRDb25qdW5jdGlvbicgOiBub1N0YXJ0RHVwbGljYXRlZENvbmp1bmN0aW9uXG4gIH1cbiAgfSk7XG5kb2N1bWVudC5hZGRFdmVudExpc3RlbmVyIFwiRE9NQ29udGVudExvYWRlZFwiLCAoZXZlbnQpPT5cblxuICAjIGNsaWVudC5zZW5kIFwibW9ybmluZ1wiLFxuICAjICAgXCJmcm9tXCI6IHNldHRpbmcuaWQsXG4gICMgICBcInRvXCIgOiBcImxhbmRcIixcbiAgIyAgIFwiYm9keVwiOlxuICAjICAgICBcImNvbnRlbnRcIjogXCJoZWxsbyEgbGFuZCEgaSdtIGluZGV4XCJcblxuXG5kbyAtPlxuICBzbGlkZUhUTUwgPSBcIlwiXG4gIGVkaXRvclN0YXRlcyA9IG5ldyBFZGl0b3JTdGF0ZXMoXG4gICAgQ29kZU1pcnJvci5mcm9tVGV4dEFyZWEoJCgnI2VkaXRvcicpWzBdLFxuICAgICAgIyBnZm0gOiBHaXRodWIgRmxhdm9yZWQgTW9kZVxuICAgICAgbW9kZTogJ2dmbSdcbiAgICAgICN0aGVtZTogJ2Jhc2UxNi1saWdodCdcbiAgICAgIGxpbmVXcmFwcGluZzogdHJ1ZVxuICAgICAgbGluZU51bWJlcnM6IHRydWVcbiAgICAgIGRyYWdEcm9wOiBmYWxzZVxuICAgICAgZ3V0dGVyczogW1wiQ29kZU1pcnJvci1saW50LW1hcmtlcnNcIl1cbiAgICAgIGxpbnQ6IHtcbiAgICAgICAgIFwiZ2V0QW5ub3RhdGlvbnNcIjogdmFsaWRhdG9yLFxuICAgICAgICAgXCJhc3luY1wiOiB0cnVlXG4gICAgICB9XG4gICAgICBleHRyYUtleXM6XG4gICAgICAgIEVudGVyOiAnbmV3bGluZUFuZEluZGVudENvbnRpbnVlTWFya2Rvd25MaXN0J1xuICAgICksXG4gICAgJCgnI3ByZXZpZXcnKVswXVxuICApXG5cblxuXG4gICMgVmlldyBtb2Rlc1xuICAkKCcudmlld21vZGUtYnRuW2RhdGEtdmlld21vZGVdJykuY2xpY2sgLT4gTWRzUmVuZGVyZXIuc2VuZFRvTWFpbigndmlld01vZGUnLCAkKHRoaXMpLmF0dHIoJ2RhdGEtdmlld21vZGUnKSlcblxuICAjIFBERiBFeHBvcnQgYnV0dG9uXG4gICQoJyNwZGYtZXhwb3J0JykuY2xpY2sgLT4gaXBjLnNlbmQgJ1BkZkV4cG9ydCdcblxuICAjIEZpbGUgRCZEXG4gICQoZG9jdW1lbnQpXG4gICAgLm9uICdkcmFnb3ZlcicsICAtPiBmYWxzZVxuICAgIC5vbiAnZHJhZ2xlYXZlJywgLT4gZmFsc2VcbiAgICAub24gJ2RyYWdlbmQnLCAgIC0+IGZhbHNlXG4gICAgLm9uICdkcm9wJywgICAgICAoZSkgPT5cbiAgICAgIGUucHJldmVudERlZmF1bHQoKVxuICAgICAgcmV0dXJuIGZhbHNlIHVubGVzcyAoZiA9IGUub3JpZ2luYWxFdmVudC5kYXRhVHJhbnNmZXI/LmZpbGVzP1swXSk/XG4gICAgICBjb25zb2xlLmxvZyBmLnR5cGVcbiAgICAgICNjb25zb2xlLmxvZyBmLnBhdGhcbiAgICAgICMg44OR44Ov44Od44GuIC5wcHR444OV44Kh44Kk44Or44Gg44Gj44Gf44KJXG4gICAgICBpZiBmLnR5cGUgPT0gXCJhcHBsaWNhdGlvbi92bmQub3BlbnhtbGZvcm1hdHMtb2ZmaWNlZG9jdW1lbnQucHJlc2VudGF0aW9ubWwucHJlc2VudGF0aW9uXCJcbiAgICAgICAgZWRpdG9yU3RhdGVzLmxvYWRGcm9tUFBUWCBmLnBhdGhcbiAgICAgIGVsc2UgaWYgZi50eXBlLnN0YXJ0c1dpdGgoJ2ltYWdlJylcbiAgICAgICAgZWRpdG9yU3RhdGVzLmluc2VydEltYWdlIGYucGF0aFxuICAgICAgZWxzZSBpZiBmLnR5cGUuc3RhcnRzV2l0aCgndGV4dCcpIHx8IGYudHlwZSBpcyAnJ1xuICAgICAgICBNZHNSZW5kZXJlci5zZW5kVG9NYWluICdsb2FkRnJvbUZpbGUnLCBmLnBhdGggaWYgZi5wYXRoP1xuICAgICAgZWxzZSBpZiBmLnR5cGUuc3RhcnRzV2l0aCgndmlkZW8nKVxuICAgICAgICBlZGl0b3JTdGF0ZXMuaW5zZXJ0VmlkZW8gZi5wYXRoXG4gICAgICBlbHNlIGlmIGYudHlwZSA9PSAnYXBwbGljYXRpb24vcGRmJ1xuICAgICAgICBlZGl0b3JTdGF0ZXMubG9hZEZyb21QREYgZi5wYXRoXG4gICAgICBmYWxzZVxuXG4gICMgU3BsaXR0ZXJcbiAgZHJhZ2dpbmdTcGxpdHRlciAgICAgID0gZmFsc2VcbiAgZHJhZ2dpbmdTcGxpdFBvc2l0aW9uID0gdW5kZWZpbmVkXG5cbiAgc2V0U3BsaXR0ZXIgPSAoc3BsaXRQb2ludCkgLT5cbiAgICBzcGxpdFBvaW50ID0gTWF0aC5taW4oMC44LCBNYXRoLm1heCgwLjIsIHBhcnNlRmxvYXQoc3BsaXRQb2ludCkpKVxuXG4gICAgJCgnLnBhbmUubWFya2Rvd24nKS5jc3MoJ2ZsZXgtZ3JvdycsIHNwbGl0UG9pbnQgKiAxMDApXG4gICAgJCgnLnBhbmUucHJldmlldycpLmNzcygnZmxleC1ncm93JywgKDEgLSBzcGxpdFBvaW50KSAqIDEwMClcblxuICAgIHJldHVybiBzcGxpdFBvaW50XG5cbiAgc2V0RWRpdG9yQ29uZmlnID0gKGVkaXRvckNvbmZpZykgLT5cbiAgICBlZGl0b3IgPSAkKGVkaXRvclN0YXRlcy5jb2RlTWlycm9yPy5nZXRXcmFwcGVyRWxlbWVudCgpKVxuICAgIGVkaXRvci5jc3MoJ2ZvbnQtZmFtaWx5JywgZWRpdG9yQ29uZmlnLmZvbnRGYW1pbHkpIGlmIGVkaXRvcj9cbiAgICBlZGl0b3IuY3NzKCdmb250LXNpemUnLCBlZGl0b3JDb25maWcuZm9udFNpemUpIGlmIGVkaXRvcj9cblxuICAkKCcucGFuZS1zcGxpdHRlcicpXG4gICAgLm1vdXNlZG93biAtPlxuICAgICAgZHJhZ2dpbmdTcGxpdHRlciA9IHRydWVcbiAgICAgIGRyYWdnaW5nU3BsaXRQb3NpdGlvbiA9IHVuZGVmaW5lZFxuXG4gICAgLmRibGNsaWNrIC0+XG4gICAgICBNZHNSZW5kZXJlci5zZW5kVG9NYWluICdzZXRDb25maWcnLCAnc3BsaXR0ZXJQb3NpdGlvbicsIHNldFNwbGl0dGVyKDAuNSlcblxuICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lciAnbW91c2Vtb3ZlJywgKGUpIC0+XG4gICAgaWYgZHJhZ2dpbmdTcGxpdHRlclxuICAgICAgZHJhZ2dpbmdTcGxpdFBvc2l0aW9uID0gc2V0U3BsaXR0ZXIgTWF0aC5taW4oTWF0aC5tYXgoMCwgZS5jbGllbnRYKSwgZG9jdW1lbnQuYm9keS5jbGllbnRXaWR0aCkgLyBkb2N1bWVudC5ib2R5LmNsaWVudFdpZHRoXG4gICwgZmFsc2VcblxuICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lciAnbW91c2V1cCcsIChlKSAtPlxuICAgIGRyYWdnaW5nU3BsaXR0ZXIgPSBmYWxzZVxuICAgIE1kc1JlbmRlcmVyLnNlbmRUb01haW4gJ3NldENvbmZpZycsICdzcGxpdHRlclBvc2l0aW9uJywgZHJhZ2dpbmdTcGxpdFBvc2l0aW9uIGlmIGRyYWdnaW5nU3BsaXRQb3NpdGlvbj9cbiAgLCBmYWxzZVxuXG4gIHJlc3BvbnNlUGRmT3B0cyA9IG51bGxcblxuICAjIEV2ZW50c1xuICBNZHNSZW5kZXJlclxuICAgIC5vbiAncHVibGlzaFBkZicsIChmbmFtZSkgLT5cbiAgICAgIGVkaXRvclN0YXRlcy5jb2RlTWlycm9yLmdldElucHV0RmllbGQoKS5ibHVyKClcbiAgICAgICQoJ2JvZHknKS5hZGRDbGFzcyAnZXhwb3J0aW5nLXBkZidcblxuICAgICAgZWRpdG9yU3RhdGVzLnByZXZpZXcuc2VuZCAncmVxdWVzdFBkZk9wdGlvbnMnLCB7IGZpbGVuYW1lOiBmbmFtZSB9XG5cbiAgICAub24gJ3Jlc3BvbnNlUGRmT3B0aW9ucycsIChvcHRzKSAtPlxuICAgICAgIyBXYWl0IGxvYWRpbmcgcmVzb3VyY2VzXG4gICAgICBzdGFydFB1Ymxpc2ggPSAtPlxuICAgICAgICBpZiBsb2FkaW5nU3RhdGUgaXMgJ2xvYWRpbmcnXG4gICAgICAgICAgc2V0VGltZW91dCBzdGFydFB1Ymxpc2gsIDI1MFxuICAgICAgICBlbHNlXG4gICAgICAgICAgZWRpdG9yU3RhdGVzLnByZXZpZXcucHJpbnRUb1BERlxuICAgICAgICAgICAgbWFyZ2luc1R5cGU6IDFcbiAgICAgICAgICAgIHBhZ2VTaXplOiBvcHRzLmV4cG9ydFNpemVcbiAgICAgICAgICAgIHByaW50QmFja2dyb3VuZDogdHJ1ZVxuICAgICAgICAgICwgKGVyciwgZGF0YSkgLT5cbiAgICAgICAgICAgIHVubGVzcyBlcnJcbiAgICAgICAgICAgICAgTWRzUmVuZGVyZXIuc2VuZFRvTWFpbiAnd3JpdGVGaWxlJywgb3B0cy5maWxlbmFtZSwgZGF0YSwgeyBmaW5hbGl6ZWQ6ICd1bmZyZWV6ZScgfVxuICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICBNZHNSZW5kZXJlci5zZW5kVG9NYWluICd1bmZyZWV6ZSdcblxuICAgICAgc2V0VGltZW91dCBzdGFydFB1Ymxpc2gsIDUwMFxuXG4gICAgLm9uICd1bmZyZWV6ZWQnLCAtPlxuICAgICAgZWRpdG9yU3RhdGVzLnByZXZpZXcuc2VuZCAndW5mcmVlemUnXG4gICAgICAkKCdib2R5JykucmVtb3ZlQ2xhc3MgJ2V4cG9ydGluZy1wZGYnXG5cbiAgICAub24gJ2xvYWRUZXh0JywgKGJ1ZmZlcikgLT5cbiAgICAgIGVkaXRvclN0YXRlcy5fbG9ja0NoYW5nZWRTdGF0dXMgPSB0cnVlXG4gICAgICBlZGl0b3JTdGF0ZXMuY29kZU1pcnJvci5zZXRWYWx1ZSBidWZmZXJcbiAgICAgIGVkaXRvclN0YXRlcy5jb2RlTWlycm9yLmNsZWFySGlzdG9yeSgpXG4gICAgICBlZGl0b3JTdGF0ZXMuX2xvY2tDaGFuZ2VkU3RhdHVzID0gZmFsc2VcblxuICAgIC5vbiAnc2V0SW1hZ2VEaXJlY3RvcnknLCAoZGlyZWN0b3JpZXMpIC0+IGVkaXRvclN0YXRlcy5zZXRJbWFnZURpcmVjdG9yeSBkaXJlY3Rvcmllc1xuXG4gICAgIyBzZW5kIHRleHQgdG8gc2F2ZSB0byBtYWluIHByb2Nlc3MgYW5kIHJlbG9hZFxuICAgIC5vbiAnc2F2ZScsIChmbmFtZSwgdHJpZ2dlcnMgPSB7fSkgLT5cbiAgICAgIE1kc1JlbmRlcmVyLnNlbmRUb01haW4gJ3dyaXRlRmlsZScsIGZuYW1lLCBlZGl0b3JTdGF0ZXMuY29kZU1pcnJvci5nZXRWYWx1ZSgpLCB0cmlnZ2Vyc1xuICAgICAgTWRzUmVuZGVyZXIuc2VuZFRvTWFpbiAnaW5pdGlhbGl6ZVN0YXRlJywgZm5hbWVcblxuICAgIC5vbiAndmlld01vZGUnLCAobW9kZSkgLT5cbiAgICAgIHN3aXRjaCBtb2RlXG4gICAgICAgIHdoZW4gJ21hcmtkb3duJ1xuICAgICAgICAgIGVkaXRvclN0YXRlcy5wcmV2aWV3LnNlbmQgJ3NldENsYXNzJywgJydcbiAgICAgICAgd2hlbiAnc2NyZWVuJ1xuICAgICAgICAgIGVkaXRvclN0YXRlcy5wcmV2aWV3LnNlbmQgJ3NldENsYXNzJywgJ3NsaWRlLXZpZXcgc2NyZWVuJ1xuICAgICAgICB3aGVuICdsaXN0J1xuICAgICAgICAgIGVkaXRvclN0YXRlcy5wcmV2aWV3LnNlbmQgJ3NldENsYXNzJywgJ3NsaWRlLXZpZXcgbGlzdCdcbiAgICAgICAgd2hlbiAncHJlc2VuLWRldidcbiAgICAgICAgICBlZGl0b3JTdGF0ZXMucHJldmlldy5zZW5kICdzZXRDbGFzcycsICdzbGlkZS12aWV3IHByZXNlbi1kZXYnXG5cbiAgICAgICQoJyNwcmV2aWV3LW1vZGVzJykucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJylcbiAgICAgICQoJy52aWV3bW9kZS1idG5bZGF0YS12aWV3bW9kZV0nKS5yZW1vdmVDbGFzcygnYWN0aXZlJylcbiAgICAgICAgLmZpbHRlcihcIltkYXRhLXZpZXdtb2RlPScje21vZGV9J11cIikuYWRkQ2xhc3MoJ2FjdGl2ZScpXG5cbiAgICAub24gJ2VkaXRDb21tYW5kJywgKGNvbW1hbmQpIC0+IGVkaXRvclN0YXRlcy5jb2RlTWlycm9yLmV4ZWNDb21tYW5kKGNvbW1hbmQpXG5cbiAgICAub24gJ29wZW5EZXZUb29sJywgLT5cbiAgICAgIGlmIGVkaXRvclN0YXRlcy5wcmV2aWV3LmlzRGV2VG9vbHNPcGVuZWQoKVxuICAgICAgICBlZGl0b3JTdGF0ZXMucHJldmlldy5jbG9zZURldlRvb2xzKClcbiAgICAgIGVsc2VcbiAgICAgICAgZWRpdG9yU3RhdGVzLnByZXZpZXcub3BlbkRldlRvb2xzKClcblxuICAgIC5vbiAnc2V0RWRpdG9yQ29uZmlnJywgKGVkaXRvckNvbmZpZykgLT4gc2V0RWRpdG9yQ29uZmlnIGVkaXRvckNvbmZpZ1xuICAgIC5vbiAnc2V0U3BsaXR0ZXInLCAoc3BsaWl0ZXJQb3MpIC0+IHNldFNwbGl0dGVyIHNwbGlpdGVyUG9zXG4gICAgLm9uICdzZXRUaGVtZScsICh0aGVtZSkgLT4gZWRpdG9yU3RhdGVzLnVwZGF0ZUdsb2JhbFNldHRpbmcgJyR0aGVtZScsIHRoZW1lXG4gICAgLm9uICd0aGVtZUNoYW5nZWQnLCAodGhlbWUpIC0+IE1kc1JlbmRlcmVyLnNlbmRUb01haW4gJ3RoZW1lQ2hhbmdlZCcsIHRoZW1lXG4gICAgLm9uICdyZXNvdXJjZVN0YXRlJywgKHN0YXRlKSAtPiBsb2FkaW5nU3RhdGUgPSBzdGF0ZVxuICAjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuXG4gIHNldHRpbmcgPVxuICAgIFwiaWRcIjogXCJpbmRleFwiXG4gICAgXCJ1cmxcIjogXCJ3czovL2FwcHMud2lzZG9td2ViLm5ldDo2NDI2MC93cy9taWtcIlxuICAgIFwic2l0ZVwiOiBcInRlc3RcIlxuICAgIFwidG9rZW5cIjogXCJQYWQ6OTk0OFwiXG4gIGNsaWVudCA9IG5ldyBNaWNrckNsaWVudChzZXR0aW5nKVxuXG4gIGNsaWVudC5vbiBcImNhblJlY2VpdmVFZGl0b3JUZXh0XCIsICgpPT5cbiAgICBjbGllbnQuc2VuZCBcInNlbmRFZGl0b3JUZXh0XCIsIHtcbiAgICAgIFwidG9cIjogXCJwcmVzZW5JbmRleFwiXG4gICAgICBcImJvZHlcIjpcbiAgICAgICAgXCJjb250ZW50XCI6IGVkaXRvclN0YXRlcy5jb2RlTWlycm9yLmdldFZhbHVlKClcbiAgICB9XG4gIGNsaWVudC5vbiBcImNhblJlY2VpdmVDb21tZW50XCIsICgpPT5cbiAgIGNsaWVudC5zZW5kIFwic2VuZENvbW1lbnRcIiwge1xuICAgICBcInRvXCI6IFwicHJlc2VuRGV2SW5kZXhcIixcbiAgICAgXCJib2R5XCI6XG4gICAgICAgXCJjb250ZW50XCI6IGVkaXRvclN0YXRlcy5waWNrVXBDb21tZW50KClcbiAgIH1cblxuICB3ZWJ2aWV3ID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI3ByZXZpZXcnKVxuICAjIHNpbXBsZSBwcmVzZW50YXRpb24gbW9kZSBvbiFcbiAgIyAkKCcjcHJlc2VudGF0aW9uJykub24gJ2NsaWNrJywgKCkgPT5cbiAgIyAgIHdlYnZpZXcud2Via2l0UmVxdWVzdEZ1bGxTY3JlZW4oKVxuXG4gICMgJCgnI3ByZXNlbnRhdGlvbicpLm9uICdjbGljaycsICgpID0+XG4gICMgICAkKCcucGFuZS5tYXJrZG93bicpLnRvZ2dsZSgpXG4gICMgICBpcGMuc2VuZCgnUHJlc2VudGF0aW9uJylcblxuICAjIGlwYy5vbiAnaW5pdGlhbGl6ZScgKCkgPT5cblxuXG4gICMgaXBjLm9uIFwicHJlc2VudGF0aW9uXCIsICgpIC0+XG4gICMgICBjb25zb2xlLmxvZyBcInJlY2lldmUgcHJlc2VudGF0aW9uXCJcbiAgIyAgIGlwYy5zZW5kIFwidGV4dFNlbmRcIiwgZWRpdG9yU3RhdGVzLmNvZGVNaXJyb3IuZ2V0VmFsdWUoKVxuICAjICAgY29uc29sZS5sb2cgJ3NlbmQgdGV4dFNlbmQnXG5cbiAgJCgnI3ByZXNlbnRhdGlvbicpLm9uICdjbGljaycsICgpID0+XG4gICAgd2Vidmlldy5zZW5kICdyZXF1ZXN0U2xpZGVJbmZvJ1xuICAgIGNvbnNvbGUubG9nICdzZW5kIHJlcXVlc3RTbGlkZUluZm8nXG5cbiAgIyBzdGF0ZSA9IDA7XG4gICMgJCgnI2xvYWRVc2VkU2xpZGUnKS5vbiAnY2xpY2snLCAoKSA9PlxuICAjICAgY29uc29sZS5sb2cgJ2xvYWQgZmlsZSdcbiAgIyAgIGlwYy5zZW5kICdsb2FkVXNlZFNsaWRlJ1xuICAjICAgaWYgc3RhdGUgPT0gMFxuICAjICAgICAkKCcuQ29kZU1pcnJvcicpLmNzcyAnaGVpZ2h0JywgJzY1JSdcbiAgIyAgICAgc3RhdGUgPSAxXG5cbiAgIyAkKCcjdG9nZ2xlVXNlZFNsaWRlJykub24gJ2NsaWNrJywgKCkgPT5cbiAgIyAgIGlmIHN0YXRlID09IDBcbiAgIyAgICAgJCgnLkNvZGVNaXJyb3InKS5jc3MgJ2hlaWdodCcsICc2NSUnXG4gICMgICAgIHN0YXRlID0gMVxuICAjICAgZWxzZVxuICAjICAgICAkKCcuQ29kZU1pcnJvcicpLmNzcyAnaGVpZ2h0JywgJzEwMCUnXG4gICMgICAgIHN0YXRlID0gMFxuXG4gIGlwYy5vbiAnc2VuZFVzZWRTbGlkZVBhdGgnLCAoZSwgdHh0KSA9PlxuICAgIGNvbnNvbGUubG9nIFwidXNlZFNsaWRlUGF0aCA9IFwiICsgdHh0XG4gICAgd2Vidmlld1VzZWRTbGlkZSA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNwcmV2aWV3MScpXG4gICAgI3dlYnZpZXdVc2VkU2xpZGUub3BlbkRldlRvb2xzKClcbiAgICB3ZWJ2aWV3VXNlZFNsaWRlLnNlbmQgJ3NlbmRVc2VkU2xpZGVQYXRoJywgdHh0XG5cblxuICB3ZWJ2aWV3LmFkZEV2ZW50TGlzdGVuZXIgJ2lwYy1tZXNzYWdlJywgKGV2ZW50KSA9PlxuICAgICBzd2l0Y2ggZXZlbnQuY2hhbm5lbFxuICAgICAgIHdoZW4gXCJzZW5kU2xpZGVJbmZvXCIgICAjIHdlYnZpZXcg44GL44KJ44K544Op44Kk44OJ5oOF5aCx44KS5Y+X5L+hXG4gICAgICAgIHNsaWRlSW5mbyA9IGV2ZW50LmFyZ3NbMF1cbiAgICAgICAgY29uc29sZS5sb2cgJ3JlY2VpdmUgc2VuZFNsaWRlSW5mbydcbiAgICAgICAgY29uc29sZS5sb2cgc2xpZGVJbmZvXG4gICAgICAgIGlwYy5zZW5kICd0ZXh0U2VuZCcsIHNsaWRlSW5mb1xuICAgICAgICBjb25zb2xlLmxvZyAnc2VuZCB0ZXh0U2VuZCdcbiAgICAgICAgYnJlYWtcblxuICAgICAgIHdoZW4gXCJyZXF1ZXN0U2xpZGVIVE1MXCJcbiAgICAgICAgd2Vidmlldy5zZW5kICdzZXRTbGlkZScsIHNsaWRlSFRNTFxuICAgICAgICBjb25zb2xlLmxvZyAnc2VuZCBzZXRTbGlkZSdcbiAgICAgICAgYnJlYWtcblxuICBpcGMub24gJ3ByZXNlbkRldkluaXRpYWxpemUnLCAoZSwgdGV4dCkgPT5cbiAgICAgIGNvbnNvbGUubG9nICdyZWNlaXZlIHByZXNlbkRldkluaXRpYWxpemUnXG4gICAgICBjb25zb2xlLmxvZyB0ZXh0XG4gICAgICBzbGlkZUhUTUwgPSB0ZXh0XG5cbiAgaXBjLm9uICdnb1RvUGFnZScsIChlLCBwYWdlKSA9PlxuICAgIGNvbnNvbGUubG9nIHBhZ2VcbiAgICB3ZWJ2aWV3LnNlbmQgJ2dvVG9QYWdlJywgcGFnZVxuXG4gICAgICAjIHdlYnZpZXcg44Gu5rqW5YKZ44GM44Gn44GN44Gm44Gq44GEXG4gICAgICAjIHdlYnZpZXcuc2VuZCAnc2V0U2xpZGUnLCB0ZXh0XG4gICAgICAjIGNvbnNvbGUubG9nICdzZW5kIHNldFNsaWRlJ1xuICAjIGlwYy5vbiAnaW5pdGlhbGl6ZScsICgpID0+XG4gICMgICAkKCcucGFuZS5tYXJrZG93bicpLmh0bWwoKVxuIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG5cblxuICAjIEluaXRpYWxpemVcbiAgZWRpdG9yU3RhdGVzLmNvZGVNaXJyb3IuZm9jdXMoKVxuICBlZGl0b3JTdGF0ZXMucmVmcmVzaFBhZ2UoKVxuIl19
