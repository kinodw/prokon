var MdsMarkdown, MdsMdSetting, Path, exist, extend, highlightJs, markdownIt, twemoji,
  bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  slice = [].slice;

highlightJs = require('highlight.js');

twemoji = require('twemoji');

extend = require('extend');

markdownIt = require('markdown-it');

Path = require('path');

MdsMdSetting = require('./mds_md_setting');

exist = require('./mds_file').exist;

module.exports = MdsMarkdown = (function() {
  MdsMarkdown.slideTagOpen = function(page) {
    return '<div class="slide_wrapper" id="' + page + '"><div class="slide"><div class="slide_bg"></div><div class="slide_inner">';
  };

  MdsMarkdown.slideTagClose = function(page) {
    return '</div><footer class="slide_footer"></footer><span class="slide_page" data-page="' + page + '">' + page + '</span></div></div>';
  };

  MdsMarkdown.highlighter = function(code, lang) {
    if (lang != null) {
      if (lang === 'text' || lang === 'plain') {
        return '';
      } else if (highlightJs.getLanguage(lang)) {
        try {
          return highlightJs.highlight(lang, code).value;
        } catch (error) {}
      }
    }
    return highlightJs.highlightAuto(code).value;
  };

  MdsMarkdown["default"] = {
    options: {
      html: true,
      xhtmlOut: true,
      breaks: true,
      linkify: true,
      highlight: MdsMarkdown.highlighter
    },
    plugins: {
      'markdown-it-mark': {},
      'markdown-it-emoji': {
        shortcuts: {}
      },
      'markdown-it-katex': {},
      'markdown-it-video': {
        youtube: {
          width: 640,
          height: 390
        },
        vimeo: {
          width: 500,
          height: 281
        },
        vine: {
          width: 600,
          height: 600,
          embed: 'simple'
        },
        prezi: {
          width: 550,
          height: 400
        }
      }
    },
    twemoji: {
      base: Path.resolve(__dirname, '../../node_modules/twemoji/2') + Path.sep,
      size: 'svg',
      ext: '.svg'
    }
  };

  MdsMarkdown.createMarkdownIt = function(opts, plugins) {
    var COMMNET_BLOCK_CLOSE_RE, COMMNET_BLOCK_OPNE_RE, COMMNET_INLINE_RE, block_comment_rule, comment_render_rule, inline_comment_rule, md, plugName, plugOpts;
    md = markdownIt(opts);
    for (plugName in plugins) {
      plugOpts = plugins[plugName];
      md.use(require(plugName), plugOpts != null ? plugOpts : {});
    }
    COMMNET_BLOCK_OPNE_RE = /^{##\s*$/;
    COMMNET_BLOCK_CLOSE_RE = /^(.+\s+|\s*)##}$/;
    COMMNET_INLINE_RE = /^{## .* ##}/;
    block_comment_rule = function(state, startLine, endLine, silent) {
      var ch, match, max, nextLine, pos, shift, token;
      pos = state.bMarks[startLine];
      max = state.eMarks[startLine];
      shift = state.tShift[startLine];
      pos += shift;
      if (pos + 2 >= max) {
        return false;
      }
      ch = state.src.charCodeAt(pos);
      if (ch === 0x7B) {
        match = state.src.slice(pos, max).match(COMMNET_BLOCK_OPNE_RE);
        if (!match) {
          return false;
        }
      } else {
        return false;
      }
      if (silent) {
        return true;
      }
      nextLine = startLine;
      while (nextLine < state.lineMax) {
        nextLine++;
        pos = state.bMarks[nextLine];
        max = state.eMarks[nextLine];
        if (pos + state.tShift[nextLine] + 2 <= max) {
          if (state.src.slice(pos, max).match(COMMNET_BLOCK_CLOSE_RE)) {
            nextLine++;
            break;
          }
        }
      }
      state.line = nextLine;
      token = state.push('comment_block', '', 0);
      token.map = [startLine, state.line];
      token.content = state.getLines(startLine, nextLine, 0, true);
      return true;
    };
    inline_comment_rule = function(state, silent) {
      var ch, match, max, pos;
      pos = state.pos;
      max = state.posMax;
      if (state.src.charCodeAt(pos) !== 0x7B) {
        return false;
      }
      if (pos + 1 < max) {
        ch = state.src.charCodeAt(pos + 1);
        if (ch === 0x23) {
          match = state.src.slice(pos).match(COMMNET_INLINE_RE);
          if (match) {
            state.pos += match[0].length;
            return true;
          }
        }
      }
      return false;
    };
    md.block.ruler.after('fence', 'comment_block', block_comment_rule);
    md.inline.ruler.after('image', 'comment_block', inline_comment_rule);
    comment_render_rule = function(tokens, idx, options, env, self) {
      return '';
    };
    md.renderer.rules.comment_block = comment_render_rule;
    return md;
  };

  MdsMarkdown.generateAfterRender = function($) {
    return function(md) {
      var mdElm;
      mdElm = $("<div>" + md.parsed + "</div>");
      mdElm.find('p > img[alt~="bg"]').each(function() {
        var $t, alt, bg, elm, i, len, m, opt, p, ref, src;
        $t = $(this);
        p = $t.parent();
        bg = $t.parents('.slide_wrapper').find('.slide_bg');
        src = $t[0].src;
        alt = $t.attr('alt');
        elm = $('<div class="slide_bg_img"></div>').css('backgroundImage', "url(" + src + ")").attr('data-alt', alt);
        ref = alt.split(/\s+/);
        for (i = 0, len = ref.length; i < len; i++) {
          opt = ref[i];
          if (m = opt.match(/^(\d+(?:\.\d+)?)%$/)) {
            elm.css('backgroundSize', m[1] + "%");
          }
        }
        elm.appendTo(bg);
        $t.remove();
        if (p.children(':not(br)').length === 0 && /^\s*$/.test(p.text())) {
          return p.remove();
        }
      });
      mdElm.find('img[alt*="%"]').each(function() {
        var i, len, m, opt, ref, results;
        ref = $(this).attr('alt').split(/\s+/);
        results = [];
        for (i = 0, len = ref.length; i < len; i++) {
          opt = ref[i];
          if (m = opt.match(/^(\d+(?:\.\d+)?)%$/)) {
            results.push($(this).css('zoom', parseFloat(m[1]) / 100.0));
          } else {
            results.push(void 0);
          }
        }
        return results;
      });
      mdElm.children('.slide_wrapper').each(function() {
        var $t, headsLength, inner, innerContents, page, prop, quotesLength, ref, val;
        $t = $(this);
        page = $t[0].id;
        ref = md.settings.getAt(+page, false);
        for (prop in ref) {
          val = ref[prop];
          $t.attr("data-" + prop, val);
          if (prop === 'footer') {
            $t.find('footer.slide_footer:last').text(val);
          }
        }
        inner = $t.find('.slide > .slide_inner');
        innerContents = inner.children().filter(':not(base, link, meta, noscript, script, style, template, title)');
        headsLength = inner.children(':header').length;
        if (headsLength > 0 && innerContents.length === headsLength) {
          $t.addClass('only-headings');
        }
        quotesLength = inner.children('blockquote').length;
        if (quotesLength > 0 && innerContents.length === quotesLength) {
          return $t.addClass('only-blockquotes');
        }
      });
      return md.parsed = mdElm.html();
    };
  };

  MdsMarkdown.prototype.rulers = [];

  MdsMarkdown.prototype.settings = new MdsMdSetting;

  MdsMarkdown.prototype.afterRender = null;

  MdsMarkdown.prototype.twemojiOpts = {};

  function MdsMarkdown(settings) {
    this.parse = bind(this.parse, this);
    this.afterCreate = bind(this.afterCreate, this);
    var opts, plugins;
    opts = extend({}, MdsMarkdown["default"].options, (settings != null ? settings.options : void 0) || {});
    plugins = extend({}, MdsMarkdown["default"].plugins, (settings != null ? settings.plugins : void 0) || {});
    this.twemojiOpts = extend({}, MdsMarkdown["default"].twemoji, (settings != null ? settings.twemoji : void 0) || {});
    this.afterRender = (settings != null ? settings.afterRender : void 0) || null;
    this.markdown = MdsMarkdown.createMarkdownIt.call(this, opts, plugins);
    this.afterCreate();
  }

  MdsMarkdown.prototype.afterCreate = function() {
    var defaultRenderers, md, rules;
    md = this.markdown;
    rules = md.renderer.rules;
    defaultRenderers = {
      image: rules.image,
      html_block: rules.html_block
    };
    return extend(rules, {
      emoji: (function(_this) {
        return function(token, idx) {
          return twemoji.parse(token[idx].content, _this.twemojiOpts);
        };
      })(this),
      hr: (function(_this) {
        return function(token, idx) {
          var ruler;
          if (ruler = _this._rulers) {
            ruler.push(token[idx].map[0]);
          }
          return "" + (MdsMarkdown.slideTagClose(ruler.length || '')) + (MdsMarkdown.slideTagOpen(ruler ? ruler.length + 1 : ''));
        };
      })(this),
      image: (function(_this) {
        return function() {
          var args;
          args = 1 <= arguments.length ? slice.call(arguments, 0) : [];
          _this.renderers.image.apply(_this, args);
          return defaultRenderers.image.apply(_this, args);
        };
      })(this),
      html_block: (function(_this) {
        return function() {
          var args;
          args = 1 <= arguments.length ? slice.call(arguments, 0) : [];
          _this.renderers.html_block.apply(_this, args);
          return defaultRenderers.html_block.apply(_this, args);
        };
      })(this)
    });
  };

  MdsMarkdown.prototype.parse = function(markdown) {
    var ret;
    this._rulers = [];
    this._settings = new MdsMdSetting;
    this.settingsPosition = [];
    this.lastParsed = (MdsMarkdown.slideTagOpen(1)) + "\n" + (this.markdown.render(markdown)) + "\n" + (MdsMarkdown.slideTagClose(this._rulers.length + 1));
    ret = {
      parsed: this.lastParsed,
      settingsPosition: this.settingsPosition,
      rulerChanged: this.rulers.join(",") !== this._rulers.join(",")
    };
    this.rulers = ret.rulers = this._rulers;
    this.settings = ret.settings = this._settings;
    if (this.afterRender != null) {
      this.afterRender(ret);
    }
    return ret;
  };

  MdsMarkdown.prototype.renderers = {
    image: function(tokens, idx, options, env, self) {
      var src;
      src = decodeURIComponent(tokens[idx].attrs[tokens[idx].attrIndex('src')][1]);
      if (exist(src)) {
        return tokens[idx].attrs[tokens[idx].attrIndex('src')][1] = src;
      }
    },
    html_block: function(tokens, idx, options, env, self) {
      var content, i, len, lineIndex, matched, mathcedLine, pageIdx, parsed, ref, results, spaceLines, startFrom;
      content = tokens[idx].content;
      if (content.substring(0, 3) !== '<!-') {
        return;
      }
      if (matched = /^(<!-{2,}\s*)([\s\S]*?)\s*-{2,}>$/m.exec(content)) {
        spaceLines = matched[1].split("\n");
        lineIndex = tokens[idx].map[0] + spaceLines.length - 1;
        startFrom = spaceLines[spaceLines.length - 1].length;
        ref = matched[2].split("\n");
        results = [];
        for (i = 0, len = ref.length; i < len; i++) {
          mathcedLine = ref[i];
          parsed = /^(\s*)(([\$\*]?)(\w+)\s*:\s*(.*))\s*$/.exec(mathcedLine);
          if (parsed) {
            startFrom += parsed[1].length;
            pageIdx = this._rulers.length || 0;
            if (parsed[3] === '$') {
              this._settings.setGlobal(parsed[4], parsed[5]);
            } else {
              this._settings.set(pageIdx + 1, parsed[4], parsed[5], parsed[3] === '*');
            }
            this.settingsPosition.push({
              pageIdx: pageIdx,
              lineIdx: lineIndex,
              from: startFrom,
              length: parsed[2].length,
              property: "" + parsed[3] + parsed[4],
              value: parsed[5]
            });
          }
          lineIndex++;
          results.push(startFrom = 0);
        }
        return results;
      }
    }
  };

  return MdsMarkdown;

})();

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xhc3Nlcy9tZHNfbWFya2Rvd24uanMiLCJzb3VyY2VzIjpbImNsYXNzZXMvbWRzX21hcmtkb3duLmNvZmZlZSJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxJQUFBLGdGQUFBO0VBQUE7OztBQUFBLFdBQUEsR0FBZSxPQUFBLENBQVEsY0FBUjs7QUFDZixPQUFBLEdBQWUsT0FBQSxDQUFRLFNBQVI7O0FBQ2YsTUFBQSxHQUFlLE9BQUEsQ0FBUSxRQUFSOztBQUNmLFVBQUEsR0FBZSxPQUFBLENBQVEsYUFBUjs7QUFDZixJQUFBLEdBQWUsT0FBQSxDQUFRLE1BQVI7O0FBQ2YsWUFBQSxHQUFlLE9BQUEsQ0FBUSxrQkFBUjs7QUFDZCxRQUFjLE9BQUEsQ0FBUSxZQUFSOztBQUVmLE1BQU0sQ0FBQyxPQUFQLEdBQXVCO0VBQ3JCLFdBQUMsQ0FBQSxZQUFELEdBQWdCLFNBQUMsSUFBRDtXQUFVLGlDQUFBLEdBQW9DLElBQXBDLEdBQTJDO0VBQXJEOztFQUNoQixXQUFDLENBQUEsYUFBRCxHQUFnQixTQUFDLElBQUQ7V0FBVSxrRkFBQSxHQUFxRixJQUFyRixHQUE0RixJQUE1RixHQUFtRyxJQUFuRyxHQUEwRztFQUFwSDs7RUFFaEIsV0FBQyxDQUFBLFdBQUQsR0FBYyxTQUFDLElBQUQsRUFBTyxJQUFQO0lBQ1osSUFBRyxZQUFIO01BQ0UsSUFBRyxJQUFBLEtBQVEsTUFBUixJQUFrQixJQUFBLEtBQVEsT0FBN0I7QUFDRSxlQUFPLEdBRFQ7T0FBQSxNQUVLLElBQUcsV0FBVyxDQUFDLFdBQVosQ0FBd0IsSUFBeEIsQ0FBSDtBQUNIO0FBQ0UsaUJBQU8sV0FBVyxDQUFDLFNBQVosQ0FBc0IsSUFBdEIsRUFBNEIsSUFBNUIsQ0FBaUMsQ0FBQyxNQUQzQztTQUFBLGlCQURHO09BSFA7O1dBT0EsV0FBVyxDQUFDLGFBQVosQ0FBMEIsSUFBMUIsQ0FBK0IsQ0FBQztFQVJwQjs7RUFVZCxXQUFDLEVBQUEsT0FBQSxFQUFELEdBQ0U7SUFBQSxPQUFBLEVBQ0U7TUFB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QUFBLHFDQUFBOztVQUNFLE1BQUEsR0FBUyx1Q0FBdUMsQ0FBQyxJQUF4QyxDQUE2QyxXQUE3QztVQUVULElBQUcsTUFBSDtZQUNFLFNBQUEsSUFBYSxNQUFPLENBQUEsQ0FBQSxDQUFFLENBQUM7WUFDdkIsT0FBQSxHQUFVLElBQUMsQ0FBQSxPQUFPLENBQUMsTUFBVCxJQUFtQjtZQUU3QixJQUFHLE1BQU8sQ0FBQSxDQUFBLENBQVAsS0FBYSxHQUFoQjtjQUNFLElBQUMsQ0FBQSxTQUFTLENBQUMsU0FBWCxDQUFxQixNQUFPLENBQUEsQ0FBQSxDQUE1QixFQUFnQyxNQUFPLENBQUEsQ0FBQSxDQUF2QyxFQURGO2FBQUEsTUFBQTtjQUdFLElBQUMsQ0FBQSxTQUFTLENBQUMsR0FBWCxDQUFlLE9BQUEsR0FBVSxDQUF6QixFQUE0QixNQUFPLENBQUEsQ0FBQSxDQUFuQyxFQUF1QyxNQUFPLENBQUEsQ0FBQSxDQUE5QyxFQUFrRCxNQUFPLENBQUEsQ0FBQSxDQUFQLEtBQWEsR0FBL0QsRUFIRjs7WUFLQSxJQUFDLENBQUEsZ0JBQWdCLENBQUMsSUFBbEIsQ0FDRTtjQUFBLE9BQUEsRUFBUyxPQUFUO2NBQ0EsT0FBQSxFQUFTLFNBRFQ7Y0FFQSxJQUFBLEVBQU0sU0FGTjtjQUdBLE1BQUEsRUFBUSxNQUFPLENBQUEsQ0FBQSxDQUFFLENBQUMsTUFIbEI7Y0FJQSxRQUFBLEVBQVUsRUFBQSxHQUFHLE1BQU8sQ0FBQSxDQUFBLENBQVYsR0FBZSxNQUFPLENBQUEsQ0FBQSxDQUpoQztjQUtBLEtBQUEsRUFBTyxNQUFPLENBQUEsQ0FBQSxDQUxkO2FBREYsRUFURjs7VUFpQkEsU0FBQTt1QkFDQSxTQUFBLEdBQVk7QUFyQmQ7dUJBTEY7O0lBSlUsQ0FKWiIsInNvdXJjZXNDb250ZW50IjpbImhpZ2hsaWdodEpzICA9IHJlcXVpcmUgJ2hpZ2hsaWdodC5qcydcbnR3ZW1vamkgICAgICA9IHJlcXVpcmUgJ3R3ZW1vamknXG5leHRlbmQgICAgICAgPSByZXF1aXJlICdleHRlbmQnXG5tYXJrZG93bkl0ICAgPSByZXF1aXJlICdtYXJrZG93bi1pdCdcblBhdGggICAgICAgICA9IHJlcXVpcmUgJ3BhdGgnXG5NZHNNZFNldHRpbmcgPSByZXF1aXJlICcuL21kc19tZF9zZXR0aW5nJ1xue2V4aXN0fSAgICAgID0gcmVxdWlyZSAnLi9tZHNfZmlsZSdcblxubW9kdWxlLmV4cG9ydHMgPSBjbGFzcyBNZHNNYXJrZG93blxuICBAc2xpZGVUYWdPcGVuOiAgKHBhZ2UpIC0+ICc8ZGl2IGNsYXNzPVwic2xpZGVfd3JhcHBlclwiIGlkPVwiJyArIHBhZ2UgKyAnXCI+PGRpdiBjbGFzcz1cInNsaWRlXCI+PGRpdiBjbGFzcz1cInNsaWRlX2JnXCI+PC9kaXY+PGRpdiBjbGFzcz1cInNsaWRlX2lubmVyXCI+J1xuICBAc2xpZGVUYWdDbG9zZTogKHBhZ2UpIC0+ICc8L2Rpdj48Zm9vdGVyIGNsYXNzPVwic2xpZGVfZm9vdGVyXCI+PC9mb290ZXI+PHNwYW4gY2xhc3M9XCJzbGlkZV9wYWdlXCIgZGF0YS1wYWdlPVwiJyArIHBhZ2UgKyAnXCI+JyArIHBhZ2UgKyAnPC9zcGFuPjwvZGl2PjwvZGl2PidcblxuICBAaGlnaGxpZ2h0ZXI6IChjb2RlLCBsYW5nKSAtPlxuICAgIGlmIGxhbmc/XG4gICAgICBpZiBsYW5nID09ICd0ZXh0JyBvciBsYW5nID09ICdwbGFpbidcbiAgICAgICAgcmV0dXJuICcnXG4gICAgICBlbHNlIGlmIGhpZ2hsaWdodEpzLmdldExhbmd1YWdlKGxhbmcpXG4gICAgICAgIHRyeVxuICAgICAgICAgIHJldHVybiBoaWdobGlnaHRKcy5oaWdobGlnaHQobGFuZywgY29kZSkudmFsdWVcblxuICAgIGhpZ2hsaWdodEpzLmhpZ2hsaWdodEF1dG8oY29kZSkudmFsdWVcblxuICBAZGVmYXVsdDpcbiAgICBvcHRpb25zOlxuICAgICAgaHRtbDogdHJ1ZVxuICAgICAgeGh0bWxPdXQ6IHRydWVcbiAgICAgIGJyZWFrczogdHJ1ZVxuICAgICAgbGlua2lmeTogdHJ1ZVxuICAgICAgaGlnaGxpZ2h0OiBAaGlnaGxpZ2h0ZXJcblxuICAgIHBsdWdpbnM6XG4gICAgICAnbWFya2Rvd24taXQtbWFyayc6IHt9XG4gICAgICAnbWFya2Rvd24taXQtZW1vamknOlxuICAgICAgICBzaG9ydGN1dHM6IHt9XG4gICAgICAnbWFya2Rvd24taXQta2F0ZXgnOiB7fVxuICAgICAgJ21hcmtkb3duLWl0LXZpZGVvJzoge1xuICAgICAgICB5b3V0dWJlOiB7IHdpZHRoOiA2NDAsIGhlaWdodDogMzkwIH1cbiAgICAgICAgdmltZW86IHsgd2lkdGg6IDUwMCwgaGVpZ2h0OiAyODEgfVxuICAgICAgICB2aW5lOiB7IHdpZHRoOiA2MDAsIGhlaWdodDogNjAwLCBlbWJlZDogJ3NpbXBsZScgfVxuICAgICAgICBwcmV6aTogeyB3aWR0aDogNTUwLCBoZWlnaHQ6IDQwMCB9XG4gICAgICB9XG5cbiAgICB0d2Vtb2ppOlxuICAgICAgYmFzZTogUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4uLy4uL25vZGVfbW9kdWxlcy90d2Vtb2ppLzInKSArIFBhdGguc2VwXG4gICAgICBzaXplOiAnc3ZnJ1xuICAgICAgZXh0OiAnLnN2ZydcblxuICMgY3JlYXRlIE1hcmtkb3duSXQgb2JqZWN0IGFuZCBhcHBseSBwbHVnaW5zXG4gIyByZXR1cm4gbWFya2Rvd24taXQgaW5zdGFuY2VcbiAgQGNyZWF0ZU1hcmtkb3duSXQ6IChvcHRzLCBwbHVnaW5zKSAtPlxuICAgIG1kID0gbWFya2Rvd25JdChvcHRzKVxuICAgIG1kLnVzZShyZXF1aXJlKHBsdWdOYW1lKSwgcGx1Z09wdHMgPyB7fSkgZm9yIHBsdWdOYW1lLCBwbHVnT3B0cyBvZiBwbHVnaW5zXG4gICAgQ09NTU5FVF9CTE9DS19PUE5FX1JFID0gL157IyNcXHMqJC9cbiAgICBDT01NTkVUX0JMT0NLX0NMT1NFX1JFID0gL14oLitcXHMrfFxccyopIyN9JC9cbiAgICBDT01NTkVUX0lOTElORV9SRSA9IC9eeyMjIC4qICMjfS9cblxuICAgICMg44OW44Ot44OD44Kv44Kz44Oh44Oz44OI44Or44O844OrXG4gICAgYmxvY2tfY29tbWVudF9ydWxlID0gKHN0YXRlLCBzdGFydExpbmUsIGVuZExpbmUsIHNpbGVudCktPlxuICAgICAgI3ZhciBjaCwgbWF0Y2gsIG5leHRMaW5lLCB0b2tlbixcbiAgICAgIHBvcyA9IHN0YXRlLmJNYXJrc1tzdGFydExpbmVdXG4gICAgICBtYXggPSBzdGF0ZS5lTWFya3Nbc3RhcnRMaW5lXVxuICAgICAgc2hpZnQgPSBzdGF0ZS50U2hpZnRbc3RhcnRMaW5lXVxuXG4gICAgICBwb3MgKz0gc2hpZnRcblxuICAgICAgaWYgKHBvcyArIDIgPj0gbWF4KVxuICAgICAgICByZXR1cm4gZmFsc2VcblxuICAgICAgY2ggPSBzdGF0ZS5zcmMuY2hhckNvZGVBdChwb3MpXG5cbiAgICAgICMgUHJvYmFibHkgc3RhcnRcbiAgICAgIGlmIChjaCA9PSAweDdCKSAjIDB4N0Ig44GvIHtcbiAgICAgICAgICAjIG9wZW5pbmcgdGFnXG4gICAgICAgICAgbWF0Y2ggPSBzdGF0ZS5zcmMuc2xpY2UocG9zLCBtYXgpLm1hdGNoKENPTU1ORVRfQkxPQ0tfT1BORV9SRSk7XG4gICAgICAgICAgaWYgKCFtYXRjaClcbiAgICAgICAgICAgcmV0dXJuIGZhbHNlXG4gICAgICBlbHNlXG4gICAgICAgICAgcmV0dXJuIGZhbHNlXG4gICAgICAjIHNpbGVudOOBjOOCiOOBj+WIhuOBi+OBo+OBpuOBvuOBm+OCk++8m++8m1xuICAgICAgIyDjgYrjgZ3jgonjgY92YWxpZGF0aW9uIG1vZGXjgafjga7li5XkvZzjgaDjgajmgJ3jgo/jgozjgotcbiAgICAgIGlmIChzaWxlbnQpXG4gICAgICAgcmV0dXJuIHRydWVcblxuICAgICAgIyBzZWFyY2ggYSBlbmQgdGFnXG4gICAgICBuZXh0TGluZSA9IHN0YXJ0TGluZTtcbiAgICAgIHdoaWxlIChuZXh0TGluZSA8IHN0YXRlLmxpbmVNYXgpXG4gICAgICAgICAgbmV4dExpbmUrKztcbiAgICAgICAgICBwb3MgPSBzdGF0ZS5iTWFya3NbbmV4dExpbmVdXG4gICAgICAgICAgbWF4ID0gc3RhdGUuZU1hcmtzW25leHRMaW5lXVxuICAgICAgICAgIGlmIChwb3MgKyBzdGF0ZS50U2hpZnRbbmV4dExpbmVdICsgMiA8PSBtYXgpXG4gICAgICAgICAgICAgIGlmKHN0YXRlLnNyYy5zbGljZShwb3MsIG1heCkubWF0Y2goQ09NTU5FVF9CTE9DS19DTE9TRV9SRSkpXG4gICAgICAgICAgICAgICAgICBuZXh0TGluZSsrO1xuICAgICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgIHN0YXRlLmxpbmUgPSBuZXh0TGluZTtcbiAgICAgIHRva2VuICAgICAgICAgPSBzdGF0ZS5wdXNoKCdjb21tZW50X2Jsb2NrJywgJycsIDApO1xuICAgICAgdG9rZW4ubWFwICAgICA9IFsgc3RhcnRMaW5lLCBzdGF0ZS5saW5lIF07XG4gICAgICB0b2tlbi5jb250ZW50ID0gc3RhdGUuZ2V0TGluZXMoc3RhcnRMaW5lLCBuZXh0TGluZSwgMCwgdHJ1ZSk7XG5cbiAgICAgIHJldHVybiB0cnVlXG5cbiAgICAjIOOCpOODs+ODqeOCpOODs+OCs+ODoeODs+ODiOODq+ODvOODq1xuICAgIGlubGluZV9jb21tZW50X3J1bGUgPSAoc3RhdGUsIHNpbGVudCktPlxuICAgICAgI3ZhciBjaCwgY29kZSwgbWF0Y2gsXG4gICAgICBwb3MgPSBzdGF0ZS5wb3NcbiAgICAgIG1heCA9IHN0YXRlLnBvc01heDtcblxuICAgICAgaWYgKHN0YXRlLnNyYy5jaGFyQ29kZUF0KHBvcykgIT0gMHg3QikgIyAweDc4IOOBryB7XG4gICAgICAgICAgcmV0dXJuIGZhbHNlXG5cbiAgICAgIGlmIChwb3MgKyAxIDwgbWF4KVxuICAgICAgICAgIGNoID0gc3RhdGUuc3JjLmNoYXJDb2RlQXQocG9zICsgMSk7XG5cbiAgICAgICAgICBpZiAoY2ggPT0gMHgyMykjICAweDIzIOOBryAqXG4gICAgICAgICAgICAgIG1hdGNoID0gc3RhdGUuc3JjLnNsaWNlKHBvcykubWF0Y2goQ09NTU5FVF9JTkxJTkVfUkUpO1xuICAgICAgICAgICAgICBpZiAobWF0Y2gpXG4gICAgICAgICAgICAgICAgICBzdGF0ZS5wb3MgKz0gbWF0Y2hbMF0ubGVuZ3RoO1xuICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICByZXR1cm4gZmFsc2VcblxuXG4gICAgIyAnZmVuY2Un44KEJ2ltYWdlJ+OBr+aXouOBq+i/veWKoOOBleOCjOOBpuOBhOOCi+ODq+ODvOODq+WQjeOBp++8jOOBneOCjOOBruW+jOOBq+OCs+ODoeODs+ODiOODq+ODvOODq+OCkumBqeeUqOOBmeOCi++8jlxuICAgICMgJ2NvbW1lbnRfYmxvY2sn44Gv5qyh44Gu44Os44Oz44OA44Oq44Oz44Kw44Or44O844Or5ZCN44Go5ZCI44KP44Gb44KL5b+F6KaB44GC44KK77yOXG4gICAgbWQuYmxvY2sucnVsZXIuYWZ0ZXIoJ2ZlbmNlJywgJ2NvbW1lbnRfYmxvY2snLGJsb2NrX2NvbW1lbnRfcnVsZSk7XG4gICAgbWQuaW5saW5lLnJ1bGVyLmFmdGVyKCdpbWFnZScsICdjb21tZW50X2Jsb2NrJyxpbmxpbmVfY29tbWVudF9ydWxlKTtcblxuICAgICPov73liqDjgZfjgZ/jgrPjg6Hjg7Pjg4jjga7jg6vjg7zjg6vjgavjg57jg4Pjg4Hjg7PjgrDjgZnjgovmloflrZfliJfjga7lh6bnkIbjgpLov73liqDjgZnjgotcbiAgICBjb21tZW50X3JlbmRlcl9ydWxlID0gKHRva2VucywgaWR4LCBvcHRpb25zLCBlbnYsIHNlbGYpLT5cbiAgICAgICPku4rlm57jga/jgrPjg6Hjg7Pjg4jjgqLjgqbjg4jjgZnjgovjga7jgafvvIzjg5bjg6njg7Pjgq/mloflrZfliJfjgpLov5TljbTjgZnjgovjgaDjgZFcbiAgICAgIHJldHVybiAgJyc7XG5cbiAgICAjJ2NvbW1lbnRfYmxvY2sn44GvcnVsZXLjgpLov73liqDjgZfjgZ/mmYLjga7nrKzvvJLlvJXmlbDjgajlkIjjgo/jgZvjgotcbiAgICBtZC5yZW5kZXJlci5ydWxlcy5jb21tZW50X2Jsb2NrID0gY29tbWVudF9yZW5kZXJfcnVsZTtcbiAgICBtZFxuXG4gIEBnZW5lcmF0ZUFmdGVyUmVuZGVyOiAoJCkgLT5cbiAgICAobWQpIC0+XG4gICAgICBtZEVsbSA9ICQoXCI8ZGl2PiN7bWQucGFyc2VkfTwvZGl2PlwiKVxuICAgICAgIyBzZXQgYmFja2dyb3VuZCBpbWFnZVxuICAgICAgI2Jn44GM5Y2Y6Kqe44Go44GX44GmYWx05bGe5oCn44Gu5YCk44Gr54++44KM44KLcOebtOS4i+OBrmltZ+imgee0oOOCkuWvvuixoeOBqOOBmeOCi1xuICAgICAgbWRFbG0uZmluZCgncCA+IGltZ1thbHR+PVwiYmdcIl0nKS5lYWNoIC0+XG4gICAgICAgICR0ICA9ICQoQClcbiAgICAgICAgcCAgID0gJHQucGFyZW50KClcbiAgICAgICAgYmcgID0gJHQucGFyZW50cygnLnNsaWRlX3dyYXBwZXInKS5maW5kKCcuc2xpZGVfYmcnKVxuICAgICAgICBzcmMgPSAkdFswXS5zcmNcbiAgICAgICAgYWx0ID0gJHQuYXR0cignYWx0JylcbiAgICAgICAgZWxtID0gJCgnPGRpdiBjbGFzcz1cInNsaWRlX2JnX2ltZ1wiPjwvZGl2PicpLmNzcygnYmFja2dyb3VuZEltYWdlJywgXCJ1cmwoI3tzcmN9KVwiKS5hdHRyKCdkYXRhLWFsdCcsIGFsdClcblxuICAgICAgICBmb3Igb3B0IGluIGFsdC5zcGxpdCgvXFxzKy8pXG4gICAgICAgICAgZWxtLmNzcygnYmFja2dyb3VuZFNpemUnLCBcIiN7bVsxXX0lXCIpIGlmIG0gPSBvcHQubWF0Y2goL14oXFxkKyg/OlxcLlxcZCspPyklJC8pXG5cbiAgICAgICAgZWxtLmFwcGVuZFRvKGJnKVxuICAgICAgICAkdC5yZW1vdmUoKVxuICAgICAgICBwLnJlbW92ZSgpIGlmIHAuY2hpbGRyZW4oJzpub3QoYnIpJykubGVuZ3RoID09IDAgJiYgL15cXHMqJC8udGVzdChwLnRleHQoKSlcblxuICAgICAgbWRFbG0uZmluZCgnaW1nW2FsdCo9XCIlXCJdJykuZWFjaCAtPlxuICAgICAgICBmb3Igb3B0IGluICQoQCkuYXR0cignYWx0Jykuc3BsaXQoL1xccysvKVxuICAgICAgICAgIGlmIG0gPSBvcHQubWF0Y2goL14oXFxkKyg/OlxcLlxcZCspPyklJC8pXG4gICAgICAgICAgICAkKEApLmNzcygnem9vbScsIHBhcnNlRmxvYXQobVsxXSkgLyAxMDAuMClcblxuICAgICAgbWRFbG1cbiAgICAgICAgLmNoaWxkcmVuKCcuc2xpZGVfd3JhcHBlcicpXG4gICAgICAgIC5lYWNoIC0+XG4gICAgICAgICAgJHQgPSAkKEApXG5cbiAgICAgICAgICAjIFBhZ2UgZGlyZWN0aXZlcyBmb3IgdGhlbWVzXG4gICAgICAgICAgcGFnZSA9ICR0WzBdLmlkXG4gICAgICAgICAgZm9yIHByb3AsIHZhbCBvZiBtZC5zZXR0aW5ncy5nZXRBdCgrcGFnZSwgZmFsc2UpXG4gICAgICAgICAgICAkdC5hdHRyKFwiZGF0YS0je3Byb3B9XCIsIHZhbClcbiAgICAgICAgICAgICR0LmZpbmQoJ2Zvb3Rlci5zbGlkZV9mb290ZXI6bGFzdCcpLnRleHQodmFsKSBpZiBwcm9wID09ICdmb290ZXInXG5cbiAgICAgICAgICAjIERldGVjdCBcIm9ubHktKioqXCIgZWxlbWVudHNcbiAgICAgICAgICBpbm5lciA9ICR0LmZpbmQoJy5zbGlkZSA+IC5zbGlkZV9pbm5lcicpXG4gICAgICAgICAgaW5uZXJDb250ZW50cyA9IGlubmVyLmNoaWxkcmVuKCkuZmlsdGVyKCc6bm90KGJhc2UsIGxpbmssIG1ldGEsIG5vc2NyaXB0LCBzY3JpcHQsIHN0eWxlLCB0ZW1wbGF0ZSwgdGl0bGUpJylcblxuICAgICAgICAgIGhlYWRzTGVuZ3RoID0gaW5uZXIuY2hpbGRyZW4oJzpoZWFkZXInKS5sZW5ndGhcbiAgICAgICAgICAkdC5hZGRDbGFzcygnb25seS1oZWFkaW5ncycpIGlmIGhlYWRzTGVuZ3RoID4gMCAmJiBpbm5lckNvbnRlbnRzLmxlbmd0aCA9PSBoZWFkc0xlbmd0aFxuXG4gICAgICAgICAgcXVvdGVzTGVuZ3RoID0gaW5uZXIuY2hpbGRyZW4oJ2Jsb2NrcXVvdGUnKS5sZW5ndGhcbiAgICAgICAgICAkdC5hZGRDbGFzcygnb25seS1ibG9ja3F1b3RlcycpIGlmIHF1b3Rlc0xlbmd0aCA+IDAgJiYgaW5uZXJDb250ZW50cy5sZW5ndGggPT0gcXVvdGVzTGVuZ3RoXG5cbiAgICAgIG1kLnBhcnNlZCA9IG1kRWxtLmh0bWwoKVxuXG4gIHJ1bGVyczogW11cbiAgc2V0dGluZ3M6IG5ldyBNZHNNZFNldHRpbmdcbiAgYWZ0ZXJSZW5kZXI6IG51bGxcbiAgdHdlbW9qaU9wdHM6IHt9XG5cbiAgY29uc3RydWN0b3I6IChzZXR0aW5ncykgLT5cbiAgICBvcHRzICAgICAgICAgPSBleHRlbmQoe30sIE1kc01hcmtkb3duLmRlZmF1bHQub3B0aW9ucywgc2V0dGluZ3M/Lm9wdGlvbnMgfHwge30pXG4gICAgcGx1Z2lucyAgICAgID0gZXh0ZW5kKHt9LCBNZHNNYXJrZG93bi5kZWZhdWx0LnBsdWdpbnMsIHNldHRpbmdzPy5wbHVnaW5zIHx8IHt9KVxuICAgIEB0d2Vtb2ppT3B0cyA9IGV4dGVuZCh7fSwgTWRzTWFya2Rvd24uZGVmYXVsdC50d2Vtb2ppLCBzZXR0aW5ncz8udHdlbW9qaSB8fCB7fSlcbiAgICBAYWZ0ZXJSZW5kZXIgPSBzZXR0aW5ncz8uYWZ0ZXJSZW5kZXIgfHwgbnVsbFxuICAgIEBtYXJrZG93biAgICA9IE1kc01hcmtkb3duLmNyZWF0ZU1hcmtkb3duSXQuY2FsbChALCBvcHRzLCBwbHVnaW5zKVxuICAgIEBhZnRlckNyZWF0ZSgpXG5cbiAgYWZ0ZXJDcmVhdGU6ID0+XG4gICAgbWQgICAgICA9IEBtYXJrZG93blxuICAgIHtydWxlc30gPSBtZC5yZW5kZXJlclxuXG4gICAgZGVmYXVsdFJlbmRlcmVycyA9XG4gICAgICBpbWFnZTogICAgICBydWxlcy5pbWFnZVxuICAgICAgaHRtbF9ibG9jazogcnVsZXMuaHRtbF9ibG9ja1xuXG4gICAgIyBtYXJrZG93bi1pdOOBruODq+ODvOODq+OCkuS4iuabuOOBjVxuICAgICMgbWFya2Rvd24taXTjga7jg6vjg7zjg6vjga/jgqrjg5bjgrjjgqfjgq/jg4jjgavjgarjgaPjgabjgYrjgorjgIHjgq3jg7zjgavlr77jgZfjgabjgZ3jga7plqLmlbDjgYzlhaXjgaPjgabjgYTjgotcbiAgICAjIGFwcGx544Gu56ys5LiA5byV5pWw44Gr5rih44GX44Gf44KC44Gu44Gv44CBYXBwbHnjgaflkbzjgbPlh7rjgZfjgZ/lhYjjga7plqLmlbDjga50aGlz44Gn5omx44GI44KLXG4gICAgZXh0ZW5kIHJ1bGVzLFxuICAgICAgZW1vamk6ICh0b2tlbiwgaWR4KSA9PlxuICAgICAgICB0d2Vtb2ppLnBhcnNlKHRva2VuW2lkeF0uY29udGVudCwgQHR3ZW1vamlPcHRzKVxuXG4gICAgICBocjogKHRva2VuLCBpZHgpID0+XG4gICAgICAgIHJ1bGVyLnB1c2ggdG9rZW5baWR4XS5tYXBbMF0gaWYgcnVsZXIgPSBAX3J1bGVyc1xuICAgICAgICBcIiN7TWRzTWFya2Rvd24uc2xpZGVUYWdDbG9zZShydWxlci5sZW5ndGggfHwgJycpfSN7TWRzTWFya2Rvd24uc2xpZGVUYWdPcGVuKGlmIHJ1bGVyIHRoZW4gcnVsZXIubGVuZ3RoICsgMSBlbHNlICcnKX1cIlxuXG4gICAgICBpbWFnZTogKGFyZ3MuLi4pID0+XG4gICAgICAgIEByZW5kZXJlcnMuaW1hZ2UuYXBwbHkoQCwgYXJncylcbiAgICAgICAgZGVmYXVsdFJlbmRlcmVycy5pbWFnZS5hcHBseShALCBhcmdzKVxuXG4gICAgICBodG1sX2Jsb2NrOiAoYXJncy4uLikgPT5cbiAgICAgICAgQHJlbmRlcmVycy5odG1sX2Jsb2NrLmFwcGx5KEAsIGFyZ3MpXG4gICAgICAgIGRlZmF1bHRSZW5kZXJlcnMuaHRtbF9ibG9jay5hcHBseShALCBhcmdzKVxuXG4gICMg44Or44O844Or44KS44GE44GP44Gk44GL5LiK5pu444GN44GX44GfbWFya2Rvd24taXTjgafjg5Hjg7zjgrnjgZnjgotcbiAgcGFyc2U6IChtYXJrZG93bikgPT5cbiAgICBAX3J1bGVycyAgICAgICAgICA9IFtdXG4gICAgQF9zZXR0aW5ncyAgICAgICAgPSBuZXcgTWRzTWRTZXR0aW5nXG4gICAgQHNldHRpbmdzUG9zaXRpb24gPSBbXVxuICAgIEBsYXN0UGFyc2VkICAgICAgID0gXCJcIlwiXG4gICAgICAgICAgICAgICAgICAgICAgICAje01kc01hcmtkb3duLnNsaWRlVGFnT3BlbigxKX1cbiAgICAgICAgICAgICAgICAgICAgICAgICN7QG1hcmtkb3duLnJlbmRlciBtYXJrZG93bn1cbiAgICAgICAgICAgICAgICAgICAgICAgICN7TWRzTWFya2Rvd24uc2xpZGVUYWdDbG9zZShAX3J1bGVycy5sZW5ndGggKyAxKX1cbiAgICAgICAgICAgICAgICAgICAgICAgIFwiXCJcIlxuICAgIHJldCA9XG4gICAgICBwYXJzZWQ6IEBsYXN0UGFyc2VkXG4gICAgICBzZXR0aW5nc1Bvc2l0aW9uOiBAc2V0dGluZ3NQb3NpdGlvblxuICAgICAgcnVsZXJDaGFuZ2VkOiBAcnVsZXJzLmpvaW4oXCIsXCIpICE9IEBfcnVsZXJzLmpvaW4oXCIsXCIpXG5cbiAgICBAcnVsZXJzICAgPSByZXQucnVsZXJzICAgPSBAX3J1bGVyc1xuICAgIEBzZXR0aW5ncyA9IHJldC5zZXR0aW5ncyA9IEBfc2V0dGluZ3NcblxuICAgIEBhZnRlclJlbmRlcihyZXQpIGlmIEBhZnRlclJlbmRlcj9cbiAgICByZXRcblxuICByZW5kZXJlcnM6XG4gICAgaW1hZ2U6ICh0b2tlbnMsIGlkeCwgb3B0aW9ucywgZW52LCBzZWxmKSAtPlxuICAgICAgc3JjID0gZGVjb2RlVVJJQ29tcG9uZW50KHRva2Vuc1tpZHhdLmF0dHJzW3Rva2Vuc1tpZHhdLmF0dHJJbmRleCgnc3JjJyldWzFdKVxuICAgICAgdG9rZW5zW2lkeF0uYXR0cnNbdG9rZW5zW2lkeF0uYXR0ckluZGV4KCdzcmMnKV1bMV0gPSBzcmMgaWYgZXhpc3Qoc3JjKVxuXG4gICAgaHRtbF9ibG9jazogKHRva2VucywgaWR4LCBvcHRpb25zLCBlbnYsIHNlbGYpIC0+XG4gICAgICB7Y29udGVudH0gPSB0b2tlbnNbaWR4XVxuICAgICAgcmV0dXJuIGlmIGNvbnRlbnQuc3Vic3RyaW5nKDAsIDMpIGlzbnQgJzwhLSdcblxuICAgICAgaWYgbWF0Y2hlZCA9IC9eKDwhLXsyLH1cXHMqKShbXFxzXFxTXSo/KVxccyotezIsfT4kL20uZXhlYyhjb250ZW50KVxuICAgICAgICBzcGFjZUxpbmVzID0gbWF0Y2hlZFsxXS5zcGxpdChcIlxcblwiKVxuICAgICAgICBsaW5lSW5kZXggID0gdG9rZW5zW2lkeF0ubWFwWzBdICsgc3BhY2VMaW5lcy5sZW5ndGggLSAxXG4gICAgICAgIHN0YXJ0RnJvbSAgPSBzcGFjZUxpbmVzW3NwYWNlTGluZXMubGVuZ3RoIC0gMV0ubGVuZ3RoXG5cbiAgICAgICAgZm9yIG1hdGhjZWRMaW5lIGluIG1hdGNoZWRbMl0uc3BsaXQoXCJcXG5cIilcbiAgICAgICAgICBwYXJzZWQgPSAvXihcXHMqKSgoW1xcJFxcKl0/KShcXHcrKVxccyo6XFxzKiguKikpXFxzKiQvLmV4ZWMobWF0aGNlZExpbmUpXG5cbiAgICAgICAgICBpZiBwYXJzZWRcbiAgICAgICAgICAgIHN0YXJ0RnJvbSArPSBwYXJzZWRbMV0ubGVuZ3RoXG4gICAgICAgICAgICBwYWdlSWR4ID0gQF9ydWxlcnMubGVuZ3RoIHx8IDBcblxuICAgICAgICAgICAgaWYgcGFyc2VkWzNdIGlzICckJ1xuICAgICAgICAgICAgICBAX3NldHRpbmdzLnNldEdsb2JhbCBwYXJzZWRbNF0sIHBhcnNlZFs1XVxuICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICBAX3NldHRpbmdzLnNldCBwYWdlSWR4ICsgMSwgcGFyc2VkWzRdLCBwYXJzZWRbNV0sIHBhcnNlZFszXSBpcyAnKidcblxuICAgICAgICAgICAgQHNldHRpbmdzUG9zaXRpb24ucHVzaFxuICAgICAgICAgICAgICBwYWdlSWR4OiBwYWdlSWR4XG4gICAgICAgICAgICAgIGxpbmVJZHg6IGxpbmVJbmRleFxuICAgICAgICAgICAgICBmcm9tOiBzdGFydEZyb21cbiAgICAgICAgICAgICAgbGVuZ3RoOiBwYXJzZWRbMl0ubGVuZ3RoXG4gICAgICAgICAgICAgIHByb3BlcnR5OiBcIiN7cGFyc2VkWzNdfSN7cGFyc2VkWzRdfVwiXG4gICAgICAgICAgICAgIHZhbHVlOiBwYXJzZWRbNV1cblxuICAgICAgICAgIGxpbmVJbmRleCsrXG4gICAgICAgICAgc3RhcnRGcm9tID0gMFxuIl19
