var MdsManager, ipc, type_is,
  bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  slice = [].slice;

type_is = function(type, obj) {
  return (obj != null) && type === Object.prototype.toString.call(obj).slice(8, -1);
};

ipc = require('electron').ipcMain;

MdsManager = (function() {
  MdsManager.prototype.WINDOW_PENDING = 1;

  MdsManager.prototype.WINDOW_ACCEPTED = 2;

  MdsManager.prototype.windows = new Map;

  MdsManager.prototype.window_states = new Map;

  function MdsManager() {
    this.onRecievedEvent = bind(this.onRecievedEvent, this);
    this.onRequestedAccept = bind(this.onRequestedAccept, this);
    this.removeWindow = bind(this.removeWindow, this);
    this.addWindow = bind(this.addWindow, this);
    ipc.on('MdsRendererRequestAccept', this.onRequestedAccept);
    ipc.on('MdsRendererSendEvent', this.onRecievedEvent);
  }

  MdsManager.prototype.addWindow = function(id, obj) {
    this.window_states.set(id, this.WINDOW_PENDING);
    return this.windows.set(id, obj);
  };

  MdsManager.prototype.removeWindow = function(id) {
    this.window_states["delete"](id);
    return this.windows["delete"](id);
  };

  MdsManager.prototype.onRequestedAccept = function(e, id) {
    var is_accepted;
    is_accepted = this.window_states.get(id) === this.WINDOW_PENDING;
    if (is_accepted) {
      this.window_states.set(id, this.WINDOW_ACCEPTED);
    }
    return e.sender.send('MdsManagerRendererAccepted', is_accepted);
  };

  MdsManager.prototype.onRecievedEvent = function(e, evt, target, args) {
    var i, j, len, len1, ref, ref1, ref2, send_target, t, tos, w, wid;
    if (this.window_states.get(target != null ? target.from : void 0) === this.WINDOW_ACCEPTED) {
      send_target = [];
      if (target.to === '*' || target.to === '**') {
        this.window_states.forEach((function(_this) {
          return function(state, id) {
            if (target.to === '*' && id === target.from) {
              return;
            }
            if (state === _this.WINDOW_ACCEPTED) {
              return send_target.push(id);
            }
          };
        })(this));
      } else if (target.to != null) {
        tos = type_is("Number", target.to) ? [target.to] : target.to;
        for (i = 0, len = tos.length; i < len; i++) {
          t = tos[i];
          if (this.window_states.get(t) === this.WINDOW_ACCEPTED) {
            send_target.push(t);
          }
        }
      } else {
        (ref = this.windows.get(target.from)).trigger.apply(ref, [evt].concat(slice.call(args)));
      }
      for (j = 0, len1 = send_target.length; j < len1; j++) {
        wid = send_target[j];
        w = (ref1 = this.windows.get(wid)) != null ? (ref2 = ref1.browserWindow) != null ? ref2.webContents : void 0 : void 0;
        w.send('MdsManagerSendEvent', evt, {
          from: target.from,
          to: send_target
        }, args);
      }
    }
    return e.sender.send('MdsRendererEventSent', evt);
  };

  return MdsManager;

})();

