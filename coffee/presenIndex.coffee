ipc = require('electron').ipcRenderer
{shell, webFrame} = require 'electron'
MdsMenu           = require './js/classes/mds_menu'
clsMdsRenderer    = require './js/classes/mds_renderer'
createValidator   = require 'codemirror-textlint'
MdsRenderer       = new clsMdsRenderer
MickrClient       = require './modules/MickrClient'
MdsRenderer.requestAccept()

webFrame.setZoomLevelLimits(1, 1)

CodeMirror = require 'codemirror'
require 'codemirror/mode/xml/xml'
require 'codemirror/mode/markdown/markdown'
require 'codemirror/mode/gfm/gfm'
require 'codemirror/addon/edit/continuelist'
require "codemirror/addon/lint/lint"
MickrClient = require './modules/MickrClient'

class PresenStates
  rulers: []
  currentPage: null
  previewInitialized: false
  lastRendered: {}

  _lockChangedStatus: false
  _imageDirectory: null

  constructor: (@codeMirror, @preview) ->
    @initializeEditor()
    @initializePreview()

    @menu = new MdsMenu [
      { label: '&Undo', accelerator: 'CmdOrCtrl+Z', click: (i, w) => @codeMirror.execCommand 'undo' if w and !w.mdsWindow.freeze }
      {
        label: '&Redo'
        accelerator: do -> if process.platform is 'win32' then 'Control+Y' else 'Shift+CmdOrCtrl+Z'
        click: (i, w) => @codeMirror.execCommand 'redo' if w and !w.mdsWindow.freeze
      }
      { type: 'separator' }
      { label: 'Cu&t', accelerator: 'CmdOrCtrl+X', role: 'cut' }
      { label: '&Copy', accelerator: 'CmdOrCtrl+C', role: 'copy' }
      { label: '&Paste', accelerator: 'CmdOrCtrl+V', role: 'paste' }
      { label: '&Delete', role: 'delete' }
      { label: 'Select &All', accelerator: 'CmdOrCtrl+A', click: (i, w) => @codeMirror.execCommand 'selectAll' if w and !w.mdsWindow.freeze }
      { type: 'separator', platform: 'darwin' }
      { label: 'Services', role: 'services', submenu: [], platform: 'darwin' }
    ]

  # ページカウント後、webviewへそれを送信
  refreshPage: (rulers) =>
    # presenStatesクラスの変数rulersリストへ入れて、一旦ページを１にする
    @rulers = rulers if rulers?
    page    = 1
    # console.log "1page = " + @pickUpCommentFromPage(1)
    # console.log "last page = " + @pickUpCommentFromPage(@rulers.length+1)
    #console.log @pickUpComment()

    # rulerLineには'---'の行位置が記されており、それとエディタ上のカーソル位置を比較してpageを決める
    lineNumber = @codeMirror.getCursor().line || 0
    for rulerLine in @rulers
      page++ if rulerLine <= lineNumber

    # ruler計算後にページの増減があった場合、正しいページ情報をwebviewへ送信
    if @currentPage != page
      @currentPage = page
      @preview.send 'currentPage', @currentPage if @previewInitialized

    $('#page-indicator').text "Page #{@currentPage} / #{@rulers.length + 1}"

  initializePreview: =>
    $(@preview)
      .on 'dom-ready', =>
        # Fix minimized preview (#20)
        # [Note] https://github.com/electron/electron/issues/4882
        $(@preview.shadowRoot).append('<style>object{min-width:0;min-height:0;}</style>')

      # webview からの通信を受け取る 'ipc-message'
      .on 'ipc-message', (ev) =>
        e = ev.originalEvent

        switch e.channel
          when 'rulerChanged'
            @refreshPage e.args[0]
          when 'linkTo'
            @openLink e.args[0]
          when 'rendered'
            @lastRendered = e.args[0]
            unless @previewInitialized
              MdsRenderer.sendToMain 'previewInitialized'

              @previewInitialized = true
              $('body').addClass 'initialized-slide'
          else
            MdsRenderer._call_event e.channel, e.args...
      # urlをクリックして新しいウインドウが開かれる時
      .on 'new-window', (e) =>
        e.preventDefault()
        @openLink e.originalEvent.url

      .on 'did-finish-load', (e) =>
        @preview.send 'currentPage', 1
        @preview.send 'setImageDirectory', @_imageDirectory
        @preview.send 'render', @codeMirror.getValue()  # render イベント送信でruler確認してページ切り替わり

  openLink: (link) =>
    shell.openExternal link if /^https?:\/\/.+/.test(link)

  initializeEditor: =>
    @codeMirror.on 'contextmenu', (cm, e) =>
      e.preventDefault()
      @codeMirror.focus()
      @menu.popup()
      false

    @codeMirror.on 'change', (cm, chg) =>
      @preview.send 'render', cm.getValue()
      MdsRenderer.sendToMain 'setChangedStatus', true if !@_lockChangedStatus

    @codeMirror.on 'cursorActivity', (cm) => window.setTimeout (=> @refreshPage()), 5

    $('.pane.markdown').toggle()

  setImageDirectory: (directory) =>
    if @previewInitialized
      @preview.send 'setImageDirectory', directory
      @preview.send 'render', @codeMirror.getValue()
    else
      @_imageDirectory = directory

  insertImage: (filePath) => @codeMirror.replaceSelection("![](#{filePath.replace(/ /g, '%20')})\n")

  #********************************TODO****************************************
  insertVideo: (filePath) =>
    console.log filePath
  #****************************************************************************


  updateGlobalSetting: (prop, value) =>
    latestPos = null

    for obj in (@lastRendered?.settingsPosition || [])
      latestPos = obj if obj.property is prop

    if latestPos?
      @codeMirror.replaceRange(
        "#{prop}: #{value}",
        CodeMirror.Pos(latestPos.lineIdx, latestPos.from),
        CodeMirror.Pos(latestPos.lineIdx, latestPos.from + latestPos.length),
      )
    else
      @codeMirror.replaceRange(
        "<!-- #{prop}: #{value} -->\n\n",
        CodeMirror.Pos(@codeMirror.firstLine(), 0)
      )

