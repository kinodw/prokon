var MdsRenderer, ipc,
  bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  slice = [].slice;

ipc = require('electron').ipcRenderer;

module.exports = MdsRenderer = (function() {
  MdsRenderer.prototype.id = null;

  MdsRenderer.prototype._accepted = false;

  MdsRenderer.prototype.events = {};

  function MdsRenderer() {
    this._call_event = bind(this._call_event, this);
    this.recievedEvent = bind(this.recievedEvent, this);
    this.send = bind(this.send, this);
    this.sendToAllWithMe = bind(this.sendToAllWithMe, this);
    this.sendToAll = bind(this.sendToAll, this);
    this.sendToMain = bind(this.sendToMain, this);
    this.on = bind(this.on, this);
    this.isAccepted = bind(this.isAccepted, this);
    this.requestAccept = bind(this.requestAccept, this);
    this.id = parseInt(window.location.hash.replace(/^#/, ''));
    ipc.on('MdsManagerRendererAccepted', (function(_this) {
      return function(e, _accepted) {
        _this._accepted = _accepted;
      };
    })(this));
    ipc.on('MdsManagerSendEvent', this.recievedEvent);
  }

  MdsRenderer.prototype.requestAccept = function() {
    return ipc.send('MdsRendererRequestAccept', this.id);
  };

  MdsRenderer.prototype.isAccepted = function() {
    return !!this._accepted;
  };

  MdsRenderer.prototype.on = function(evt, func) {
    if (this.events[evt] == null) {
      this.events[evt] = [];
    }
    this.events[evt].push(func);
    return this;
  };

  MdsRenderer.prototype.sendToMain = function() {
    var args, evt;
    evt = arguments[0], args = 2 <= arguments.length ? slice.call(arguments, 1) : [];
    return this.send.apply(this, [evt, null].concat(slice.call(args)));
  };

  MdsRenderer.prototype.sendToAll = function() {
    var args, evt;
    evt = arguments[0], args = 2 <= arguments.length ? slice.call(arguments, 1) : [];
    return this.send.apply(this, [evt, '*'].concat(slice.call(args)));
  };

  MdsRenderer.prototype.sendToAllWithMe = function() {
    var args, evt;
    evt = arguments[0], args = 2 <= arguments.length ? slice.call(arguments, 1) : [];
    return this.send.apply(this, [evt, '**'].concat(slice.call(args)));
  };

  MdsRenderer.prototype.send = function() {
    var args, evt, ids;
    evt = arguments[0], ids = arguments[1], args = 3 <= arguments.length ? slice.call(arguments, 2) : [];
    if (ids == null) {
      ids = null;
    }
    return ipc.send('MdsRendererSendEvent', evt, {
      from: this.id,
      to: ids
    }, args);
  };

  MdsRenderer.prototype.recievedEvent = function(e, evt, target, args) {
    return this._call_event.apply(this, [evt].concat(slice.call(args)));
  };

  MdsRenderer.prototype._call_event = function() {
    var args, evt, func, funcs, i, len;
    evt = arguments[0], args = 2 <= arguments.length ? slice.call(arguments, 1) : [];
    funcs = this.events[evt];
    if (funcs == null) {
      return false;
    }
    for (i = 0, len = funcs.length; i < len; i++) {
      func = funcs[i];
      func.apply(this, args);
    }
    return true;
  };

  return MdsRenderer;

})();

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xhc3Nlcy9tZHNfcmVuZGVyZXIuanMiLCJzb3VyY2VzIjpbImNsYXNzZXMvbWRzX3JlbmRlcmVyLmNvZmZlZSJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxJQUFBLGdCQUFBO0VBQUE7OztBQUFBLEdBQUEsR0FBTSxPQUFBLENBQVEsVUFBUixDQUFtQixDQUFDOztBQUUxQixNQUFNLENBQUMsT0FBUCxHQUF1Qjt3QkFDckIsRUFBQSxHQUFJOzt3QkFDSixTQUFBLEdBQVc7O3dCQUdYLE1BQUEsR0FBUTs7RUFFSyxxQkFBQTs7Ozs7Ozs7OztJQUNYLElBQUMsQ0FBQSxFQUFELEdBQU0sUUFBQSxDQUFTLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLE9BQXJCLENBQTZCLElBQTdCLEVBQW1DLEVBQW5DLENBQVQ7SUFFTixHQUFHLENBQUMsRUFBSixDQUFPLDRCQUFQLEVBQXFDLENBQUEsU0FBQSxLQUFBO2FBQUEsU0FBQyxDQUFELEVBQUksU0FBSjtRQUFJLEtBQUMsQ0FBQSxZQUFEO01BQUo7SUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBQXJDO0lBQ0EsR0FBRyxDQUFDLEVBQUosQ0FBTyxxQkFBUCxFQUE4QixJQUFDLENBQUEsYUFBL0I7RUFKVzs7d0JBTWIsYUFBQSxHQUFlLFNBQUE7V0FDYixHQUFHLENBQUMsSUFBSixDQUFTLDBCQUFULEVBQXFDLElBQUMsQ0FBQSxFQUF0QztFQURhOzt3QkFHZixVQUFBLEdBQVksU0FBQTtXQUFHLENBQUMsQ0FBQyxJQUFDLENBQUE7RUFBTjs7d0JBRVosRUFBQSxHQUFJLFNBQUMsR0FBRCxFQUFNLElBQU47SUFDRixJQUF5Qix3QkFBekI7TUFBQSxJQUFDLENBQUEsTUFBTyxDQUFBLEdBQUEsQ0FBUixHQUFlLEdBQWY7O0lBQ0EsSUFBQyxDQUFBLE1BQU8sQ0FBQSxHQUFBLENBQUksQ0FBQyxJQUFiLENBQWtCLElBQWxCO0FBQ0EsV0FBTztFQUhMOzt3QkFLSixVQUFBLEdBQWtCLFNBQUE7QUFBa0IsUUFBQTtJQUFqQixvQkFBSztXQUFZLElBQUMsQ0FBQSxJQUFELGFBQU0sQ0FBQSxHQUFBLEVBQUssSUFBTSxTQUFBLFdBQUEsSUFBQSxDQUFBLENBQWpCO0VBQWxCOzt3QkFDbEIsU0FBQSxHQUFrQixTQUFBO0FBQWtCLFFBQUE7SUFBakIsb0JBQUs7V0FBWSxJQUFDLENBQUEsSUFBRCxhQUFNLENBQUEsR0FBQSxFQUFLLEdBQU0sU0FBQSxXQUFBLElBQUEsQ0FBQSxDQUFqQjtFQUFsQjs7d0JBQ2xCLGVBQUEsR0FBa0IsU0FBQTtBQUFrQixRQUFBO0lBQWpCLG9CQUFLO1dBQVksSUFBQyxDQUFBLElBQUQsYUFBTSxDQUFBLEdBQUEsRUFBSyxJQUFNLFNBQUEsV0FBQSxJQUFBLENBQUEsQ0FBakI7RUFBbEI7O3dCQUNsQixJQUFBLEdBQU0sU0FBQTtBQUNKLFFBQUE7SUFESyxvQkFBSyxvQkFBWTs7TUFBWixNQUFNOztXQUNoQixHQUFHLENBQUMsSUFBSixDQUFTLHNCQUFULEVBQWlDLEdBQWpDLEVBQXNDO01BQUUsSUFBQSxFQUFNLElBQUMsQ0FBQSxFQUFUO01BQWEsRUFBQSxFQUFJLEdBQWpCO0tBQXRDLEVBQThELElBQTlEO0VBREk7O3dCQUdOLGFBQUEsR0FBZSxTQUFDLENBQUQsRUFBSSxHQUFKLEVBQVMsTUFBVCxFQUFpQixJQUFqQjtXQUNiLElBQUMsQ0FBQSxXQUFELGFBQWEsQ0FBQSxHQUFLLFNBQUEsV0FBQSxJQUFBLENBQUEsQ0FBbEI7RUFEYTs7d0JBR2YsV0FBQSxHQUFhLFNBQUE7QUFDWCxRQUFBO0lBRFksb0JBQUs7SUFDakIsS0FBQSxHQUFRLElBQUMsQ0FBQSxNQUFPLENBQUEsR0FBQTtJQUNoQixJQUFvQixhQUFwQjtBQUFBLGFBQU8sTUFBUDs7QUFFQSxTQUFBLHVDQUFBOztNQUFBLElBQUksQ0FBQyxLQUFMLENBQVcsSUFBWCxFQUFjLElBQWQ7QUFBQTtBQUNBLFdBQU87RUFMSSIsInNvdXJjZXNDb250ZW50IjpbImlwYyA9IHJlcXVpcmUoJ2VsZWN0cm9uJykuaXBjUmVuZGVyZXJcblxubW9kdWxlLmV4cG9ydHMgPSBjbGFzcyBNZHNSZW5kZXJlclxuICBpZDogbnVsbFxuICBfYWNjZXB0ZWQ6IGZhbHNlXG5cbiMgZXZlbnQgaXMgcHVzaGVkIHRvIHRoaXMgbGlzdFxuICBldmVudHM6IHt9XG5cbiAgY29uc3RydWN0b3I6IC0+XG4gICAgQGlkID0gcGFyc2VJbnQgd2luZG93LmxvY2F0aW9uLmhhc2gucmVwbGFjZSgvXiMvLCAnJylcblxuICAgIGlwYy5vbiAnTWRzTWFuYWdlclJlbmRlcmVyQWNjZXB0ZWQnLCAoZSwgQF9hY2NlcHRlZCkgPT5cbiAgICBpcGMub24gJ01kc01hbmFnZXJTZW5kRXZlbnQnLCBAcmVjaWV2ZWRFdmVudFxuXG4gIHJlcXVlc3RBY2NlcHQ6ID0+XG4gICAgaXBjLnNlbmQgJ01kc1JlbmRlcmVyUmVxdWVzdEFjY2VwdCcsIEBpZFxuXG4gIGlzQWNjZXB0ZWQ6ID0+ICEhQF9hY2NlcHRlZFxuXG4gIG9uOiAoZXZ0LCBmdW5jKSA9PlxuICAgIEBldmVudHNbZXZ0XSA9IFtdIHVubGVzcyBAZXZlbnRzW2V2dF0/XG4gICAgQGV2ZW50c1tldnRdLnB1c2ggZnVuY1xuICAgIHJldHVybiBAXG5cbiAgc2VuZFRvTWFpbjogICAgICAgKGV2dCwgYXJncy4uLikgPT4gQHNlbmQgZXZ0LCBudWxsLCBhcmdzLi4uXG4gIHNlbmRUb0FsbDogICAgICAgIChldnQsIGFyZ3MuLi4pID0+IEBzZW5kIGV2dCwgJyonLCAgYXJncy4uLlxuICBzZW5kVG9BbGxXaXRoTWU6ICAoZXZ0LCBhcmdzLi4uKSA9PiBAc2VuZCBldnQsICcqKicsIGFyZ3MuLi5cbiAgc2VuZDogKGV2dCwgaWRzID0gbnVsbCwgYXJncy4uLikgPT5cbiAgICBpcGMuc2VuZCAnTWRzUmVuZGVyZXJTZW5kRXZlbnQnLCBldnQsIHsgZnJvbTogQGlkLCB0bzogaWRzIH0sIGFyZ3NcblxuICByZWNpZXZlZEV2ZW50OiAoZSwgZXZ0LCB0YXJnZXQsIGFyZ3MpID0+XG4gICAgQF9jYWxsX2V2ZW50IGV2dCwgYXJncy4uLlxuXG4gIF9jYWxsX2V2ZW50OiAoZXZ0LCBhcmdzLi4uKSA9PlxuICAgIGZ1bmNzID0gQGV2ZW50c1tldnRdXG4gICAgcmV0dXJuIGZhbHNlIHVubGVzcyBmdW5jcz9cblxuICAgIGZ1bmMuYXBwbHkoQCwgYXJncykgZm9yIGZ1bmMgaW4gZnVuY3NcbiAgICByZXR1cm4gdHJ1ZVxuIl19
