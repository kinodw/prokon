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
    var md, plugName, plugOpts;
    md = markdownIt(opts);
    for (plugName in plugins) {
      plugOpts = plugins[plugName];
      md.use(require(plugName), plugOpts != null ? plugOpts : {});
    }
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xhc3Nlcy9tZHNfbWFya2Rvd24uanMiLCJzb3VyY2VzIjpbImNsYXNzZXMvbWRzX21hcmtkb3duLmNvZmZlZSJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxJQUFBLGdGQUFBO0VBQUE7OztBQUFBLFdBQUEsR0FBZSxPQUFBLENBQVEsY0FBUjs7QUFDZixPQUFBLEdBQWUsT0FBQSxDQUFRLFNBQVI7O0FBQ2YsTUFBQSxHQUFlLE9BQUEsQ0FBUSxRQUFSOztBQUNmLFVBQUEsR0FBZSxPQUFBLENBQVEsYUFBUjs7QUFDZixJQUFBLEdBQWUsT0FBQSxDQUFRLE1BQVI7O0FBQ2YsWUFBQSxHQUFlLE9BQUEsQ0FBUSxrQkFBUjs7QUFDZCxRQUFjLE9BQUEsQ0FBUSxZQUFSOztBQUVmLE1BQU0sQ0FBQyxPQUFQLEdBQXVCO0VBQ3JCLFdBQUMsQ0FBQSxZQUFELEdBQWdCLFNBQUMsSUFBRDtXQUFVLGlDQUFBLEdBQW9DLElBQXBDLEdBQTJDO0VBQXJEOztFQUNoQixXQUFDLENBQUEsYUFBRCxHQUFnQixTQUFDLElBQUQ7V0FBVSxrRkFBQSxHQUFxRixJQUFyRixHQUE0RixJQUE1RixHQUFtRyxJQUFuRyxHQUEwRztFQUFwSDs7RUFFaEIsV0FBQyxDQUFBLFdBQUQsR0FBYyxTQUFDLElBQUQsRUFBTyxJQUFQO0lBQ1osSUFBRyxZQUFIO01BQ0UsSUFBRyxJQUFBLEtBQVEsTUFBUixJQUFrQixJQUFBLEtBQVEsT0FBN0I7QUFDRSxlQUFPLEdBRFQ7T0FBQSxNQUVLLElBQUcsV0FBVyxDQUFDLFdBQVosQ0FBd0IsSUFBeEIsQ0FBSDtBQUNIO0FBQ0UsaUJBQU8sV0FBVyxDQUFDLFNBQVosQ0FBc0IsSUFBdEIsRUFBNEIsSUFBNUIsQ0FBaUMsQ0FBQyxNQUQzQztTQUFBLGlCQURHO09BSFA7O1dBT0EsV0FBVyxDQUFDLGFBQVosQ0FBMEIsSUFBMUIsQ0FBK0IsQ0FBQztFQVJwQjs7RUFVZCxXQUFDLEVBQUEsT0FBQSxFQUFELEdBQ0U7SUFBQSxPQUFBLEVBQ0U7TUFB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TUFBTyxDQUFBLENBQUEsQ0FBUCxLQUFhLEdBQWhCO2NBQ0UsSUFBQyxDQUFBLFNBQVMsQ0FBQyxTQUFYLENBQXFCLE1BQU8sQ0FBQSxDQUFBLENBQTVCLEVBQWdDLE1BQU8sQ0FBQSxDQUFBLENBQXZDLEVBREY7YUFBQSxNQUFBO2NBR0UsSUFBQyxDQUFBLFNBQVMsQ0FBQyxHQUFYLENBQWUsT0FBQSxHQUFVLENBQXpCLEVBQTRCLE1BQU8sQ0FBQSxDQUFBLENBQW5DLEVBQXVDLE1BQU8sQ0FBQSxDQUFBLENBQTlDLEVBQWtELE1BQU8sQ0FBQSxDQUFBLENBQVAsS0FBYSxHQUEvRCxFQUhGOztZQUtBLElBQUMsQ0FBQSxnQkFBZ0IsQ0FBQyxJQUFsQixDQUNFO2NBQUEsT0FBQSxFQUFTLE9BQVQ7Y0FDQSxPQUFBLEVBQVMsU0FEVDtjQUVBLElBQUEsRUFBTSxTQUZOO2NBR0EsTUFBQSxFQUFRLE1BQU8sQ0FBQSxDQUFBLENBQUUsQ0FBQyxNQUhsQjtjQUlBLFFBQUEsRUFBVSxFQUFBLEdBQUcsTUFBTyxDQUFBLENBQUEsQ0FBVixHQUFlLE1BQU8sQ0FBQSxDQUFBLENBSmhDO2NBS0EsS0FBQSxFQUFPLE1BQU8sQ0FBQSxDQUFBLENBTGQ7YUFERixFQVRGOztVQWlCQSxTQUFBO3VCQUNBLFNBQUEsR0FBWTtBQXJCZDt1QkFMRjs7SUFKVSxDQUpaIiwic291cmNlc0NvbnRlbnQiOlsiaGlnaGxpZ2h0SnMgID0gcmVxdWlyZSAnaGlnaGxpZ2h0LmpzJ1xudHdlbW9qaSAgICAgID0gcmVxdWlyZSAndHdlbW9qaSdcbmV4dGVuZCAgICAgICA9IHJlcXVpcmUgJ2V4dGVuZCdcbm1hcmtkb3duSXQgICA9IHJlcXVpcmUgJ21hcmtkb3duLWl0J1xuUGF0aCAgICAgICAgID0gcmVxdWlyZSAncGF0aCdcbk1kc01kU2V0dGluZyA9IHJlcXVpcmUgJy4vbWRzX21kX3NldHRpbmcnXG57ZXhpc3R9ICAgICAgPSByZXF1aXJlICcuL21kc19maWxlJ1xuXG5tb2R1bGUuZXhwb3J0cyA9IGNsYXNzIE1kc01hcmtkb3duXG4gIEBzbGlkZVRhZ09wZW46ICAocGFnZSkgLT4gJzxkaXYgY2xhc3M9XCJzbGlkZV93cmFwcGVyXCIgaWQ9XCInICsgcGFnZSArICdcIj48ZGl2IGNsYXNzPVwic2xpZGVcIj48ZGl2IGNsYXNzPVwic2xpZGVfYmdcIj48L2Rpdj48ZGl2IGNsYXNzPVwic2xpZGVfaW5uZXJcIj4nXG4gIEBzbGlkZVRhZ0Nsb3NlOiAocGFnZSkgLT4gJzwvZGl2Pjxmb290ZXIgY2xhc3M9XCJzbGlkZV9mb290ZXJcIj48L2Zvb3Rlcj48c3BhbiBjbGFzcz1cInNsaWRlX3BhZ2VcIiBkYXRhLXBhZ2U9XCInICsgcGFnZSArICdcIj4nICsgcGFnZSArICc8L3NwYW4+PC9kaXY+PC9kaXY+J1xuXG4gIEBoaWdobGlnaHRlcjogKGNvZGUsIGxhbmcpIC0+XG4gICAgaWYgbGFuZz9cbiAgICAgIGlmIGxhbmcgPT0gJ3RleHQnIG9yIGxhbmcgPT0gJ3BsYWluJ1xuICAgICAgICByZXR1cm4gJydcbiAgICAgIGVsc2UgaWYgaGlnaGxpZ2h0SnMuZ2V0TGFuZ3VhZ2UobGFuZylcbiAgICAgICAgdHJ5XG4gICAgICAgICAgcmV0dXJuIGhpZ2hsaWdodEpzLmhpZ2hsaWdodChsYW5nLCBjb2RlKS52YWx1ZVxuXG4gICAgaGlnaGxpZ2h0SnMuaGlnaGxpZ2h0QXV0byhjb2RlKS52YWx1ZVxuXG4gIEBkZWZhdWx0OlxuICAgIG9wdGlvbnM6XG4gICAgICBodG1sOiB0cnVlXG4gICAgICB4aHRtbE91dDogdHJ1ZVxuICAgICAgYnJlYWtzOiB0cnVlXG4gICAgICBsaW5raWZ5OiB0cnVlXG4gICAgICBoaWdobGlnaHQ6IEBoaWdobGlnaHRlclxuXG4gICAgcGx1Z2luczpcbiAgICAgICdtYXJrZG93bi1pdC1tYXJrJzoge31cbiAgICAgICdtYXJrZG93bi1pdC1lbW9qaSc6XG4gICAgICAgIHNob3J0Y3V0czoge31cbiAgICAgICdtYXJrZG93bi1pdC1rYXRleCc6IHt9XG4gICAgICAnbWFya2Rvd24taXQtdmlkZW8nOiB7XG4gICAgICAgIHlvdXR1YmU6IHsgd2lkdGg6IDY0MCwgaGVpZ2h0OiAzOTAgfVxuICAgICAgICB2aW1lbzogeyB3aWR0aDogNTAwLCBoZWlnaHQ6IDI4MSB9XG4gICAgICAgIHZpbmU6IHsgd2lkdGg6IDYwMCwgaGVpZ2h0OiA2MDAsIGVtYmVkOiAnc2ltcGxlJyB9XG4gICAgICAgIHByZXppOiB7IHdpZHRoOiA1NTAsIGhlaWdodDogNDAwIH1cbiAgICAgIH1cblxuICAgIHR3ZW1vamk6XG4gICAgICBiYXNlOiBQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4vLi4vbm9kZV9tb2R1bGVzL3R3ZW1vamkvMicpICsgUGF0aC5zZXBcbiAgICAgIHNpemU6ICdzdmcnXG4gICAgICBleHQ6ICcuc3ZnJ1xuXG4jIGNyZWF0ZSBNYXJrZG93bkludCBvYmplY3QgYW5kIGFwcGx5IHBsdWdpbnNcbiAgQGNyZWF0ZU1hcmtkb3duSXQ6IChvcHRzLCBwbHVnaW5zKSAtPlxuICAgIG1kID0gbWFya2Rvd25JdChvcHRzKVxuICAgIG1kLnVzZShyZXF1aXJlKHBsdWdOYW1lKSwgcGx1Z09wdHMgPyB7fSkgZm9yIHBsdWdOYW1lLCBwbHVnT3B0cyBvZiBwbHVnaW5zXG4gICAgbWRcblxuICBAZ2VuZXJhdGVBZnRlclJlbmRlcjogKCQpIC0+XG4gICAgKG1kKSAtPlxuICAgICAgbWRFbG0gPSAkKFwiPGRpdj4je21kLnBhcnNlZH08L2Rpdj5cIilcbiAgICAgICMgc2V0IGJhY2tncm91bmQgaW1hZ2VcbiAgICAgICNiZ+OBjOWNmOiqnuOBqOOBl+OBpmFsdOWxnuaAp+OBruWApOOBq+ePvuOCjOOCi3Dnm7TkuIvjga5pbWfopoHntKDjgpLlr77osaHjgajjgZnjgotcbiAgICAgIG1kRWxtLmZpbmQoJ3AgPiBpbWdbYWx0fj1cImJnXCJdJykuZWFjaCAtPlxuICAgICAgICAkdCAgPSAkKEApXG4gICAgICAgIHAgICA9ICR0LnBhcmVudCgpXG4gICAgICAgIGJnICA9ICR0LnBhcmVudHMoJy5zbGlkZV93cmFwcGVyJykuZmluZCgnLnNsaWRlX2JnJylcbiAgICAgICAgc3JjID0gJHRbMF0uc3JjXG4gICAgICAgIGFsdCA9ICR0LmF0dHIoJ2FsdCcpXG4gICAgICAgIGVsbSA9ICQoJzxkaXYgY2xhc3M9XCJzbGlkZV9iZ19pbWdcIj48L2Rpdj4nKS5jc3MoJ2JhY2tncm91bmRJbWFnZScsIFwidXJsKCN7c3JjfSlcIikuYXR0cignZGF0YS1hbHQnLCBhbHQpXG5cbiAgICAgICAgZm9yIG9wdCBpbiBhbHQuc3BsaXQoL1xccysvKVxuICAgICAgICAgIGVsbS5jc3MoJ2JhY2tncm91bmRTaXplJywgXCIje21bMV19JVwiKSBpZiBtID0gb3B0Lm1hdGNoKC9eKFxcZCsoPzpcXC5cXGQrKT8pJSQvKVxuXG4gICAgICAgIGVsbS5hcHBlbmRUbyhiZylcbiAgICAgICAgJHQucmVtb3ZlKClcbiAgICAgICAgcC5yZW1vdmUoKSBpZiBwLmNoaWxkcmVuKCc6bm90KGJyKScpLmxlbmd0aCA9PSAwICYmIC9eXFxzKiQvLnRlc3QocC50ZXh0KCkpXG5cbiAgICAgIG1kRWxtLmZpbmQoJ2ltZ1thbHQqPVwiJVwiXScpLmVhY2ggLT5cbiAgICAgICAgZm9yIG9wdCBpbiAkKEApLmF0dHIoJ2FsdCcpLnNwbGl0KC9cXHMrLylcbiAgICAgICAgICBpZiBtID0gb3B0Lm1hdGNoKC9eKFxcZCsoPzpcXC5cXGQrKT8pJSQvKVxuICAgICAgICAgICAgJChAKS5jc3MoJ3pvb20nLCBwYXJzZUZsb2F0KG1bMV0pIC8gMTAwLjApXG5cbiAgICAgIG1kRWxtXG4gICAgICAgIC5jaGlsZHJlbignLnNsaWRlX3dyYXBwZXInKVxuICAgICAgICAuZWFjaCAtPlxuICAgICAgICAgICR0ID0gJChAKVxuXG4gICAgICAgICAgIyBQYWdlIGRpcmVjdGl2ZXMgZm9yIHRoZW1lc1xuICAgICAgICAgIHBhZ2UgPSAkdFswXS5pZFxuICAgICAgICAgIGZvciBwcm9wLCB2YWwgb2YgbWQuc2V0dGluZ3MuZ2V0QXQoK3BhZ2UsIGZhbHNlKVxuICAgICAgICAgICAgJHQuYXR0cihcImRhdGEtI3twcm9wfVwiLCB2YWwpXG4gICAgICAgICAgICAkdC5maW5kKCdmb290ZXIuc2xpZGVfZm9vdGVyOmxhc3QnKS50ZXh0KHZhbCkgaWYgcHJvcCA9PSAnZm9vdGVyJ1xuXG4gICAgICAgICAgIyBEZXRlY3QgXCJvbmx5LSoqKlwiIGVsZW1lbnRzXG4gICAgICAgICAgaW5uZXIgPSAkdC5maW5kKCcuc2xpZGUgPiAuc2xpZGVfaW5uZXInKVxuICAgICAgICAgIGlubmVyQ29udGVudHMgPSBpbm5lci5jaGlsZHJlbigpLmZpbHRlcignOm5vdChiYXNlLCBsaW5rLCBtZXRhLCBub3NjcmlwdCwgc2NyaXB0LCBzdHlsZSwgdGVtcGxhdGUsIHRpdGxlKScpXG5cbiAgICAgICAgICBoZWFkc0xlbmd0aCA9IGlubmVyLmNoaWxkcmVuKCc6aGVhZGVyJykubGVuZ3RoXG4gICAgICAgICAgJHQuYWRkQ2xhc3MoJ29ubHktaGVhZGluZ3MnKSBpZiBoZWFkc0xlbmd0aCA+IDAgJiYgaW5uZXJDb250ZW50cy5sZW5ndGggPT0gaGVhZHNMZW5ndGhcblxuICAgICAgICAgIHF1b3Rlc0xlbmd0aCA9IGlubmVyLmNoaWxkcmVuKCdibG9ja3F1b3RlJykubGVuZ3RoXG4gICAgICAgICAgJHQuYWRkQ2xhc3MoJ29ubHktYmxvY2txdW90ZXMnKSBpZiBxdW90ZXNMZW5ndGggPiAwICYmIGlubmVyQ29udGVudHMubGVuZ3RoID09IHF1b3Rlc0xlbmd0aFxuXG4gICAgICBtZC5wYXJzZWQgPSBtZEVsbS5odG1sKClcblxuICBydWxlcnM6IFtdXG4gIHNldHRpbmdzOiBuZXcgTWRzTWRTZXR0aW5nXG4gIGFmdGVyUmVuZGVyOiBudWxsXG4gIHR3ZW1vamlPcHRzOiB7fVxuXG4gIGNvbnN0cnVjdG9yOiAoc2V0dGluZ3MpIC0+XG4gICAgb3B0cyAgICAgICAgID0gZXh0ZW5kKHt9LCBNZHNNYXJrZG93bi5kZWZhdWx0Lm9wdGlvbnMsIHNldHRpbmdzPy5vcHRpb25zIHx8IHt9KVxuICAgIHBsdWdpbnMgICAgICA9IGV4dGVuZCh7fSwgTWRzTWFya2Rvd24uZGVmYXVsdC5wbHVnaW5zLCBzZXR0aW5ncz8ucGx1Z2lucyB8fCB7fSlcbiAgICBAdHdlbW9qaU9wdHMgPSBleHRlbmQoe30sIE1kc01hcmtkb3duLmRlZmF1bHQudHdlbW9qaSwgc2V0dGluZ3M/LnR3ZW1vamkgfHwge30pXG4gICAgQGFmdGVyUmVuZGVyID0gc2V0dGluZ3M/LmFmdGVyUmVuZGVyIHx8IG51bGxcbiAgICBAbWFya2Rvd24gICAgPSBNZHNNYXJrZG93bi5jcmVhdGVNYXJrZG93bkl0LmNhbGwoQCwgb3B0cywgcGx1Z2lucylcbiAgICBAYWZ0ZXJDcmVhdGUoKVxuXG4gIGFmdGVyQ3JlYXRlOiA9PlxuICAgIG1kICAgICAgPSBAbWFya2Rvd25cbiAgICB7cnVsZXN9ID0gbWQucmVuZGVyZXJcblxuICAgIGRlZmF1bHRSZW5kZXJlcnMgPVxuICAgICAgaW1hZ2U6ICAgICAgcnVsZXMuaW1hZ2VcbiAgICAgIGh0bWxfYmxvY2s6IHJ1bGVzLmh0bWxfYmxvY2tcblxuICAgIGV4dGVuZCBydWxlcyxcbiAgICAgIGVtb2ppOiAodG9rZW4sIGlkeCkgPT5cbiAgICAgICAgdHdlbW9qaS5wYXJzZSh0b2tlbltpZHhdLmNvbnRlbnQsIEB0d2Vtb2ppT3B0cylcblxuICAgICAgaHI6ICh0b2tlbiwgaWR4KSA9PlxuICAgICAgICBydWxlci5wdXNoIHRva2VuW2lkeF0ubWFwWzBdIGlmIHJ1bGVyID0gQF9ydWxlcnNcbiAgICAgICAgXCIje01kc01hcmtkb3duLnNsaWRlVGFnQ2xvc2UocnVsZXIubGVuZ3RoIHx8ICcnKX0je01kc01hcmtkb3duLnNsaWRlVGFnT3BlbihpZiBydWxlciB0aGVuIHJ1bGVyLmxlbmd0aCArIDEgZWxzZSAnJyl9XCJcblxuICAgICAgaW1hZ2U6IChhcmdzLi4uKSA9PlxuICAgICAgICBAcmVuZGVyZXJzLmltYWdlLmFwcGx5KEAsIGFyZ3MpXG4gICAgICAgIGRlZmF1bHRSZW5kZXJlcnMuaW1hZ2UuYXBwbHkoQCwgYXJncylcblxuICAgICAgaHRtbF9ibG9jazogKGFyZ3MuLi4pID0+XG4gICAgICAgIEByZW5kZXJlcnMuaHRtbF9ibG9jay5hcHBseShALCBhcmdzKVxuICAgICAgICBkZWZhdWx0UmVuZGVyZXJzLmh0bWxfYmxvY2suYXBwbHkoQCwgYXJncylcblxuICBwYXJzZTogKG1hcmtkb3duKSA9PlxuICAgIEBfcnVsZXJzICAgICAgICAgID0gW11cbiAgICBAX3NldHRpbmdzICAgICAgICA9IG5ldyBNZHNNZFNldHRpbmdcbiAgICBAc2V0dGluZ3NQb3NpdGlvbiA9IFtdXG4gICAgQGxhc3RQYXJzZWQgICAgICAgPSBcIlwiXCJcbiAgICAgICAgICAgICAgICAgICAgICAgICN7TWRzTWFya2Rvd24uc2xpZGVUYWdPcGVuKDEpfVxuICAgICAgICAgICAgICAgICAgICAgICAgI3tAbWFya2Rvd24ucmVuZGVyIG1hcmtkb3dufVxuICAgICAgICAgICAgICAgICAgICAgICAgI3tNZHNNYXJrZG93bi5zbGlkZVRhZ0Nsb3NlKEBfcnVsZXJzLmxlbmd0aCArIDEpfVxuICAgICAgICAgICAgICAgICAgICAgICAgXCJcIlwiXG4gICAgcmV0ID1cbiAgICAgIHBhcnNlZDogQGxhc3RQYXJzZWRcbiAgICAgIHNldHRpbmdzUG9zaXRpb246IEBzZXR0aW5nc1Bvc2l0aW9uXG4gICAgICBydWxlckNoYW5nZWQ6IEBydWxlcnMuam9pbihcIixcIikgIT0gQF9ydWxlcnMuam9pbihcIixcIilcblxuICAgIEBydWxlcnMgICA9IHJldC5ydWxlcnMgICA9IEBfcnVsZXJzXG4gICAgQHNldHRpbmdzID0gcmV0LnNldHRpbmdzID0gQF9zZXR0aW5nc1xuXG4gICAgQGFmdGVyUmVuZGVyKHJldCkgaWYgQGFmdGVyUmVuZGVyP1xuICAgIHJldFxuXG4gIHJlbmRlcmVyczpcbiAgICBpbWFnZTogKHRva2VucywgaWR4LCBvcHRpb25zLCBlbnYsIHNlbGYpIC0+XG4gICAgICBzcmMgPSBkZWNvZGVVUklDb21wb25lbnQodG9rZW5zW2lkeF0uYXR0cnNbdG9rZW5zW2lkeF0uYXR0ckluZGV4KCdzcmMnKV1bMV0pXG4gICAgICB0b2tlbnNbaWR4XS5hdHRyc1t0b2tlbnNbaWR4XS5hdHRySW5kZXgoJ3NyYycpXVsxXSA9IHNyYyBpZiBleGlzdChzcmMpXG5cbiAgICBodG1sX2Jsb2NrOiAodG9rZW5zLCBpZHgsIG9wdGlvbnMsIGVudiwgc2VsZikgLT5cbiAgICAgIHtjb250ZW50fSA9IHRva2Vuc1tpZHhdXG4gICAgICByZXR1cm4gaWYgY29udGVudC5zdWJzdHJpbmcoMCwgMykgaXNudCAnPCEtJ1xuXG4gICAgICBpZiBtYXRjaGVkID0gL14oPCEtezIsfVxccyopKFtcXHNcXFNdKj8pXFxzKi17Mix9PiQvbS5leGVjKGNvbnRlbnQpXG4gICAgICAgIHNwYWNlTGluZXMgPSBtYXRjaGVkWzFdLnNwbGl0KFwiXFxuXCIpXG4gICAgICAgIGxpbmVJbmRleCAgPSB0b2tlbnNbaWR4XS5tYXBbMF0gKyBzcGFjZUxpbmVzLmxlbmd0aCAtIDFcbiAgICAgICAgc3RhcnRGcm9tICA9IHNwYWNlTGluZXNbc3BhY2VMaW5lcy5sZW5ndGggLSAxXS5sZW5ndGhcblxuICAgICAgICBmb3IgbWF0aGNlZExpbmUgaW4gbWF0Y2hlZFsyXS5zcGxpdChcIlxcblwiKVxuICAgICAgICAgIHBhcnNlZCA9IC9eKFxccyopKChbXFwkXFwqXT8pKFxcdyspXFxzKjpcXHMqKC4qKSlcXHMqJC8uZXhlYyhtYXRoY2VkTGluZSlcblxuICAgICAgICAgIGlmIHBhcnNlZFxuICAgICAgICAgICAgc3RhcnRGcm9tICs9IHBhcnNlZFsxXS5sZW5ndGhcbiAgICAgICAgICAgIHBhZ2VJZHggPSBAX3J1bGVycy5sZW5ndGggfHwgMFxuXG4gICAgICAgICAgICBpZiBwYXJzZWRbM10gaXMgJyQnXG4gICAgICAgICAgICAgIEBfc2V0dGluZ3Muc2V0R2xvYmFsIHBhcnNlZFs0XSwgcGFyc2VkWzVdXG4gICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgIEBfc2V0dGluZ3Muc2V0IHBhZ2VJZHggKyAxLCBwYXJzZWRbNF0sIHBhcnNlZFs1XSwgcGFyc2VkWzNdIGlzICcqJ1xuXG4gICAgICAgICAgICBAc2V0dGluZ3NQb3NpdGlvbi5wdXNoXG4gICAgICAgICAgICAgIHBhZ2VJZHg6IHBhZ2VJZHhcbiAgICAgICAgICAgICAgbGluZUlkeDogbGluZUluZGV4XG4gICAgICAgICAgICAgIGZyb206IHN0YXJ0RnJvbVxuICAgICAgICAgICAgICBsZW5ndGg6IHBhcnNlZFsyXS5sZW5ndGhcbiAgICAgICAgICAgICAgcHJvcGVydHk6IFwiI3twYXJzZWRbM119I3twYXJzZWRbNF19XCJcbiAgICAgICAgICAgICAgdmFsdWU6IHBhcnNlZFs1XVxuXG4gICAgICAgICAgbGluZUluZGV4KytcbiAgICAgICAgICBzdGFydEZyb20gPSAwXG4iXX0=
