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
        console.log(slideList);
        for (i in slideList) {
          value = slideList[i];
          if (value.id === $(this).attr('id')) {
            selectedIndex = i;
          }
        }
        $("html,body").animate({
          scrollTop: $(this).offset().top
        });
        changeSlide($(this).attr('id'));
        return console.log(selectedIndex);
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
        nextPageIndex = (selectedIndex + (slideList.length - 1)) % slideList.length;
        nextPageId = slideList[nextPageIndex].id;
        $('.slide_wrapper').css('backgroundColor', '');
        $("#" + nextPageId).css('backgroundColor', '#ffe3b4');
        selectedIndex = nextPageIndex;
        console.log(selectedIndex);
        changeSlide(nextPageId);
        $("html,body").animate({
          scrollTop: $("#" + nextPageId).offset().top
        });
      }
      if (e.keyCode === 40) {
        nextPageIndex = (selectedIndex + 1) % slideList.length;
        nextPageId = slideList[nextPageIndex].id;
        $('.slide_wrapper').css('backgroundColor', '');
        $("#" + nextPageId).css('backgroundColor', '#ffe3b4');
        selectedIndex = nextPageIndex;
        console.log(selectedIndex);
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
      tmp = slideList[selectedIndex];
      slideList = [];
      $('.slide_wrapper').each(function(idx, elem) {
        return slideList.push(elem);
      });
      for (j = 0, len = slideList.length; j < len; j++) {
        i = slideList[j];
        if (i === tmp) {
          selectedIndex = slideList.indexOf(i);
        }
      }
      return console.log(selectedIndex);
    });
  })($);
});

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJlc2VuRGV2U2xpZGUuanMiLCJzb3VyY2VzIjpbInByZXNlbkRldlNsaWRlLmNvZmZlZSJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxJQUFBOztBQUFBLFdBQUEsR0FBYyxPQUFBLENBQVEsd0JBQVI7O0FBQ2QsR0FBQSxHQUFjLE9BQUEsQ0FBUSxVQUFSLENBQW1CLENBQUM7O0FBQ2xDLElBQUEsR0FBYyxPQUFBLENBQVEsTUFBUjs7QUFDZCxXQUFBLEdBQWMsT0FBQSxDQUFRLHdCQUFSOztBQUVkLG1CQUFBLEdBQXNCLFNBQUMsSUFBRDs7SUFBQyxPQUFPOztTQUFTLElBQUksQ0FBQyxPQUFMLENBQWEsU0FBYixFQUF3QixLQUF4QixFQUErQixJQUEvQjtBQUFqQjs7QUFFdEIsUUFBUSxDQUFDLGdCQUFULENBQTBCLGtCQUExQixFQUE4QyxTQUFBO0FBQzVDLE1BQUE7RUFBQSxPQUFBLEdBQ0M7SUFBQSxJQUFBLEVBQU0sZ0JBQU47SUFDQSxLQUFBLEVBQU8sc0NBRFA7SUFFQSxNQUFBLEVBQVEsTUFGUjtJQUdBLE9BQUEsRUFBUyxVQUhUOztFQUlELE1BQUEsR0FBUyxJQUFJLFdBQUosQ0FBZ0IsT0FBaEI7RUFFVCxXQUFBLEdBQWMsU0FBQyxJQUFEO0lBQ1osTUFBTSxDQUFDLElBQVAsQ0FBWSxVQUFaLEVBQXdCO01BQ3RCLElBQUEsRUFBTSxhQURnQjtNQUV0QixNQUFBLEVBQ0U7UUFBQSxTQUFBLEVBQVcsSUFBWDtPQUhvQjtLQUF4QjtXQUtBLE1BQU0sQ0FBQyxJQUFQLENBQVksZUFBWixFQUE2QjtNQUMzQixJQUFBLEVBQU0sZ0JBRHFCO01BRTNCLE1BQUEsRUFDRTtRQUFBLFNBQUEsRUFBVyxJQUFYO09BSHlCO0tBQTdCO0VBTlk7RUFjZCxTQUFBLEdBQVk7RUFDWixTQUFBLEdBQVk7RUFFWixhQUFBLEdBQWdCO1NBRWIsQ0FBQSxTQUFDLENBQUQ7QUFFRCxRQUFBO0lBQUEsQ0FBQSxDQUFFLDJCQUFGLENBQThCLENBQUMsSUFBL0IsQ0FBb0MsU0FBQTtBQUNsQyxVQUFBO0FBQUE7QUFBQTtXQUFBLHFDQUFBOztxQkFDRSxDQUFBLENBQUUsSUFBRixDQUFJLENBQUMsSUFBTCxDQUFVLE1BQVYsRUFBa0IsbUJBQUEsQ0FBb0IsQ0FBQSxDQUFFLElBQUYsQ0FBSSxDQUFDLElBQUwsQ0FBVSxNQUFWLENBQXBCLENBQWxCO0FBREY7O0lBRGtDLENBQXBDO0lBSUEsUUFBQSxHQUFXLElBQUksV0FBSixDQUFnQjtNQUFFLFdBQUEsRUFBYSxXQUFXLENBQUMsbUJBQVosQ0FBZ0MsQ0FBaEMsQ0FBZjtLQUFoQjtJQUVYLE1BQUEsR0FBUztJQUNULE1BQU0sQ0FBQyxPQUFQLEdBQWlCLFNBQUE7YUFBRyxDQUFBLENBQUUsWUFBRixDQUFlLENBQUMsSUFBaEIsQ0FBcUIsTUFBckI7SUFBSDtJQUNqQixNQUFNLEVBQUMsT0FBRCxFQUFOLEdBQWlCLE1BQU0sQ0FBQyxPQUFQLENBQUE7SUFDakIsTUFBTSxDQUFDLEtBQVAsR0FBZSxTQUFDLElBQUQ7QUFDYixVQUFBOztRQURjLE9BQU87O01BQ3JCLE9BQUEsR0FBVSxtQkFBQSxDQUFvQixJQUFBLElBQVEsTUFBTSxFQUFDLE9BQUQsRUFBbEM7TUFFVixJQUFHLE9BQUEsS0FBYSxNQUFNLENBQUMsT0FBUCxDQUFBLENBQWhCO1FBQ0UsQ0FBQSxDQUFFLFlBQUYsQ0FBZSxDQUFDLElBQWhCLENBQXFCLE1BQXJCLEVBQTZCLE9BQTdCO1FBQ0EsVUFBQSxDQUFXLGVBQVgsRUFBNEIsRUFBNUI7QUFFQSxlQUFPLE9BQU8sQ0FBQyxLQUFSLENBQWMsZ0JBQWQsQ0FBZ0MsQ0FBQSxDQUFBLEVBSnpDOzthQUtBO0lBUmE7SUFVZixRQUFBLEdBQVcsU0FBQyxVQUFELEVBQWEsR0FBYjtBQUNULFVBQUE7TUFBQSxFQUFBLEdBQU0sTUFBQSxHQUFPLFVBQVAsR0FBa0I7TUFDeEIsR0FBQSxHQUFNLENBQUEsQ0FBRSxHQUFBLEdBQUksRUFBTjtNQUNOLElBQW1FLEdBQUcsQ0FBQyxNQUFKLElBQWMsQ0FBakY7UUFBQSxHQUFBLEdBQU0sQ0FBQSxDQUFFLGNBQUEsR0FBZSxFQUFmLEdBQWtCLGFBQXBCLENBQWlDLENBQUMsUUFBbEMsQ0FBMkMsUUFBUSxDQUFDLElBQXBELEVBQU47O2FBQ0EsR0FBRyxDQUFDLElBQUosQ0FBUyxHQUFUO0lBSlM7SUFNWCxTQUFBLEdBQVksU0FBQyxJQUFEO2FBQVUsUUFBUSxDQUFDLFdBQVcsQ0FBQyxnQkFBckIsQ0FBc0MsUUFBUSxDQUFDLElBQS9DLENBQW9ELENBQUMsZ0JBQXJELENBQXNFLElBQXRFO0lBQVY7SUFFWixZQUFBLEdBQWUsU0FBQTtBQUNiLFVBQUE7TUFBQSxJQUFBLEdBQ0U7UUFBQSxDQUFBLEVBQUcsQ0FBQyxTQUFBLENBQVUsZUFBVixDQUFKO1FBQ0EsQ0FBQSxFQUFHLENBQUMsU0FBQSxDQUFVLGdCQUFWLENBREo7O01BR0YsSUFBSSxDQUFDLEtBQUwsR0FBYSxJQUFJLENBQUMsQ0FBTCxHQUFTLElBQUksQ0FBQzthQUMzQjtJQU5hO0lBUWYsY0FBQSxHQUFpQixTQUFDLEtBQUQsRUFBUSxNQUFSO01BQ2YsUUFBQSxDQUFTLFdBQVQsRUFDRSwyQkFBQSxHQUVrQixDQUFDLEtBQUEsSUFBUyxTQUFWLENBRmxCLEdBRXNDLHVCQUZ0QyxHQUdtQixDQUFDLE1BQUEsSUFBVSxTQUFYLENBSG5CLEdBR3dDLE1BSjFDO2FBT0EsZUFBQSxDQUFBO0lBUmU7SUFVakIsYUFBQSxHQUFnQixTQUFBO0FBQ2QsVUFBQTtNQUFBLElBQUEsR0FDRTtRQUFBLENBQUEsRUFBRyxRQUFRLENBQUMsZUFBZSxDQUFDLFdBQTVCO1FBQ0EsQ0FBQSxFQUFHLFFBQVEsQ0FBQyxlQUFlLENBQUMsWUFENUI7O01BR0YsYUFBQSxHQUFnQixDQUFDLFNBQUEsQ0FBVSxrQkFBVjtNQUNqQixJQUFJLENBQUMsS0FBTCxHQUFhLENBQUMsSUFBSSxDQUFDLENBQUwsR0FBUyxhQUFBLEdBQWdCLENBQTFCLENBQUEsR0FBK0IsQ0FBQyxJQUFJLENBQUMsQ0FBTCxHQUFTLGFBQUEsR0FBZ0IsQ0FBMUI7YUFDNUM7SUFQYztJQVNoQixlQUFBLEdBQWtCLFNBQUE7QUFDaEIsVUFBQTtNQUFBLElBQUEsR0FBTyxhQUFBLENBQUE7TUFDUCxRQUFBLENBQVMsWUFBVCxFQUF1Qix5QkFBQSxHQUEwQixJQUFJLENBQUMsQ0FBL0IsR0FBaUMscUJBQWpDLEdBQXNELElBQUksQ0FBQyxDQUEzRCxHQUE2RCxLQUFwRjthQUNBLENBQUEsQ0FBRSxZQUFGLENBQWUsQ0FBQyxXQUFoQixDQUE0QixhQUE1QixFQUEyQyxJQUFJLENBQUMsS0FBTCxHQUFhLFlBQUEsQ0FBQSxDQUFjLENBQUMsS0FBdkU7SUFIZ0I7SUFPbEIsZ0JBQUEsR0FBbUIsU0FBQyxJQUFEO2FBQ2pCLFFBQUEsQ0FBUyxhQUFULEVBQ0UsK0VBQUEsR0FFMkQsSUFGM0QsR0FFZ0UsbUlBSGxFO0lBRGlCO0lBYW5CLE1BQUEsR0FBUyxTQUFDLEVBQUQ7QUFDUCxVQUFBO01BQUEsT0FBTyxDQUFDLEdBQVIsQ0FBWSxhQUFaO01BQ0EsY0FBQSxDQUFlLEVBQUUsQ0FBQyxRQUFRLENBQUMsU0FBWixDQUFzQixPQUF0QixDQUFmLEVBQStDLEVBQUUsQ0FBQyxRQUFRLENBQUMsU0FBWixDQUFzQixRQUF0QixDQUEvQztNQUNBLEVBQUUsQ0FBQyxZQUFILEdBQWtCLE1BQU0sQ0FBQyxLQUFQLENBQWEsRUFBRSxDQUFDLFFBQVEsQ0FBQyxTQUFaLENBQXNCLE9BQXRCLENBQWI7TUFJbEIsY0FBQSxHQUFpQjtBQUNqQixXQUFBLGNBQUE7O1FBQ0UsY0FBYyxDQUFDLElBQWYsQ0FBb0IsS0FBSyxDQUFDLFNBQTFCO0FBREY7TUFHQSxDQUFBLENBQUUsV0FBRixDQUFjLENBQUMsSUFBZixDQUFvQixjQUFjLENBQUMsSUFBZixDQUFvQixHQUFwQixDQUFwQjtNQUdBLENBQUEsQ0FBRSxnQkFBRixDQUFtQixDQUFDLEdBQXBCLENBQXdCLGlCQUF4QixFQUEyQyxFQUEzQztNQUNBLENBQUEsQ0FBRSxJQUFGLENBQU8sQ0FBQyxHQUFSLENBQVksaUJBQVosRUFBK0IsU0FBL0I7TUFDQSxXQUFBLENBQVksQ0FBWjtNQUdBLENBQUEsQ0FBRSxnQkFBRixDQUFtQixDQUFDLEVBQXBCLENBQXVCLE9BQXZCLEVBQWdDLFNBQUE7UUFFOUIsQ0FBQSxDQUFFLGdCQUFGLENBQW1CLENBQUMsR0FBcEIsQ0FBd0IsaUJBQXhCLEVBQTJDLEVBQTNDO1FBQ0EsQ0FBQSxDQUFFLElBQUYsQ0FBTyxDQUFDLEdBQVIsQ0FBWSxpQkFBWixFQUErQixTQUEvQjtRQUNBLE9BQU8sQ0FBQyxHQUFSLENBQVksU0FBWjtBQUNBLGFBQUEsY0FBQTs7VUFDRSxJQUFHLEtBQUssQ0FBQyxFQUFOLEtBQVksQ0FBQSxDQUFFLElBQUYsQ0FBTyxDQUFDLElBQVIsQ0FBYSxJQUFiLENBQWY7WUFDRSxhQUFBLEdBQWdCLEVBRGxCOztBQURGO1FBSUEsQ0FBQSxDQUFFLFdBQUYsQ0FBYyxDQUFDLE9BQWYsQ0FBdUI7VUFBQyxTQUFBLEVBQVUsQ0FBQSxDQUFFLElBQUYsQ0FBTyxDQUFDLE1BQVIsQ0FBQSxDQUFnQixDQUFDLEdBQTVCO1NBQXZCO1FBR0EsV0FBQSxDQUFZLENBQUEsQ0FBRSxJQUFGLENBQU8sQ0FBQyxJQUFSLENBQWEsSUFBYixDQUFaO2VBQ0EsT0FBTyxDQUFDLEdBQVIsQ0FBWSxhQUFaO01BYjhCLENBQWhDO01BZUEsR0FBRyxDQUFDLFVBQUosQ0FBZSxVQUFmLEVBQTJCLEVBQTNCO01BQ0EsSUFBNEMsRUFBRSxDQUFDLFlBQS9DO1FBQUEsR0FBRyxDQUFDLFVBQUosQ0FBZSxjQUFmLEVBQStCLEVBQUUsQ0FBQyxNQUFsQyxFQUFBOztNQUNBLElBQWtELEVBQUUsQ0FBQyxZQUFyRDtlQUFBLEdBQUcsQ0FBQyxVQUFKLENBQWUsY0FBZixFQUErQixFQUFFLENBQUMsWUFBbEMsRUFBQTs7SUFwQ087SUFxQ1QsaUJBQUEsR0FBb0IsU0FBQyxHQUFEO2FBQVMsQ0FBQSxDQUFFLGFBQUYsQ0FBZ0IsQ0FBQyxJQUFqQixDQUFzQixNQUF0QixFQUE4QixHQUFBLElBQU8sSUFBckM7SUFBVDtJQUVwQixHQUFHLENBQUMsRUFBSixDQUFPLFFBQVAsRUFBaUIsU0FBQyxDQUFELEVBQUksRUFBSjthQUFXLE1BQUEsQ0FBTyxRQUFRLENBQUMsS0FBVCxDQUFlLEVBQWYsQ0FBUDtJQUFYLENBQWpCO0lBQ0EsR0FBRyxDQUFDLEVBQUosQ0FBTyxhQUFQLEVBQXNCLFNBQUMsQ0FBRCxFQUFJLElBQUo7YUFBYSxnQkFBQSxDQUFpQixJQUFqQjtJQUFiLENBQXRCO0lBQ0EsR0FBRyxDQUFDLEVBQUosQ0FBTyxVQUFQLEVBQW1CLFNBQUMsQ0FBRCxFQUFJLE9BQUo7YUFBZ0IsQ0FBQSxDQUFFLE1BQUYsQ0FBUyxDQUFDLElBQVYsQ0FBZSxPQUFmLEVBQXdCLE9BQXhCO0lBQWhCLENBQW5CO0lBQ0EsR0FBRyxDQUFDLEVBQUosQ0FBTyxtQkFBUCxFQUE0QixTQUFDLENBQUQsRUFBSSxHQUFKO2FBQVksaUJBQUEsQ0FBa0IsR0FBbEI7SUFBWixDQUE1QjtJQUNBLEdBQUcsQ0FBQyxFQUFKLENBQU8sbUJBQVAsRUFBNEIsU0FBQyxDQUFELEVBQUksSUFBSjthQUFhLGNBQUEsQ0FBZSxJQUFBLElBQVEsRUFBdkI7SUFBYixDQUE1QjtJQUNBLEdBQUcsQ0FBQyxFQUFKLENBQU8sVUFBUCxFQUFtQixTQUFBO2FBQUcsQ0FBQSxDQUFFLE1BQUYsQ0FBUyxDQUFDLFdBQVYsQ0FBc0IsUUFBdEI7SUFBSCxDQUFuQjtJQUdBLENBQUEsQ0FBRSxRQUFGLENBQVcsQ0FBQyxFQUFaLENBQWUsT0FBZixFQUF3QixHQUF4QixFQUE2QixTQUFDLENBQUQ7TUFDM0IsQ0FBQyxDQUFDLGNBQUYsQ0FBQTthQUNBLEdBQUcsQ0FBQyxVQUFKLENBQWUsUUFBZixFQUF5QixDQUFBLENBQUUsQ0FBQyxDQUFDLGFBQUosQ0FBa0IsQ0FBQyxJQUFuQixDQUF3QixNQUF4QixDQUF6QjtJQUYyQixDQUE3QjtJQUlBLENBQUEsQ0FBRSxRQUFGLENBQVcsQ0FBQyxPQUFaLENBQW9CLFNBQUMsQ0FBRDtBQUNsQixVQUFBO01BQUEsSUFBRyxDQUFDLENBQUMsT0FBRixLQUFhLEVBQWhCO1FBRUUsYUFBQSxHQUFnQixDQUFDLGFBQUEsR0FBZ0IsQ0FBQyxTQUFTLENBQUMsTUFBVixHQUFpQixDQUFsQixDQUFqQixDQUFBLEdBQXlDLFNBQVMsQ0FBQztRQUNuRSxVQUFBLEdBQWdCLFNBQVUsQ0FBQSxhQUFBLENBQWMsQ0FBQztRQUV6QyxDQUFBLENBQUUsZ0JBQUYsQ0FBbUIsQ0FBQyxHQUFwQixDQUF3QixpQkFBeEIsRUFBMkMsRUFBM0M7UUFDQSxDQUFBLENBQUUsR0FBQSxHQUFJLFVBQU4sQ0FBbUIsQ0FBQyxHQUFwQixDQUF3QixpQkFBeEIsRUFBMkMsU0FBM0M7UUFDQSxhQUFBLEdBQWdCO1FBQ2hCLE9BQU8sQ0FBQyxHQUFSLENBQVksYUFBWjtRQUVBLFdBQUEsQ0FBWSxVQUFaO1FBQ0EsQ0FBQSxDQUFFLFdBQUYsQ0FBYyxDQUFDLE9BQWYsQ0FBdUI7VUFBQyxTQUFBLEVBQVUsQ0FBQSxDQUFFLEdBQUEsR0FBSSxVQUFOLENBQW1CLENBQUMsTUFBcEIsQ0FBQSxDQUE0QixDQUFDLEdBQXhDO1NBQXZCLEVBWEY7O01BYUEsSUFBRyxDQUFDLENBQUMsT0FBRixLQUFhLEVBQWhCO1FBRUUsYUFBQSxHQUFnQixDQUFDLGFBQUEsR0FBZ0IsQ0FBakIsQ0FBQSxHQUFzQixTQUFTLENBQUM7UUFDaEQsVUFBQSxHQUFnQixTQUFVLENBQUEsYUFBQSxDQUFjLENBQUM7UUFFekMsQ0FBQSxDQUFFLGdCQUFGLENBQW1CLENBQUMsR0FBcEIsQ0FBd0IsaUJBQXhCLEVBQTJDLEVBQTNDO1FBQ0EsQ0FBQSxDQUFFLEdBQUEsR0FBSSxVQUFOLENBQW1CLENBQUMsR0FBcEIsQ0FBd0IsaUJBQXhCLEVBQTJDLFNBQTNDO1FBQ0EsYUFBQSxHQUFnQjtRQUNoQixPQUFPLENBQUMsR0FBUixDQUFZLGFBQVo7UUFFQSxXQUFBLENBQVksVUFBWjtlQUNBLENBQUEsQ0FBRSxXQUFGLENBQWMsQ0FBQyxPQUFmLENBQXVCO1VBQUMsU0FBQSxFQUFVLENBQUEsQ0FBRSxHQUFBLEdBQUksVUFBTixDQUFtQixDQUFDLE1BQXBCLENBQUEsQ0FBNEIsQ0FBQyxHQUF4QztTQUF2QixFQVhGOztJQWRrQixDQUFwQjtJQTJCQSxDQUFBLENBQUUsTUFBRixDQUFTLENBQUMsTUFBVixDQUFpQixTQUFDLENBQUQ7YUFBTyxlQUFBLENBQUE7SUFBUCxDQUFqQjtJQUNBLGVBQUEsQ0FBQTtJQUtBLEdBQUcsQ0FBQyxFQUFKLENBQU8sa0JBQVAsRUFBMkIsQ0FBQSxTQUFBLEtBQUE7YUFBQSxTQUFBO0FBQ3pCLFlBQUE7UUFBQSxPQUFPLENBQUMsR0FBUixDQUFZLDBCQUFaO1FBQ0EsWUFBQSxHQUFlLFFBQVEsQ0FBQyxhQUFULENBQXVCLGdCQUF2QjtRQUVmLEdBQUcsQ0FBQyxVQUFKLENBQWUsZUFBZixFQUFnQyxZQUFZLENBQUMsU0FBN0M7UUFDQSxPQUFPLENBQUMsR0FBUixDQUFZLFlBQVksQ0FBQyxTQUF6QjtlQUNBLE9BQU8sQ0FBQyxHQUFSLENBQVksb0JBQVo7TUFOeUI7SUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBQTNCO0lBUUEsR0FBRyxDQUFDLFVBQUosQ0FBZSxrQkFBZixFQUFtQyxDQUFBLFNBQUEsS0FBQTthQUFBLFNBQUE7ZUFDakMsT0FBTyxDQUFDLEdBQVIsQ0FBWSx1QkFBWjtNQURpQztJQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBbkM7SUFHQSxHQUFHLENBQUMsRUFBSixDQUFPLFVBQVAsRUFBbUIsQ0FBQSxTQUFBLEtBQUE7YUFBQSxTQUFDLENBQUQsRUFBSSxJQUFKO1FBQ2pCLE9BQU8sQ0FBQyxHQUFSLENBQVksa0JBQVo7UUFDQSxPQUFPLENBQUMsR0FBUixDQUFZLElBQVo7UUFDQSxTQUFBLEdBQVksSUFBSSxDQUFDLElBQUwsQ0FBVSxFQUFWO1FBQ1osUUFBUSxDQUFDLGFBQVQsQ0FBdUIsZ0JBQXZCLENBQXdDLENBQUMsU0FBekMsR0FBcUQ7ZUFFckQsQ0FBQSxDQUFFLGdCQUFGLENBQW1CLENBQUMsSUFBcEIsQ0FBeUIsU0FBQyxHQUFELEVBQU0sSUFBTjtpQkFFdkIsU0FBUyxDQUFDLElBQVYsQ0FBZSxJQUFmO1FBRnVCLENBQXpCO01BTmlCO0lBQUEsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQUFuQjtJQVdBLENBQUEsQ0FBRSxnQkFBRixDQUFtQixDQUFDLFFBQXBCLENBQTZCO01BQzNCLFNBQUEsRUFBVyxHQURnQjtLQUE3QjtJQUdBLENBQUEsQ0FBRSxnQkFBRixDQUFtQixDQUFDLGdCQUFwQixDQUFBO1dBQ0EsQ0FBQSxDQUFFLFFBQUYsQ0FBVyxDQUFDLEVBQVosQ0FBZSxVQUFmLEVBQTJCLGdCQUEzQixFQUE2QyxTQUFBO0FBRzNDLFVBQUE7TUFBQSxHQUFBLEdBQU0sU0FBVSxDQUFBLGFBQUE7TUFDaEIsU0FBQSxHQUFZO01BQ1osQ0FBQSxDQUFFLGdCQUFGLENBQW1CLENBQUMsSUFBcEIsQ0FBeUIsU0FBQyxHQUFELEVBQU0sSUFBTjtlQUN4QixTQUFTLENBQUMsSUFBVixDQUFlLElBQWY7TUFEd0IsQ0FBekI7QUFJQSxXQUFBLDJDQUFBOztRQUNFLElBQUcsQ0FBQSxLQUFLLEdBQVI7VUFDRSxhQUFBLEdBQWdCLFNBQVMsQ0FBQyxPQUFWLENBQWtCLENBQWxCLEVBRGxCOztBQURGO2FBR0EsT0FBTyxDQUFDLEdBQVIsQ0FBWSxhQUFaO0lBWjJDLENBQTdDO0VBMUxDLENBQUEsQ0FBSCxDQUFJLENBQUo7QUEzQjRDLENBQTlDIiwic291cmNlc0NvbnRlbnQiOlsiY2xzTWFya2Rvd24gPSByZXF1aXJlICcuL2NsYXNzZXMvbWRzX21hcmtkb3duJ1xuaXBjICAgICAgICAgPSByZXF1aXJlKCdlbGVjdHJvbicpLmlwY1JlbmRlcmVyXG5QYXRoICAgICAgICA9IHJlcXVpcmUgJ3BhdGgnXG5NaWNrckNsaWVudCA9IHJlcXVpcmUgJy4uL21vZHVsZXMvTWlja3JDbGllbnQnXG5cbnJlc29sdmVQYXRoRnJvbU1hcnAgPSAocGF0aCA9ICcuLycpIC0+IFBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLi8nLCBwYXRoKVxuXG5kb2N1bWVudC5hZGRFdmVudExpc3RlbmVyICdET01Db250ZW50TG9hZGVkJywgLT5cbiAgc2V0dGluZyA9XG4gICBcImlkXCI6IFwicHJlc2VuRGV2U2xpZGVcIlxuICAgXCJ1cmxcIjogXCJ3czovL2FwcHMud2lzZG9td2ViLm5ldDo2NDI2MC93cy9taWtcIlxuICAgXCJzaXRlXCI6IFwidGVzdFwiXG4gICBcInRva2VuXCI6IFwiUGFkOjk5NDhcIlxuICBjbGllbnQgPSBuZXcgTWlja3JDbGllbnQoc2V0dGluZyk7XG5cbiAgY2hhbmdlU2xpZGUgPSAocGFnZSkgLT5cbiAgICBjbGllbnQuc2VuZCBcImdvVG9QYWdlXCIsIHtcbiAgICAgIFwidG9cIjogXCJwcmVzZW5TbGlkZVwiLFxuICAgICAgXCJib2R5XCI6XG4gICAgICAgIFwiY29udGVudFwiOiBwYWdlXG4gICAgfVxuICAgIGNsaWVudC5zZW5kIFwiY2hhbmdlQ29tbWVudFwiLCB7XG4gICAgICBcInRvXCI6IFwicHJlc2VuRGV2SW5kZXhcIixcbiAgICAgIFwiYm9keVwiOlxuICAgICAgICBcImNvbnRlbnRcIjogcGFnZVxuICAgIH1cblxuXG5cbiAgc2xpZGVIVE1MID0gXCJcIlxuICBzbGlkZUxpc3QgPSBbXVxuICAjIHNsaWRlTGlzdOOBruS9leeVquebruOBruimgee0oOOBjOePvuWcqOmBuOaKnuOBleOCjOOBpuOBhOOCi+OBi1xuICBzZWxlY3RlZEluZGV4ID0gMFxuXG4gIGRvICgkKSAtPlxuICAgICMgRmlyc3QsIHJlc29sdmUgTWFycCByZXNvdXJjZXMgcGF0aFxuICAgICQoXCJbZGF0YS1tYXJwLXBhdGgtcmVzb2x2ZXJdXCIpLmVhY2ggLT5cbiAgICAgIGZvciB0YXJnZXQgaW4gJChAKS5hdHRyKCdkYXRhLW1hcnAtcGF0aC1yZXNvbHZlcicpLnNwbGl0KC9cXHMrLylcbiAgICAgICAgJChAKS5hdHRyKHRhcmdldCwgcmVzb2x2ZVBhdGhGcm9tTWFycCgkKEApLmF0dHIodGFyZ2V0KSkpXG5cbiAgICBNYXJrZG93biA9IG5ldyBjbHNNYXJrZG93bih7IGFmdGVyUmVuZGVyOiBjbHNNYXJrZG93bi5nZW5lcmF0ZUFmdGVyUmVuZGVyKCQpIH0pXG5cbiAgICB0aGVtZXMgPSB7fVxuICAgIHRoZW1lcy5jdXJyZW50ID0gLT4gJCgnI3RoZW1lLWNzcycpLmF0dHIoJ2hyZWYnKVxuICAgIHRoZW1lcy5kZWZhdWx0ID0gdGhlbWVzLmN1cnJlbnQoKVxuICAgIHRoZW1lcy5hcHBseSA9IChwYXRoID0gbnVsbCkgLT5cbiAgICAgIHRvQXBwbHkgPSByZXNvbHZlUGF0aEZyb21NYXJwKHBhdGggfHwgdGhlbWVzLmRlZmF1bHQpXG5cbiAgICAgIGlmIHRvQXBwbHkgaXNudCB0aGVtZXMuY3VycmVudCgpXG4gICAgICAgICQoJyN0aGVtZS1jc3MnKS5hdHRyKCdocmVmJywgdG9BcHBseSlcbiAgICAgICAgc2V0VGltZW91dCBhcHBseVNjcmVlblNpemUsIDIwXG5cbiAgICAgICAgcmV0dXJuIHRvQXBwbHkubWF0Y2goLyhbXlxcL10rKVxcLmNzcyQvKVsxXVxuICAgICAgZmFsc2VcblxuICAgIHNldFN0eWxlID0gKGlkZW50aWZpZXIsIGNzcykgLT5cbiAgICAgIGlkICA9IFwibWRzLSN7aWRlbnRpZmllcn1TdHlsZVwiXG4gICAgICBlbG0gPSAkKFwiIyN7aWR9XCIpXG4gICAgICBlbG0gPSAkKFwiPHN0eWxlIGlkPVxcXCIje2lkfVxcXCI+PC9zdHlsZT5cIikuYXBwZW5kVG8oZG9jdW1lbnQuaGVhZCkgaWYgZWxtLmxlbmd0aCA8PSAwXG4gICAgICBlbG0udGV4dChjc3MpXG5cbiAgICBnZXRDU1N2YXIgPSAocHJvcCkgLT4gZG9jdW1lbnQuZGVmYXVsdFZpZXcuZ2V0Q29tcHV0ZWRTdHlsZShkb2N1bWVudC5ib2R5KS5nZXRQcm9wZXJ0eVZhbHVlKHByb3ApXG5cbiAgICBnZXRTbGlkZVNpemUgPSAtPlxuICAgICAgc2l6ZSA9XG4gICAgICAgIHc6ICtnZXRDU1N2YXIgJy0tc2xpZGUtd2lkdGgnXG4gICAgICAgIGg6ICtnZXRDU1N2YXIgJy0tc2xpZGUtaGVpZ2h0J1xuXG4gICAgICBzaXplLnJhdGlvID0gc2l6ZS53IC8gc2l6ZS5oXG4gICAgICBzaXplXG5cbiAgICBhcHBseVNsaWRlU2l6ZSA9ICh3aWR0aCwgaGVpZ2h0KSAtPlxuICAgICAgc2V0U3R5bGUgJ3NsaWRlU2l6ZScsXG4gICAgICAgIFwiXCJcIlxuICAgICAgICBib2R5IHtcbiAgICAgICAgICAtLXNsaWRlLXdpZHRoOiAje3dpZHRoIHx8ICdpbmhlcml0J307XG4gICAgICAgICAgLS1zbGlkZS1oZWlnaHQ6ICN7aGVpZ2h0IHx8ICdpbmhlcml0J307XG4gICAgICAgIH1cbiAgICAgICAgXCJcIlwiXG4gICAgICBhcHBseVNjcmVlblNpemUoKVxuXG4gICAgZ2V0U2NyZWVuU2l6ZSA9IC0+XG4gICAgICBzaXplID1cbiAgICAgICAgdzogZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmNsaWVudFdpZHRoXG4gICAgICAgIGg6IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5jbGllbnRIZWlnaHRcblxuICAgICAgcHJldmlld01hcmdpbiA9ICtnZXRDU1N2YXIgJy0tcHJldmlldy1tYXJnaW4nXG4gICAgICBzaXplLnJhdGlvID0gKHNpemUudyAtIHByZXZpZXdNYXJnaW4gKiAyKSAvIChzaXplLmggLSBwcmV2aWV3TWFyZ2luICogMilcbiAgICAgIHNpemVcblxuICAgIGFwcGx5U2NyZWVuU2l6ZSA9IC0+XG4gICAgICBzaXplID0gZ2V0U2NyZWVuU2l6ZSgpXG4gICAgICBzZXRTdHlsZSAnc2NyZWVuU2l6ZScsIFwiYm9keSB7IC0tc2NyZWVuLXdpZHRoOiAje3NpemUud307IC0tc2NyZWVuLWhlaWdodDogI3tzaXplLmh9OyB9XCJcbiAgICAgICQoJyNjb250YWluZXInKS50b2dnbGVDbGFzcyAnaGVpZ2h0LWJhc2UnLCBzaXplLnJhdGlvID4gZ2V0U2xpZGVTaXplKCkucmF0aW9cblxuICAgICMg44Oa44O844K455Wq5Y+344KS5Y+X44GR5Y+W44Gj44Gf44GC44Go44CB54++5Zyo44Gu44Oa44O844K45Lul5aSW44Gu44Oa44O844K444Gu44K544Op44Kk44OJ44KS6Z2e6KGo56S644Gr44GZ44KLXG4gICAgIyDjgZ/jgaDjgZfjgIHpnZ7jg5fjg6rjg7Pjg4jnirbmhYvjga7mmYLpmZDlrppcbiAgICBhcHBseUN1cnJlbnRQYWdlID0gKHBhZ2UpIC0+XG4gICAgICBzZXRTdHlsZSAnY3VycmVudFBhZ2UnLFxuICAgICAgICBcIlwiXCJcbiAgICAgICAgQG1lZGlhIG5vdCBwcmludCB7XG4gICAgICAgICAgYm9keS5zbGlkZS12aWV3LnNjcmVlbiAuc2xpZGVfd3JhcHBlcjpub3QoOm50aC1vZi10eXBlKCN7cGFnZX0pKSB7XG4gICAgICAgICAgICB3aWR0aDogMCAhaW1wb3J0YW50O1xuICAgICAgICAgICAgaGVpZ2h0OiAwICFpbXBvcnRhbnQ7XG4gICAgICAgICAgICBib3JkZXI6IG5vbmUgIWltcG9ydGFudDtcbiAgICAgICAgICAgIGJveC1zaGFkb3c6IG5vbmUgIWltcG9ydGFudDtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXCJcIlwiXG4gICAgIyBwcmVzZW5EZXbnlLvpnaLjgafjga/jga/jgZjjgoHjgavkuIDlm57jgaDjgZHlkbzjgbDjgozjgotcbiAgICByZW5kZXIgPSAobWQpIC0+XG4gICAgICBjb25zb2xlLmxvZyAnY2FsbCByZW5kZXInXG4gICAgICBhcHBseVNsaWRlU2l6ZSBtZC5zZXR0aW5ncy5nZXRHbG9iYWwoJ3dpZHRoJyksIG1kLnNldHRpbmdzLmdldEdsb2JhbCgnaGVpZ2h0JylcbiAgICAgIG1kLmNoYW5nZWRUaGVtZSA9IHRoZW1lcy5hcHBseSBtZC5zZXR0aW5ncy5nZXRHbG9iYWwoJ3RoZW1lJylcbiAgICAgICMgJCgnI21hcmtkb3duJykuaHRtbChzbGlkZUhUTUwpXG5cbiAgICAgICMgc2xpZGVMaXN06KaB57Sg44Gd44KM44Ge44KM44GL44KJb3V0ZXJIVE1M44KS5Y+W44KK5Ye644GX44Oq44K544OI44Gr5qC857SNXG4gICAgICBzbGlkZU91dGVySFRNTCA9IFtdXG4gICAgICBmb3IgaSwgdmFsdWUgb2Ygc2xpZGVMaXN0XG4gICAgICAgIHNsaWRlT3V0ZXJIVE1MLnB1c2ggdmFsdWUub3V0ZXJIVE1MXG5cbiAgICAgICQoJyNtYXJrZG93bicpLmh0bWwoc2xpZGVPdXRlckhUTUwuam9pbignICcpKVxuXG4gICAgICAjIOOBr+OBmOOCgeOBruOCueODqeOCpOODieOBruiJsuOCkuWkieOBiOOBpuOBiuOBjeOAgeOBneOBruODmuODvOOCuOOBjOmBuOaKnuOBleOCjOOBpuOBhOOCi+OBk+OBqOOCkuekuuOBmVxuICAgICAgJCgnLnNsaWRlX3dyYXBwZXInKS5jc3MoJ2JhY2tncm91bmRDb2xvcicsICcnKVxuICAgICAgJCgnIzEnKS5jc3MoJ2JhY2tncm91bmRDb2xvcicsICcjZmZlM2I0JylcbiAgICAgIGNoYW5nZVNsaWRlKDEpXG5cbiAgICAgICMg5oq844GV44KM44Gfc2xpZGVfd3JhcHBlcuOBrmlk44KS6YCB5L+h44GX44Gm44Oa44O844K46YG356e7XG4gICAgICAkKCcuc2xpZGVfd3JhcHBlcicpLm9uICdjbGljaycsICgpIC0+XG4gICAgICAgICMg6YG45oqe44GV44KM44Gf44K544Op44Kk44OJ44Gu6Imy44KS5aSJ5pu044GX44CB44CA44Oa44O844K46YG356e744GV44Gb44KLXG4gICAgICAgICQoJy5zbGlkZV93cmFwcGVyJykuY3NzKCdiYWNrZ3JvdW5kQ29sb3InLCAnJylcbiAgICAgICAgJCh0aGlzKS5jc3MoJ2JhY2tncm91bmRDb2xvcicsICcjZmZlM2I0JylcbiAgICAgICAgY29uc29sZS5sb2cgc2xpZGVMaXN0XG4gICAgICAgIGZvciBpLHZhbHVlIG9mIHNsaWRlTGlzdFxuICAgICAgICAgIGlmKHZhbHVlLmlkID09ICQodGhpcykuYXR0cignaWQnKSlcbiAgICAgICAgICAgIHNlbGVjdGVkSW5kZXggPSBpXG4gICAgICAgICNzZWxlY3RlZEluZGV4ID0gc2xpZGVMaXN0LmluZGV4T2YodGhpcylcbiAgICAgICAgJChcImh0bWwsYm9keVwiKS5hbmltYXRlKHtzY3JvbGxUb3A6JCh0aGlzKS5vZmZzZXQoKS50b3B9KTtcbiAgICAgICAgIyDjg5rjg7zjgrjnp7vli5Xjg6Hjg4Pjgrvjg7zjgrjpgIHkv6FcbiAgICAgICAgI2lwYy5zZW5kVG9Ib3N0ICdnb1RvUGFnZScsICQodGhpcykuYXR0cignaWQnKVxuICAgICAgICBjaGFuZ2VTbGlkZSgkKHRoaXMpLmF0dHIoJ2lkJykpXG4gICAgICAgIGNvbnNvbGUubG9nIHNlbGVjdGVkSW5kZXhcblxuICAgICAgaXBjLnNlbmRUb0hvc3QgJ3JlbmRlcmVkJywgbWRcbiAgICAgIGlwYy5zZW5kVG9Ib3N0ICdydWxlckNoYW5nZWQnLCBtZC5ydWxlcnMgaWYgbWQucnVsZXJDaGFuZ2VkXG4gICAgICBpcGMuc2VuZFRvSG9zdCAndGhlbWVDaGFuZ2VkJywgbWQuY2hhbmdlZFRoZW1lIGlmIG1kLmNoYW5nZWRUaGVtZVxuICAgIHNldEltYWdlRGlyZWN0b3J5ID0gKGRpcikgLT4gJCgnaGVhZCA+IGJhc2UnKS5hdHRyKCdocmVmJywgZGlyIHx8ICcuLycpXG5cbiAgICBpcGMub24gJ3JlbmRlcicsIChlLCBtZCkgLT4gcmVuZGVyKE1hcmtkb3duLnBhcnNlKG1kKSlcbiAgICBpcGMub24gJ2N1cnJlbnRQYWdlJywgKGUsIHBhZ2UpIC0+IGFwcGx5Q3VycmVudFBhZ2UgcGFnZVxuICAgIGlwYy5vbiAnc2V0Q2xhc3MnLCAoZSwgY2xhc3NlcykgLT4gJCgnYm9keScpLmF0dHIgJ2NsYXNzJywgY2xhc3Nlc1xuICAgIGlwYy5vbiAnc2V0SW1hZ2VEaXJlY3RvcnknLCAoZSwgZGlyKSAtPiBzZXRJbWFnZURpcmVjdG9yeShkaXIpXG4gICAgaXBjLm9uICdyZXF1ZXN0UGRmT3B0aW9ucycsIChlLCBvcHRzKSAtPiBzZW5kUGRmT3B0aW9ucyhvcHRzIHx8IHt9KVxuICAgIGlwYy5vbiAndW5mcmVlemUnLCAtPiAkKCdib2R5JykucmVtb3ZlQ2xhc3MoJ3RvLXBkZicpXG5cbiAgICAjIEluaXRpYWxpemVcbiAgICAkKGRvY3VtZW50KS5vbiAnY2xpY2snLCAnYScsIChlKSAtPlxuICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpXG4gICAgICBpcGMuc2VuZFRvSG9zdCAnbGlua1RvJywgJChlLmN1cnJlbnRUYXJnZXQpLmF0dHIoJ2hyZWYnKVxuXG4gICAgJChkb2N1bWVudCkua2V5ZG93biAoZSkgLT5cbiAgICAgIGlmIGUua2V5Q29kZSA9PSAzOFxuICAgICAgICAjY29uc29sZS5sb2cgJ3VwIGtleSdcbiAgICAgICAgbmV4dFBhZ2VJbmRleCA9IChzZWxlY3RlZEluZGV4ICsgKHNsaWRlTGlzdC5sZW5ndGgtMSkpICUgc2xpZGVMaXN0Lmxlbmd0aFxuICAgICAgICBuZXh0UGFnZUlkICAgID0gc2xpZGVMaXN0W25leHRQYWdlSW5kZXhdLmlkXG4gICAgICAgICNjb25zb2xlLmxvZyAnbmV4dCBpZCA9ICcgKyBuZXh0UGFnZUlkXG4gICAgICAgICQoJy5zbGlkZV93cmFwcGVyJykuY3NzKCdiYWNrZ3JvdW5kQ29sb3InLCAnJylcbiAgICAgICAgJChcIiMje25leHRQYWdlSWR9XCIpLmNzcygnYmFja2dyb3VuZENvbG9yJywgJyNmZmUzYjQnKVxuICAgICAgICBzZWxlY3RlZEluZGV4ID0gbmV4dFBhZ2VJbmRleFxuICAgICAgICBjb25zb2xlLmxvZyBzZWxlY3RlZEluZGV4XG4gICAgICAgICNpcGMuc2VuZFRvSG9zdCAnZ29Ub1BhZ2UnLCBuZXh0UGFnZUlkXG4gICAgICAgIGNoYW5nZVNsaWRlKG5leHRQYWdlSWQpXG4gICAgICAgICQoXCJodG1sLGJvZHlcIikuYW5pbWF0ZSh7c2Nyb2xsVG9wOiQoXCIjI3tuZXh0UGFnZUlkfVwiKS5vZmZzZXQoKS50b3B9KTtcblxuICAgICAgaWYgZS5rZXlDb2RlID09IDQwXG4gICAgICAgICNjb25zb2xlLmxvZyAnZG93biBrZXknXG4gICAgICAgIG5leHRQYWdlSW5kZXggPSAoc2VsZWN0ZWRJbmRleCArIDEpICUgc2xpZGVMaXN0Lmxlbmd0aFxuICAgICAgICBuZXh0UGFnZUlkICAgID0gc2xpZGVMaXN0W25leHRQYWdlSW5kZXhdLmlkXG4gICAgICAgICNjb25zb2xlLmxvZyAnbmV4dCBpZCA9ICcgKyBuZXh0UGFnZUlkXG4gICAgICAgICQoJy5zbGlkZV93cmFwcGVyJykuY3NzKCdiYWNrZ3JvdW5kQ29sb3InLCAnJylcbiAgICAgICAgJChcIiMje25leHRQYWdlSWR9XCIpLmNzcygnYmFja2dyb3VuZENvbG9yJywgJyNmZmUzYjQnKVxuICAgICAgICBzZWxlY3RlZEluZGV4ID0gbmV4dFBhZ2VJbmRleFxuICAgICAgICBjb25zb2xlLmxvZyBzZWxlY3RlZEluZGV4XG4gICAgICAgICNpcGMuc2VuZFRvSG9zdCAnZ29Ub1BhZ2UnLCBuZXh0UGFnZUlkXG4gICAgICAgIGNoYW5nZVNsaWRlKG5leHRQYWdlSWQpXG4gICAgICAgICQoXCJodG1sLGJvZHlcIikuYW5pbWF0ZSh7c2Nyb2xsVG9wOiQoXCIjI3tuZXh0UGFnZUlkfVwiKS5vZmZzZXQoKS50b3B9KTtcblxuICAgICQod2luZG93KS5yZXNpemUgKGUpIC0+IGFwcGx5U2NyZWVuU2l6ZSgpXG4gICAgYXBwbHlTY3JlZW5TaXplKClcblxuXG4gICAgIyBwcmVzZW50YXRpb24gPT09PT09PT09PT09PT09PT09PT09PT09XG5cbiAgICBpcGMub24gJ3JlcXVlc3RTbGlkZUluZm8nLCAoKSA9PlxuICAgICAgY29uc29sZS5sb2cgJ3JlY2VpdmUgcmVxdWVzdFNsaWRlSW5mbydcbiAgICAgIG1hcmtkb3duQm9keSA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5tYXJrZG93bi1ib2R5JylcbiAgICAgIyBjb25zb2xlLmxvZyBtYXJrZG93bkJvZHkuaW5uZXJIVE1MXG4gICAgICBpcGMuc2VuZFRvSG9zdCAnc2VuZFNsaWRlSW5mbycsIG1hcmtkb3duQm9keS5pbm5lckhUTUxcbiAgICAgIGNvbnNvbGUubG9nIG1hcmtkb3duQm9keS5pbm5lckhUTUxcbiAgICAgIGNvbnNvbGUubG9nICdzZW5kIHNlbmRTbGlkZUluZm8nXG5cbiAgICBpcGMuc2VuZFRvSG9zdCAncmVxdWVzdFNsaWRlSFRNTCcsICgpID0+XG4gICAgICBjb25zb2xlLmxvZyAnc2VuZCByZXF1ZXN0U2xpZGVIVE1MJ1xuXG4gICAgaXBjLm9uICdzZXRTbGlkZScsIChlLCB0ZXh0KSA9PlxuICAgICAgY29uc29sZS5sb2cgJ3JlY2VpdmUgc2V0U2xpZGUnXG4gICAgICBjb25zb2xlLmxvZyB0ZXh0XG4gICAgICBzbGlkZUhUTUwgPSB0ZXh0LmpvaW4oXCJcIilcbiAgICAgIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5tYXJrZG93bi1ib2R5JykuaW5uZXJIVE1MID0gc2xpZGVIVE1MXG4gICAgICAjIHNsaWRlTGlzdCDjgbhwdXNoXG4gICAgICAkKCcuc2xpZGVfd3JhcHBlcicpLmVhY2ggKGlkeCwgZWxlbSkgLT5cbiAgICAgICAgIyBIVE1MT2JqZWN044KScHVzaFxuICAgICAgICBzbGlkZUxpc3QucHVzaCBlbGVtXG5cbiAgICAjIHNsaWRlIHNvcnRcbiAgICAkKCcubWFya2Rvd24tYm9keScpLnNvcnRhYmxlIHtcbiAgICAgICdvcGFjaXR5JzogMC41XG4gICAgfVxuICAgICQoJy5tYXJrZG93bi1ib2R5JykuZGlzYWJsZVNlbGVjdGlvbigpXG4gICAgJChkb2N1bWVudCkub24gJ3NvcnRzdG9wJywgJy5tYXJrZG93bi1ib2R5JywgKCkgLT5cbiAgICAgICNjb25zb2xlLmxvZyAnc29ydCBmaW5pc2hlZCdcbiAgICAgICMgc2xpZGVMaXN0IHVwZGF0ZVxuICAgICAgdG1wID0gc2xpZGVMaXN0W3NlbGVjdGVkSW5kZXhdXG4gICAgICBzbGlkZUxpc3QgPSBbXVxuICAgICAgJCgnLnNsaWRlX3dyYXBwZXInKS5lYWNoIChpZHgsIGVsZW0pIC0+XG4gICAgICAgc2xpZGVMaXN0LnB1c2ggZWxlbVxuXG4gICAgICAjc2VsZWN0ZWRJbmRleCDjgpLmm7TmlrDjgZnjgovlv4XopoHjgYzjgYLjgotcbiAgICAgIGZvciBpIGluIHNsaWRlTGlzdFxuICAgICAgICBpZihpID09IHRtcClcbiAgICAgICAgICBzZWxlY3RlZEluZGV4ID0gc2xpZGVMaXN0LmluZGV4T2YoaSlcbiAgICAgIGNvbnNvbGUubG9nIHNlbGVjdGVkSW5kZXhcblxuXG5cblxuXG4iXX0=
