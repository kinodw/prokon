var MdsMdSetting, extend, path,
  bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

extend = require('extend');

path = require('path');

module.exports = MdsMdSetting = (function() {
  MdsMdSetting.generalTransfomer = {
    bool: function(v) {
      return v === 'true';
    },
    unit: function(v) {
      var m, val;
      val = void 0;
      if (m = ("" + v).match(/^(\d+(?:\.\d+)?)((?:px|cm|mm|in|pt|pc)?)$/)) {
        val = parseFloat(m[1]);
        if (m[2] === 'cm') {
          val = val * 960 / 25.4;
        } else if (m[2] === 'mm') {
          val = val * 96 / 25.4;
        } else if (m[2] === 'in') {
          val = val * 96;
        } else if (m[2] === 'pt') {
          val = val * 4 / 3;
        } else if (m[2] === 'pc') {
          val = val * 16;
        }
      }
      return Math.floor(val) || void 0;
    }
  };

  MdsMdSetting.transformers = {
    page_number: MdsMdSetting.generalTransfomer.bool,
    width: MdsMdSetting.generalTransfomer.unit,
    height: MdsMdSetting.generalTransfomer.unit,
    theme: function(v) {
      var basename;
      basename = path.basename(v);
      if (basename === 'default' || basename === 'gaia') {
        return "css/themes/" + basename + ".css";
      } else {
        return null;
      }
    },
    template: function(v) {
      return v;
    },
    footer: function(v) {
      return v;
    },
    prerender: MdsMdSetting.generalTransfomer.bool
  };

  MdsMdSetting.findTransformer = function(prop) {
    var ref, transformer, transformerProp;
    ref = MdsMdSetting.transformers;
    for (transformerProp in ref) {
      transformer = ref[transformerProp];
      if (prop === transformerProp) {
        return transformer;
      }
    }
    return null;
  };

  MdsMdSetting.duckTypes = {
    size: function(v) {
      var cmd, ret, tmp;
      ret = {};
      cmd = ("" + v).toLowerCase();
      if (cmd.startsWith('4:3')) {
        ret = {
          width: 1024,
          height: 768
        };
      } else if (cmd.startsWith('16:9')) {
        ret = {
          width: 1366,
          height: 768
        };
      } else if (cmd.startsWith('a0')) {
        ret = {
          width: '1189mm',
          height: '841mm'
        };
      } else if (cmd.startsWith('a1')) {
        ret = {
          width: '841mm',
          height: '594mm'
        };
      } else if (cmd.startsWith('a2')) {
        ret = {
          width: '594mm',
          height: '420mm'
        };
      } else if (cmd.startsWith('a3')) {
        ret = {
          width: '420mm',
          height: '297mm'
        };
      } else if (cmd.startsWith('a4')) {
        ret = {
          width: '297mm',
          height: '210mm'
        };
      } else if (cmd.startsWith('a5')) {
        ret = {
          width: '210mm',
          height: '148mm'
        };
      } else if (cmd.startsWith('a6')) {
        ret = {
          width: '148mm',
          height: '105mm'
        };
      } else if (cmd.startsWith('a7')) {
        ret = {
          width: '105mm',
          height: '74mm'
        };
      } else if (cmd.startsWith('a8')) {
        ret = {
          width: '74mm',
          height: '52mm'
        };
      } else if (cmd.startsWith('b0')) {
        ret = {
          width: '1456mm',
          height: '1030mm'
        };
      } else if (cmd.startsWith('b1')) {
        ret = {
          width: '1030mm',
          height: '728mm'
        };
      } else if (cmd.startsWith('b2')) {
        ret = {
          width: '728mm',
          height: '515mm'
        };
      } else if (cmd.startsWith('b3')) {
        ret = {
          width: '515mm',
          height: '364mm'
        };
      } else if (cmd.startsWith('b4')) {
        ret = {
          width: '364mm',
          height: '257mm'
        };
      } else if (cmd.startsWith('b5')) {
        ret = {
          width: '257mm',
          height: '182mm'
        };
      } else if (cmd.startsWith('b6')) {
        ret = {
          width: '182mm',
          height: '128mm'
        };
      } else if (cmd.startsWith('b7')) {
        ret = {
          width: '128mm',
          height: '91mm'
        };
      } else if (cmd.startsWith('b8')) {
        ret = {
          width: '91mm',
          height: '64mm'
        };
      }
      if (Object.keys(ret).length > 0 && cmd.endsWith('-portrait')) {
        tmp = ret.width;
        ret.width = ret.height;
        ret.height = tmp;
      }
      return ret;
    }
  };

  MdsMdSetting.findDuckTypes = function(prop) {
    var convertFunc, duckTypeProp, ref;
    ref = MdsMdSetting.duckTypes;
    for (duckTypeProp in ref) {
      convertFunc = ref[duckTypeProp];
      if (prop === duckTypeProp) {
        return convertFunc;
      }
    }
    return null;
  };

  MdsMdSetting.validProps = {
    global: ['width', 'height', 'size', 'theme'],
    page: ['page_number', 'template', 'footer', 'prerender']
  };

  MdsMdSetting.isValidProp = function(page, prop) {
    var target;
    target = page > 0 ? 'page' : 'global';
    return indexOf.call(MdsMdSetting.validProps[target], prop) >= 0;
  };

  function MdsMdSetting() {
    this._findSettingIdx = bind(this._findSettingIdx, this);
    this.getAtGlobal = bind(this.getAtGlobal, this);
    this.getAt = bind(this.getAt, this);
    this.getGlobal = bind(this.getGlobal, this);
    this.get = bind(this.get, this);
    this.setGlobal = bind(this.setGlobal, this);
    this.set = bind(this.set, this);
    this._settings = [];
  }

  MdsMdSetting.prototype.set = function(fromPage, prop, value, noFollowing) {
    var duckType, idx, results, target, targetProp, targetValue, transformedValue, transformer;
    if (noFollowing == null) {
      noFollowing = false;
    }
    if (!MdsMdSetting.isValidProp(fromPage, prop)) {
      return false;
    }
    if (duckType = MdsMdSetting.findDuckTypes(prop)) {
      target = duckType(value);
    } else {
      target = {};
      target[prop] = value;
    }
    results = [];
    for (targetProp in target) {
      targetValue = target[targetProp];
      if (transformer = MdsMdSetting.findTransformer(targetProp)) {
        transformedValue = transformer(targetValue);
        if ((idx = this._findSettingIdx(fromPage, targetProp, !!noFollowing)) != null) {
          results.push(this._settings[idx].value = transformedValue);
        } else {
          results.push(this._settings.push({
            page: fromPage,
            property: targetProp,
            value: transformedValue,
            noFollowing: !!noFollowing
          }));
        }
      } else {
        results.push(void 0);
      }
    }
    return results;
  };

  MdsMdSetting.prototype.setGlobal = function(prop, value) {
    return this.set(0, prop, value);
  };

  MdsMdSetting.prototype.get = function(page, prop, withGlobal) {
    if (withGlobal == null) {
      withGlobal = true;
    }
    return this.getAt(page, withGlobal)[prop];
  };

  MdsMdSetting.prototype.getGlobal = function(prop) {
    return this.getAtGlobal()[prop];
  };

  MdsMdSetting.prototype.getAt = function(page, withGlobal) {
    var i, len, noFollows, obj, props, ret;
    if (withGlobal == null) {
      withGlobal = true;
    }
    props = (function() {
      var i, len, ref, results;
      ref = this._settings;
      results = [];
      for (i = 0, len = ref.length; i < len; i++) {
        obj = ref[i];
        if (obj.page <= page && (withGlobal || obj.page > 0)) {
          results.push(obj);
        }
      }
      return results;
    }).call(this);
    props.sort(function(a, b) {
      return a.page - b.page;
    });
    ret = {};
    noFollows = [];
    for (i = 0, len = props.length; i < len; i++) {
      obj = props[i];
      if (obj.noFollowing) {
        if (!noFollows[obj.page]) {
          noFollows[obj.page] = {};
        }
        noFollows[obj.page][obj.property] = obj.value;
      } else {
        ret[obj.property] = obj.value;
      }
    }
    return extend(ret, noFollows[page] || {});
  };

  MdsMdSetting.prototype.getAtGlobal = function() {
    return this.getAt(0);
  };

  MdsMdSetting.prototype._findSettingIdx = function(page, prop, noFollowing) {
    var i, idx, len, opts, ref;
    ref = this._settings;
    for (idx = i = 0, len = ref.length; i < len; idx = ++i) {
      opts = ref[idx];
      if (opts.page === page && opts.property === prop && opts.noFollowing === noFollowing) {
        return idx;
      }
    }
    return null;
  };

  return MdsMdSetting;

})();

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xhc3Nlcy9tZHNfbWRfc2V0dGluZy5qcyIsInNvdXJjZXMiOlsiY2xhc3Nlcy9tZHNfbWRfc2V0dGluZy5jb2ZmZWUiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsSUFBQSwwQkFBQTtFQUFBOzs7QUFBQSxNQUFBLEdBQVUsT0FBQSxDQUFRLFFBQVI7O0FBQ1YsSUFBQSxHQUFVLE9BQUEsQ0FBUSxNQUFSOztBQUdWLE1BQU0sQ0FBQyxPQUFQLEdBQXVCO0VBQ3JCLFlBQUMsQ0FBQSxpQkFBRCxHQUNFO0lBQUEsSUFBQSxFQUFNLFNBQUMsQ0FBRDthQUFPLENBQUEsS0FBSztJQUFaLENBQU47SUFDQSxJQUFBLEVBQU0sU0FBQyxDQUFEO0FBQ0osVUFBQTtNQUFBLEdBQUEsR0FBTTtNQUVOLElBQUcsQ0FBQSxHQUFJLENBQUEsRUFBQSxHQUFHLENBQUgsQ0FBTSxDQUFDLEtBQVAsQ0FBYSwyQ0FBYixDQUFQO1FBQ0UsR0FBQSxHQUFNLFVBQUEsQ0FBVyxDQUFFLENBQUEsQ0FBQSxDQUFiO1FBRU4sSUFBRyxDQUFFLENBQUEsQ0FBQSxDQUFGLEtBQVEsSUFBWDtVQUNFLEdBQUEsR0FBTSxHQUFBLEdBQU0sR0FBTixHQUFZLEtBRHBCO1NBQUEsTUFFSyxJQUFHLENBQUUsQ0FBQSxDQUFBLENBQUYsS0FBUSxJQUFYO1VBQ0gsR0FBQSxHQUFNLEdBQUEsR0FBTSxFQUFOLEdBQVcsS0FEZDtTQUFBLE1BRUEsSUFBRyxDQUFFLENBQUEsQ0FBQSxDQUFGLEtBQVEsSUFBWDtVQUNILEdBQUEsR0FBTSxHQUFBLEdBQU0sR0FEVDtTQUFBLE1BRUEsSUFBRyxDQUFFLENBQUEsQ0FBQSxDQUFGLEtBQVEsSUFBWDtVQUNILEdBQUEsR0FBTSxHQUFBLEdBQU0sQ0FBTixHQUFVLEVBRGI7U0FBQSxNQUVBLElBQUcsQ0FBRSxDQUFBLENBQUEsQ0FBRixLQUFRLElBQVg7VUFDSCxHQUFBLEdBQU0sR0FBQSxHQUFNLEdBRFQ7U0FYUDs7YUFjQSxJQUFJLENBQUMsS0FBTCxDQUFX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QUksQ0FBQyxRQUFMLEtBQWlCLElBQXRDLElBQThDLElBQUksQ0FBQyxXQUFMLEtBQW9CLFdBQWhGO0FBQUEsZUFBTyxJQUFQOztBQURGO1dBRUE7RUFIZSIsInNvdXJjZXNDb250ZW50IjpbImV4dGVuZCAgPSByZXF1aXJlICdleHRlbmQnXG5wYXRoICAgID0gcmVxdWlyZSAncGF0aCdcblxuIyBwYWdlIG9wdGlvbiBzZXR0aW5nXG5tb2R1bGUuZXhwb3J0cyA9IGNsYXNzIE1kc01kU2V0dGluZ1xuICBAZ2VuZXJhbFRyYW5zZm9tZXI6XG4gICAgYm9vbDogKHYpIC0+IHYgaXMgJ3RydWUnXG4gICAgdW5pdDogKHYpIC0+XG4gICAgICB2YWwgPSB1bmRlZmluZWRcblxuICAgICAgaWYgbSA9IFwiI3t2fVwiLm1hdGNoKC9eKFxcZCsoPzpcXC5cXGQrKT8pKCg/OnB4fGNtfG1tfGlufHB0fHBjKT8pJC8pXG4gICAgICAgIHZhbCA9IHBhcnNlRmxvYXQobVsxXSlcblxuICAgICAgICBpZiBtWzJdIGlzICdjbSdcbiAgICAgICAgICB2YWwgPSB2YWwgKiA5NjAgLyAyNS40XG4gICAgICAgIGVsc2UgaWYgbVsyXSBpcyAnbW0nXG4gICAgICAgICAgdmFsID0gdmFsICogOTYgLyAyNS40XG4gICAgICAgIGVsc2UgaWYgbVsyXSBpcyAnaW4nXG4gICAgICAgICAgdmFsID0gdmFsICogOTZcbiAgICAgICAgZWxzZSBpZiBtWzJdIGlzICdwdCdcbiAgICAgICAgICB2YWwgPSB2YWwgKiA0IC8gM1xuICAgICAgICBlbHNlIGlmIG1bMl0gaXMgJ3BjJ1xuICAgICAgICAgIHZhbCA9IHZhbCAqIDE2XG5cbiAgICAgIE1hdGguZmxvb3IodmFsKSB8fCB1bmRlZmluZWRcblxuICBAdHJhbnNmb3JtZXJzOlxuICAgIHBhZ2VfbnVtYmVyOiBNZHNNZFNldHRpbmcuZ2VuZXJhbFRyYW5zZm9tZXIuYm9vbFxuICAgIHdpZHRoOiBNZHNNZFNldHRpbmcuZ2VuZXJhbFRyYW5zZm9tZXIudW5pdFxuICAgIGhlaWdodDogTWRzTWRTZXR0aW5nLmdlbmVyYWxUcmFuc2ZvbWVyLnVuaXRcbiAgICB0aGVtZTogKHYpIC0+XG4gICAgICBiYXNlbmFtZSA9IHBhdGguYmFzZW5hbWUodilcbiAgICAgIHJldHVybiBpZiBiYXNlbmFtZSBpbiBbJ2RlZmF1bHQnLCAnZ2FpYSddIHRoZW4gXCJjc3MvdGhlbWVzLyN7YmFzZW5hbWV9LmNzc1wiIGVsc2UgbnVsbFxuICAgIHRlbXBsYXRlOiAodikgLT4gdlxuICAgIGZvb3RlcjogKHYpIC0+IHZcbiAgICBwcmVyZW5kZXI6IE1kc01kU2V0dGluZy5nZW5lcmFsVHJhbnNmb21lci5ib29sXG5cbiAgQGZpbmRUcmFuc2Zvcm1lcjogKHByb3ApID0+XG4gICAgZm9yIHRyYW5zZm9ybWVyUHJvcCwgdHJhbnNmb3JtZXIgb2YgTWRzTWRTZXR0aW5nLnRyYW5zZm9ybWVyc1xuICAgICAgcmV0dXJuIHRyYW5zZm9ybWVyIGlmIHByb3AgaXMgdHJhbnNmb3JtZXJQcm9wXG4gICAgbnVsbFxuXG4gIEBkdWNrVHlwZXM6XG4gICAgc2l6ZTogKHYpIC0+XG4gICAgICByZXQgPSB7fVxuICAgICAgY21kID0gXCIje3Z9XCIudG9Mb3dlckNhc2UoKVxuXG4gICAgICBpZiBjbWQuc3RhcnRzV2l0aCgnNDozJylcbiAgICAgICAgcmV0ID0geyB3aWR0aDogMTAyNCwgaGVpZ2h0OiA3NjggfVxuICAgICAgZWxzZSBpZiBjbWQuc3RhcnRzV2l0aCgnMTY6OScpXG4gICAgICAgIHJldCA9IHsgd2lkdGg6IDEzNjYsIGhlaWdodDogNzY4IH1cbiAgICAgIGVsc2UgaWYgY21kLnN0YXJ0c1dpdGgoJ2EwJylcbiAgICAgICAgcmV0ID0geyB3aWR0aDogJzExODltbScsIGhlaWdodDogJzg0MW1tJyB9XG4gICAgICBlbHNlIGlmIGNtZC5zdGFydHNXaXRoKCdhMScpXG4gICAgICAgIHJldCA9IHsgd2lkdGg6ICc4NDFtbScsIGhlaWdodDogJzU5NG1tJyB9XG4gICAgICBlbHNlIGlmIGNtZC5zdGFydHNXaXRoKCdhMicpXG4gICAgICAgIHJldCA9IHsgd2lkdGg6ICc1OTRtbScsIGhlaWdodDogJzQyMG1tJyB9XG4gICAgICBlbHNlIGlmIGNtZC5zdGFydHNXaXRoKCdhMycpXG4gICAgICAgIHJldCA9IHsgd2lkdGg6ICc0MjBtbScsIGhlaWdodDogJzI5N21tJyB9XG4gICAgICBlbHNlIGlmIGNtZC5zdGFydHNXaXRoKCdhNCcpXG4gICAgICAgIHJldCA9IHsgd2lkdGg6ICcyOTdtbScsIGhlaWdodDogJzIxMG1tJyB9XG4gICAgICBlbHNlIGlmIGNtZC5zdGFydHNXaXRoKCdhNScpXG4gICAgICAgIHJldCA9IHsgd2lkdGg6ICcyMTBtbScsIGhlaWdodDogJzE0OG1tJyB9XG4gICAgICBlbHNlIGlmIGNtZC5zdGFydHNXaXRoKCdhNicpXG4gICAgICAgIHJldCA9IHsgd2lkdGg6ICcxNDhtbScsIGhlaWdodDogJzEwNW1tJyB9XG4gICAgICBlbHNlIGlmIGNtZC5zdGFydHNXaXRoKCdhNycpXG4gICAgICAgIHJldCA9IHsgd2lkdGg6ICcxMDVtbScsIGhlaWdodDogJzc0bW0nIH1cbiAgICAgIGVsc2UgaWYgY21kLnN0YXJ0c1dpdGgoJ2E4JylcbiAgICAgICAgcmV0ID0geyB3aWR0aDogJzc0bW0nLCBoZWlnaHQ6ICc1Mm1tJyB9XG4gICAgICBlbHNlIGlmIGNtZC5zdGFydHNXaXRoKCdiMCcpXG4gICAgICAgIHJldCA9IHsgd2lkdGg6ICcxNDU2bW0nLCBoZWlnaHQ6ICcxMDMwbW0nIH1cbiAgICAgIGVsc2UgaWYgY21kLnN0YXJ0c1dpdGgoJ2IxJylcbiAgICAgICAgcmV0ID0geyB3aWR0aDogJzEwMzBtbScsIGhlaWdodDogJzcyOG1tJyB9XG4gICAgICBlbHNlIGlmIGNtZC5zdGFydHNXaXRoKCdiMicpXG4gICAgICAgIHJldCA9IHsgd2lkdGg6ICc3MjhtbScsIGhlaWdodDogJzUxNW1tJyB9XG4gICAgICBlbHNlIGlmIGNtZC5zdGFydHNXaXRoKCdiMycpXG4gICAgICAgIHJldCA9IHsgd2lkdGg6ICc1MTVtbScsIGhlaWdodDogJzM2NG1tJyB9XG4gICAgICBlbHNlIGlmIGNtZC5zdGFydHNXaXRoKCdiNCcpXG4gICAgICAgIHJldCA9IHsgd2lkdGg6ICczNjRtbScsIGhlaWdodDogJzI1N21tJyB9XG4gICAgICBlbHNlIGlmIGNtZC5zdGFydHNXaXRoKCdiNScpXG4gICAgICAgIHJldCA9IHsgd2lkdGg6ICcyNTdtbScsIGhlaWdodDogJzE4Mm1tJyB9XG4gICAgICBlbHNlIGlmIGNtZC5zdGFydHNXaXRoKCdiNicpXG4gICAgICAgIHJldCA9IHsgd2lkdGg6ICcxODJtbScsIGhlaWdodDogJzEyOG1tJyB9XG4gICAgICBlbHNlIGlmIGNtZC5zdGFydHNXaXRoKCdiNycpXG4gICAgICAgIHJldCA9IHsgd2lkdGg6ICcxMjhtbScsIGhlaWdodDogJzkxbW0nIH1cbiAgICAgIGVsc2UgaWYgY21kLnN0YXJ0c1dpdGgoJ2I4JylcbiAgICAgICAgcmV0ID0geyB3aWR0aDogJzkxbW0nLCBoZWlnaHQ6ICc2NG1tJyB9XG5cbiAgICAgIGlmIE9iamVjdC5rZXlzKHJldCkubGVuZ3RoID4gMCAmJiBjbWQuZW5kc1dpdGgoJy1wb3J0cmFpdCcpXG4gICAgICAgIHRtcCA9IHJldC53aWR0aFxuICAgICAgICByZXQud2lkdGggPSByZXQuaGVpZ2h0XG4gICAgICAgIHJldC5oZWlnaHQgPSB0bXBcblxuICAgICAgcmV0XG5cbiAgQGZpbmREdWNrVHlwZXM6IChwcm9wKSA9PlxuICAgIGZvciBkdWNrVHlwZVByb3AsIGNvbnZlcnRGdW5jIG9mIE1kc01kU2V0dGluZy5kdWNrVHlwZXNcbiAgICAgIHJldHVybiBjb252ZXJ0RnVuYyBpZiBwcm9wIGlzIGR1Y2tUeXBlUHJvcFxuICAgIG51bGxcblxuICAjIOacieWKueODl+ODreODkeODhuOCo1xuICBAdmFsaWRQcm9wczpcbiAgICBnbG9iYWw6IFsnd2lkdGgnLCAnaGVpZ2h0JywgJ3NpemUnLCAndGhlbWUnXVxuICAgIHBhZ2U6ICAgWydwYWdlX251bWJlcicsICd0ZW1wbGF0ZScsICdmb290ZXInLCAncHJlcmVuZGVyJ11cblxuICAjIHBhZ2XmjIflrprjgYzjgYLjgozjgbBwYWdl44Gu5pyJ5Yq544OX44Ot44OR44OG44Kj44KS5Y+C54Wn44GX44CBcHJvcOOBjOWtmOWcqOOBmeOCi+OBi+OBqeOBhuOBi+eiuuiqjVxuICAjIHBhZ2XjgYww5Lul5LiL44Gq44KJZ2xvYmFs44Gu5pyJ5Yq544OX44Ot44OR44OG44Kj44KS5Y+C54Wn44GX44CBcHJvcOOBjOWtmOWcqOOBmeOCi+OBi+OBqeOBhuOBi+eiuuiqjVxuICAjIOS4iuiomOOBq+OBiuOBhOOBpuOAgeWtmOWcqOOBmeOCjOOBsCB0cnVlICDlrZjlnKjjgZfjgarjgZHjgozjgbAgZmFsc2VcbiAgQGlzVmFsaWRQcm9wOiAocGFnZSwgcHJvcCkgPT5cbiAgICB0YXJnZXQgPSBpZiBwYWdlID4gMCB0aGVuICdwYWdlJyBlbHNlICdnbG9iYWwnXG4gICAgcHJvcCBpbiBNZHNNZFNldHRpbmcudmFsaWRQcm9wc1t0YXJnZXRdXG5cbiAgY29uc3RydWN0b3I6ICgpIC0+XG4gICAgQF9zZXR0aW5ncyA9IFtdXG5cbiAgIyDmnInlirnjg5fjg63jg5Hjg4bjgqPjgafjgarjgZHjgozjgbAgcmV0dXJuIGZhbHNlXG4gICNcbiAgc2V0OiAoZnJvbVBhZ2UsIHByb3AsIHZhbHVlLCBub0ZvbGxvd2luZyA9IGZhbHNlKSA9PlxuICAgIHJldHVybiBmYWxzZSB1bmxlc3MgTWRzTWRTZXR0aW5nLmlzVmFsaWRQcm9wKGZyb21QYWdlLCBwcm9wKVxuXG4gICAgaWYgZHVja1R5cGUgPSBNZHNNZFNldHRpbmcuZmluZER1Y2tUeXBlcyhwcm9wKVxuICAgICAgdGFyZ2V0ID0gZHVja1R5cGUodmFsdWUpXG4gICAgZWxzZVxuICAgICAgdGFyZ2V0ID0ge31cbiAgICAgIHRhcmdldFtwcm9wXSA9IHZhbHVlXG5cbiAgICBmb3IgdGFyZ2V0UHJvcCwgdGFyZ2V0VmFsdWUgb2YgdGFyZ2V0XG4gICAgICBpZiB0cmFuc2Zvcm1lciA9IE1kc01kU2V0dGluZy5maW5kVHJhbnNmb3JtZXIodGFyZ2V0UHJvcClcbiAgICAgICAgdHJhbnNmb3JtZWRWYWx1ZSA9IHRyYW5zZm9ybWVyKHRhcmdldFZhbHVlKVxuXG4gICAgICAgIGlmIChpZHggPSBAX2ZpbmRTZXR0aW5nSWR4IGZyb21QYWdlLCB0YXJnZXRQcm9wLCAhIW5vRm9sbG93aW5nKT9cbiAgICAgICAgICBAX3NldHRpbmdzW2lkeF0udmFsdWUgPSB0cmFuc2Zvcm1lZFZhbHVlXG4gICAgICAgIGVsc2VcbiAgICAgICAgICBAX3NldHRpbmdzLnB1c2hcbiAgICAgICAgICAgIHBhZ2U6ICAgICAgICBmcm9tUGFnZVxuICAgICAgICAgICAgcHJvcGVydHk6ICAgIHRhcmdldFByb3BcbiAgICAgICAgICAgIHZhbHVlOiAgICAgICB0cmFuc2Zvcm1lZFZhbHVlXG4gICAgICAgICAgICBub0ZvbGxvd2luZzogISFub0ZvbGxvd2luZ1xuXG4gIHNldEdsb2JhbDogKHByb3AsIHZhbHVlKSA9PiBAc2V0IDAsIHByb3AsIHZhbHVlXG5cbiAgZ2V0OiAocGFnZSwgcHJvcCwgd2l0aEdsb2JhbCA9IHRydWUpID0+IEBnZXRBdChwYWdlLCB3aXRoR2xvYmFsKVtwcm9wXVxuICBnZXRHbG9iYWw6IChwcm9wKSA9PiBAZ2V0QXRHbG9iYWwoKVtwcm9wXVxuXG4gIGdldEF0OiAocGFnZSwgd2l0aEdsb2JhbCA9IHRydWUpID0+XG4gICAgcHJvcHMgPSAob2JqIGZvciBvYmogaW4gQF9zZXR0aW5ncyB3aGVuIG9iai5wYWdlIDw9IHBhZ2UgJiYgKHdpdGhHbG9iYWwgfHwgb2JqLnBhZ2UgPiAwKSlcbiAgICBwcm9wcy5zb3J0IChhLCBiKSAtPiBhLnBhZ2UgLSBiLnBhZ2VcblxuICAgIHJldCA9IHt9XG4gICAgbm9Gb2xsb3dzID0gW11cblxuICAgIGZvciBvYmogaW4gcHJvcHNcbiAgICAgIGlmIG9iai5ub0ZvbGxvd2luZ1xuICAgICAgICBub0ZvbGxvd3Nbb2JqLnBhZ2VdID0ge30gdW5sZXNzIG5vRm9sbG93c1tvYmoucGFnZV1cbiAgICAgICAgbm9Gb2xsb3dzW29iai5wYWdlXVtvYmoucHJvcGVydHldID0gb2JqLnZhbHVlXG4gICAgICBlbHNlXG4gICAgICAgIHJldFtvYmoucHJvcGVydHldID0gb2JqLnZhbHVlXG5cbiAgICBleHRlbmQgcmV0LCBub0ZvbGxvd3NbcGFnZV0gfHwge31cblxuICBnZXRBdEdsb2JhbDogPT4gQGdldEF0IDBcblxuICBfZmluZFNldHRpbmdJZHg6IChwYWdlLCBwcm9wLCBub0ZvbGxvd2luZykgPT5cbiAgICBmb3Igb3B0cywgaWR4IGluIEBfc2V0dGluZ3NcbiAgICAgIHJldHVybiBpZHggaWYgb3B0cy5wYWdlID09IHBhZ2UgJiYgb3B0cy5wcm9wZXJ0eSA9PSBwcm9wICYmIG9wdHMubm9Gb2xsb3dpbmcgPT0gbm9Gb2xsb3dpbmdcbiAgICBudWxsXG4iXX0=
