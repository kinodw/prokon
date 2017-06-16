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
  var changeSlide, client, selectedIndex, setting, slideHTML, slideList;
  setting = {
    "id": "presenDevSlide",
    "url": "ws://apps.wisdomweb.net:64260/ws/mik",
    "site": "test",
    "token": "Pad:9948"
  };
  client = new MickrClient(setting);
  changeSlide = function(page) {
    client.send("goToPage", {
      "to": "presenSlide",
      "body": {
        "content": page
      }
    });
    return client.send("changeComment", {
      "to": "presenDevIndex",
      "body": {
        "content": page
      }
    });
  };
  slideHTML = "";
  slideList = [];
  selectedIndex = 0;
  return (function($) {
    var Markdown, applyCurrentPage, applyScreenSize, applySlideSize, getCSSvar, getScreenSize, getSlideSize, render, setImageDirectory, setStyle, themes;
    $("[data-marp-path-resolver]").each(function() {
      var j, len, ref, results, target;
      ref = $(this).attr('data-marp-path-resolver').split(/\s+/);
      results = [];
      for (j = 0, len = ref.length; j < len; j++) {
        target = ref[j];
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
      var i, slideOuterHTML, value;
      console.log('call render');
      applySlideSize(md.settings.getGlobal('width'), md.settings.getGlobal('height'));
      md.changedTheme = themes.apply(md.settings.getGlobal('theme'));
      slideOuterHTML = [];
      for (i in slideList) {
        value = slideList[i];
        slideOuterHTML.push(value.outerHTML);
      }
      $('#markdown').html(slideOuterHTML.join(' '));
      $('.slide_wrapper').css('backgroundColor', '');
      $('#1').css('backgroundColor', '#ffe3b4');
      changeSlide(1);
      $('.slide_wrapper').on('click', function() {
        $('.slide_wrapper').css('backgroundColor', '');
        $(this).css('backgroundColor', '#ffe3b4');
        selectedIndex = slideList.indexOf(this);
        $("html,body").animate({
          scrollTop: $(this).offset().top
        });
        return changeSlide($(this).attr('id'));
      });
      ipc.sendToHost('rendered', md);
      if (md.rulerChanged) {
        ipc.sendToHost('rulerChanged', md.rulers);
      }
      if (md.changedTheme) {
        return ipc.sendToHost('themeChanged', md.changedTheme);
      }
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
    $(document).keydown(function(e) {
      var nextPageId, nextPageIndex;
      if (e.keyCode === 38) {
        console.log('up key');
        nextPageIndex = (selectedIndex + (slideList.length - 1)) % slideList.length;
        nextPageId = slideList[nextPageIndex].id;
        console.log('next id = ' + nextPageId);
        $('.slide_wrapper').css('backgroundColor', '');
        $("#" + nextPageId).css('backgroundColor', '#ffe3b4');
        selectedIndex = nextPageIndex;
        changeSlide(nextPageId);
        $("html,body").animate({
          scrollTop: $("#" + nextPageId).offset().top
        });
      }
      if (e.keyCode === 40) {
        console.log('down key');
        nextPageIndex = (selectedIndex + 1) % slideList.length;
        nextPageId = slideList[nextPageIndex].id;
        console.log('next id = ' + nextPageId);
        $('.slide_wrapper').css('backgroundColor', '');
        $("#" + nextPageId).css('backgroundColor', '#ffe3b4');
        selectedIndex = nextPageIndex;
        changeSlide(nextPageId);
        return $("html,body").animate({
          scrollTop: $("#" + nextPageId).offset().top
        });
      }
    });
    $(window).resize(function(e) {
      return applyScreenSize();
    });
    applyScreenSize();
    ipc.on('requestSlideInfo', (function(_this) {
      return function() {
        var markdownBody;
        console.log('receive requestSlideInfo');
        markdownBody = document.querySelector('.markdown-body');
        ipc.sendToHost('sendSlideInfo', markdownBody.innerHTML);
        console.log(markdownBody.innerHTML);
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
        slideHTML = text.join("");
        document.querySelector('.markdown-body').innerHTML = slideHTML;
        return $('.slide_wrapper').each(function(idx, elem) {
          return slideList.push(elem);
        });
      };
    })(this));
    $('.markdown-body').sortable({
      'opacity': 0.5
    });
    $('.markdown-body').disableSelection();
    return $(document).on('sortstop', '.markdown-body', function() {
      var i, j, len, tmp;
      console.log('sort finished');
      tmp = slideList[selectedIndex].id;
      slideList = [];
      $('.slide_wrapper').each(function(idx, elem) {
        return slideList.push(elem);
      });
      for (j = 0, len = slideList.length; j < len; j++) {
        i = slideList[j];
        if (i.id === tmp) {
          selectedIndex = slideList.indexOf(i);
        }
      }
      return console.log(slideList);
    });
  })($);
});

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJlc2VuRGV2U2xpZGUuanMiLCJzb3VyY2VzIjpbInByZXNlbkRldlNsaWRlLmNvZmZlZSJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxJQUFBOztBQUFBLFdBQUEsR0FBYyxPQUFBLENBQVEsd0JBQVI7O0FBQ2QsR0FBQSxHQUFjLE9BQUEsQ0FBUSxVQUFSLENBQW1CLENBQUM7O0FBQ2xDLElBQUEsR0FBYyxPQUFBLENBQVEsTUFBUjs7QUFDZCxXQUFBLEdBQWMsT0FBQSxDQUFRLHdCQUFSOztBQUVkLG1CQUFBLEdBQXNCLFNBQUMsSUFBRDs7SUFBQyxPQUFPOztTQUFTLElBQUksQ0FBQyxPQUFMLENBQWEsU0FBYixFQUF3QixLQUF4QixFQUErQixJQUEvQjtBQUFqQjs7QUFFdEIsUUFBUSxDQUFDLGdCQUFULENBQTBCLGtCQUExQixFQUE4QyxTQUFBO0FBQzVDLE1BQUE7RUFBQSxPQUFBLEdBQ0M7SUFBQSxJQUFBLEVBQU0sZ0JBQU47SUFDQSxLQUFBLEVBQU8sc0NBRFA7SUFFQSxNQUFBLEVBQVEsTUFGUjtJQUdBLE9BQUEsRUFBUyxVQUhUOztFQUlELE1BQUEsR0FBUyxJQUFJLFdBQUosQ0FBZ0IsT0FBaEI7RUFFVCxXQUFBLEdBQWMsU0FBQyxJQUFEO0lBQ1osTUFBTSxDQUFDLElBQVAsQ0FBWSxVQUFaLEVBQXdCO01BQ3RCLElBQUEsRUFBTSxhQURnQjtNQUV0QixNQUFBLEVBQ0U7UUFBQSxTQUFBLEVBQVcsSUFBWDtPQUhvQjtLQUF4QjtXQUtBLE1BQU0sQ0FBQyxJQUFQLENBQVksZUFBWixFQUE2QjtNQUMzQixJQUFBLEVBQU0sZ0JBRHFCO01BRTNCLE1BQUEsRUFDRTtRQUFBLFNBQUEsRUFBVyxJQUFYO09BSHlCO0tBQTdCO0VBTlk7RUFjZCxTQUFBLEdBQVk7RUFDWixTQUFBLEdBQVk7RUFFWixhQUFBLEdBQWdCO1NBRWIsQ0FBQSxTQUFDLENBQUQ7QUFFRCxRQUFBO0lBQUEsQ0FBQSxDQUFFLDJCQUFGLENBQThCLENBQUMsSUFBL0IsQ0FB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QUEsQ0FBQSxDQUFBLElBQUEsQ0FBbkI7SUFXQSxDQUFBLENBQUUsZ0JBQUYsQ0FBbUIsQ0FBQyxRQUFwQixDQUE2QjtNQUMzQixTQUFBLEVBQVcsR0FEZ0I7S0FBN0I7SUFHQSxDQUFBLENBQUUsZ0JBQUYsQ0FBbUIsQ0FBQyxnQkFBcEIsQ0FBQTtXQUNBLENBQUEsQ0FBRSxRQUFGLENBQVcsQ0FBQyxFQUFaLENBQWUsVUFBZixFQUEyQixnQkFBM0IsRUFBNkMsU0FBQTtBQUMzQyxVQUFBO01BQUEsT0FBTyxDQUFDLEdBQVIsQ0FBWSxlQUFaO01BRUEsR0FBQSxHQUFNLFNBQVUsQ0FBQSxhQUFBLENBQWMsQ0FBQztNQUMvQixTQUFBLEdBQVk7TUFDWixDQUFBLENBQUUsZ0JBQUYsQ0FBbUIsQ0FBQyxJQUFwQixDQUF5QixTQUFDLEdBQUQsRUFBTSxJQUFOO2VBQ3hCLFNBQVMsQ0FBQyxJQUFWLENBQWUsSUFBZjtNQUR3QixDQUF6QjtBQUlBLFdBQUEsMkNBQUE7O1FBQ0UsSUFBRyxDQUFDLENBQUMsRUFBRixLQUFRLEdBQVg7VUFDRSxhQUFBLEdBQWdCLFNBQVMsQ0FBQyxPQUFWLENBQWtCLENBQWxCLEVBRGxCOztBQURGO2FBR0EsT0FBTyxDQUFDLEdBQVIsQ0FBWSxTQUFaO0lBWjJDLENBQTdDO0VBbkxDLENBQUEsQ0FBSCxDQUFJLENBQUo7QUEzQjRDLENBQTlDIiwic291cmNlc0NvbnRlbnQiOlsiY2xzTWFya2Rvd24gPSByZXF1aXJlICcuL2NsYXNzZXMvbWRzX21hcmtkb3duJ1xuaXBjICAgICAgICAgPSByZXF1aXJlKCdlbGVjdHJvbicpLmlwY1JlbmRlcmVyXG5QYXRoICAgICAgICA9IHJlcXVpcmUgJ3BhdGgnXG5NaWNrckNsaWVudCA9IHJlcXVpcmUgJy4uL21vZHVsZXMvTWlja3JDbGllbnQnXG5cbnJlc29sdmVQYXRoRnJvbU1hcnAgPSAocGF0aCA9ICcuLycpIC0+IFBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLi8nLCBwYXRoKVxuXG5kb2N1bWVudC5hZGRFdmVudExpc3RlbmVyICdET01Db250ZW50TG9hZGVkJywgLT5cbiAgc2V0dGluZyA9XG4gICBcImlkXCI6IFwicHJlc2VuRGV2U2xpZGVcIlxuICAgXCJ1cmxcIjogXCJ3czovL2FwcHMud2lzZG9td2ViLm5ldDo2NDI2MC93cy9taWtcIlxuICAgXCJzaXRlXCI6IFwidGVzdFwiXG4gICBcInRva2VuXCI6IFwiUGFkOjk5NDhcIlxuICBjbGllbnQgPSBuZXcgTWlja3JDbGllbnQoc2V0dGluZyk7XG5cbiAgY2hhbmdlU2xpZGUgPSAocGFnZSkgLT5cbiAgICBjbGllbnQuc2VuZCBcImdvVG9QYWdlXCIsIHtcbiAgICAgIFwidG9cIjogXCJwcmVzZW5TbGlkZVwiLFxuICAgICAgXCJib2R5XCI6XG4gICAgICAgIFwiY29udGVudFwiOiBwYWdlXG4gICAgfVxuICAgIGNsaWVudC5zZW5kIFwiY2hhbmdlQ29tbWVudFwiLCB7XG4gICAgICBcInRvXCI6IFwicHJlc2VuRGV2SW5kZXhcIixcbiAgICAgIFwiYm9keVwiOlxuICAgICAgICBcImNvbnRlbnRcIjogcGFnZVxuICAgIH1cblxuXG5cbiAgc2xpZGVIVE1MID0gXCJcIlxuICBzbGlkZUxpc3QgPSBbXVxuICAjIHNsaWRlTGlzdOOBruS9leeVquebruOBruimgee0oOOBjOePvuWcqOmBuOaKnuOBleOCjOOBpuOBhOOCi+OBi1xuICBzZWxlY3RlZEluZGV4ID0gMFxuXG4gIGRvICgkKSAtPlxuICAgICMgRmlyc3QsIHJlc29sdmUgTWFycCByZXNvdXJjZXMgcGF0aFxuICAgICQoXCJbZGF0YS1tYXJwLXBhdGgtcmVzb2x2ZXJdXCIpLmVhY2ggLT5cbiAgICAgIGZvciB0YXJnZXQgaW4gJChAKS5hdHRyKCdkYXRhLW1hcnAtcGF0aC1yZXNvbHZlcicpLnNwbGl0KC9cXHMrLylcbiAgICAgICAgJChAKS5hdHRyKHRhcmdldCwgcmVzb2x2ZVBhdGhGcm9tTWFycCgkKEApLmF0dHIodGFyZ2V0KSkpXG5cbiAgICBNYXJrZG93biA9IG5ldyBjbHNNYXJrZG93bih7IGFmdGVyUmVuZGVyOiBjbHNNYXJrZG93bi5nZW5lcmF0ZUFmdGVyUmVuZGVyKCQpIH0pXG5cbiAgICB0aGVtZXMgPSB7fVxuICAgIHRoZW1lcy5jdXJyZW50ID0gLT4gJCgnI3RoZW1lLWNzcycpLmF0dHIoJ2hyZWYnKVxuICAgIHRoZW1lcy5kZWZhdWx0ID0gdGhlbWVzLmN1cnJlbnQoKVxuICAgIHRoZW1lcy5hcHBseSA9IChwYXRoID0gbnVsbCkgLT5cbiAgICAgIHRvQXBwbHkgPSByZXNvbHZlUGF0aEZyb21NYXJwKHBhdGggfHwgdGhlbWVzLmRlZmF1bHQpXG5cbiAgICAgIGlmIHRvQXBwbHkgaXNudCB0aGVtZXMuY3VycmVudCgpXG4gICAgICAgICQoJyN0aGVtZS1jc3MnKS5hdHRyKCdocmVmJywgdG9BcHBseSlcbiAgICAgICAgc2V0VGltZW91dCBhcHBseVNjcmVlblNpemUsIDIwXG5cbiAgICAgICAgcmV0dXJuIHRvQXBwbHkubWF0Y2goLyhbXlxcL10rKVxcLmNzcyQvKVsxXVxuICAgICAgZmFsc2VcblxuICAgIHNldFN0eWxlID0gKGlkZW50aWZpZXIsIGNzcykgLT5cbiAgICAgIGlkICA9IFwibWRzLSN7aWRlbnRpZmllcn1TdHlsZVwiXG4gICAgICBlbG0gPSAkKFwiIyN7aWR9XCIpXG4gICAgICBlbG0gPSAkKFwiPHN0eWxlIGlkPVxcXCIje2lkfVxcXCI+PC9zdHlsZT5cIikuYXBwZW5kVG8oZG9jdW1lbnQuaGVhZCkgaWYgZWxtLmxlbmd0aCA8PSAwXG4gICAgICBlbG0udGV4dChjc3MpXG5cbiAgICBnZXRDU1N2YXIgPSAocHJvcCkgLT4gZG9jdW1lbnQuZGVmYXVsdFZpZXcuZ2V0Q29tcHV0ZWRTdHlsZShkb2N1bWVudC5ib2R5KS5nZXRQcm9wZXJ0eVZhbHVlKHByb3ApXG5cbiAgICBnZXRTbGlkZVNpemUgPSAtPlxuICAgICAgc2l6ZSA9XG4gICAgICAgIHc6ICtnZXRDU1N2YXIgJy0tc2xpZGUtd2lkdGgnXG4gICAgICAgIGg6ICtnZXRDU1N2YXIgJy0tc2xpZGUtaGVpZ2h0J1xuXG4gICAgICBzaXplLnJhdGlvID0gc2l6ZS53IC8gc2l6ZS5oXG4gICAgICBzaXplXG5cbiAgICBhcHBseVNsaWRlU2l6ZSA9ICh3aWR0aCwgaGVpZ2h0KSAtPlxuICAgICAgc2V0U3R5bGUgJ3NsaWRlU2l6ZScsXG4gICAgICAgIFwiXCJcIlxuICAgICAgICBib2R5IHtcbiAgICAgICAgICAtLXNsaWRlLXdpZHRoOiAje3dpZHRoIHx8ICdpbmhlcml0J307XG4gICAgICAgICAgLS1zbGlkZS1oZWlnaHQ6ICN7aGVpZ2h0IHx8ICdpbmhlcml0J307XG4gICAgICAgIH1cbiAgICAgICAgXCJcIlwiXG4gICAgICBhcHBseVNjcmVlblNpemUoKVxuXG4gICAgZ2V0U2NyZWVuU2l6ZSA9IC0+XG4gICAgICBzaXplID1cbiAgICAgICAgdzogZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmNsaWVudFdpZHRoXG4gICAgICAgIGg6IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5jbGllbnRIZWlnaHRcblxuICAgICAgcHJldmlld01hcmdpbiA9ICtnZXRDU1N2YXIgJy0tcHJldmlldy1tYXJnaW4nXG4gICAgICBzaXplLnJhdGlvID0gKHNpemUudyAtIHByZXZpZXdNYXJnaW4gKiAyKSAvIChzaXplLmggLSBwcmV2aWV3TWFyZ2luICogMilcbiAgICAgIHNpemVcblxuICAgIGFwcGx5U2NyZWVuU2l6ZSA9IC0+XG4gICAgICBzaXplID0gZ2V0U2NyZWVuU2l6ZSgpXG4gICAgICBzZXRTdHlsZSAnc2NyZWVuU2l6ZScsIFwiYm9keSB7IC0tc2NyZWVuLXdpZHRoOiAje3NpemUud307IC0tc2NyZWVuLWhlaWdodDogI3tzaXplLmh9OyB9XCJcbiAgICAgICQoJyNjb250YWluZXInKS50b2dnbGVDbGFzcyAnaGVpZ2h0LWJhc2UnLCBzaXplLnJhdGlvID4gZ2V0U2xpZGVTaXplKCkucmF0aW9cblxuICAgICMg44Oa44O844K455Wq5Y+344KS5Y+X44GR5Y+W44Gj44Gf44GC44Go44CB54++5Zyo44Gu44Oa44O844K45Lul5aSW44Gu44Oa44O844K444Gu44K544Op44Kk44OJ44KS6Z2e6KGo56S644Gr44GZ44KLXG4gICAgIyDjgZ/jgaDjgZfjgIHpnZ7jg5fjg6rjg7Pjg4jnirbmhYvjga7mmYLpmZDlrppcbiAgICBhcHBseUN1cnJlbnRQYWdlID0gKHBhZ2UpIC0+XG4gICAgICBzZXRTdHlsZSAnY3VycmVudFBhZ2UnLFxuICAgICAgICBcIlwiXCJcbiAgICAgICAgQG1lZGlhIG5vdCBwcmludCB7XG4gICAgICAgICAgYm9keS5zbGlkZS12aWV3LnNjcmVlbiAuc2xpZGVfd3JhcHBlcjpub3QoOm50aC1vZi10eXBlKCN7cGFnZX0pKSB7XG4gICAgICAgICAgICB3aWR0aDogMCAhaW1wb3J0YW50O1xuICAgICAgICAgICAgaGVpZ2h0OiAwICFpbXBvcnRhbnQ7XG4gICAgICAgICAgICBib3JkZXI6IG5vbmUgIWltcG9ydGFudDtcbiAgICAgICAgICAgIGJveC1zaGFkb3c6IG5vbmUgIWltcG9ydGFudDtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXCJcIlwiXG4gICAgIyBwcmVzZW5EZXbnlLvpnaLjgafjga/jga/jgZjjgoHjgavkuIDlm57jgaDjgZHlkbzjgbDjgozjgotcbiAgICByZW5kZXIgPSAobWQpIC0+XG4gICAgICBjb25zb2xlLmxvZyAnY2FsbCByZW5kZXInXG4gICAgICBhcHBseVNsaWRlU2l6ZSBtZC5zZXR0aW5ncy5nZXRHbG9iYWwoJ3dpZHRoJyksIG1kLnNldHRpbmdzLmdldEdsb2JhbCgnaGVpZ2h0JylcbiAgICAgIG1kLmNoYW5nZWRUaGVtZSA9IHRoZW1lcy5hcHBseSBtZC5zZXR0aW5ncy5nZXRHbG9iYWwoJ3RoZW1lJylcbiAgICAgICMgJCgnI21hcmtkb3duJykuaHRtbChzbGlkZUhUTUwpXG5cbiAgICAgICMgc2xpZGVMaXN06KaB57Sg44Gd44KM44Ge44KM44GL44KJb3V0ZXJIVE1M44KS5Y+W44KK5Ye644GX44Oq44K544OI44Gr5qC857SNXG4gICAgICBzbGlkZU91dGVySFRNTCA9IFtdXG4gICAgICBmb3IgaSwgdmFsdWUgb2Ygc2xpZGVMaXN0XG4gICAgICAgIHNsaWRlT3V0ZXJIVE1MLnB1c2ggdmFsdWUub3V0ZXJIVE1MXG5cbiAgICAgICQoJyNtYXJrZG93bicpLmh0bWwoc2xpZGVPdXRlckhUTUwuam9pbignICcpKVxuXG4gICAgICAjIOOBr+OBmOOCgeOBruOCueODqeOCpOODieOBruiJsuOCkuWkieOBiOOBpuOBiuOBjeOAgeOBneOBruODmuODvOOCuOOBjOmBuOaKnuOBleOCjOOBpuOBhOOCi+OBk+OBqOOCkuekuuOBmVxuICAgICAgJCgnLnNsaWRlX3dyYXBwZXInKS5jc3MoJ2JhY2tncm91bmRDb2xvcicsICcnKVxuICAgICAgJCgnIzEnKS5jc3MoJ2JhY2tncm91bmRDb2xvcicsICcjZmZlM2I0JylcbiAgICAgIGNoYW5nZVNsaWRlKDEpXG5cbiAgICAgICMg5oq844GV44KM44Gfc2xpZGVfd3JhcHBlcuOBrmlk44KS6YCB5L+h44GX44Gm44Oa44O844K46YG356e7XG4gICAgICAkKCcuc2xpZGVfd3JhcHBlcicpLm9uICdjbGljaycsICgpIC0+XG4gICAgICAgICMg6YG45oqe44GV44KM44Gf44K544Op44Kk44OJ44Gu6Imy44KS5aSJ5pu044GX44CB44CA44Oa44O844K46YG356e744GV44Gb44KLXG4gICAgICAgICQoJy5zbGlkZV93cmFwcGVyJykuY3NzKCdiYWNrZ3JvdW5kQ29sb3InLCAnJylcbiAgICAgICAgJCh0aGlzKS5jc3MoJ2JhY2tncm91bmRDb2xvcicsICcjZmZlM2I0JylcbiAgICAgICAgc2VsZWN0ZWRJbmRleCA9IHNsaWRlTGlzdC5pbmRleE9mKHRoaXMpXG4gICAgICAgICQoXCJodG1sLGJvZHlcIikuYW5pbWF0ZSh7c2Nyb2xsVG9wOiQodGhpcykub2Zmc2V0KCkudG9wfSk7XG4gICAgICAgICMg44Oa44O844K456e75YuV44Oh44OD44K744O844K46YCB5L+hXG4gICAgICAgICNpcGMuc2VuZFRvSG9zdCAnZ29Ub1BhZ2UnLCAkKHRoaXMpLmF0dHIoJ2lkJylcbiAgICAgICAgY2hhbmdlU2xpZGUoJCh0aGlzKS5hdHRyKCdpZCcpKVxuXG4gICAgICBpcGMuc2VuZFRvSG9zdCAncmVuZGVyZWQnLCBtZFxuICAgICAgaXBjLnNlbmRUb0hvc3QgJ3J1bGVyQ2hhbmdlZCcsIG1kLnJ1bGVycyBpZiBtZC5ydWxlckNoYW5nZWRcbiAgICAgIGlwYy5zZW5kVG9Ib3N0ICd0aGVtZUNoYW5nZWQnLCBtZC5jaGFuZ2VkVGhlbWUgaWYgbWQuY2hhbmdlZFRoZW1lXG4gICAgc2V0SW1hZ2VEaXJlY3RvcnkgPSAoZGlyKSAtPiAkKCdoZWFkID4gYmFzZScpLmF0dHIoJ2hyZWYnLCBkaXIgfHwgJy4vJylcblxuICAgIGlwYy5vbiAncmVuZGVyJywgKGUsIG1kKSAtPiByZW5kZXIoTWFya2Rvd24ucGFyc2UobWQpKVxuICAgIGlwYy5vbiAnY3VycmVudFBhZ2UnLCAoZSwgcGFnZSkgLT4gYXBwbHlDdXJyZW50UGFnZSBwYWdlXG4gICAgaXBjLm9uICdzZXRDbGFzcycsIChlLCBjbGFzc2VzKSAtPiAkKCdib2R5JykuYXR0ciAnY2xhc3MnLCBjbGFzc2VzXG4gICAgaXBjLm9uICdzZXRJbWFnZURpcmVjdG9yeScsIChlLCBkaXIpIC0+IHNldEltYWdlRGlyZWN0b3J5KGRpcilcbiAgICBpcGMub24gJ3JlcXVlc3RQZGZPcHRpb25zJywgKGUsIG9wdHMpIC0+IHNlbmRQZGZPcHRpb25zKG9wdHMgfHwge30pXG4gICAgaXBjLm9uICd1bmZyZWV6ZScsIC0+ICQoJ2JvZHknKS5yZW1vdmVDbGFzcygndG8tcGRmJylcblxuICAgICMgSW5pdGlhbGl6ZVxuICAgICQoZG9jdW1lbnQpLm9uICdjbGljaycsICdhJywgKGUpIC0+XG4gICAgICBlLnByZXZlbnREZWZhdWx0KClcbiAgICAgIGlwYy5zZW5kVG9Ib3N0ICdsaW5rVG8nLCAkKGUuY3VycmVudFRhcmdldCkuYXR0cignaHJlZicpXG5cbiAgICAkKGRvY3VtZW50KS5rZXlkb3duIChlKSAtPlxuICAgICAgaWYgZS5rZXlDb2RlID09IDM4XG4gICAgICAgIGNvbnNvbGUubG9nICd1cCBrZXknXG4gICAgICAgIG5leHRQYWdlSW5kZXggPSAoc2VsZWN0ZWRJbmRleCArIChzbGlkZUxpc3QubGVuZ3RoLTEpKSAlIHNsaWRlTGlzdC5sZW5ndGhcbiAgICAgICAgbmV4dFBhZ2VJZCAgICA9IHNsaWRlTGlzdFtuZXh0UGFnZUluZGV4XS5pZFxuICAgICAgICBjb25zb2xlLmxvZyAnbmV4dCBpZCA9ICcgKyBuZXh0UGFnZUlkXG4gICAgICAgICQoJy5zbGlkZV93cmFwcGVyJykuY3NzKCdiYWNrZ3JvdW5kQ29sb3InLCAnJylcbiAgICAgICAgJChcIiMje25leHRQYWdlSWR9XCIpLmNzcygnYmFja2dyb3VuZENvbG9yJywgJyNmZmUzYjQnKVxuICAgICAgICBzZWxlY3RlZEluZGV4ID0gbmV4dFBhZ2VJbmRleFxuICAgICAgICAjaXBjLnNlbmRUb0hvc3QgJ2dvVG9QYWdlJywgbmV4dFBhZ2VJZFxuICAgICAgICBjaGFuZ2VTbGlkZShuZXh0UGFnZUlkKVxuICAgICAgICAkKFwiaHRtbCxib2R5XCIpLmFuaW1hdGUoe3Njcm9sbFRvcDokKFwiIyN7bmV4dFBhZ2VJZH1cIikub2Zmc2V0KCkudG9wfSk7XG5cbiAgICAgIGlmIGUua2V5Q29kZSA9PSA0MFxuICAgICAgICBjb25zb2xlLmxvZyAnZG93biBrZXknXG4gICAgICAgIG5leHRQYWdlSW5kZXggPSAoc2VsZWN0ZWRJbmRleCArIDEpICUgc2xpZGVMaXN0Lmxlbmd0aFxuICAgICAgICBuZXh0UGFnZUlkICAgID0gc2xpZGVMaXN0W25leHRQYWdlSW5kZXhdLmlkXG4gICAgICAgIGNvbnNvbGUubG9nICduZXh0IGlkID0gJyArIG5leHRQYWdlSWRcbiAgICAgICAgJCgnLnNsaWRlX3dyYXBwZXInKS5jc3MoJ2JhY2tncm91bmRDb2xvcicsICcnKVxuICAgICAgICAkKFwiIyN7bmV4dFBhZ2VJZH1cIikuY3NzKCdiYWNrZ3JvdW5kQ29sb3InLCAnI2ZmZTNiNCcpXG4gICAgICAgIHNlbGVjdGVkSW5kZXggPSBuZXh0UGFnZUluZGV4XG4gICAgICAgICNpcGMuc2VuZFRvSG9zdCAnZ29Ub1BhZ2UnLCBuZXh0UGFnZUlkXG4gICAgICAgIGNoYW5nZVNsaWRlKG5leHRQYWdlSWQpXG4gICAgICAgICQoXCJodG1sLGJvZHlcIikuYW5pbWF0ZSh7c2Nyb2xsVG9wOiQoXCIjI3tuZXh0UGFnZUlkfVwiKS5vZmZzZXQoKS50b3B9KTtcblxuICAgICQod2luZG93KS5yZXNpemUgKGUpIC0+IGFwcGx5U2NyZWVuU2l6ZSgpXG4gICAgYXBwbHlTY3JlZW5TaXplKClcblxuXG4gICAgIyBwcmVzZW50YXRpb24gPT09PT09PT09PT09PT09PT09PT09PT09XG5cbiAgICBpcGMub24gJ3JlcXVlc3RTbGlkZUluZm8nLCAoKSA9PlxuICAgICAgY29uc29sZS5sb2cgJ3JlY2VpdmUgcmVxdWVzdFNsaWRlSW5mbydcbiAgICAgIG1hcmtkb3duQm9keSA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5tYXJrZG93bi1ib2R5JylcbiAgICAgIyBjb25zb2xlLmxvZyBtYXJrZG93bkJvZHkuaW5uZXJIVE1MXG4gICAgICBpcGMuc2VuZFRvSG9zdCAnc2VuZFNsaWRlSW5mbycsIG1hcmtkb3duQm9keS5pbm5lckhUTUxcbiAgICAgIGNvbnNvbGUubG9nIG1hcmtkb3duQm9keS5pbm5lckhUTUxcbiAgICAgIGNvbnNvbGUubG9nICdzZW5kIHNlbmRTbGlkZUluZm8nXG5cbiAgICBpcGMuc2VuZFRvSG9zdCAncmVxdWVzdFNsaWRlSFRNTCcsICgpID0+XG4gICAgICBjb25zb2xlLmxvZyAnc2VuZCByZXF1ZXN0U2xpZGVIVE1MJ1xuXG4gICAgaXBjLm9uICdzZXRTbGlkZScsIChlLCB0ZXh0KSA9PlxuICAgICAgY29uc29sZS5sb2cgJ3JlY2VpdmUgc2V0U2xpZGUnXG4gICAgICBjb25zb2xlLmxvZyB0ZXh0XG4gICAgICBzbGlkZUhUTUwgPSB0ZXh0LmpvaW4oXCJcIilcbiAgICAgIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5tYXJrZG93bi1ib2R5JykuaW5uZXJIVE1MID0gc2xpZGVIVE1MXG4gICAgICAjIHNsaWRlTGlzdCDjgbhwdXNoXG4gICAgICAkKCcuc2xpZGVfd3JhcHBlcicpLmVhY2ggKGlkeCwgZWxlbSkgLT5cbiAgICAgICAgIyBIVE1MT2JqZWN044KScHVzaFxuICAgICAgICBzbGlkZUxpc3QucHVzaCBlbGVtXG5cbiAgICAjIHNsaWRlIHNvcnRcbiAgICAkKCcubWFya2Rvd24tYm9keScpLnNvcnRhYmxlIHtcbiAgICAgICdvcGFjaXR5JzogMC41XG4gICAgfVxuICAgICQoJy5tYXJrZG93bi1ib2R5JykuZGlzYWJsZVNlbGVjdGlvbigpXG4gICAgJChkb2N1bWVudCkub24gJ3NvcnRzdG9wJywgJy5tYXJrZG93bi1ib2R5JywgKCkgLT5cbiAgICAgIGNvbnNvbGUubG9nICdzb3J0IGZpbmlzaGVkJ1xuICAgICAgIyBzbGlkZUxpc3QgdXBkYXRlXG4gICAgICB0bXAgPSBzbGlkZUxpc3Rbc2VsZWN0ZWRJbmRleF0uaWRcbiAgICAgIHNsaWRlTGlzdCA9IFtdXG4gICAgICAkKCcuc2xpZGVfd3JhcHBlcicpLmVhY2ggKGlkeCwgZWxlbSkgLT5cbiAgICAgICBzbGlkZUxpc3QucHVzaCBlbGVtXG5cbiAgICAgICNzZWxlY3RlZEluZGV4IOOCkuabtOaWsOOBmeOCi+W/heimgeOBjOOBguOCi1xuICAgICAgZm9yIGkgaW4gc2xpZGVMaXN0XG4gICAgICAgIGlmKGkuaWQgPT0gdG1wKVxuICAgICAgICAgIHNlbGVjdGVkSW5kZXggPSBzbGlkZUxpc3QuaW5kZXhPZihpKVxuICAgICAgY29uc29sZS5sb2cgc2xpZGVMaXN0XG5cblxuXG5cblxuIl19
