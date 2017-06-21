var MickrClient, Path, clsMarkdown, fs, ipc, resolvePathFromMarp;

clsMarkdown = require('./classes/mds_markdown');

ipc = require('electron').ipcRenderer;

Path = require('path');

MickrClient = require('../modules/MickrClient');

fs = require('fs');

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
      "id": "usedSlide",
      "url": "ws://apps.wisdomweb.net:64260/ws/mik",
      "site": "test",
      "token": "Pad:9948"
    };
    client = new MickrClient(setting);
    client.on('sendUsedSlide', (function(_this) {
      return function(data) {
        return console.log(data.body.content);
      };
    })(this));
    return ipc.on('sendUsedSlidePath', (function(_this) {
      return function(e, filepath) {
        console.log(filepath);
        return fs.readFile(filepath, 'utf8', function(err, txt) {
          if (err) {
            return console.log(err);
          } else {
            txt.toString();
            console.log(txt);
            return render(Markdown.parse(txt));
          }
        });
      };
    })(this));
  })($);
});

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlZFNsaWRlLmpzIiwic291cmNlcyI6WyJ1c2VkU2xpZGUuY29mZmVlIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLElBQUE7O0FBQUEsV0FBQSxHQUFjLE9BQUEsQ0FBUSx3QkFBUjs7QUFDZCxHQUFBLEdBQWMsT0FBQSxDQUFRLFVBQVIsQ0FBbUIsQ0FBQzs7QUFDbEMsSUFBQSxHQUFjLE9BQUEsQ0FBUSxNQUFSOztBQUNkLFdBQUEsR0FBYyxPQUFBLENBQVEsd0JBQVI7O0FBQ2QsRUFBQSxHQUFjLE9BQUEsQ0FBUSxJQUFSOztBQUdkLG1CQUFBLEdBQXNCLFNBQUMsSUFBRDs7SUFBQyxPQUFPOztTQUFTLElBQUksQ0FBQyxPQUFMLENBQWEsU0FBYixFQUF3QixLQUF4QixFQUErQixJQUEvQjtBQUFqQjs7QUFDdEIsUUFBUSxDQUFDLGdCQUFULENBQTBCLGtCQUExQixFQUE4QyxTQUFBO0FBQzVDLE1BQUE7RUFBQSxDQUFBLEdBQUksTUFBTSxDQUFDLE1BQVAsR0FBZ0IsTUFBTSxDQUFDLENBQVAsR0FBVyxPQUFBLENBQVEsUUFBUjtTQUU1QixDQUFBLFNBQUMsQ0FBRDtBQUVELFFBQUE7SUFBQSxDQUFBLENBQUUsMkJBQUYsQ0FBOEIsQ0FBQyxJQUEvQixDQUFvQyxTQUFBO0FBQ2xDLFVBQUE7QUFBQTtBQUFBO1dBQUEscUNBQUE7O3FCQUNFLENBQUEsQ0FBRSxJQUFGLENBQUksQ0FBQyxJQUFMLENBQVUsTUFBVixFQUFrQixtQkFBQSxDQUFvQixDQUFBLENBQUUsSUFBRixDQUFJLENBQUMsSUFBTCxDQUFVLE1BQVYsQ0FBcEIsQ0FBbEI7QUFERjs7SUFEa0MsQ0FBcEM7SUFJQSxRQUFBLEdBQVcsSUFBSSxXQUFKLENBQWdCO01BQUUsV0FBQSxFQUFhLFdBQVcsQ0FBQyxtQkFBWixDQUFnQyxDQUFoQyxDQUFmO0tBQWhCO0lBRVgsTUFBQSxHQUFTO0lBQ1QsTUFBTSxDQUFDLE9BQVAsR0FBaUIsU0FBQTthQUFHLENBQUEsQ0FBRSxZQUFGLENBQWUs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ICcuL2NsYXNzZXMvbWRzX21hcmtkb3duJ1xuaXBjICAgICAgICAgPSByZXF1aXJlKCdlbGVjdHJvbicpLmlwY1JlbmRlcmVyXG5QYXRoICAgICAgICA9IHJlcXVpcmUgJ3BhdGgnXG5NaWNrckNsaWVudCA9IHJlcXVpcmUgJy4uL21vZHVsZXMvTWlja3JDbGllbnQnXG5mcyAgICAgICAgICA9IHJlcXVpcmUgJ2ZzJ1xuXG5cbnJlc29sdmVQYXRoRnJvbU1hcnAgPSAocGF0aCA9ICcuLycpIC0+IFBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLi8nLCBwYXRoKVxuZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lciAnRE9NQ29udGVudExvYWRlZCcsIC0+XG4gICQgPSB3aW5kb3cualF1ZXJ5ID0gd2luZG93LiQgPSByZXF1aXJlKCdqcXVlcnknKVxuXG4gIGRvICgkKSAtPlxuICAgICMgRmlyc3QsIHJlc29sdmUgTWFycCByZXNvdXJjZXMgcGF0aFxuICAgICQoXCJbZGF0YS1tYXJwLXBhdGgtcmVzb2x2ZXJdXCIpLmVhY2ggLT5cbiAgICAgIGZvciB0YXJnZXQgaW4gJChAKS5hdHRyKCdkYXRhLW1hcnAtcGF0aC1yZXNvbHZlcicpLnNwbGl0KC9cXHMrLylcbiAgICAgICAgJChAKS5hdHRyKHRhcmdldCwgcmVzb2x2ZVBhdGhGcm9tTWFycCgkKEApLmF0dHIodGFyZ2V0KSkpXG5cbiAgICBNYXJrZG93biA9IG5ldyBjbHNNYXJrZG93bih7IGFmdGVyUmVuZGVyOiBjbHNNYXJrZG93bi5nZW5lcmF0ZUFmdGVyUmVuZGVyKCQpIH0pXG5cbiAgICB0aGVtZXMgPSB7fVxuICAgIHRoZW1lcy5jdXJyZW50ID0gLT4gJCgnI3RoZW1lLWNzcycpLmF0dHIoJ2hyZWYnKVxuICAgIHRoZW1lcy5kZWZhdWx0ID0gdGhlbWVzLmN1cnJlbnQoKVxuICAgIHRoZW1lcy5hcHBseSA9IChwYXRoID0gbnVsbCkgLT5cbiAgICAgIHRvQXBwbHkgPSByZXNvbHZlUGF0aEZyb21NYXJwKHBhdGggfHwgdGhlbWVzLmRlZmF1bHQpXG5cbiAgICAgIGlmIHRvQXBwbHkgaXNudCB0aGVtZXMuY3VycmVudCgpXG4gICAgICAgICQoJyN0aGVtZS1jc3MnKS5hdHRyKCdocmVmJywgdG9BcHBseSlcbiAgICAgICAgc2V0VGltZW91dCBhcHBseVNjcmVlblNpemUsIDIwXG5cbiAgICAgICAgcmV0dXJuIHRvQXBwbHkubWF0Y2goLyhbXlxcL10rKVxcLmNzcyQvKVsxXVxuICAgICAgZmFsc2VcblxuICAgIHNldFN0eWxlID0gKGlkZW50aWZpZXIsIGNzcykgLT5cbiAgICAgIGlkICA9IFwibWRzLSN7aWRlbnRpZmllcn1TdHlsZVwiXG4gICAgICBlbG0gPSAkKFwiIyN7aWR9XCIpXG4gICAgICBlbG0gPSAkKFwiPHN0eWxlIGlkPVxcXCIje2lkfVxcXCI+PC9zdHlsZT5cIikuYXBwZW5kVG8oZG9jdW1lbnQuaGVhZCkgaWYgZWxtLmxlbmd0aCA8PSAwXG4gICAgICBlbG0udGV4dChjc3MpXG5cbiAgICBnZXRDU1N2YXIgPSAocHJvcCkgLT4gZG9jdW1lbnQuZGVmYXVsdFZpZXcuZ2V0Q29tcHV0ZWRTdHlsZShkb2N1bWVudC5ib2R5KS5nZXRQcm9wZXJ0eVZhbHVlKHByb3ApXG5cbiAgICBnZXRTbGlkZVNpemUgPSAtPlxuICAgICAgc2l6ZSA9XG4gICAgICAgIHc6ICtnZXRDU1N2YXIgJy0tc2xpZGUtd2lkdGgnXG4gICAgICAgIGg6ICtnZXRDU1N2YXIgJy0tc2xpZGUtaGVpZ2h0J1xuXG4gICAgICBzaXplLnJhdGlvID0gc2l6ZS53IC8gc2l6ZS5oXG4gICAgICBzaXplXG5cbiAgICBhcHBseVNsaWRlU2l6ZSA9ICh3aWR0aCwgaGVpZ2h0KSAtPlxuICAgICAgc2V0U3R5bGUgJ3NsaWRlU2l6ZScsXG4gICAgICAgIFwiXCJcIlxuICAgICAgICBib2R5IHtcbiAgICAgICAgICAtLXNsaWRlLXdpZHRoOiAje3dpZHRoIHx8ICdpbmhlcml0J307XG4gICAgICAgICAgLS1zbGlkZS1oZWlnaHQ6ICN7aGVpZ2h0IHx8ICdpbmhlcml0J307XG4gICAgICAgIH1cbiAgICAgICAgXCJcIlwiXG4gICAgICBhcHBseVNjcmVlblNpemUoKVxuXG4gICAgZ2V0U2NyZWVuU2l6ZSA9IC0+XG4gICAgICBzaXplID1cbiAgICAgICAgdzogZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmNsaWVudFdpZHRoXG4gICAgICAgIGg6IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5jbGllbnRIZWlnaHRcblxuICAgICAgcHJldmlld01hcmdpbiA9ICtnZXRDU1N2YXIgJy0tcHJldmlldy1tYXJnaW4nXG4gICAgICBzaXplLnJhdGlvID0gKHNpemUudyAtIHByZXZpZXdNYXJnaW4gKiAyKSAvIChzaXplLmggLSBwcmV2aWV3TWFyZ2luICogMilcbiAgICAgIHNpemVcblxuICAgIGFwcGx5U2NyZWVuU2l6ZSA9IC0+XG4gICAgICBzaXplID0gZ2V0U2NyZWVuU2l6ZSgpXG4gICAgICBzZXRTdHlsZSAnc2NyZWVuU2l6ZScsIFwiYm9keSB7IC0tc2NyZWVuLXdpZHRoOiAje3NpemUud307IC0tc2NyZWVuLWhlaWdodDogI3tzaXplLmh9OyB9XCJcbiAgICAgICQoJyNjb250YWluZXInKS50b2dnbGVDbGFzcyAnaGVpZ2h0LWJhc2UnLCBzaXplLnJhdGlvID4gZ2V0U2xpZGVTaXplKCkucmF0aW9cblxuICAgICMg44Oa44O844K455Wq5Y+344KS5Y+X44GR5Y+W44Gj44Gf44GC44Go44CB54++5Zyo44Gu44Oa44O844K45Lul5aSW44Gu44Oa44O844K444Gu44K544Op44Kk44OJ44KS6Z2e6KGo56S644Gr44GZ44KLXG4gICAgIyDjgZ/jgaDjgZfjgIHpnZ7jg5fjg6rjg7Pjg4jnirbmhYvjga7mmYLpmZDlrppcbiAgICBhcHBseUN1cnJlbnRQYWdlID0gKHBhZ2UpIC0+XG4gICAgICBzZXRTdHlsZSAnY3VycmVudFBhZ2UnLFxuICAgICAgICBcIlwiXCJcbiAgICAgICAgQG1lZGlhIG5vdCBwcmludCB7XG4gICAgICAgICAgYm9keS5zbGlkZS12aWV3LnNjcmVlbiAuc2xpZGVfd3JhcHBlcjpub3QoOm50aC1vZi10eXBlKCN7cGFnZX0pKSB7XG4gICAgICAgICAgICB3aWR0aDogMCAhaW1wb3J0YW50O1xuICAgICAgICAgICAgaGVpZ2h0OiAwICFpbXBvcnRhbnQ7XG4gICAgICAgICAgICBib3JkZXI6IG5vbmUgIWltcG9ydGFudDtcbiAgICAgICAgICAgIGJveC1zaGFkb3c6IG5vbmUgIWltcG9ydGFudDtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXCJcIlwiXG5cbiAgICByZW5kZXIgPSAobWQpIC0+XG4gICAgICBhcHBseVNsaWRlU2l6ZSBtZC5zZXR0aW5ncy5nZXRHbG9iYWwoJ3dpZHRoJyksIG1kLnNldHRpbmdzLmdldEdsb2JhbCgnaGVpZ2h0JylcbiAgICAgIG1kLmNoYW5nZWRUaGVtZSA9IHRoZW1lcy5hcHBseSBtZC5zZXR0aW5ncy5nZXRHbG9iYWwoJ3RoZW1lJylcbiAgICAgICQoJyNtYXJrZG93bicpLmh0bWwobWQucGFyc2VkKVxuXG4gICAgICAjIHlvdXR1YmUgcGx1Z2luIHJlcGxhY2VtZW50IGV4LiBAW3lvdXR1YmVdKGh0dHBzOi8vfilcbiAgICAgICMgaWYgdXJsID0gJCgnLmVtYmVkLXJlc3BvbnNpdmUtaXRlbScpLmF0dHIoJ3NyYycpXG4gICAgICAjICAgY29uc29sZS5sb2cgdXJsXG4gICAgICAjICAgY29uc29sZS5sb2cgdXJsLmluZGV4T2YoXCJmaWxlOlwiKVxuICAgICAgIyAgIHVybCA9ICdodHRwczonICsgdXJsXG4gICAgICAjICAgJCgnLmVtYmVkLXJlc3BvbnNpdmUtaXRlbScpLmF0dHIoJ3NyYycsIHVybClcblxuICAgICAgaXBjLnNlbmRUb0hvc3QgJ3JlbmRlcmVkJywgbWRcbiAgICAgIGlwYy5zZW5kVG9Ib3N0ICdydWxlckNoYW5nZWQnLCBtZC5ydWxlcnMgaWYgbWQucnVsZXJDaGFuZ2VkXG4gICAgICBpcGMuc2VuZFRvSG9zdCAndGhlbWVDaGFuZ2VkJywgbWQuY2hhbmdlZFRoZW1lIGlmIG1kLmNoYW5nZWRUaGVtZVxuXG4gICAgc2VuZFBkZk9wdGlvbnMgPSAob3B0cykgLT5cbiAgICAgIHNsaWRlU2l6ZSA9IGdldFNsaWRlU2l6ZSgpXG5cbiAgICAgIG9wdHMuZXhwb3J0U2l6ZSA9XG4gICAgICAgIHdpZHRoOiAgTWF0aC5mbG9vcihzbGlkZVNpemUudyAqIDI1NDAwIC8gOTYpXG4gICAgICAgIGhlaWdodDogTWF0aC5mbG9vcihzbGlkZVNpemUuaCAqIDI1NDAwIC8gOTYpXG5cbiAgICAgICMgTG9hZCBzbGlkZSByZXNvdXJjZXNcbiAgICAgICQoJ2JvZHknKS5hZGRDbGFzcyAndG8tcGRmJ1xuICAgICAgc2V0VGltZW91dCAoLT4gaXBjLnNlbmRUb0hvc3QgJ3Jlc3BvbnNlUGRmT3B0aW9ucycsIG9wdHMpLCAwXG5cbiAgICBzZXRJbWFnZURpcmVjdG9yeSA9IChkaXIpIC0+ICQoJ2hlYWQgPiBiYXNlJykuYXR0cignaHJlZicsIGRpciB8fCAnLi8nKVxuXG4gICAgaXBjLm9uICdyZW5kZXInLCAoZSwgbWQpIC0+IHJlbmRlcihNYXJrZG93bi5wYXJzZShtZCkpXG4gICAgaXBjLm9uICdjdXJyZW50UGFnZScsIChlLCBwYWdlKSAtPiBhcHBseUN1cnJlbnRQYWdlIHBhZ2VcbiAgICBpcGMub24gJ3NldENsYXNzJywgKGUsIGNsYXNzZXMpIC0+ICQoJ2JvZHknKS5hdHRyICdjbGFzcycsIGNsYXNzZXNcbiAgICBpcGMub24gJ3NldEltYWdlRGlyZWN0b3J5JywgKGUsIGRpcikgLT4gc2V0SW1hZ2VEaXJlY3RvcnkoZGlyKVxuICAgIGlwYy5vbiAncmVxdWVzdFBkZk9wdGlvbnMnLCAoZSwgb3B0cykgLT4gc2VuZFBkZk9wdGlvbnMob3B0cyB8fCB7fSlcbiAgICBpcGMub24gJ3VuZnJlZXplJywgLT4gJCgnYm9keScpLnJlbW92ZUNsYXNzKCd0by1wZGYnKVxuXG4gICAgIyBJbml0aWFsaXplXG4gICAgJChkb2N1bWVudCkub24gJ2NsaWNrJywgJ2EnLCAoZSkgLT5cbiAgICAgIGUucHJldmVudERlZmF1bHQoKVxuICAgICAgaXBjLnNlbmRUb0hvc3QgJ2xpbmtUbycsICQoZS5jdXJyZW50VGFyZ2V0KS5hdHRyKCdocmVmJylcblxuICAgICQod2luZG93KS5yZXNpemUgKGUpIC0+IGFwcGx5U2NyZWVuU2l6ZSgpXG4gICAgYXBwbHlTY3JlZW5TaXplKClcblxuICAgICMgcHJlc2VudGF0aW9uID09PT09PT09PT09PT09PT09PT09PT09PVxuICAgIHNldHRpbmcgPVxuICAgICBcImlkXCI6IFwidXNlZFNsaWRlXCJcbiAgICAgXCJ1cmxcIjogXCJ3czovL2FwcHMud2lzZG9td2ViLm5ldDo2NDI2MC93cy9taWtcIlxuICAgICBcInNpdGVcIjogXCJ0ZXN0XCJcbiAgICAgXCJ0b2tlblwiOiBcIlBhZDo5OTQ4XCJcblxuICAgIGNsaWVudCA9IG5ldyBNaWNrckNsaWVudChzZXR0aW5nKTtcblxuICAgIGNsaWVudC5vbiAnc2VuZFVzZWRTbGlkZScsIChkYXRhKSA9PlxuICAgICAgY29uc29sZS5sb2cgZGF0YS5ib2R5LmNvbnRlbnRcblxuICAgIGlwYy5vbiAnc2VuZFVzZWRTbGlkZVBhdGgnLCAoZSwgZmlsZXBhdGgpID0+XG4gICAgICBjb25zb2xlLmxvZyBmaWxlcGF0aFxuICAgICAgIyDnrKzkuozlvJXmlbDjgasgdXRmOCDjgpLjgaTjgZHjgarjgYTjgahCdWZmZXLjg6rjgrnjg4jvvJ/jgYzluLDjgaPjgabjgY3jgabjgZfjgb7jgYZcbiAgICAgIGZzLnJlYWRGaWxlIGZpbGVwYXRoLCd1dGY4JywgKGVyciwgdHh0KSA9PlxuICAgICAgICBpZiBlcnJcbiAgICAgICAgICBjb25zb2xlLmxvZyBlcnJcbiAgICAgICAgZWxzZVxuICAgICAgICAgIHR4dC50b1N0cmluZygpXG4gICAgICAgICAgY29uc29sZS5sb2cgdHh0XG4gICAgICAgICAgcmVuZGVyIE1hcmtkb3duLnBhcnNlKHR4dClcblxuICAgICAgICAgICMgIyBpZ25vcmXjgZfjgarjgYTloLTlkIggZmlsZU5hbWUg44KSIGZpbGVIaXN0cnnjgIDjgatwdXNo44GX44CB44GZ44G544Gm44Gu44Km44Kk44Oz44OJ44Km44Gu44Oh44OL44Ol44O85pu05pawXG4gICAgICAgICAgIyB1bmxlc3Mgb3B0aW9ucz8uaWdub3JlUmVjZW50XG4gICAgICAgICAgIyAgIE1kc0ZpbGVIaXN0b3J5LnB1c2ggZm5hbWVcbiAgICAgICAgICAjICAgTWRzTWFpbk1lbnUudXBkYXRlTWVudVRvQWxsKClcblxuICAgICAgICAgICMgIyDjgqbjgqTjg7Pjg4njgqbjgYzlrZjlnKjjgZfjgIHjgYvjgaTjgIFvdmVycmlkZeOBvuOBn+OBr+OCpuOCpOODs+ODieOCpuOBruODkOODg+ODleOCoeOBjOepuuOAgeOBp+OBguOCi+OBqOOBjVxuICAgICAgICAgICMgaWYgbWRzV2luZG93PyBhbmQgKG9wdGlvbnM/Lm92ZXJyaWRlIG9yIG1kc1dpbmRvdy5pc0J1ZmZlckVtcHR5KCkpXG4gICAgICAgICAgIyAgIG1kc1dpbmRvdy50cmlnZ2VyICdsb2FkJywgYnVmLCBmbmFtZVxuXG4gICAgICAgICAgIyAjIOOCpuOCpOODs+ODieOCpuWIneacn+WMluOAgHBhcmFtID0gZmlsZU9wdHPjgIDjgacgZmlsZU9wdHMgPSB7IHBhdGg6IGZuYW1lLCBidWZmZXI6IGJ1ZiB9XG4gICAgICAgICAgIyAjIOesrOS6jOW8leaVsOOBr+OBquOBlyAtPiBAb3B0aW9ucyA9IHt9XG4gICAgICAgICAgIyBlbHNlXG4gICAgICAgICAgIyAgIG5ldyBNZHNXaW5kb3cgeyBwYXRoOiBmbmFtZSwgYnVmZmVyOiBidWYgfVxuXG4iXX0=