loadingState = 'loading'



# textlint rules setting

noAbusage = require 'textlint-rule-ja-no-abusage'
mixedPeriod = require 'textlint-rule-ja-no-mixed-period'
successiveWord = require 'textlint-rule-ja-no-successive-word'
weakPhrase = require 'textlint-rule-ja-no-weak-phrase'
maxComma = require 'textlint-rule-max-comma'
kanjiContinuousLen = require 'textlint-rule-max-kanji-continuous-len'
maxTen = require 'textlint-rule-max-ten'
noDoubleNegativeJa = require 'textlint-rule-no-double-negative-ja'
noDoubledConjunction = require 'textlint-rule-no-doubled-conjunction'
noDoubledConjunctiveParticleGa = require 'textlint-rule-no-doubled-conjunctive-particle-ga'
noDoubledJoshi = require 'textlint-rule-no-doubled-joshi'
noDroppingTheRa = require 'textlint-rule-no-dropping-the-ra'
noExclamationQuestionMark = require 'textlint-rule-no-exclamation-question-mark'
noHankakuKana = require 'textlint-rule-no-hankaku-kana'
noMixDearuDesumasu = require 'textlint-rule-no-mix-dearu-desumasu'
noNfd = require 'textlint-rule-no-nfd'
noStartDuplicatedConjunction = require 'textlint-rule-no-start-duplicated-conjunction'

validator = createValidator({
  rules: {
    'noAbusage' : noAbusage,
    'mixedPeriod' : mixedPeriod,
    'successiveWord' : successiveWord,
    'weakPhrase' : weakPhrase,
    'maxComma' : maxComma,
    'kanjiContinuousLen' : kanjiContinuousLen,
    'maxTen' : maxTen,
    'noDoubledNegativeJa' : noDoubleNegativeJa,
    'noDoubledConjunction' : noDoubledConjunction,
    'noDoubledConjunctiveParticleGa' : noDoubledConjunctiveParticleGa,
    'noDoubledJoshi' : noDoubledJoshi,
    'noDroppingTheRa' : noDroppingTheRa,
    'noExclamationQuestionMark' : noExclamationQuestionMark,
    'noHankakuKana' : noHankakuKana,
    'noMixDearuDesumasu' : noMixDearuDesumasu,
    'noNfd' : noNfd,
    'noStartDuplicatedConjunction' : noStartDuplicatedConjunction
  }
  });

