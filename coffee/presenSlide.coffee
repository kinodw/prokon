clsMarkdown = require './classes/mds_markdown'
ipc         = require('electron').ipcRenderer
Path        = require 'path'
MickrClient = require '../modules/MickrClient'

resolvePathFromMarp = (path = './') -> Path.resolve(__dirname, '../', path)

document.addEventListener 'DOMContentLoaded', ->
  $ = window.jQuery = window.$ = require('jquery')

  do ($) ->
    # First, resolve Marp resources path
    $("[data-marp-path-resolver]").each ->
      for target in $(@).attr('data-marp-path-resolver').split(/\s+/)
        $(@).attr(target, resolvePathFromMarp($(@).attr(target)))

    Markdown = new clsMarkdown({ afterRender: clsMarkdown.generateAfterRender($) })

    themes = {}
    themes.current = -> $('#theme-css').attr('href')
    themes.default = themes.current()
    themes.apply = (path = null) ->
      toApply = resolvePathFromMarp(path || themes.default)

      if toApply isnt themes.current()
        $('#theme-css').attr('href', toApply)
        setTimeout applyScreenSize, 20

        return toApply.match(/([^\/]+)\.css$/)[1]
      false

    setStyle = (identifier, css) ->
      id  = "mds-#{identifier}Style"
      elm = $("##{id}")
      elm = $("<style id=\"#{id}\"></style>").appendTo(document.head) if elm.length <= 0
      elm.text(css)

    getCSSvar = (prop) -> document.defaultView.getComputedStyle(document.body).getPropertyValue(prop)

    getSlideSize = ->
      size =
        w: +getCSSvar '--slide-width'
        h: +getCSSvar '--slide-height'

      size.ratio = size.w / size.h
      size

    applySlideSize = (width, height) ->
      setStyle 'slideSize',
        """
        body {
          --slide-width: #{width || 'inherit'};
          --slide-height: #{height || 'inherit'};
        }
        """
      applyScreenSize()

    getScreenSize = ->
      size =
        w: document.documentElement.clientWidth
        h: document.documentElement.clientHeight

      previewMargin = +getCSSvar '--preview-margin'
      size.ratio = (size.w - previewMargin * 2) / (size.h - previewMargin * 2)
      size

    applyScreenSize = ->
      size = getScreenSize()
      setStyle 'screenSize', "body { --screen-width: #{size.w}; --screen-height: #{size.h}; }"
      $('#container').toggleClass 'height-base', size.ratio > getSlideSize().ratio

    # ページ番号を受け取ったあと、現在のページ以外のページのスライドを非表示にする
    # ただし、非プリント状態の時限定
    applyCurrentPage = (page) ->
      setStyle 'currentPage',
        """
        @media not print {
          body.slide-view.screen .slide_wrapper:not(:nth-of-type(#{page})) {
            width: 0 !important;
            height: 0 !important;
            border: none !important;
            box-shadow: none !important;
          }
        }
        """

    render = (md) ->
      applySlideSize md.settings.getGlobal('width'), md.settings.getGlobal('height')
      md.changedTheme = themes.apply md.settings.getGlobal('theme')
      $('#markdown').html(md.parsed)

      # youtube plugin replacement ex. @[youtube](https://~)
      # if url = $('.embed-responsive-item').attr('src')
      #   console.log url
      #   console.log url.indexOf("file:")
      #   url = 'https:' + url
      #   $('.embed-responsive-item').attr('src', url)

      ipc.sendToHost 'rendered', md
      ipc.sendToHost 'rulerChanged', md.rulers if md.rulerChanged
      ipc.sendToHost 'themeChanged', md.changedTheme if md.changedTheme

    sendPdfOptions = (opts) ->
      slideSize = getSlideSize()

      opts.exportSize =
        width:  Math.floor(slideSize.w * 25400 / 96)
        height: Math.floor(slideSize.h * 25400 / 96)

      # Load slide resources
      $('body').addClass 'to-pdf'
      setTimeout (-> ipc.sendToHost 'responsePdfOptions', opts), 0

    setImageDirectory = (dir) -> $('head > base').attr('href', dir || './')

    ipc.on 'render', (e, md) -> render(Markdown.parse(md))
    ipc.on 'currentPage', (e, page) -> applyCurrentPage page
    ipc.on 'setClass', (e, classes) -> $('body').attr 'class', classes
    ipc.on 'setImageDirectory', (e, dir) -> setImageDirectory(dir)
    ipc.on 'requestPdfOptions', (e, opts) -> sendPdfOptions(opts || {})
    ipc.on 'unfreeze', -> $('body').removeClass('to-pdf')

    # Initialize
    $(document).on 'click', 'a', (e) ->
      e.preventDefault()
      ipc.sendToHost 'linkTo', $(e.currentTarget).attr('href')

    $(window).resize (e) -> applyScreenSize()
    applyScreenSize()


    # presentation ========================
    setting =
     "id": "presenSlide"
     "url": "ws://apps.wisdomweb.net:64260/ws/mik"
     "site": "test"
     "token": "Pad:9948"

    client = new MickrClient(setting);

    client.on "goToPage", (e, data)=>
      page = data.body.content
      applyCurrentPage page

    # markdownBodyをオブジェクトで送信するVer
    ipc.on 'requestSlideInfo', () =>
      console.log 'receive requestSlideInfo'
      markdownBody = []
      $('.slide_wrapper').each (idx, elem) =>
        markdownBody.push elem.outerHTML # <div class=slide_wrapper id=1> ...
      console.log markdownBody
      ipc.sendToHost 'sendSlideInfo', markdownBody
      console.log 'send sendSlideInfo'

    ipc.sendToHost 'requestSlideHTML', () =>
      console.log 'send requestSlideHTML'

    ipc.on 'setSlide', (e, text) =>
      console.log 'receive setSlide'
      console.log text
      console.log $('.markdown-body').html(text)

    ipc.on 'goToPage', (e, page) =>
      console.log page
      applyCurrentPage page


