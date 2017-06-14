var MdsFileHistory, app, exist,
  bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

app = require('electron').app;

exist = require('./mds_file').exist;

MdsFileHistory = (function() {
  var instance;

  MdsFileHistory.prototype.history = [];

  MdsFileHistory.prototype.max = 8;

  instance = void 0;

  function MdsFileHistory() {
    this.setHistory = bind(this.setHistory, this);
    this.filterExistance = bind(this.filterExistance, this);
    this.clear = bind(this.clear, this);
    this.push = bind(this.push, this);
    this.saveToConf = bind(this.saveToConf, this);
    this.loadFromConf = bind(this.loadFromConf, this);
    this.generateMenuItemTemplate = bind(this.generateMenuItemTemplate, this);
    if (instance != null) {
      return instance;
    }
    instance = this;
    instance.loadFromConf();
    instance.filterExistance();
  }

  MdsFileHistory.prototype.generateMenuItemTemplate = function(MdsWindow) {
    var full_path, i, idx, item, len, menuitems, ref, ref1;
    menuitems = [];
    if (((ref = this.history) != null ? ref.length : void 0) > 0) {
      ref1 = this.history;
      for (idx = i = 0, len = ref1.length; i < len; idx = ++i) {
        full_path = ref1[idx];
        item = (function(full_path) {
          return {
            click: function(item, w) {
              return MdsWindow.loadFromFile(full_path, w != null ? w.mdsWindow : void 0);
            }
          };
        })(full_path);
        if (process.platform === 'darwin') {
          item.label = full_path.replace(/\\/g, '/').replace(/.*\//, '');
        } else {
          item.label = "" + (idx < 9 ? '&' : '') + (idx + 1) + ": " + full_path;
        }
        menuitems.push(item);
      }
    }
    return menuitems;
  };

  MdsFileHistory.prototype.loadFromConf = function() {
    var ref;
    if ((typeof global !== "undefined" && global !== null ? (ref = global.marp) != null ? ref.config : void 0 : void 0) != null) {
      this.history = global.marp.config.get('fileHistory');
      return this.max = global.marp.config.get('fileHistoryMax');
    }
  };

  MdsFileHistory.prototype.saveToConf = function() {
    var ref;
    if ((typeof global !== "undefined" && global !== null ? (ref = global.marp) != null ? ref.config : void 0 : void 0) != null) {
      global.marp.config.set('fileHistory', this.history, true);
      global.marp.config.set('fileHistoryMax', this.max);
      return global.marp.config.save();
    }
  };

  MdsFileHistory.prototype.push = function(path) {
    var dupHistory, i, len, p, ref;
    dupHistory = [];
    ref = this.history;
    for (i = 0, len = ref.length; i < len; i++) {
      p = ref[i];
      if (path !== p) {
        dupHistory.push(p);
      }
    }
    if (exist(path)) {
      return this.setHistory([path].concat(dupHistory));
    }
  };

  MdsFileHistory.prototype.clear = function() {
    return this.setHistory([]);
  };

  MdsFileHistory.prototype.filterExistance = function() {
    var i, len, newHistory, path, ref;
    newHistory = [];
    ref = this.history;
    for (i = 0, len = ref.length; i < len; i++) {
      path = ref[i];
      if (exist(path)) {
        newHistory.push(path);
      }
    }
    return this.setHistory(newHistory);
  };

  MdsFileHistory.prototype.setHistory = function(newHistory) {
    var i, len, osRecentDocument, path;
    this.history = newHistory.slice(0, this.max);
    osRecentDocument = this.history.slice(0);
    if (process.platform === 'win32') {
      osRecentDocument.reverse();
    }
    app.clearRecentDocuments();
    for (i = 0, len = osRecentDocument.length; i < len; i++) {
      path = osRecentDocument[i];
      app.addRecentDocument(path);
    }
    return this.saveToConf();
  };

  return MdsFileHistory;

})();

module.exports = new MdsFileHistory;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xhc3Nlcy9tZHNfZmlsZV9oaXN0b3J5LmpzIiwic291cmNlcyI6WyJjbGFzc2VzL21kc19maWxlX2hpc3RvcnkuY29mZmVlIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLElBQUEsMEJBQUE7RUFBQTs7QUFBQyxNQUFTLE9BQUEsQ0FBUSxVQUFSOztBQUNULFFBQVMsT0FBQSxDQUFRLFlBQVI7O0FBRUo7QUFDSixNQUFBOzsyQkFBQSxPQUFBLEdBQVM7OzJCQUNULEdBQUEsR0FBSzs7RUFFTCxRQUFBLEdBQVc7O0VBRUUsd0JBQUE7Ozs7Ozs7O0lBQ1gsSUFBbUIsZ0JBQW5CO0FBQUEsYUFBTyxTQUFQOztJQUVBLFFBQUEsR0FBVztJQUNYLFFBQVEsQ0FBQyxZQUFULENBQUE7SUFDQSxRQUFRLENBQUMsZUFBVCxDQUFBO0VBTFc7OzJCQU9iLHdCQUFBLEdBQTBCLFNBQUMsU0FBRDtBQUN4QixRQUFBO0lBQUEsU0FBQSxHQUFZO0lBRVosdUNBQVcsQ0FBRSxnQkFBVixHQUFtQixDQUF0QjtBQUNFO0FBQUEsV0FBQSxrREFBQTs7UUFDRSxJQUFBLEdBQVUsQ0FBQSxTQUFDLFNBQUQ7aUJBQ1I7WUFBQSxLQUFBLEVBQU8sU0FBQyxJQUFELEVBQU8sQ0FBUDtxQkFBYSxTQUFTLENBQUMsWUFBVixDQUF1QixTQUF2QixjQUFrQyxDQUFDLENBQUUsa0JBQXJDO1lBQWIsQ0FBUDs7UUFEUSxDQUFBLENBQUgsQ0FBSSxTQUFKO1FBR1AsSUFBRyxPQUFPLENBQUMsUUFBUixLQUFvQixRQUF2QjtVQUNFLElBQUksQ0FBQyxLQUFMLEdBQWEsU0FBUyxDQUFDLE9BQVYsQ0FBa0IsS0FBbEIsRUFBeUIsR0FBekIsQ0FBNkIsQ0FBQyxPQUE5QixDQUFzQyxNQUF0QyxFQUE4QyxFQUE5QyxFQURmO1NBQUEsTUFBQTtVQUdFLElBQUksQ0FBQyxLQUFMLEdBQWEsRUFBQSxHQUFFLENBQUksR0FBQSxHQUFNLENBQVQsR0FBZ0IsR0FBaEIsR0FBeUIsRUFBMUIsQ0FBRixHQUFnQyxDQUFDLEdBQUEsR0FBTSxDQUFQLENBQWhDLEdBQXlDLElBQXpDLEdBQTZDLFVBSDVEOztRQUtBLFNBQVMsQ0FBQyxJQUFWLENBQWUsSUFBZjtBQVRGLE9BREY7O1dBWUE7RUFmd0I7OzJCQWlCMUIsWUFBQSxHQUFjLFNBQUE7QUFDWixRQUFBO0lBQUEsSUFBRyx1SEFBSDtNQUNFLElBQUMsQ0FBQSxPQUFELEdBQVcsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBbkIsQ0FBdUIsYUFBdkI7YUFDWCxJQUFDLENBQUEsR0FBRCxHQUFPLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQW5CLENBQXVCLGdCQUF2QixFQUZUOztFQURZOzsyQkFLZCxVQUFBLEdBQVksU0FBQTtBQUNWLFFBQUE7SUFBQSxJQUFHLHVIQUFIO01BQ0UsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBbkIsQ0FBdUIsYUFBdkIsRUFBc0MsSUFBQyxDQUFBLE9BQXZDLEVBQWdELElBQWhEO01BQ0EsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBbkIsQ0FBdUIsZ0JBQXZCLEVBQXlDLElBQUMsQ0FBQSxHQUExQzthQUNBLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQW5CLENBQUEsRUFIRjs7RUFEVTs7MkJBTVosSUFBQSxHQUFNLFNBQUMsSUFBRDtBQUNKLFFBQUE7SUFBQSxVQUFBLEdBQWE7QUFDYjtBQUFBLFNBQUEscUNBQUE7O1VBQXlDLElBQUEsS0FBUTtRQUFqRCxVQUFVLENBQUMsSUFBWCxDQUFnQixDQUFoQjs7QUFBQTtJQUNBLElBQXlDLEtBQUEsQ0FBTSxJQUFOLENBQXpDO2FBQUEsSUFBQyxDQUFBLFVBQUQsQ0FBWSxDQUFDLElBQUQsQ0FBTSxDQUFDLE1BQVAsQ0FBYyxVQUFkLENBQVosRUFBQTs7RUFISTs7MkJBS04sS0FBQSxHQUFPLFNBQUE7V0FDTCxJQUFDLENBQUEsVUFBRCxDQUFZLEVBQVo7RUFESzs7MkJBR1AsZUFBQSxHQUFpQixTQUFBO0FBQ2YsUUFBQTtJQUFBLFVBQUEsR0FBYTtBQUNiO0FBQUEsU0FBQSxxQ0FBQTs7VUFBK0MsS0FBQSxDQUFNLElBQU47UUFBL0MsVUFBVSxDQUFDLElBQVgsQ0FBZ0IsSUFBaEI7O0FBQUE7V0FDQSxJQUFDLENBQUEsVUFBRCxDQUFZLFVBQVo7RUFIZTs7MkJBS2pCLFVBQUEsR0FBWSxTQUFDLFVBQUQ7QUFDVixRQUFBO0lBQUEsSUFBQyxDQUFBLE9BQUQsR0FBVyxVQUFVLENBQUMsS0FBWCxDQUFpQixDQUFqQixFQUFvQixJQUFDLENBQUEsR0FBckI7SUFFWCxnQkFBQSxHQUFtQixJQUFDLENBQUEsT0FBTyxDQUFDLEtBQVQsQ0FBZSxDQUFmO0lBQ25CLElBQThCLE9BQU8sQ0FBQyxRQUFSLEtBQW9CLE9BQWxEO01BQUEsZ0JBQWdCLENBQUMsT0FBakIsQ0FBQSxFQUFBOztJQUVBLEdBQUcsQ0FBQyxvQkFBSixDQUFBO0FBQ0EsU0FBQSxrREFBQTs7TUFBQSxHQUFHLENBQUMsaUJBQUosQ0FBc0IsSUFBdEI7QUFBQTtXQUVBLElBQUMsQ0FBQSxVQUFELENBQUE7RUFUVTs7Ozs7O0FBV2QsTUFBTSxDQUFDLE9BQVAsR0FBaUIsSUFBSSIsInNvdXJjZXNDb250ZW50IjpbInthcHB9ICAgPSByZXF1aXJlICdlbGVjdHJvbidcbntleGlzdH0gPSByZXF1aXJlICcuL21kc19maWxlJ1xuXG5jbGFzcyBNZHNGaWxlSGlzdG9yeVxuICBoaXN0b3J5OiBbXVxuICBtYXg6IDhcblxuICBpbnN0YW5jZSA9IHVuZGVmaW5lZFxuXG4gIGNvbnN0cnVjdG9yOiAtPlxuICAgIHJldHVybiBpbnN0YW5jZSBpZiBpbnN0YW5jZT9cblxuICAgIGluc3RhbmNlID0gQFxuICAgIGluc3RhbmNlLmxvYWRGcm9tQ29uZigpXG4gICAgaW5zdGFuY2UuZmlsdGVyRXhpc3RhbmNlKClcblxuICBnZW5lcmF0ZU1lbnVJdGVtVGVtcGxhdGU6IChNZHNXaW5kb3cpID0+XG4gICAgbWVudWl0ZW1zID0gW11cblxuICAgIGlmIEBoaXN0b3J5Py5sZW5ndGggPiAwXG4gICAgICBmb3IgZnVsbF9wYXRoLCBpZHggaW4gQGhpc3RvcnlcbiAgICAgICAgaXRlbSA9IGRvIChmdWxsX3BhdGgpIC0+XG4gICAgICAgICAgY2xpY2s6IChpdGVtLCB3KSAtPiBNZHNXaW5kb3cubG9hZEZyb21GaWxlIGZ1bGxfcGF0aCwgdz8ubWRzV2luZG93XG5cbiAgICAgICAgaWYgcHJvY2Vzcy5wbGF0Zm9ybSA9PSAnZGFyd2luJ1xuICAgICAgICAgIGl0ZW0ubGFiZWwgPSBmdWxsX3BhdGgucmVwbGFjZSgvXFxcXC9nLCAnLycpLnJlcGxhY2UoLy4qXFwvLywgJycpXG4gICAgICAgIGVsc2VcbiAgICAgICAgICBpdGVtLmxhYmVsID0gXCIje2lmIGlkeCA8IDkgdGhlbiAnJicgZWxzZSAnJ30je2lkeCArIDF9OiAje2Z1bGxfcGF0aH1cIlxuXG4gICAgICAgIG1lbnVpdGVtcy5wdXNoIGl0ZW1cblxuICAgIG1lbnVpdGVtc1xuXG4gIGxvYWRGcm9tQ29uZjogPT5cbiAgICBpZiBnbG9iYWw/Lm1hcnA/LmNvbmZpZz9cbiAgICAgIEBoaXN0b3J5ID0gZ2xvYmFsLm1hcnAuY29uZmlnLmdldCgnZmlsZUhpc3RvcnknKVxuICAgICAgQG1heCA9IGdsb2JhbC5tYXJwLmNvbmZpZy5nZXQoJ2ZpbGVIaXN0b3J5TWF4JylcblxuICBzYXZlVG9Db25mOiA9PlxuICAgIGlmIGdsb2JhbD8ubWFycD8uY29uZmlnP1xuICAgICAgZ2xvYmFsLm1hcnAuY29uZmlnLnNldCgnZmlsZUhpc3RvcnknLCBAaGlzdG9yeSwgdHJ1ZSlcbiAgICAgIGdsb2JhbC5tYXJwLmNvbmZpZy5zZXQoJ2ZpbGVIaXN0b3J5TWF4JywgQG1heClcbiAgICAgIGdsb2JhbC5tYXJwLmNvbmZpZy5zYXZlKClcblxuICBwdXNoOiAocGF0aCkgPT5cbiAgICBkdXBIaXN0b3J5ID0gW11cbiAgICBkdXBIaXN0b3J5LnB1c2ggcCBmb3IgcCBpbiBAaGlzdG9yeSB3aGVuIHBhdGggIT0gcFxuICAgIEBzZXRIaXN0b3J5IFtwYXRoXS5jb25jYXQoZHVwSGlzdG9yeSkgaWYgZXhpc3QocGF0aClcblxuICBjbGVhcjogPT5cbiAgICBAc2V0SGlzdG9yeSBbXVxuXG4gIGZpbHRlckV4aXN0YW5jZTogPT5cbiAgICBuZXdIaXN0b3J5ID0gW11cbiAgICBuZXdIaXN0b3J5LnB1c2ggcGF0aCBmb3IgcGF0aCBpbiBAaGlzdG9yeSB3aGVuIGV4aXN0KHBhdGgpXG4gICAgQHNldEhpc3RvcnkgbmV3SGlzdG9yeVxuXG4gIHNldEhpc3Rvcnk6IChuZXdIaXN0b3J5KSA9PlxuICAgIEBoaXN0b3J5ID0gbmV3SGlzdG9yeS5zbGljZSAwLCBAbWF4XG5cbiAgICBvc1JlY2VudERvY3VtZW50ID0gQGhpc3Rvcnkuc2xpY2UoMClcbiAgICBvc1JlY2VudERvY3VtZW50LnJldmVyc2UoKSBpZiBwcm9jZXNzLnBsYXRmb3JtID09ICd3aW4zMidcblxuICAgIGFwcC5jbGVhclJlY2VudERvY3VtZW50cygpXG4gICAgYXBwLmFkZFJlY2VudERvY3VtZW50KHBhdGgpIGZvciBwYXRoIGluIG9zUmVjZW50RG9jdW1lbnRcblxuICAgIEBzYXZlVG9Db25mKClcblxubW9kdWxlLmV4cG9ydHMgPSBuZXcgTWRzRmlsZUhpc3RvcnlcbiJdfQ==
