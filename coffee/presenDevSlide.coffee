clsMarkdown = require './classes/mds_markdown'
ipc         = require('electron').ipcRenderer
Path        = require 'path'
MickrClient = require '../modules/MickrClient'

resolvePathFromMarp = (path = './') -> Path.resolve(__dirname, '../', path)

document.addEventListener 'DOMContentLoaded', ->
  setting =
   "id": "presenDevSlide"
   "url": "ws://apps.wisdomweb.net:64260/ws/mik"
   "site": "test"
   "token": "Pad:9948"
  client = new MickrClient(setting);

  changeSlide = (page) ->
    client.send "goToPage", {
      "to": "presenSlide",
      "body":
        "content": page
    }
    client.send "changeComment", {
      "to": "presenDevIndex",
      "body":
        "content": page
    }



  slideHTML = ""
  slideList = []
  # slideListの何番目の要素が現在選択されているか
  selectedIndex = 0

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
    # presenDev画面でははじめに一回だけ呼ばれる
    render = (md) ->
      console.log 'call render'
      applySlideSize md.settings.getGlobal('width'), md.settings.getGlobal('height')
      md.changedTheme = themes.apply md.settings.getGlobal('theme')
      # $('#markdown').html(slideHTML)

      # slideList要素それぞれからouterHTMLを取り出しリストに格納
      slideOuterHTML = []
      for i, value of slideList
        slideOuterHTML.push value.outerHTML

      $('#markdown').html(slideOuterHTML.join(' '))

      # はじめのスライドの色を変えておき、そのページが選択されていることを示す
      $('.slide_wrapper').css('backgroundColor', '')
      $('#1').css('backgroundColor', '#ffe3b4')
      changeSlide(1)

      # 押されたslide_wrapperのidを送信してページ遷移
      $('.slide_wrapper').on 'click', () ->
        # 選択されたスライドの色を変更し、　ページ遷移させる
        $('.slide_wrapper').css('backgroundColor', '')
        $(this).css('backgroundColor', '#ffe3b4')
        selectedIndex = slideList.indexOf(this)
        $("html,body").animate({scrollTop:$(this).offset().top});
        # ページ移動メッセージ送信
        #ipc.sendToHost 'goToPage', $(this).attr('id')
        changeSlide($(this).attr('id'))

      ipc.sendToHost 'rendered', md
      ipc.sendToHost 'rulerChanged', md.rulers if md.rulerChanged
      ipc.sendToHost 'themeChanged', md.changedTheme if md.changedTheme
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

    $(document).keydown (e) ->
      if e.keyCode == 38
        console.log 'up key'
        nextPageIndex = (selectedIndex + (slideList.length-1)) % slideList.length
        nextPageId    = slideList[nextPageIndex].id
        console.log 'next id = ' + nextPageId
        $('.slide_wrapper').css('backgroundColor', '')
        $("##{nextPageId}").css('backgroundColor', '#ffe3b4')
        selectedIndex = nextPageIndex
        #ipc.sendToHost 'goToPage', nextPageId
        changeSlide(nextPageId)
        $("html,body").animate({scrollTop:$("##{nextPageId}").offset().top});

      if e.keyCode == 40
        console.log 'down key'
        nextPageIndex = (selectedIndex + 1) % slideList.length
        nextPageId    = slideList[nextPageIndex].id
        console.log 'next id = ' + nextPageId
        $('.slide_wrapper').css('backgroundColor', '')
        $("##{nextPageId}").css('backgroundColor', '#ffe3b4')
        selectedIndex = nextPageIndex
        #ipc.sendToHost 'goToPage', nextPageId
        changeSlide(nextPageId)
        $("html,body").animate({scrollTop:$("##{nextPageId}").offset().top});

    $(window).resize (e) -> applyScreenSize()
    applyScreenSize()


    # presentation ========================

    ipc.on 'requestSlideInfo', () =>
      console.log 'receive requestSlideInfo'
      markdownBody = document.querySelector('.markdown-body')
     # console.log markdownBody.innerHTML
      ipc.sendToHost 'sendSlideInfo', markdownBody.innerHTML
      console.log markdownBody.innerHTML
      console.log 'send sendSlideInfo'

    ipc.sendToHost 'requestSlideHTML', () =>
      console.log 'send requestSlideHTML'

    ipc.on 'setSlide', (e, text) =>
      console.log 'receive setSlide'
      console.log text
      slideHTML = text.join("")
      document.querySelector('.markdown-body').innerHTML = slideHTML
      # slideList へpush
      $('.slide_wrapper').each (idx, elem) ->
        # HTMLObjectをpush
        slideList.push elem

    # slide sort
    $('.markdown-body').sortable {
      'opacity': 0.5
    }
    $('.markdown-body').disableSelection()
    $(document).on 'sortstop', '.markdown-body', () ->
      console.log 'sort finished'
      # slideList update
      slideList = []
      $('.slide_wrapper').each (idx, elem) ->
       slideList.push elem