module.exports = new MdsManager;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xhc3Nlcy9tZHNfbWFuYWdlci5qcyIsInNvdXJjZXMiOlsiY2xhc3Nlcy9tZHNfbWFuYWdlci5jb2ZmZWUiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsSUFBQSx3QkFBQTtFQUFBOzs7QUFBQSxPQUFBLEdBQVUsU0FBQyxJQUFELEVBQU8sR0FBUDtTQUFlLGFBQUEsSUFBUyxJQUFBLEtBQVEsTUFBTSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsSUFBMUIsQ0FBK0IsR0FBL0IsQ0FBbUMsQ0FBQyxLQUFwQyxDQUEwQyxDQUExQyxFQUE2QyxDQUFDLENBQTlDO0FBQWhDOztBQUVWLEdBQUEsR0FBTSxPQUFBLENBQVEsVUFBUixDQUFtQixDQUFDOztBQUVwQjt1QkFDSixjQUFBLEdBQWdCOzt1QkFDaEIsZUFBQSxHQUFpQjs7dUJBRWpCLE9BQUEsR0FBUyxJQUFJOzt1QkFDYixhQUFBLEdBQWUsSUFBSTs7RUFFTixvQkFBQTs7Ozs7SUFDWCxHQUFHLENBQUMsRUFBSixDQUFPLDBCQUFQLEVBQW1DLElBQUMsQ0FBQSxpQkFBcEM7SUFDQSxHQUFHLENBQUMsRUFBSixDQUFPLHNCQUFQLEVBQStCLElBQUMsQ0FBQSxlQUFoQztFQUZXOzt1QkFJYixTQUFBLEdBQVcsU0FBQyxFQUFELEVBQUssR0FBTDtJQUNULElBQUMsQ0FBQSxhQUFhLENBQUMsR0FBZixDQUFtQixFQUFuQixFQUF1QixJQUFDLENBQUEsY0FBeEI7V0FDQSxJQUFDLENBQUEsT0FBTyxDQUFDLEdBQVQsQ0FBYSxFQUFiLEVBQWlCLEdBQWpCO0VBRlM7O3VCQUlYLFlBQUEsR0FBYyxTQUFDLEVBQUQ7SUFDWixJQUFDLENBQUEsYUFBYSxFQUFDLE1BQUQsRUFBZCxDQUFzQixFQUF0QjtXQUNBLElBQUMsQ0FBQSxPQUFPLEVBQUMsTUFBRCxFQUFSLENBQWdCLEVBQWhCO0VBRlk7O3VCQUlkLGlCQUFBLEdBQW1CLFNBQUMsQ0FBRCxFQUFJLEVBQUo7QUFDakIsUUFBQTtJQUFBLFdBQUEsR0FBYyxJQUFDLENBQUEsYUFBYSxDQUFDLEdBQWYsQ0FBbUIsRUFBbkIsQ0FBQSxLQUEwQixJQUFDLENBQUE7SUFDekMsSUFBMkMsV0FBM0M7TUFBQSxJQUFDLENBQUEsYUFBYSxDQUFDLEdBQWYsQ0FBbUIsRUFBbkIsRUFBdUIsSUFBQyxDQUFBLGVBQXhCLEVBQUE7O1dBRUEsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFULENBQWMsNEJBQWQsRUFBNEMsV0FBNUM7RUFKaUI7O3VCQU1uQixlQUFBLEdBQWlCLFNBQUMsQ0FBRCxFQUFJLEdBQUosRUFBUyxNQUFULEVBQWlCLElBQWpCO0FBQ2YsUUFBQTtJQUFBLElBQUcsSUFBQyxDQUFBLGFBQWEsQ0FBQyxHQUFmLGtCQUFtQixNQUFNLENBQUUsYUFBM0IsQ0FBQSxLQUFvQyxJQUFDLENBQUEsZUFBeEM7TUFDRSxXQUFBLEdBQWM7TUFFZCxJQUFHLE1BQU0sQ0FBQyxFQUFQLEtBQWEsR0FBYixJQUFvQixNQUFNLENBQUMsRUFBUCxLQUFhLElBQXBDO1FBQ0UsSUFBQyxDQUFBLGFBQWEsQ0FBQyxPQUFmLENBQXVCLENBQUEsU0FBQSxLQUFBO2lCQUFBLFNBQUMsS0FBRCxFQUFRLEVBQVI7WUFDckIsSUFBVSxNQUFNLENBQUMsRUFBUCxLQUFhLEdBQWIsSUFBcUIsRUFBQSxLQUFNLE1BQU0sQ0FBQyxJQUE1QztBQUFBLHFCQUFBOztZQUNBLElBQXdCLEtBQUEsS0FBUyxLQUFDLENBQUEsZUFBbEM7cUJBQUEsV0FBVyxDQUFDLElBQVosQ0FBaUIsRUFBakIsRUFBQTs7VUFGcUI7UUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBQXZCLEVBREY7T0FBQSxNQUtLLElBQUcsaUJBQUg7UUFDSCxHQUFBLEdBQVMsT0FBQSxDQUFRLFFBQVIsRUFBa0IsTUFBTSxDQUFDLEVBQXpCLENBQUgsR0FBcUMsQ0FBQyxNQUFNLENBQUMsRUFBUixDQUFyQyxHQUFzRCxNQUFNLENBQUM7QUFDbkUsYUFBQSxxQ0FBQTs7VUFDRSxJQUFzQixJQUFDLENBQUEsYUFBYSxDQUFDLEdBQWYsQ0FBbUIsQ0FBbkIsQ0FBQSxLQUF5QixJQUFDLENBQUEsZUFBaEQ7WUFBQSxXQUFXLENBQUMsSUFBWixDQUFpQixDQUFqQixFQUFBOztBQURGLFNBRkc7T0FBQSxNQUFBO1FBTUgsT0FBQSxJQUFDLENBQUEsT0FBTyxDQUFDLEdBQVQsQ0FBYSxNQUFNLENBQUMsSUFBcEIsQ0FBQSxDQUF5QixDQUFDLE9BQTFCLFlBQWtDLENBQUEsR0FBSyxTQUFBLFdBQUEsSUFBQSxDQUFBLENBQXZDLEVBTkc7O0FBUUwsV0FBQSwrQ0FBQTs7UUFDRSxDQUFBLHNGQUFvQyxDQUFFO1FBQ3RDLENBQUMsQ0FBQyxJQUFGLENBQU8scUJBQVAsRUFBOEIsR0FBOUIsRUFBbUM7VUFBRSxJQUFBLEVBQU0sTUFBTSxDQUFDLElBQWY7VUFBcUIsRUFBQSxFQUFJLFdBQXpCO1NBQW5DLEVBQTJFLElBQTNFO0FBRkYsT0FoQkY7O1dBb0JBLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBVCxDQUFjLHNCQUFkLEVBQXNDLEdBQXRDO0VBckJlOzs7Ozs7QUF1Qm5CLE1BQU0sQ0FBQyxPQUFQLEdBQWlCLElBQUkiLCJzb3VyY2VzQ29udGVudCI6WyJ0eXBlX2lzID0gKHR5cGUsIG9iaikgLT4gb2JqPyBhbmQgdHlwZSA9PSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwob2JqKS5zbGljZSg4LCAtMSlcblxuaXBjID0gcmVxdWlyZSgnZWxlY3Ryb24nKS5pcGNNYWluO1xuXG5jbGFzcyBNZHNNYW5hZ2VyXG4gIFdJTkRPV19QRU5ESU5HOiAxXG4gIFdJTkRPV19BQ0NFUFRFRDogMlxuXG4gIHdpbmRvd3M6IG5ldyBNYXBcbiAgd2luZG93X3N0YXRlczogbmV3IE1hcFxuXG4gIGNvbnN0cnVjdG9yOiAtPlxuICAgIGlwYy5vbiAnTWRzUmVuZGVyZXJSZXF1ZXN0QWNjZXB0JywgQG9uUmVxdWVzdGVkQWNjZXB0XG4gICAgaXBjLm9uICdNZHNSZW5kZXJlclNlbmRFdmVudCcsIEBvblJlY2lldmVkRXZlbnRcblxuICBhZGRXaW5kb3c6IChpZCwgb2JqKSA9PlxuICAgIEB3aW5kb3dfc3RhdGVzLnNldCBpZCwgQFdJTkRPV19QRU5ESU5HXG4gICAgQHdpbmRvd3Muc2V0IGlkLCBvYmpcblxuICByZW1vdmVXaW5kb3c6IChpZCkgPT5cbiAgICBAd2luZG93X3N0YXRlcy5kZWxldGUgaWRcbiAgICBAd2luZG93cy5kZWxldGUgaWRcblxuICBvblJlcXVlc3RlZEFjY2VwdDogKGUsIGlkKSA9PlxuICAgIGlzX2FjY2VwdGVkID0gQHdpbmRvd19zdGF0ZXMuZ2V0KGlkKSA9PSBAV0lORE9XX1BFTkRJTkdcbiAgICBAd2luZG93X3N0YXRlcy5zZXQgaWQsIEBXSU5ET1dfQUNDRVBURUQgaWYgaXNfYWNjZXB0ZWRcblxuICAgIGUuc2VuZGVyLnNlbmQgJ01kc01hbmFnZXJSZW5kZXJlckFjY2VwdGVkJywgaXNfYWNjZXB0ZWRcblxuICBvblJlY2lldmVkRXZlbnQ6IChlLCBldnQsIHRhcmdldCwgYXJncykgPT5cbiAgICBpZiBAd2luZG93X3N0YXRlcy5nZXQodGFyZ2V0Py5mcm9tKSA9PSBAV0lORE9XX0FDQ0VQVEVEXG4gICAgICBzZW5kX3RhcmdldCA9IFtdXG5cbiAgICAgIGlmIHRhcmdldC50byA9PSAnKicgb3IgdGFyZ2V0LnRvID09ICcqKidcbiAgICAgICAgQHdpbmRvd19zdGF0ZXMuZm9yRWFjaCAoc3RhdGUsIGlkKSA9PlxuICAgICAgICAgIHJldHVybiBpZiB0YXJnZXQudG8gPT0gJyonIGFuZCBpZCA9PSB0YXJnZXQuZnJvbVxuICAgICAgICAgIHNlbmRfdGFyZ2V0LnB1c2goaWQpIGlmIHN0YXRlID09IEBXSU5ET1dfQUNDRVBURURcblxuICAgICAgZWxzZSBpZiB0YXJnZXQudG8/XG4gICAgICAgIHRvcyA9IGlmIHR5cGVfaXMoXCJOdW1iZXJcIiwgdGFyZ2V0LnRvKSB0aGVuIFt0YXJnZXQudG9dIGVsc2UgdGFyZ2V0LnRvXG4gICAgICAgIGZvciB0IGluIHRvc1xuICAgICAgICAgIHNlbmRfdGFyZ2V0LnB1c2ggdCBpZiBAd2luZG93X3N0YXRlcy5nZXQodCkgPT0gQFdJTkRPV19BQ0NFUFRFRFxuXG4gICAgICBlbHNlXG4gICAgICAgIEB3aW5kb3dzLmdldCh0YXJnZXQuZnJvbSkudHJpZ2dlciBldnQsIGFyZ3MuLi5cblxuICAgICAgZm9yIHdpZCBpbiBzZW5kX3RhcmdldFxuICAgICAgICB3ID0gQHdpbmRvd3MuZ2V0KHdpZCk/LmJyb3dzZXJXaW5kb3c/LndlYkNvbnRlbnRzXG4gICAgICAgIHcuc2VuZCAnTWRzTWFuYWdlclNlbmRFdmVudCcsIGV2dCwgeyBmcm9tOiB0YXJnZXQuZnJvbSwgdG86IHNlbmRfdGFyZ2V0IH0sIGFyZ3NcblxuICAgIGUuc2VuZGVyLnNlbmQgJ01kc1JlbmRlcmVyRXZlbnRTZW50JywgZXZ0XG5cbm1vZHVsZS5leHBvcnRzID0gbmV3IE1kc01hbmFnZXJcbiJdfQ==
