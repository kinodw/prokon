var MickrClient, Path, clsMarkdown, ipc, resolvePathFromMarp;

clsMarkdown = require('./classes/mds_markdown');

ipc = require('electron').ipcRenderer;

Path = require('path');

MickrClient = require('../modules/MickrClient');

resolvePathFromMarp = function(path) {
  if (path == null) {
    path = './';
  }
  return Path.resolve(__dirname, '../', path);
};

document.addEventListener('DOMContentLoaded', function() {
  var $;
  $ = window.jQuery = window.$ = require('jquery');
  return (function($) {
    var Markdown, applyCurrentPage, applyScreenSize, applySlideSize, client, getCSSvar, getScreenSize, getSlideSize, render, sendPdfOptions, setImageDirectory, setStyle, setting, themes;
    $("[data-marp-path-resolver]").each(function() {
      var i, len, ref, results, target;
      ref = $(this).attr('data-marp-path-resolver').split(/\s+/);
      results = [];
      for (i = 0, len = ref.length; i < len; i++) {
        target = ref[i];
        results.push($(this).attr(target, resolvePathFromMarp($(this).attr(target))));
      }
      return results;
    });
    Markdown = new clsMarkdown({
      afterRender: clsMarkdown.generateAfterRender($)
    });
    themes = {};
    themes.current = function() {
      return $('#theme-css').attr('href');
    };
    themes["default"] = themes.current();
    themes.apply = function(path) {
      var toApply;
      if (path == null) {
        path = null;
      }
      toApply = resolvePathFromMarp(path || themes["default"]);
      if (toApply !== themes.current()) {
        $('#theme-css').attr('href', toApply);
        setTimeout(applyScreenSize, 20);
        return toApply.match(/([^\/]+)\.css$/)[1];
      }
      return false;
    };
    setStyle = function(identifier, css) {
      var elm, id;
      id = "mds-" + identifier + "Style";
      elm = $("#" + id);
      if (elm.length <= 0) {
        elm = $("<style id=\"" + id + "\"></style>").appendTo(document.head);
      }
      return elm.text(css);
    };
    getCSSvar = function(prop) {
      return document.defaultView.getComputedStyle(document.body).getPropertyValue(prop);
    };
    getSlideSize = function() {
      var size;
      size = {
        w: +getCSSvar('--slide-width'),
        h: +getCSSvar('--slide-height')
      };
      size.ratio = size.w / size.h;
      return size;
    };
    applySlideSize = function(width, height) {
      setStyle('slideSize', "body {\n  --slide-width: " + (width || 'inherit') + ";\n  --slide-height: " + (height || 'inherit') + ";\n}");
      return applyScreenSize();
    };
    getScreenSize = function() {
      var previewMargin, size;
      size = {
        w: document.documentElement.clientWidth,
        h: document.documentElement.clientHeight
      };
      previewMargin = +getCSSvar('--preview-margin');
      size.ratio = (size.w - previewMargin * 2) / (size.h - previewMargin * 2);
      return size;
    };
    applyScreenSize = function() {
      var size;
      size = getScreenSize();
      setStyle('screenSize', "body { --screen-width: " + size.w + "; --screen-height: " + size.h + "; }");
      return $('#container').toggleClass('height-base', size.ratio > getSlideSize().ratio);
    };
    applyCurrentPage = function(page) {
      return setStyle('currentPage', "@media not print {\n  body.slide-view.screen .slide_wrapper:not(:nth-of-type(" + page + ")) {\n    width: 0 !important;\n    height: 0 !important;\n    border: none !important;\n    box-shadow: none !important;\n  }\n}");
    };
    render = function(md) {
      applySlideSize(md.settings.getGlobal('width'), md.settings.getGlobal('height'));
      md.changedTheme = themes.apply(md.settings.getGlobal('theme'));
      $('#markdown').html(md.parsed);
      ipc.sendToHost('rendered', md);
      if (md.rulerChanged) {
        ipc.sendToHost('rulerChanged', md.rulers);
      }
      if (md.changedTheme) {
        return ipc.sendToHost('themeChanged', md.changedTheme);
      }
    };
    sendPdfOptions = function(opts) {
      var slideSize;
      slideSize = getSlideSize();
      opts.exportSize = {
        width: Math.floor(slideSize.w * 25400 / 96),
        height: Math.floor(slideSize.h * 25400 / 96)
      };
      $('body').addClass('to-pdf');
      return setTimeout((function() {
        return ipc.sendToHost('responsePdfOptions', opts);
      }), 0);
    };
    setImageDirectory = function(dir) {
      return $('head > base').attr('href', dir || './');
    };
    ipc.on('render', function(e, md) {
      return render(Markdown.parse(md));
    });
    ipc.on('currentPage', function(e, page) {
      return applyCurrentPage(page);
    });
    ipc.on('setClass', function(e, classes) {
      return $('body').attr('class', classes);
    });
    ipc.on('setImageDirectory', function(e, dir) {
      return setImageDirectory(dir);
    });
    ipc.on('requestPdfOptions', function(e, opts) {
      return sendPdfOptions(opts || {});
    });
    ipc.on('unfreeze', function() {
      return $('body').removeClass('to-pdf');
    });
    $(document).on('click', 'a', function(e) {
      e.preventDefault();
      return ipc.sendToHost('linkTo', $(e.currentTarget).attr('href'));
    });
    $(window).resize(function(e) {
      return applyScreenSize();
    });
    applyScreenSize();
    setting = {
      "id": "presenSlide",
      "url": "ws://apps.wisdomweb.net:64260/ws/mik",
      "site": "test",
      "token": "Pad:9948"
    };
    client = new MickrClient(setting);
    client.on("goToPage", (function(_this) {
      return function(e, data) {
        var page;
        page = data.body.content;
        return applyCurrentPage(page);
      };
    })(this));
    ipc.on('requestSlideInfo', (function(_this) {
      return function() {
        var markdownBody;
        console.log('receive requestSlideInfo');
        markdownBody = [];
        $('.slide_wrapper').each(function(idx, elem) {
          return markdownBody.push(elem.outerHTML);
        });
        console.log(markdownBody);
        ipc.sendToHost('sendSlideInfo', markdownBody);
        return console.log('send sendSlideInfo');
      };
    })(this));
    ipc.sendToHost('requestSlideHTML', (function(_this) {
      return function() {
        return console.log('send requestSlideHTML');
      };
    })(this));
    ipc.on('setSlide', (function(_this) {
      return function(e, text) {
        console.log('receive setSlide');
        console.log(text);
        return console.log($('.markdown-body').html(text));
      };
    })(this));
    return ipc.on('goToPage', (function(_this) {
      return function(e, page) {
        console.log(page);
        return applyCurrentPage(page);
      };
    })(this));
  })($);
});

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJlc2VuU2xpZGUuanMiLCJzb3VyY2VzIjpbInByZXNlblNsaWRlLmNvZmZlZSJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxJQUFBOztBQUFBLFdBQUEsR0FBYyxPQUFBLENBQVEsd0JBQVI7O0FBQ2QsR0FBQSxHQUFjLE9BQUEsQ0FBUSxVQUFSLENBQW1CLENBQUM7O0FBQ2xDLElBQUEsR0FBYyxPQUFBLENBQVEsTUFBUjs7QUFDZCxXQUFBLEdBQWMsT0FBQSxDQUFRLHdCQUFSOztBQUVkLG1CQUFBLEdBQXNCLFNBQUMsSUFBRDs7SUFBQyxPQUFPOztTQUFTLElBQUksQ0FBQyxPQUFMLENBQWEsU0FBYixFQUF3QixLQUF4QixFQUErQixJQUEvQjtBQUFqQjs7QUFFdEIsUUFBUSxDQUFDLGdCQUFULENBQTBCLGtCQUExQixFQUE4QyxTQUFBO0FBQzVDLE1BQUE7RUFBQSxDQUFBLEdBQUksTUFBTSxDQUFDLE1BQVAsR0FBZ0IsTUFBTSxDQUFDLENBQVAsR0FBVyxPQUFBLENBQVEsUUFBUjtTQUU1QixDQUFBLFNBQUMsQ0FBRDtBQUVELFFBQUE7SUFBQSxDQUFBLENBQUUsMkJBQUYsQ0FBOEIsQ0FBQyxJQUEvQixDQUFvQyxTQUFBO0FBQ2xDLFVBQUE7QUFBQTtBQUFBO1dBQUEscUNBQUE7O3FCQUNFLENBQUEsQ0FBRSxJQUFGLENBQUksQ0FBQyxJQUFMLENBQVUsTUFBVixFQUFrQixtQkFBQSxDQUFvQixDQUFBLENBQUUsSUFBRixDQUFJLENBQUMsSUFBTCxDQUFVLE1BQVYsQ0FBcEIsQ0FBbEI7QUFERjs7SUFEa0MsQ0FBcEM7SUFJQSxRQUFBLEdBQVcsSUFBSSxXQUFKLENBQWdCO01BQUUsV0FBQSxFQUFhLFdBQVcsQ0FBQyxtQkFBWixDQUFnQyxDQUFoQyxDQUFmO0tBQWhCO0lBRVgsTUFBQSxHQUFTO0lBQ1QsTUFBTSxDQUFDLE9BQVAsR0FBaUIsU0FBQTthQUFHLENBQUEsQ0FBRSxZQUFGLENBQWUsQ0FBQyxJQUFoQixDQUFxQixNQUFyQjtJQUFI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O01BRGlDO0lBQUEsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQUFuQztJQUdBLEdBQUcsQ0FBQyxFQUFKLENBQU8sVUFBUCxFQUFtQixDQUFBLFNBQUEsS0FBQTthQUFBLFNBQUMsQ0FBRCxFQUFJLElBQUo7UUFDakIsT0FBTyxDQUFDLEdBQVIsQ0FBWSxrQkFBWjtRQUNBLE9BQU8sQ0FBQyxHQUFSLENBQVksSUFBWjtlQUNBLE9BQU8sQ0FBQyxHQUFSLENBQVksQ0FBQSxDQUFFLGdCQUFGLENBQW1CLENBQUMsSUFBcEIsQ0FBeUIsSUFBekIsQ0FBWjtNQUhpQjtJQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBbkI7V0FLQSxHQUFHLENBQUMsRUFBSixDQUFPLFVBQVAsRUFBbUIsQ0FBQSxTQUFBLEtBQUE7YUFBQSxTQUFDLENBQUQsRUFBSSxJQUFKO1FBQ2pCLE9BQU8sQ0FBQyxHQUFSLENBQVksSUFBWjtlQUNBLGdCQUFBLENBQWlCLElBQWpCO01BRmlCO0lBQUEsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQUFuQjtFQXhKQyxDQUFBLENBQUgsQ0FBSSxDQUFKO0FBSDRDLENBQTlDIiwic291cmNlc0NvbnRlbnQiOlsiY2xzTWFya2Rvd24gPSByZXF1aXJlICcuL2NsYXNzZXMvbWRzX21hcmtkb3duJ1xuaXBjICAgICAgICAgPSByZXF1aXJlKCdlbGVjdHJvbicpLmlwY1JlbmRlcmVyXG5QYXRoICAgICAgICA9IHJlcXVpcmUgJ3BhdGgnXG5NaWNrckNsaWVudCA9IHJlcXVpcmUgJy4uL21vZHVsZXMvTWlja3JDbGllbnQnXG5cbnJlc29sdmVQYXRoRnJvbU1hcnAgPSAocGF0aCA9ICcuLycpIC0+IFBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLi8nLCBwYXRoKVxuXG5kb2N1bWVudC5hZGRFdmVudExpc3RlbmVyICdET01Db250ZW50TG9hZGVkJywgLT5cbiAgJCA9IHdpbmRvdy5qUXVlcnkgPSB3aW5kb3cuJCA9IHJlcXVpcmUoJ2pxdWVyeScpXG5cbiAgZG8gKCQpIC0+XG4gICAgIyBGaXJzdCwgcmVzb2x2ZSBNYXJwIHJlc291cmNlcyBwYXRoXG4gICAgJChcIltkYXRhLW1hcnAtcGF0aC1yZXNvbHZlcl1cIikuZWFjaCAtPlxuICAgICAgZm9yIHRhcmdldCBpbiAkKEApLmF0dHIoJ2RhdGEtbWFycC1wYXRoLXJlc29sdmVyJykuc3BsaXQoL1xccysvKVxuICAgICAgICAkKEApLmF0dHIodGFyZ2V0LCByZXNvbHZlUGF0aEZyb21NYXJwKCQoQCkuYXR0cih0YXJnZXQpKSlcblxuICAgIE1hcmtkb3duID0gbmV3IGNsc01hcmtkb3duKHsgYWZ0ZXJSZW5kZXI6IGNsc01hcmtkb3duLmdlbmVyYXRlQWZ0ZXJSZW5kZXIoJCkgfSlcblxuICAgIHRoZW1lcyA9IHt9XG4gICAgdGhlbWVzLmN1cnJlbnQgPSAtPiAkKCcjdGhlbWUtY3NzJykuYXR0cignaHJlZicpXG4gICAgdGhlbWVzLmRlZmF1bHQgPSB0aGVtZXMuY3VycmVudCgpXG4gICAgdGhlbWVzLmFwcGx5ID0gKHBhdGggPSBudWxsKSAtPlxuICAgICAgdG9BcHBseSA9IHJlc29sdmVQYXRoRnJvbU1hcnAocGF0aCB8fCB0aGVtZXMuZGVmYXVsdClcblxuICAgICAgaWYgdG9BcHBseSBpc250IHRoZW1lcy5jdXJyZW50KClcbiAgICAgICAgJCgnI3RoZW1lLWNzcycpLmF0dHIoJ2hyZWYnLCB0b0FwcGx5KVxuICAgICAgICBzZXRUaW1lb3V0IGFwcGx5U2NyZWVuU2l6ZSwgMjBcblxuICAgICAgICByZXR1cm4gdG9BcHBseS5tYXRjaCgvKFteXFwvXSspXFwuY3NzJC8pWzFdXG4gICAgICBmYWxzZVxuXG4gICAgc2V0U3R5bGUgPSAoaWRlbnRpZmllciwgY3NzKSAtPlxuICAgICAgaWQgID0gXCJtZHMtI3tpZGVudGlmaWVyfVN0eWxlXCJcbiAgICAgIGVsbSA9ICQoXCIjI3tpZH1cIilcbiAgICAgIGVsbSA9ICQoXCI8c3R5bGUgaWQ9XFxcIiN7aWR9XFxcIj48L3N0eWxlPlwiKS5hcHBlbmRUbyhkb2N1bWVudC5oZWFkKSBpZiBlbG0ubGVuZ3RoIDw9IDBcbiAgICAgIGVsbS50ZXh0KGNzcylcblxuICAgIGdldENTU3ZhciA9IChwcm9wKSAtPiBkb2N1bWVudC5kZWZhdWx0Vmlldy5nZXRDb21wdXRlZFN0eWxlKGRvY3VtZW50LmJvZHkpLmdldFByb3BlcnR5VmFsdWUocHJvcClcblxuICAgIGdldFNsaWRlU2l6ZSA9IC0+XG4gICAgICBzaXplID1cbiAgICAgICAgdzogK2dldENTU3ZhciAnLS1zbGlkZS13aWR0aCdcbiAgICAgICAgaDogK2dldENTU3ZhciAnLS1zbGlkZS1oZWlnaHQnXG5cbiAgICAgIHNpemUucmF0aW8gPSBzaXplLncgLyBzaXplLmhcbiAgICAgIHNpemVcblxuICAgIGFwcGx5U2xpZGVTaXplID0gKHdpZHRoLCBoZWlnaHQpIC0+XG4gICAgICBzZXRTdHlsZSAnc2xpZGVTaXplJyxcbiAgICAgICAgXCJcIlwiXG4gICAgICAgIGJvZHkge1xuICAgICAgICAgIC0tc2xpZGUtd2lkdGg6ICN7d2lkdGggfHwgJ2luaGVyaXQnfTtcbiAgICAgICAgICAtLXNsaWRlLWhlaWdodDogI3toZWlnaHQgfHwgJ2luaGVyaXQnfTtcbiAgICAgICAgfVxuICAgICAgICBcIlwiXCJcbiAgICAgIGFwcGx5U2NyZWVuU2l6ZSgpXG5cbiAgICBnZXRTY3JlZW5TaXplID0gLT5cbiAgICAgIHNpemUgPVxuICAgICAgICB3OiBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuY2xpZW50V2lkdGhcbiAgICAgICAgaDogZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmNsaWVudEhlaWdodFxuXG4gICAgICBwcmV2aWV3TWFyZ2luID0gK2dldENTU3ZhciAnLS1wcmV2aWV3LW1hcmdpbidcbiAgICAgIHNpemUucmF0aW8gPSAoc2l6ZS53IC0gcHJldmlld01hcmdpbiAqIDIpIC8gKHNpemUuaCAtIHByZXZpZXdNYXJnaW4gKiAyKVxuICAgICAgc2l6ZVxuXG4gICAgYXBwbHlTY3JlZW5TaXplID0gLT5cbiAgICAgIHNpemUgPSBnZXRTY3JlZW5TaXplKClcbiAgICAgIHNldFN0eWxlICdzY3JlZW5TaXplJywgXCJib2R5IHsgLS1zY3JlZW4td2lkdGg6ICN7c2l6ZS53fTsgLS1zY3JlZW4taGVpZ2h0OiAje3NpemUuaH07IH1cIlxuICAgICAgJCgnI2NvbnRhaW5lcicpLnRvZ2dsZUNsYXNzICdoZWlnaHQtYmFzZScsIHNpemUucmF0aW8gPiBnZXRTbGlkZVNpemUoKS5yYXRpb1xuXG4gICAgIyDjg5rjg7zjgrjnlarlj7fjgpLlj5fjgZHlj5bjgaPjgZ/jgYLjgajjgIHnj77lnKjjga7jg5rjg7zjgrjku6XlpJbjga7jg5rjg7zjgrjjga7jgrnjg6njgqTjg4njgpLpnZ7ooajnpLrjgavjgZnjgotcbiAgICAjIOOBn+OBoOOBl+OAgemdnuODl+ODquODs+ODiOeKtuaFi+OBruaZgumZkOWumlxuICAgIGFwcGx5Q3VycmVudFBhZ2UgPSAocGFnZSkgLT5cbiAgICAgIHNldFN0eWxlICdjdXJyZW50UGFnZScsXG4gICAgICAgIFwiXCJcIlxuICAgICAgICBAbWVkaWEgbm90IHByaW50IHtcbiAgICAgICAgICBib2R5LnNsaWRlLXZpZXcuc2NyZWVuIC5zbGlkZV93cmFwcGVyOm5vdCg6bnRoLW9mLXR5cGUoI3twYWdlfSkpIHtcbiAgICAgICAgICAgIHdpZHRoOiAwICFpbXBvcnRhbnQ7XG4gICAgICAgICAgICBoZWlnaHQ6IDAgIWltcG9ydGFudDtcbiAgICAgICAgICAgIGJvcmRlcjogbm9uZSAhaW1wb3J0YW50O1xuICAgICAgICAgICAgYm94LXNoYWRvdzogbm9uZSAhaW1wb3J0YW50O1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcIlwiXCJcblxuICAgIHJlbmRlciA9IChtZCkgLT5cbiAgICAgIGFwcGx5U2xpZGVTaXplIG1kLnNldHRpbmdzLmdldEdsb2JhbCgnd2lkdGgnKSwgbWQuc2V0dGluZ3MuZ2V0R2xvYmFsKCdoZWlnaHQnKVxuICAgICAgbWQuY2hhbmdlZFRoZW1lID0gdGhlbWVzLmFwcGx5IG1kLnNldHRpbmdzLmdldEdsb2JhbCgndGhlbWUnKVxuICAgICAgJCgnI21hcmtkb3duJykuaHRtbChtZC5wYXJzZWQpXG5cbiAgICAgICMgeW91dHViZSBwbHVnaW4gcmVwbGFjZW1lbnQgZXguIEBbeW91dHViZV0oaHR0cHM6Ly9+KVxuICAgICAgIyBpZiB1cmwgPSAkKCcuZW1iZWQtcmVzcG9uc2l2ZS1pdGVtJykuYXR0cignc3JjJylcbiAgICAgICMgICBjb25zb2xlLmxvZyB1cmxcbiAgICAgICMgICBjb25zb2xlLmxvZyB1cmwuaW5kZXhPZihcImZpbGU6XCIpXG4gICAgICAjICAgdXJsID0gJ2h0dHBzOicgKyB1cmxcbiAgICAgICMgICAkKCcuZW1iZWQtcmVzcG9uc2l2ZS1pdGVtJykuYXR0cignc3JjJywgdXJsKVxuXG4gICAgICBpcGMuc2VuZFRvSG9zdCAncmVuZGVyZWQnLCBtZFxuICAgICAgaXBjLnNlbmRUb0hvc3QgJ3J1bGVyQ2hhbmdlZCcsIG1kLnJ1bGVycyBpZiBtZC5ydWxlckNoYW5nZWRcbiAgICAgIGlwYy5zZW5kVG9Ib3N0ICd0aGVtZUNoYW5nZWQnLCBtZC5jaGFuZ2VkVGhlbWUgaWYgbWQuY2hhbmdlZFRoZW1lXG5cbiAgICBzZW5kUGRmT3B0aW9ucyA9IChvcHRzKSAtPlxuICAgICAgc2xpZGVTaXplID0gZ2V0U2xpZGVTaXplKClcblxuICAgICAgb3B0cy5leHBvcnRTaXplID1cbiAgICAgICAgd2lkdGg6ICBNYXRoLmZsb29yKHNsaWRlU2l6ZS53ICogMjU0MDAgLyA5NilcbiAgICAgICAgaGVpZ2h0OiBNYXRoLmZsb29yKHNsaWRlU2l6ZS5oICogMjU0MDAgLyA5NilcblxuICAgICAgIyBMb2FkIHNsaWRlIHJlc291cmNlc1xuICAgICAgJCgnYm9keScpLmFkZENsYXNzICd0by1wZGYnXG4gICAgICBzZXRUaW1lb3V0ICgtPiBpcGMuc2VuZFRvSG9zdCAncmVzcG9uc2VQZGZPcHRpb25zJywgb3B0cyksIDBcblxuICAgIHNldEltYWdlRGlyZWN0b3J5ID0gKGRpcikgLT4gJCgnaGVhZCA+IGJhc2UnKS5hdHRyKCdocmVmJywgZGlyIHx8ICcuLycpXG5cbiAgICBpcGMub24gJ3JlbmRlcicsIChlLCBtZCkgLT4gcmVuZGVyKE1hcmtkb3duLnBhcnNlKG1kKSlcbiAgICBpcGMub24gJ2N1cnJlbnRQYWdlJywgKGUsIHBhZ2UpIC0+IGFwcGx5Q3VycmVudFBhZ2UgcGFnZVxuICAgIGlwYy5vbiAnc2V0Q2xhc3MnLCAoZSwgY2xhc3NlcykgLT4gJCgnYm9keScpLmF0dHIgJ2NsYXNzJywgY2xhc3Nlc1xuICAgIGlwYy5vbiAnc2V0SW1hZ2VEaXJlY3RvcnknLCAoZSwgZGlyKSAtPiBzZXRJbWFnZURpcmVjdG9yeShkaXIpXG4gICAgaXBjLm9uICdyZXF1ZXN0UGRmT3B0aW9ucycsIChlLCBvcHRzKSAtPiBzZW5kUGRmT3B0aW9ucyhvcHRzIHx8IHt9KVxuICAgIGlwYy5vbiAndW5mcmVlemUnLCAtPiAkKCdib2R5JykucmVtb3ZlQ2xhc3MoJ3RvLXBkZicpXG5cbiAgICAjIEluaXRpYWxpemVcbiAgICAkKGRvY3VtZW50KS5vbiAnY2xpY2snLCAnYScsIChlKSAtPlxuICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpXG4gICAgICBpcGMuc2VuZFRvSG9zdCAnbGlua1RvJywgJChlLmN1cnJlbnRUYXJnZXQpLmF0dHIoJ2hyZWYnKVxuXG4gICAgJCh3aW5kb3cpLnJlc2l6ZSAoZSkgLT4gYXBwbHlTY3JlZW5TaXplKClcbiAgICBhcHBseVNjcmVlblNpemUoKVxuXG5cbiAgICAjIHByZXNlbnRhdGlvbiA9PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICBzZXR0aW5nID1cbiAgICAgXCJpZFwiOiBcInByZXNlblNsaWRlXCJcbiAgICAgXCJ1cmxcIjogXCJ3czovL2FwcHMud2lzZG9td2ViLm5ldDo2NDI2MC93cy9taWtcIlxuICAgICBcInNpdGVcIjogXCJ0ZXN0XCJcbiAgICAgXCJ0b2tlblwiOiBcIlBhZDo5OTQ4XCJcblxuICAgIGNsaWVudCA9IG5ldyBNaWNrckNsaWVudChzZXR0aW5nKTtcblxuICAgIGNsaWVudC5vbiBcImdvVG9QYWdlXCIsIChlLCBkYXRhKT0+XG4gICAgICBwYWdlID0gZGF0YS5ib2R5LmNvbnRlbnRcbiAgICAgIGFwcGx5Q3VycmVudFBhZ2UgcGFnZVxuXG4gICAgIyBtYXJrZG93bkJvZHnjgpLjgqrjg5bjgrjjgqfjgq/jg4jjgafpgIHkv6HjgZnjgotWZXJcbiAgICBpcGMub24gJ3JlcXVlc3RTbGlkZUluZm8nLCAoKSA9PlxuICAgICAgY29uc29sZS5sb2cgJ3JlY2VpdmUgcmVxdWVzdFNsaWRlSW5mbydcbiAgICAgIG1hcmtkb3duQm9keSA9IFtdXG4gICAgICAkKCcuc2xpZGVfd3JhcHBlcicpLmVhY2ggKGlkeCwgZWxlbSkgPT5cbiAgICAgICAgbWFya2Rvd25Cb2R5LnB1c2ggZWxlbS5vdXRlckhUTUwgIyA8ZGl2IGNsYXNzPXNsaWRlX3dyYXBwZXIgaWQ9MT4gLi4uXG4gICAgICBjb25zb2xlLmxvZyBtYXJrZG93bkJvZHlcbiAgICAgIGlwYy5zZW5kVG9Ib3N0ICdzZW5kU2xpZGVJbmZvJywgbWFya2Rvd25Cb2R5XG4gICAgICBjb25zb2xlLmxvZyAnc2VuZCBzZW5kU2xpZGVJbmZvJ1xuXG4gICAgaXBjLnNlbmRUb0hvc3QgJ3JlcXVlc3RTbGlkZUhUTUwnLCAoKSA9PlxuICAgICAgY29uc29sZS5sb2cgJ3NlbmQgcmVxdWVzdFNsaWRlSFRNTCdcblxuICAgIGlwYy5vbiAnc2V0U2xpZGUnLCAoZSwgdGV4dCkgPT5cbiAgICAgIGNvbnNvbGUubG9nICdyZWNlaXZlIHNldFNsaWRlJ1xuICAgICAgY29uc29sZS5sb2cgdGV4dFxuICAgICAgY29uc29sZS5sb2cgJCgnLm1hcmtkb3duLWJvZHknKS5odG1sKHRleHQpXG5cbiAgICBpcGMub24gJ2dvVG9QYWdlJywgKGUsIHBhZ2UpID0+XG4gICAgICBjb25zb2xlLmxvZyBwYWdlXG4gICAgICBhcHBseUN1cnJlbnRQYWdlIHBhZ2VcblxuXG4iXX0=
