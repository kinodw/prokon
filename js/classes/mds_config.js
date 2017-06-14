var MdsConfig, Path, app, extend, fs,
  bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

app = require('electron').app;

fs = require('fs');

Path = require('path');

extend = require('extend');

MdsConfig = (function() {
  var instance;

  instance = void 0;

  MdsConfig.prototype.config = {};

  MdsConfig.prototype.configFile = Path.join(app.getPath('userData'), 'config.json');

  MdsConfig.initialConfig = {
    editor: {
      fontFamily: 'Consolas, monaco, monospace',
      fontSize: '14px'
    },
    fileHistory: [],
    fileHistoryMax: 8,
    splitterPosition: 0.5,
    viewMode: 'screen',
    windowPosition: {
      x: void 0,
      y: void 0,
      width: 1200,
      height: 800,
      maximized: false
    }
  };

  function MdsConfig() {
    this.merge = bind(this.merge, this);
    this.set = bind(this.set, this);
    this.get = bind(this.get, this);
    this.save = bind(this.save, this);
    this.load = bind(this.load, this);
    this.initialize = bind(this.initialize, this);
    if (instance != null) {
      return instance;
    }
    instance = this;
    instance.initialize();
  }

  MdsConfig.prototype.initialize = function(conf) {
    if (conf == null) {
      conf = this.configFile;
    }
    return this.load(conf, true);
  };

  MdsConfig.prototype.load = function(conf, initialize) {
    if (conf == null) {
      conf = this.configFile;
    }
    if (initialize == null) {
      initialize = false;
    }
    this.config = MdsConfig.initialConfig;
    return this.save();
  };

  MdsConfig.prototype.save = function(json) {
    if (json == null) {
      json = this.config;
    }
    try {
      fs.writeFileSync(this.configFile, JSON.stringify(json));
      return json;
    } catch (error) {
      return {};
    }
  };

  MdsConfig.prototype.get = function(name, _target) {
    var names;
    if (_target == null) {
      _target = this.config;
    }
    names = name.split('.');
    if (_target[names[0]] == null) {
      return null;
    }
    if (names.length > 1) {
      return this.get(names.slice(1).join('.'), _target[names[0]]);
    }
    return _target[names[0]];
  };

  MdsConfig.prototype.set = function(name, val, override) {
    var elm, i, j, key, len, names, obj;
    if (override == null) {
      override = false;
    }
    names = name.split('.');
    obj = {};
    elm = obj;
    for (i = j = 0, len = names.length; j < len; i = ++j) {
      key = names[i];
      elm[key] = i === names.length - 1 ? val : {};
      elm = elm[key];
    }
    this.merge(obj, override);
    return val;
  };

  MdsConfig.prototype.merge = function(object, override) {
    if (override == null) {
      override = false;
    }
    if (override) {
      return extend(this.config, object);
    } else {
      return extend(true, this.config, object);
    }
  };

  return MdsConfig;

})();

