highlightJs  = require 'highlight.js'
twemoji      = require 'twemoji'
extend       = require 'extend'
markdownIt   = require 'markdown-it'
Path         = require 'path'
MdsMdSetting = require './mds_md_setting'
{exist}      = require './mds_file'

module.exports = class MdsMarkdown
  @slideTagOpen:  (page) -> '<div class="slide_wrapper" id="' + page + '"><div class="slide"><div class="slide_bg"></div><div class="slide_inner">'
  @slideTagClose: (page) -> '</div><footer class="slide_footer"></footer><span class="slide_page" data-page="' + page + '">' + page + '</span></div></div>'

  @highlighter: (code, lang) ->
    if lang?
      if lang == 'text' or lang == 'plain'
        return ''
      else if highlightJs.getLanguage(lang)
        try
          return highlightJs.highlight(lang, code).value

    highlightJs.highlightAuto(code).value

  @default:
    options:
      html: true
      xhtmlOut: true
      breaks: true
      linkify: true
      highlight: @highlighter

    plugins:
      'markdown-it-mark': {}
      'markdown-it-emoji':
        shortcuts: {}
      'markdown-it-katex': {}
      'markdown-it-video': {
        youtube: { width: 640, height: 390 }
        vimeo: { width: 500, height: 281 }
        vine: { width: 600, height: 600, embed: 'simple' }
        prezi: { width: 550, height: 400 }
      }

    twemoji:
      base: Path.resolve(__dirname, '../../node_modules/twemoji/2') + Path.sep
      size: 'svg'
      ext: '.svg'

 # create MarkdownIt object and apply plugins
 # return markdown-it instance
  @createMarkdownIt: (opts, plugins) ->
    md = markdownIt(opts)
    md.use(require(plugName), plugOpts ? {}) for plugName, plugOpts of plugins
    COMMNET_BLOCK_OPNE_RE = /^{##\s*$/
    COMMNET_BLOCK_CLOSE_RE = /^(.+\s+|\s*)##}$/
    COMMNET_INLINE_RE = /^{## .* ##}/

    # ブロックコメントルール
    block_comment_rule = (state, startLine, endLine, silent)->
      #var ch, match, nextLine, token,
      pos = state.bMarks[startLine]
      max = state.eMarks[startLine]
      shift = state.tShift[startLine]

      pos += shift

      if (pos + 2 >= max)
        return false

      ch = state.src.charCodeAt(pos)

      # Probably start
      if (ch == 0x7B) # 0x7B は {
          # opening tag
          match = state.src.slice(pos, max).match(COMMNET_BLOCK_OPNE_RE);
          if (!match)
           return false
      else
          return false
      # silentがよく分かってません；；
      # おそらくvalidation modeでの動作だと思われる
      if (silent)
       return true

      # search a end tag
      nextLine = startLine;
      while (nextLine < state.lineMax)
          nextLine++;
          pos = state.bMarks[nextLine]
          max = state.eMarks[nextLine]
          if (pos + state.tShift[nextLine] + 2 <= max)
              if(state.src.slice(pos, max).match(COMMNET_BLOCK_CLOSE_RE))
                  nextLine++;
                  break;

      state.line = nextLine;
      token         = state.push('comment_block', '', 0);
      token.map     = [ startLine, state.line ];
      token.content = state.getLines(startLine, nextLine, 0, true);

      return true

    # インラインコメントルール
    inline_comment_rule = (state, silent)->
      #var ch, code, match,
      pos = state.pos
      max = state.posMax;

      if (state.src.charCodeAt(pos) != 0x7B) # 0x78 は {
          return false

      if (pos + 1 < max)
          ch = state.src.charCodeAt(pos + 1);

          if (ch == 0x23)#  0x23 は *
              match = state.src.slice(pos).match(COMMNET_INLINE_RE);
              if (match)
                  state.pos += match[0].length;
                  return true;
      return false


    # 'fence'や'image'は既に追加されているルール名で，それの後にコメントルールを適用する．
    # 'comment_block'は次のレンダリングルール名と合わせる必要あり．
    md.block.ruler.after('fence', 'comment_block',block_comment_rule);
    md.inline.ruler.after('image', 'comment_block',inline_comment_rule);

    #追加したコメントのルールにマッチングする文字列の処理を追加する
    comment_render_rule = (tokens, idx, options, env, self)->
      #今回はコメントアウトするので，ブランク文字列を返却するだけ
      return  '';

    #'comment_block'はrulerを追加した時の第２引数と合わせる
    md.renderer.rules.comment_block = comment_render_rule;
    md

  @generateAfterRender: ($) ->
    (md) ->
      mdElm = $("<div>#{md.parsed}</div>")
      # set background image
      #bgが単語としてalt属性の値に現れるp直下のimg要素を対象とする
      mdElm.find('p > img[alt~="bg"]').each ->
        $t  = $(@)
        p   = $t.parent()
        bg  = $t.parents('.slide_wrapper').find('.slide_bg')
        src = $t[0].src
        alt = $t.attr('alt')
        elm = $('<div class="slide_bg_img"></div>').css('backgroundImage', "url(#{src})").attr('data-alt', alt)

        for opt in alt.split(/\s+/)
          elm.css('backgroundSize', "#{m[1]}%") if m = opt.match(/^(\d+(?:\.\d+)?)%$/)

        elm.appendTo(bg)
        $t.remove()
        p.remove() if p.children(':not(br)').length == 0 && /^\s*$/.test(p.text())

      mdElm.find('img[alt*="%"]').each ->
        for opt in $(@).attr('alt').split(/\s+/)
          if m = opt.match(/^(\d+(?:\.\d+)?)%$/)
            $(@).css('zoom', parseFloat(m[1]) / 100.0)

      mdElm
        .children('.slide_wrapper')
        .each ->
          $t = $(@)

          # Page directives for themes
          page = $t[0].id
          for prop, val of md.settings.getAt(+page, false)
            $t.attr("data-#{prop}", val)
            $t.find('footer.slide_footer:last').text(val) if prop == 'footer'

          # Detect "only-***" elements
          inner = $t.find('.slide > .slide_inner')
          innerContents = inner.children().filter(':not(base, link, meta, noscript, script, style, template, title)')

          headsLength = inner.children(':header').length
          $t.addClass('only-headings') if headsLength > 0 && innerContents.length == headsLength

          quotesLength = inner.children('blockquote').length
          $t.addClass('only-blockquotes') if quotesLength > 0 && innerContents.length == quotesLength

      md.parsed = mdElm.html()

  rulers: []
  settings: new MdsMdSetting
  afterRender: null
  twemojiOpts: {}

  constructor: (settings) ->
    opts         = extend({}, MdsMarkdown.default.options, settings?.options || {})
    plugins      = extend({}, MdsMarkdown.default.plugins, settings?.plugins || {})
    @twemojiOpts = extend({}, MdsMarkdown.default.twemoji, settings?.twemoji || {})
    @afterRender = settings?.afterRender || null
    @markdown    = MdsMarkdown.createMarkdownIt.call(@, opts, plugins)
    @afterCreate()

  afterCreate: =>
    md      = @markdown
    {rules} = md.renderer

    defaultRenderers =
      image:      rules.image
      html_block: rules.html_block

    # markdown-itのルールを上書き
    # markdown-itのルールはオブジェクトになっており、キーに対してその関数が入っている
    # applyの第一引数に渡したものは、applyで呼び出した先の関数のthisで扱える
    extend rules,
      emoji: (token, idx) =>
        twemoji.parse(token[idx].content, @twemojiOpts)

      hr: (token, idx) =>
        ruler.push token[idx].map[0] if ruler = @_rulers
        "#{MdsMarkdown.slideTagClose(ruler.length || '')}#{MdsMarkdown.slideTagOpen(if ruler then ruler.length + 1 else '')}"

      image: (args...) =>
        @renderers.image.apply(@, args)
        defaultRenderers.image.apply(@, args)

      html_block: (args...) =>
        @renderers.html_block.apply(@, args)
        defaultRenderers.html_block.apply(@, args)

  # ルールをいくつか上書きしたmarkdown-itでパースする
  parse: (markdown) =>
    @_rulers          = []
    @_settings        = new MdsMdSetting
    @settingsPosition = []
    @lastParsed       = """
                        #{MdsMarkdown.slideTagOpen(1)}
                        #{@markdown.render markdown}
                        #{MdsMarkdown.slideTagClose(@_rulers.length + 1)}
                        """
    ret =
      parsed: @lastParsed
      settingsPosition: @settingsPosition
      rulerChanged: @rulers.join(",") != @_rulers.join(",")

    @rulers   = ret.rulers   = @_rulers
    @settings = ret.settings = @_settings

    @afterRender(ret) if @afterRender?
    ret

  renderers:
    image: (tokens, idx, options, env, self) ->
      src = decodeURIComponent(tokens[idx].attrs[tokens[idx].attrIndex('src')][1])
      tokens[idx].attrs[tokens[idx].attrIndex('src')][1] = src if exist(src)

    html_block: (tokens, idx, options, env, self) ->
      {content} = tokens[idx]
      return if content.substring(0, 3) isnt '<!-'

      if matched = /^(<!-{2,}\s*)([\s\S]*?)\s*-{2,}>$/m.exec(content)
        spaceLines = matched[1].split("\n")
        lineIndex  = tokens[idx].map[0] + spaceLines.length - 1
        startFrom  = spaceLines[spaceLines.length - 1].length

        for mathcedLine in matched[2].split("\n")
          parsed = /^(\s*)(([\$\*]?)(\w+)\s*:\s*(.*))\s*$/.exec(mathcedLine)

          if parsed
            startFrom += parsed[1].length
            pageIdx = @_rulers.length || 0

            if parsed[3] is '$'
              @_settings.setGlobal parsed[4], parsed[5]
            else
              @_settings.set pageIdx + 1, parsed[4], parsed[5], parsed[3] is '*'

            @settingsPosition.push
              pageIdx: pageIdx
              lineIdx: lineIndex
              from: startFrom
              length: parsed[2].length
              property: "#{parsed[3]}#{parsed[4]}"
              value: parsed[5]

          lineIndex++
          startFrom = 0