do ->
  slideHTML = ""
  presenStates = new PresenStates(
    CodeMirror.fromTextArea($('#editor')[0],
      # gfm : Github Flavored Mode
      mode: 'gfm'
      #theme: 'base16-light'
      lineWrapping: true
      lineNumbers: true
      dragDrop: false
      gutters: ["CodeMirror-lint-markers"]
      lint: {
         "getAnnotations": validator,
         "async": true
      }
      extraKeys:
        Enter: 'newlineAndIndentContinueMarkdownList'
    ),
    $('#preview')[0]
  )

  # Splitter
  draggingSplitter      = false
  draggingSplitPosition = undefined

  setSplitter = (splitPoint) ->
    splitPoint = Math.min(0.8, Math.max(0.2, parseFloat(splitPoint)))

    $('.pane.markdown').css('flex-grow', splitPoint * 100)
    $('.pane.preview').css('flex-grow', (1 - splitPoint) * 100)

    return splitPoint

  setEditorConfig = (editorConfig) ->
    editor = $(presenStates.codeMirror?.getWrapperElement())
    editor.css('font-family', editorConfig.fontFamily) if editor?
    editor.css('font-size', editorConfig.fontSize) if editor?

  $('.pane-splitter')
    .mousedown ->
      draggingSplitter = true
      draggingSplitPosition = undefined

    .dblclick ->
      MdsRenderer.sendToMain 'setConfig', 'splitterPosition', setSplitter(0.5)

  window.addEventListener 'mousemove', (e) ->
    if draggingSplitter
      draggingSplitPosition = setSplitter Math.min(Math.max(0, e.clientX), document.body.clientWidth) / document.body.clientWidth
  , false

  window.addEventListener 'mouseup', (e) ->
    draggingSplitter = false
    MdsRenderer.sendToMain 'setConfig', 'splitterPosition', draggingSplitPosition if draggingSplitPosition?
  , false

  responsePdfOpts = null

  # Events
  MdsRenderer
    .on 'publishPdf', (fname) ->
      presenStates.codeMirror.getInputField().blur()
      $('body').addClass 'exporting-pdf'

      presenStates.preview.send 'requestPdfOptions', { filename: fname }

    .on 'responsePdfOptions', (opts) ->
      # Wait loading resources
      startPublish = ->
        if loadingState is 'loading'
          setTimeout startPublish, 250
        else
          presenStates.preview.printToPDF
            marginsType: 1
            pageSize: opts.exportSize
            printBackground: true
          , (err, data) ->
            unless err
              MdsRenderer.sendToMain 'writeFile', opts.filename, data, { finalized: 'unfreeze' }
            else
              MdsRenderer.sendToMain 'unfreeze'

      setTimeout startPublish, 500

    .on 'unfreezed', ->
      presenStates.preview.send 'unfreeze'
      $('body').removeClass 'exporting-pdf'

    .on 'loadText', (buffer) ->
      presenStates._lockChangedStatus = true
      presenStates.codeMirror.setValue buffer
      presenStates.codeMirror.clearHistory()
      presenStates._lockChangedStatus = false

    .on 'setImageDirectory', (directories) -> presenStates.setImageDirectory directories

    # send text to save to main process and reload
    .on 'save', (fname, triggers = {}) ->
      MdsRenderer.sendToMain 'writeFile', fname, presenStates.codeMirror.getValue(), triggers
      MdsRenderer.sendToMain 'initializeState', fname

    .on 'viewMode', (mode) ->
      switch mode
        when 'markdown'
          presenStates.preview.send 'setClass', ''
        when 'screen'
          presenStates.preview.send 'setClass', 'slide-view screen'
        when 'list'
          presenStates.preview.send 'setClass', 'slide-view list'
        when 'presen-dev'
          presenStates.preview.send 'setClass', 'slide-view presen-dev'

      $('#preview-modes').removeClass('disabled')
      $('.viewmode-btn[data-viewmode]').removeClass('active')
        .filter("[data-viewmode='#{mode}']").addClass('active')

    .on 'editCommand', (command) -> presenStates.codeMirror.execCommand(command)

    .on 'openDevTool', ->
      if presenStates.preview.isDevToolsOpened()
        presenStates.preview.closeDevTools()
      else
        presenStates.preview.openDevTools()

    .on 'setEditorConfig', (editorConfig) -> setEditorConfig editorConfig
    .on 'setSplitter', (spliiterPos) -> setSplitter spliiterPos
    .on 'setTheme', (theme) -> presenStates.updateGlobalSetting '$theme', theme
    .on 'themeChanged', (theme) -> MdsRenderer.sendToMain 'themeChanged', theme
    .on 'resourceState', (state) -> loadingState = state

  # MickrClient================================================
  setting =
    "id": "presenIndex"
    "url": "ws://apps.wisdomweb.net:64260/ws/mik"
    "site": "test"
    "token": "Pad:9948"
  client = new MickrClient(setting)

  client.send "canReceiveEditorText",{
    "to": "index"
    "body":
      "content": ""
  }
  client.on "sendEditorText", (e, data)=>
    editorText = data.body.content
    console.log data.body.content
    presenStates.codeMirror.setValue(editorText)
  # ==========================================================

  webview = document.querySelector('#preview')

  webview.addEventListener 'ipc-message', (event) =>
     switch event.channel
       when "sendSlideInfo"   # webview からスライド情報を受信
        slideInfo = event.args[0]
        console.log 'receive sendSlideInfo'
        console.log slideInfo
        ipc.send 'textSend', slideInfo
        console.log 'send textSend'
        break

       when "requestSlideHTML"
        webview.send 'setSlide', slideHTML
        console.log 'send setSlide'
        break

  ipc.on 'presenDevInitialize', (e, text) =>
      console.log 'receive presenDevInitialize'
      console.log text
      slideHTML = text

  ipc.on 'goToPage', (e, page) =>
    console.log page
    webview.send 'goToPage', page


  # Initialize
  presenStates.codeMirror.focus()
  presenStates.refreshPage()
