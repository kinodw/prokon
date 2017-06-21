var MdsMenu, Menu, MenuItem, electron, isRemote,
  bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

electron = require('electron');

Menu = electron.Menu || electron.remote.Menu;

MenuItem = electron.MenuItem || electron.remote.MenuItem;

isRemote = electron.Menu == null;

module.exports = MdsMenu = (function() {
  MdsMenu.appMenu = null;

  MdsMenu.prototype.menu = new Menu();

  function MdsMenu(template) {
    this.template = template;
    this.popup = bind(this.popup, this);
    this.setMenu = bind(this.setMenu, this);
    this.setAppMenu = bind(this.setAppMenu, this);
    this.getMenu = bind(this.getMenu, this);
  }

  MdsMenu.filterTemplate = function(tpl, opts) {
    var cond, current_platform, filtered, i, invert_condition, item, j, len, len1, newTpl, newTplIdx, target_platform, target_platforms;
    if (opts == null) {
      opts = {};
    }
    newTpl = [];
    for (i = 0, len = tpl.length; i < len; i++) {
      item = tpl[i];
      filtered = (item.visible != null) && !item.visible || false;
      if (item.platform != null) {
        target_platforms = item.platform.split(",");
        current_platform = process.platform.toLowerCase();
        for (j = 0, len1 = target_platforms.length; j < len1; j++) {
          target_platform = target_platforms[j];
          invert_condition = false;
          if (target_platform[0] === '!') {
            target_platform = target_platform.slice(1);
            invert_condition = true;
          }
          cond = target_platform === current_platform;
          if (invert_condition) {
            cond = !cond;
          }
          if (!cond) {
            filtered = true;
            break;
          }
        }
      }
      if (item.replacement != null) {
        filtered = true;
        if (((opts != null ? opts.replacements : void 0) != null) && (opts.replacements[item.replacement] != null)) {
          Array.prototype.push.apply(newTpl, MdsMenu.filterTemplate(opts.replacements[item.replacement], opts));
        }
      }
      if (!filtered) {
        newTplIdx = newTpl.push(item) - 1;
        if (newTpl[newTplIdx].submenu != null) {
          newTpl[newTplIdx].submenu = MdsMenu.filterTemplate(newTpl[newTplIdx].submenu, opts);
        }
      }
    }
    return newTpl;
  };

  MdsMenu.prototype.getMenu = function(opts) {
    if (opts == null) {
      opts = {};
    }
    if (this.template != null) {
      return this.menu = Menu.buildFromTemplate(MdsMenu.filterTemplate(this.template, opts));
    } else {
      return this.menu = new Menu();
    }
  };

  MdsMenu.prototype.setAppMenu = function(opts) {
    if (opts == null) {
      opts = {};
    }
    if (!isRemote) {
      MdsMenu.appMenu = this;
      return Menu.setApplicationMenu(MdsMenu.appMenu.getMenu(opts));
    }
  };

  MdsMenu.prototype.setMenu = function(win, opts) {
    if (opts == null) {
      opts = {};
    }
    if (!isRemote) {
      return win.setMenu(this.getMenu(opts));
    }
  };

  MdsMenu.prototype.popup = function(opts) {
    if (opts == null) {
      opts = {};
    }
    if (isRemote) {
      return this.getMenu(opts).popup(electron.remote.getCurrentWindow());
    }
  };

  return MdsMenu;

})();

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xhc3Nlcy9tZHNfbWVudS5qcyIsInNvdXJjZXMiOlsiY2xhc3Nlcy9tZHNfbWVudS5jb2ZmZWUiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsSUFBQSwyQ0FBQTtFQUFBOztBQUFBLFFBQUEsR0FBVyxPQUFBLENBQVEsVUFBUjs7QUFDWCxJQUFBLEdBQVcsUUFBUSxDQUFDLElBQVQsSUFBaUIsUUFBUSxDQUFDLE1BQU0sQ0FBQzs7QUFDNUMsUUFBQSxHQUFXLFFBQVEsQ0FBQyxRQUFULElBQXFCLFFBQVEsQ0FBQyxNQUFNLENBQUM7O0FBQ2hELFFBQUEsR0FBWTs7QUFFWixNQUFNLENBQUMsT0FBUCxHQUF1QjtFQUNyQixPQUFDLENBQUEsT0FBRCxHQUFVOztvQkFDVixJQUFBLEdBQU0sSUFBSSxJQUFKLENBQUE7O0VBRU8saUJBQUMsUUFBRDtJQUFDLElBQUMsQ0FBQSxXQUFEOzs7OztFQUFEOztFQUViLE9BQUMsQ0FBQSxjQUFELEdBQWlCLFNBQUMsR0FBRCxFQUFNLElBQU47QUFDZixRQUFBOztNQURxQixPQUFPOztJQUM1QixNQUFBLEdBQVM7QUFDVCxTQUFBLHFDQUFBOztNQUNFLFFBQUEsR0FBVyxzQkFBQSxJQUFpQixDQUFDLElBQUksQ0FBQyxPQUF2QixJQUFrQztNQUc3QyxJQUFHLHFCQUFIO1FBQ0UsZ0JBQUEsR0FBbUIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFkLENBQW9CLEdBQXBCO1FBQ25CLGdCQUFBLEdBQW1CLE9BQU8sQ0FBQyxRQUFRLENBQUMsV0FBakIsQ0FBQTtBQUVuQixhQUFBLG9EQUFBOztVQUNFLGdCQUFBLEdBQW1CO1VBRW5CLElBQUcsZUFBZ0IsQ0FBQSxDQUFBLENBQWhCLEtBQXNCLEdBQXpCO1lBQ0UsZUFBQSxHQUFtQixlQUFlLENBQUMsS0FBaEIsQ0FBc0IsQ0FBdEI7WUFDbkIsZ0JBQUEsR0FBbUIsS0FGckI7O1VBSUEsSUFBQSxHQUFPLGVBQUEsS0FBbUI7VUFDMUIsSUFBZ0IsZ0JBQWhCO1lBQUEsSUFBQSxHQUFPLENBQUMsS0FBUjs7VUFFQSxJQUFBLENBQU8sSUFBUDtZQUNFLFFBQUEsR0FBVztBQUNYLGtCQUZGOztBQVZGLFNBSkY7O01BbUJBLElBQUcsd0JBQUg7UUFDRSxRQUFBLEdBQVc7UUFDWCxJQUFHLHFEQUFBLElBQXdCLDZDQUEzQjtVQUNFLEtBQUssQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLEtBQXJCLENBQTJCLE1BQTNCLEVBQW1DLE9BQU8sQ0FBQyxjQUFSLENBQXVCLElBQUksQ0FBQyxZQUFhLENBQUEsSUFBSSxDQUFDLFdBQUwsQ0FBekMsRUFBNEQsSUFBNUQsQ0FBbkMsRUFERjtTQUZGOztNQUtBLElBQUEsQ0FBTyxRQUFQO1FBQ0UsU0FBQSxHQUFZLE1BQU0sQ0FBQyxJQUFQLENBQVksSUFBWixDQUFBLEdBQW9CO1FBRWhDLElBQUcsaUNBQUg7VUFDRSxNQUFPLENBQUEsU0FBQSxDQUFVLENBQUMsT0FBbEIsR0FBNEIsT0FBTyxDQUFDLGNBQVIsQ0FBdUIsTUFBTyxDQUFBLFNBQUEsQ0FBVSxDQUFDLE9BQXpDLEVBQWtELElBQWxELEVBRDlCO1NBSEY7O0FBNUJGO0FBa0NBLFdBQU87RUFwQ1E7O29CQXNDakIsT0FBQSxHQUFTLFNBQUMsSUFBRDs7TUFBQyxPQUFPOztJQUNmLElBQUcscUJBQUg7YUFDRSxJQUFDLENBQUEsSUFBRCxHQUFRLElBQUksQ0FBQyxpQkFBTCxDQUF1QixPQUFPLENBQUMsY0FBUixDQUF1QixJQUFDLENBQUEsUUFBeEIsRUFBa0MsSUFBbEMsQ0FBdkIsRUFEVjtLQUFBLE1BQUE7YUFHRSxJQUFDLENBQUEsSUFBRCxHQUFRLElBQUksSUFBSixDQUFBLEVBSFY7O0VBRE87O29CQU1ULFVBQUEsR0FBWSxTQUFDLElBQUQ7O01BQUMsT0FBTzs7SUFDbEIsSUFBRyxDQUFDLFFBQUo7TUFDRSxPQUFPLENBQUMsT0FBUixHQUFrQjthQUNsQixJQUFJLENBQUMsa0JBQUwsQ0FBd0IsT0FBTyxDQUFDLE9BQU8sQ0FBQyxPQUFoQixDQUF3QixJQUF4QixDQUF4QixFQUZGOztFQURVOztvQkFLWixPQUFBLEdBQVMsU0FBQyxHQUFELEVBQU0sSUFBTjs7TUFBTSxPQUFPOztJQUNwQixJQUFBLENBQWtDLFFBQWxDO2FBQUEsR0FBRyxDQUFDLE9BQUosQ0FBWSxJQUFDLENBQUEsT0FBRCxDQUFTLElBQVQsQ0FBWixFQUFBOztFQURPOztvQkFHVCxLQUFBLEdBQU8sU0FBQyxJQUFEOztNQUFDLE9BQU87O0lBQ2IsSUFBNEQsUUFBNUQ7YUFBQSxJQUFDLENBQUEsT0FBRCxDQUFTLElBQVQsQ0FBYyxDQUFDLEtBQWYsQ0FBcUIsUUFBUSxDQUFDLE1BQU0sQ0FBQyxnQkFBaEIsQ0FBQSxDQUFyQixFQUFBOztFQURLIiwic291cmNlc0NvbnRlbnQiOlsiZWxlY3Ryb24gPSByZXF1aXJlICdlbGVjdHJvbidcbk1lbnUgICAgID0gZWxlY3Ryb24uTWVudSB8fCBlbGVjdHJvbi5yZW1vdGUuTWVudVxuTWVudUl0ZW0gPSBlbGVjdHJvbi5NZW51SXRlbSB8fCBlbGVjdHJvbi5yZW1vdGUuTWVudUl0ZW1cbmlzUmVtb3RlID0gIWVsZWN0cm9uLk1lbnU/XG5cbm1vZHVsZS5leHBvcnRzID0gY2xhc3MgTWRzTWVudVxuICBAYXBwTWVudTogbnVsbFxuICBtZW51OiBuZXcgTWVudSgpXG5cbiAgY29uc3RydWN0b3I6IChAdGVtcGxhdGUpIC0+XG5cbiAgQGZpbHRlclRlbXBsYXRlOiAodHBsLCBvcHRzID0ge30pID0+XG4gICAgbmV3VHBsID0gW11cbiAgICBmb3IgaXRlbSBpbiB0cGxcbiAgICAgIGZpbHRlcmVkID0gaXRlbS52aXNpYmxlPyAmJiAhaXRlbS52aXNpYmxlIHx8IGZhbHNlXG5cbiAgICAgICMgUGxhdGZvcm0gZmlsdGVyXG4gICAgICBpZiBpdGVtLnBsYXRmb3JtP1xuICAgICAgICB0YXJnZXRfcGxhdGZvcm1zID0gaXRlbS5wbGF0Zm9ybS5zcGxpdChcIixcIilcbiAgICAgICAgY3VycmVudF9wbGF0Zm9ybSA9IHByb2Nlc3MucGxhdGZvcm0udG9Mb3dlckNhc2UoKVxuXG4gICAgICAgIGZvciB0YXJnZXRfcGxhdGZvcm0gaW4gdGFyZ2V0X3BsYXRmb3Jtc1xuICAgICAgICAgIGludmVydF9jb25kaXRpb24gPSBmYWxzZVxuXG4gICAgICAgICAgaWYgdGFyZ2V0X3BsYXRmb3JtWzBdID09ICchJ1xuICAgICAgICAgICAgdGFyZ2V0X3BsYXRmb3JtICA9IHRhcmdldF9wbGF0Zm9ybS5zbGljZSAxXG4gICAgICAgICAgICBpbnZlcnRfY29uZGl0aW9uID0gdHJ1ZVxuXG4gICAgICAgICAgY29uZCA9IHRhcmdldF9wbGF0Zm9ybSA9PSBjdXJyZW50X3BsYXRmb3JtXG4gICAgICAgICAgY29uZCA9ICFjb25kIGlmIGludmVydF9jb25kaXRpb25cblxuICAgICAgICAgIHVubGVzcyBjb25kXG4gICAgICAgICAgICBmaWx0ZXJlZCA9IHRydWVcbiAgICAgICAgICAgIGJyZWFrXG5cbiAgICAgICMgUmVwbGFjZW1lbnQgZmlsdGVyXG4gICAgICBpZiBpdGVtLnJlcGxhY2VtZW50P1xuICAgICAgICBmaWx0ZXJlZCA9IHRydWVcbiAgICAgICAgaWYgb3B0cz8ucmVwbGFjZW1lbnRzPyBhbmQgb3B0cy5yZXBsYWNlbWVudHNbaXRlbS5yZXBsYWNlbWVudF0/XG4gICAgICAgICAgQXJyYXkucHJvdG90eXBlLnB1c2guYXBwbHkobmV3VHBsLCBNZHNNZW51LmZpbHRlclRlbXBsYXRlKG9wdHMucmVwbGFjZW1lbnRzW2l0ZW0ucmVwbGFjZW1lbnRdLCBvcHRzKSlcblxuICAgICAgdW5sZXNzIGZpbHRlcmVkXG4gICAgICAgIG5ld1RwbElkeCA9IG5ld1RwbC5wdXNoKGl0ZW0pIC0gMVxuXG4gICAgICAgIGlmIG5ld1RwbFtuZXdUcGxJZHhdLnN1Ym1lbnU/XG4gICAgICAgICAgbmV3VHBsW25ld1RwbElkeF0uc3VibWVudSA9IE1kc01lbnUuZmlsdGVyVGVtcGxhdGUobmV3VHBsW25ld1RwbElkeF0uc3VibWVudSwgb3B0cylcblxuICAgIHJldHVybiBuZXdUcGxcblxuICBnZXRNZW51OiAob3B0cyA9IHt9KSA9PlxuICAgIGlmIEB0ZW1wbGF0ZT9cbiAgICAgIEBtZW51ID0gTWVudS5idWlsZEZyb21UZW1wbGF0ZShNZHNNZW51LmZpbHRlclRlbXBsYXRlKEB0ZW1wbGF0ZSwgb3B0cykpXG4gICAgZWxzZVxuICAgICAgQG1lbnUgPSBuZXcgTWVudSgpXG5cbiAgc2V0QXBwTWVudTogKG9wdHMgPSB7fSkgPT5cbiAgICBpZiAhaXNSZW1vdGVcbiAgICAgIE1kc01lbnUuYXBwTWVudSA9IEBcbiAgICAgIE1lbnUuc2V0QXBwbGljYXRpb25NZW51IE1kc01lbnUuYXBwTWVudS5nZXRNZW51KG9wdHMpXG5cbiAgc2V0TWVudTogKHdpbiwgb3B0cyA9IHt9KSA9PlxuICAgIHdpbi5zZXRNZW51IEBnZXRNZW51KG9wdHMpIHVubGVzcyBpc1JlbW90ZVxuXG4gIHBvcHVwOiAob3B0cyA9IHt9KSA9PlxuICAgIEBnZXRNZW51KG9wdHMpLnBvcHVwKGVsZWN0cm9uLnJlbW90ZS5nZXRDdXJyZW50V2luZG93KCkpIGlmIGlzUmVtb3RlXG4iXX0=
