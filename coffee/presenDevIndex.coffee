ipc = require('electron').ipcRenderer
{shell, webFrame} = require 'electron'
MdsMenu           = require './js/classes/mds_menu'
clsMdsRenderer    = require './js/classes/mds_renderer'
MdsRenderer       = new clsMdsRenderer
MickrClient       = require './modules/MickrClient'

MdsRenderer.requestAccept()
#webFrame.setZoomLevelLimits(1, 1)

class PresenDevStates
  comment = []
  currentPage: null
  previewInitialized: false
  lastRendered: {}

  _lockChangedStatus: false
  _imageDirectory: null

  constructor: (@preview) ->
    @initializePreview()
    # @initializeStopWatch()


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
        @preview.send 'render', ""

  openLink: (link) =>
    shell.openExternal link if /^https?:\/\/.+/.test(link)

  initializeStopWatch: =>

    time = 0
    mid = 0

    min_time = 0
    sec_time = 0

    now = null
    count = null

    min = $("#min")
    sec = $("#sec")

    start = $("#start")
    stop = $("#stop")
    reset = $("#reset")

    #startボタンが押された時の処理
    start.click () ->
        now = new Date() #現在時刻
        count = setInterval(counter, 10)
        toggle()
        reset.css("color", "#FF9194")

    #stopボタンが押された時の処理
    stop.click () ->
        mid += (new Date() - now)/1000
        clearInterval(count)
        toggle()
        reset.css("color", "red")


    #resetボタンが押された時の処理
    reset.click () ->
        mid = 0
        min.html("0")
        sec.html("00.00")
        reset.css("color", "gray")
        reset.prop("disabled", true)

    #時間の計算
    counter = ()->
        time = mid + ((new Date() - now)/1000)

        #60秒経過した時の処理
        if(time > 60)
            mid = 0
            min_time++
            now = new Date()
            time = 0
            sec.html()


        #秒数が10秒より小さかったら01, 02のようにする
        if(time < 10)
            sec.html("0"+time.toFixed(2))
        else
            sec.html(time.toFixed(2))
        min.html(min_time);


    #ボタンの切り替え
    toggle = () ->
        if(!start.prop("disabled"))
            start.prop("disabled", true);
            stop.prop("disabled", false);
            reset.prop("disabled", true);
        else
            start.prop("disabled", false);
            stop.prop("disabled", true);
            reset.prop("disabled", false);

do ->

  slideHTML = ""
  presenDevStates = new PresenDevStates(
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
    .on 'viewMode', (mode) ->
      switch mode
        when 'markdown'
          presenDevStates.preview.send 'setClass', ''
        when 'screen'
          presenDevStates.preview.send 'setClass', 'slide-view screen'
        when 'list'
          presenDevStates.preview.send 'setClass', 'slide-view list'
        when 'presen-dev'
          presenDevStates.preview.send 'setClass', 'slide-view presen-dev'

      $('#preview-modes').removeClass('disabled')
      $('.viewmode-btn[data-viewmode]').removeClass('active')
        .filter("[data-viewmode='#{mode}']").addClass('active')

    .on 'openDevTool', ->
      if presenDevStates.preview.isDevToolsOpened()
        presenDevStates.preview.closeDevTools()
      else
        presenDevStates.preview.openDevTools()

    .on 'setSplitter', (spliiterPos) -> setSplitter spliiterPos
    .on 'setTheme', (theme) -> presenDevStates.updateGlobalSetting '$theme', theme
    .on 'resourceState', (state) -> loadingState = state
##################################################
  setting =
    "id": "presenDevIndex"
    "url": "ws://apps.wisdomweb.net:64260/ws/mik"
    "site": "test"
    "token": "Pad:9948"
  client = new MickrClient(setting)
    # コメント受信
  client.on "sendComment", (e, data) =>
    @comment = [].concat(data.body.content)
    console.log @comment

  client.send "canReceiveComment", {
    "to": "index"
    "body":
      "content": ""
    }

  client.on "changeComment", (e,data) =>
    id = data.body.content
    $('#comment').text(comment[id-1])

  # presenDevウインドウが開いたら、そこでタイマー開始

  $("#t").timer({
        action: 'start',
        seconds: 0,
        });
  $("#t").addClass("badge-important");
  $('#btn1').removeClass("icon icon-play");
  $('#btn1').addClass('icon icon-pause')



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
       when "goToPage"
        page = event.args[0]
        console.log page
        ipc.send 'goToPage', page

  ipc.on 'presenDevInitialize', (e, text) =>
      console.log 'receive presenDevInitialize'
      console.log text
      slideHTML = text