module.exports = new MdsConfig;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xhc3Nlcy9tZHNfY29uZmlnLmpzIiwic291cmNlcyI6WyJjbGFzc2VzL21kc19jb25maWcuY29mZmVlIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLElBQUEsZ0NBQUE7RUFBQTs7QUFBQyxNQUFRLE9BQUEsQ0FBUSxVQUFSOztBQUNULEVBQUEsR0FBUyxPQUFBLENBQVEsSUFBUjs7QUFDVCxJQUFBLEdBQVMsT0FBQSxDQUFRLE1BQVI7O0FBQ1QsTUFBQSxHQUFTLE9BQUEsQ0FBUSxRQUFSOztBQUVIO0FBQ0osTUFBQTs7RUFBQSxRQUFBLEdBQVc7O3NCQUVYLE1BQUEsR0FBUTs7c0JBQ1IsVUFBQSxHQUFZLElBQUksQ0FBQyxJQUFMLENBQVUsR0FBRyxDQUFDLE9BQUosQ0FBWSxVQUFaLENBQVYsRUFBbUMsYUFBbkM7O0VBRVosU0FBQyxDQUFBLGFBQUQsR0FDRTtJQUFBLE1BQUEsRUFDRTtNQUFBLFVBQUEsRUFBWSw2QkFBWjtNQUNBLFFBQUEsRUFBVSxNQURWO0tBREY7SUFHQSxXQUFBLEVBQWEsRUFIYjtJQUlBLGNBQUEsRUFBZ0IsQ0FKaEI7SUFLQSxnQkFBQSxFQUFrQixHQUxsQjtJQU1BLFFBQUEsRUFBVSxRQU5WO0lBT0EsY0FBQSxFQUNFO01BQUEsQ0FBQSxFQUFHLE1BQUg7TUFDQSxDQUFBLEVBQUcsTUFESDtNQUVBLEtBQUEsRUFBTyxJQUZQO01BR0EsTUFBQSxFQUFRLEdBSFI7TUFJQSxTQUFBLEVBQVcsS0FKWDtLQVJGOzs7RUFjVyxtQkFBQTs7Ozs7OztJQUNYLElBQW1CLGdCQUFuQjtBQUFBLGFBQU8sU0FBUDs7SUFFQSxRQUFBLEdBQVc7SUFDWCxRQUFRLENBQUMsVUFBVCxDQUFBO0VBSlc7O3NCQU1iLFVBQUEsR0FBWSxTQUFDLElBQUQ7O01BQUMsT0FBTyxJQUFDLENBQUE7O1dBQWUsSUFBQyxDQUFBLElBQUQsQ0FBTSxJQUFOLEVBQVksSUFBWjtFQUF4Qjs7c0JBRVosSUFBQSxHQUFNLFNBQUMsSUFBRCxFQUFxQixVQUFyQjs7TUFBQyxPQUFPLElBQUMsQ0FBQTs7O01BQVksYUFBYTs7SUFPdEMsSUFBQyxDQUFBLE1BQUQsR0FBVSxTQUFTLENBQUM7V0FDcEIsSUFBQyxDQUFBLElBQUQsQ0FBQTtFQVJJOztzQkFVTixJQUFBLEdBQU0sU0FBQyxJQUFEOztNQUFDLE9BQU8sSUFBQyxDQUFBOztBQUNiO01BQ0UsRUFBRSxDQUFDLGFBQUgsQ0FBaUIsSUFBQyxDQUFBLFVBQWxCLEVBQThCLElBQUksQ0FBQyxTQUFMLENBQWUsSUFBZixDQUE5QjtBQUNBLGFBQU8sS0FGVDtLQUFBLGFBQUE7QUFJRSxhQUFPLEdBSlQ7O0VBREk7O3NCQU9OLEdBQUEsR0FBSyxTQUFDLElBQUQsRUFBTyxPQUFQO0FBQ0gsUUFBQTs7TUFEVSxVQUFVLElBQUMsQ0FBQTs7SUFDckIsS0FBQSxHQUFRLElBQUksQ0FBQyxLQUFMLENBQVcsR0FBWDtJQUNSLElBQW1CLHlCQUFuQjtBQUFBLGFBQU8sS0FBUDs7SUFDQSxJQUE0RCxLQUFLLENBQUMsTUFBTixHQUFlLENBQTNFO0FBQUEsYUFBTyxJQUFDLENBQUEsR0FBRCxDQUFLLEtBQUssQ0FBQyxLQUFOLENBQVksQ0FBWixDQUFjLENBQUMsSUFBZixDQUFvQixHQUFwQixDQUFMLEVBQStCLE9BQVEsQ0FBQSxLQUFNLENBQUEsQ0FBQSxDQUFOLENBQXZDLEVBQVA7O1dBQ0EsT0FBUSxDQUFBLEtBQU0sQ0FBQSxDQUFBLENBQU47RUFKTDs7c0JBTUwsR0FBQSxHQUFLLFNBQUMsSUFBRCxFQUFPLEdBQVAsRUFBWSxRQUFaO0FBQ0gsUUFBQTs7TUFEZSxXQUFXOztJQUMxQixLQUFBLEdBQVEsSUFBSSxDQUFDLEtBQUwsQ0FBVyxHQUFYO0lBQ1IsR0FBQSxHQUFRO0lBQ1IsR0FBQSxHQUFRO0FBRVIsU0FBQSwrQ0FBQTs7TUFDRSxHQUFJLENBQUEsR0FBQSxDQUFKLEdBQWMsQ0FBQSxLQUFLLEtBQUssQ0FBQyxNQUFOLEdBQWUsQ0FBdkIsR0FBOEIsR0FBOUIsR0FBdUM7TUFDbEQsR0FBQSxHQUFNLEdBQUksQ0FBQSxHQUFBO0FBRlo7SUFJQSxJQUFDLENBQUEsS0FBRCxDQUFPLEdBQVAsRUFBWSxRQUFaO1dBQ0E7RUFWRzs7c0JBWUwsS0FBQSxHQUFPLFNBQUMsTUFBRCxFQUFTLFFBQVQ7O01BQVMsV0FBVzs7SUFBVSxJQUFHLFFBQUg7YUFBaUIsTUFBQSxDQUFPLElBQUMsQ0FBQSxNQUFSLEVBQWdCLE1BQWhCLEVBQWpCO0tBQUEsTUFBQTthQUE4QyxNQUFBLENBQU8sSUFBUCxFQUFhLElBQUMsQ0FBQSxNQUFkLEVBQXNCLE1BQXRCLEVBQTlDOztFQUE5Qjs7Ozs7O0FBRVQsTUFBTSxDQUFDLE9BQVAsR0FBaUIsSUFBSSIsInNvdXJjZXNDb250ZW50IjpbInthcHB9ICA9IHJlcXVpcmUgJ2VsZWN0cm9uJ1xuZnMgICAgID0gcmVxdWlyZSAnZnMnXG5QYXRoICAgPSByZXF1aXJlICdwYXRoJ1xuZXh0ZW5kID0gcmVxdWlyZSAnZXh0ZW5kJ1xuXG5jbGFzcyBNZHNDb25maWdcbiAgaW5zdGFuY2UgPSB1bmRlZmluZWRcblxuICBjb25maWc6IHt9XG4gIGNvbmZpZ0ZpbGU6IFBhdGguam9pbihhcHAuZ2V0UGF0aCgndXNlckRhdGEnKSwgJ2NvbmZpZy5qc29uJylcblxuICBAaW5pdGlhbENvbmZpZzpcbiAgICBlZGl0b3I6XG4gICAgICBmb250RmFtaWx5OiAnQ29uc29sYXMsIG1vbmFjbywgbW9ub3NwYWNlJ1xuICAgICAgZm9udFNpemU6ICcxNHB4J1xuICAgIGZpbGVIaXN0b3J5OiBbXVxuICAgIGZpbGVIaXN0b3J5TWF4OiA4XG4gICAgc3BsaXR0ZXJQb3NpdGlvbjogMC41XG4gICAgdmlld01vZGU6ICdzY3JlZW4nXG4gICAgd2luZG93UG9zaXRpb246XG4gICAgICB4OiB1bmRlZmluZWRcbiAgICAgIHk6IHVuZGVmaW5lZFxuICAgICAgd2lkdGg6IDEyMDBcbiAgICAgIGhlaWdodDogODAwXG4gICAgICBtYXhpbWl6ZWQ6IGZhbHNlXG5cbiAgY29uc3RydWN0b3I6IC0+XG4gICAgcmV0dXJuIGluc3RhbmNlIGlmIGluc3RhbmNlP1xuXG4gICAgaW5zdGFuY2UgPSBAXG4gICAgaW5zdGFuY2UuaW5pdGlhbGl6ZSgpXG5cbiAgaW5pdGlhbGl6ZTogKGNvbmYgPSBAY29uZmlnRmlsZSkgPT4gQGxvYWQoY29uZiwgdHJ1ZSlcblxuICBsb2FkOiAoY29uZiA9IEBjb25maWdGaWxlLCBpbml0aWFsaXplID0gZmFsc2UpID0+XG4gICAgIyB0cnlcbiAgICAjICAgZnMuYWNjZXNzU3luYyhjb25mLCBmcy5GX09LKVxuICAgICMgICBAY29uZmlnID0gZXh0ZW5kKHRydWUsIHt9LCBNZHNDb25maWcuaW5pdGlhbENvbmZpZywgSlNPTi5wYXJzZShmcy5yZWFkRmlsZVN5bmMoY29uZikudG9TdHJpbmcoKSkpXG4gICAgIyBjYXRjaFxuICAgICMgICBpZiBpbml0aWFsaXplXG4gICAgIyAgICAgY29uc29sZS5sb2cgJ0ZhaWxlZCByZWFkaW5nIGNvbmZpZyBmaWxlLiBDb25maWcgaW5pdGlhbGl6ZWQuJ1xuICAgIEBjb25maWcgPSBNZHNDb25maWcuaW5pdGlhbENvbmZpZ1xuICAgIEBzYXZlKClcblxuICBzYXZlOiAoanNvbiA9IEBjb25maWcpID0+XG4gICAgdHJ5XG4gICAgICBmcy53cml0ZUZpbGVTeW5jKEBjb25maWdGaWxlLCBKU09OLnN0cmluZ2lmeShqc29uKSlcbiAgICAgIHJldHVybiBqc29uXG4gICAgY2F0Y2hcbiAgICAgIHJldHVybiB7fVxuXG4gIGdldDogKG5hbWUsIF90YXJnZXQgPSBAY29uZmlnKSA9PlxuICAgIG5hbWVzID0gbmFtZS5zcGxpdCAnLidcbiAgICByZXR1cm4gbnVsbCB1bmxlc3MgX3RhcmdldFtuYW1lc1swXV0/XG4gICAgcmV0dXJuIEBnZXQobmFtZXMuc2xpY2UoMSkuam9pbignLicpLCBfdGFyZ2V0W25hbWVzWzBdXSkgaWYgbmFtZXMubGVuZ3RoID4gMVxuICAgIF90YXJnZXRbbmFtZXNbMF1dXG5cbiAgc2V0OiAobmFtZSwgdmFsLCBvdmVycmlkZSA9IGZhbHNlKSA9PlxuICAgIG5hbWVzID0gbmFtZS5zcGxpdCAnLidcbiAgICBvYmogICA9IHt9XG4gICAgZWxtICAgPSBvYmpcblxuICAgIGZvciBrZXksIGkgaW4gbmFtZXNcbiAgICAgIGVsbVtrZXldID0gaWYgaSA9PSBuYW1lcy5sZW5ndGggLSAxIHRoZW4gdmFsIGVsc2Uge31cbiAgICAgIGVsbSA9IGVsbVtrZXldXG5cbiAgICBAbWVyZ2Ugb2JqLCBvdmVycmlkZVxuICAgIHZhbFxuXG4gIG1lcmdlOiAob2JqZWN0LCBvdmVycmlkZSA9IGZhbHNlKSA9PiBpZiBvdmVycmlkZSB0aGVuIGV4dGVuZChAY29uZmlnLCBvYmplY3QpIGVsc2UgZXh0ZW5kKHRydWUsIEBjb25maWcsIG9iamVjdClcblxubW9kdWxlLmV4cG9ydHMgPSBuZXcgTWRzQ29uZmlnXG4iXX0=
