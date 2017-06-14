const electron = require('electron')
const {TweenMax, TweenLite, TimelineLite, TimelineMax} = require('gsap');
const EventEmitter = new require('events').EventEmitter;

var w = 0;
var h = 0;

module.exports = class Animator extends EventEmitter{
  constructor(option){
    super()
    option = option || {
      parent: global,
      element: {}
    };
    this.parent = option.parent;
    this.state = 'init';
    this.element = option.element;
    this.animations = {};
    this.timeline = {};
  }

  initAnimation(){
    const self = this;
    w = electron.screen.getPrimaryDisplay().workAreaSize.width;
    h = electron.screen.getPrimaryDisplay().workAreaSize.height;
    this.animations = {
      /* 右へ外回り移動 */
      Right: (option) => {
        var tl = new TimelineLite();
        var animations = [TweenLite.to(self.element, option.duration, {
            x: w,
            y: 0,
            xPercent: -150,
            yPercent: 50,
            ease: Sine.easeInOut,
            onComplete: (() => {
              self.state = 'Down';
              if (option.onComplete) option.onComplete();
            }).bind(self)
          })];

        tl.add(animations);

        return tl;
      },

      Down: (option) => {
        var tl = new TimelineLite();

        var animations = [TweenLite.to(self.element, option.duration, {
            x: w,
            y: h,
            xPercent: -150,
            yPercent: -150,
            ease: Sine.easeInOut,
            onComplete: () => {
              self.state = 'Left';
              if(option.onComplete) option.onComplete();
            }
          })];

        tl.add(animations);

        return tl;
      },

      /* 左へ外回り移動 */
      Left: (option) => {
        var tl = new TimelineLite();

        var animations = [TweenLite.to(self.element, option.duration, {
            x: 0,
            y: h,
            xPercent: 50,
            yPercent: -150,
            ease: Sine.easeInOut,
            onComplete: () => {
              self.state = 'Up';
              if (option.onComplete) option.onComplete();
            }
          })];

        tl.add(animations);

        return tl;
      },

      /* 上へ外回り移動 */
      Up: (option) => {
        var tl = new TimelineLite();

        var animations = [TweenLite.to(self.element, option.duration, {
            x: 0,
            y: 0,
            xPercent: 50,
            yPercent: 50,
            ease: Sine.easeInOut,
            onComplete: () => {
              self.state = 'Done';
              if(option.onComplete) option.onComplete();
            }
          })];

        tl.add(animations);

        return tl;
      },

      fromTo: (start={x:0, y:0}, end={x:0, y:0}, duration=2) => TweenLite.fromTo(self.element, duration, {left: start.x, top: position.y}, {left: end.x, top: end.y}),
      rotate: (angle=0, duration=2) => TweenLite.to(self.element, duration, {rotation: angle,}),
      fadeIn: (duration=2 ,alpha=1.0) => TweenLite.to(self.element, duration, {alpha:alpha}),
      fadeOut:(duration=2) => TweenLite.to(self.element, duration, {alpha:alpha}),

      Around: (start={x: 0, y:0}, end={x:0, y:0}, swing=true, rotation=true) => {
        var tl = new TimelineLite({onComplete: onComplete, onUpdateParams: ["{self}"]});
        tl.add(TweenLite.fromTo(self.element, 2, {
          rotation: 0,
          xPercent: 0,
          yPercent: 0,
          x: start.x,
          y: start.y
        }, {
          rotation: rotation
            ? -235
            : 0,
          xPercent: 50,
          yPercent: 50,
          y: 0,
          onComplete: (() => {self.state = 'Right';}).bind(self)
        }));

        tl.add('Around');
        tl.add('Right');
        tl.add(this.animations['Right']({duration:  option.position ? 9 * ((w - option.position.x) / w) : 9, swing: option.swing_right, rotation: option.rotation}));
        tl.add('Down');
        tl.add(this.animations['Down']({duration: 8, swing: option.swing, rotation: option.rotation}));
        tl.add('Left');
        tl.add(this.animations['Left']({duration: 9, swing: option.swing, rotation: option.rotation}));
        tl.add('Up');
        tl.add(this.animations['Up']({duration: 8, swing: option.swing, rotation: option.otation}));
        tl.add(TweenLite.fromTo(self.element, 2, {rotation: 0, xPercent: 0, yPercent: 0, left: end.x, top: end.y}));
        tl.add('Done');

        return tl;
      },
      centering: () => {
        var tl = new TimelineLite();
        var animations = [TweenLite.to(self.element, 2, {
          rotation: 0,
          xPercent: 0,
          yPercent: 0,
          x: w/2 - 100,
          y: h/2 - 100
        }), TweenLite.to(self.element, 2, {
          scale: 3.0
        })];
        tl.add(animations);
        return tl;
      }
    };
  }

  setWindow(window){
    this.element = window;
    console.log("set window",window);
  }

  addAnimation(name, func){
    if(name){
      this.animations[name] = func;
      this.on(name, func)
    }
    else console.error("name is undefined");
  }

  pause(name){if(this.timeline[name]) this.timeline[name].pause()}
  resume(name){if(this.timeline[name]) this.timeline[name].resume()}
  start(name){if(this.timeline[name]) this.timeline[name].start()}
  pauseAll(){Object,keys(this.timeline).forEach(k => this.pause(k))}
  resumeAll(){Object,keys(this.timeline).forEach(k => this.resume(k))}
  startAll(){Object,keys(this.timeline).forEach(k => this.start(k))}

  addGoAround(option){
    option = option || {}
    this.timeline['around'] = this.goAround({
      el: this.element,
      rotation: option.rotation,
      position: option.position,
      onUpdate: (tl => {this.now = tl.totalTime();}).bind(this),
      onComplete: option.onComplete === undefined ? option.onComplete : ()=>{}
    });
  };

  goAround(option){
    var tl = new TimelineLite({onComplete: option.onComplete, onUpdate: option.onUpdate, onUpdateParams: ["{self}"]});

    if (option.position) {
      tl.add(TweenLite.fromTo(this.element, 2, {
        rotation: 0,
        xPercent: 0,
        yPercent: 0,
        x: option.position.x,
        y: option.position.y
      }, {
        rotation: option.rotation ? -235 : 0,
        xPercent: 50,
        yPercent: 50,
        y: 0,
        onComplete: () => {this.state = 'Right';}
      }));
    } else {
      tl.add(TweenLite.set(this.element, {rotation: option.rotation ? -235 : 0, xPercent: 50, yPercent: 50, onComplete: () => {this.state = 'Right';}}));
    }

    tl.add('Around');
    tl.add('Right');
    tl.add(this.animations['Right']({duration:  option.position ? 9 * ((w - option.position.x) / w) : 9, swing: option.swing, rotation: option.rotation}));
    tl.add('Down');
    tl.add(this.animations['Down']({duration: 8, swing: option.swing, rotation: option.rotation}));
    tl.add('Left');
    tl.add(this.animations['Left']({duration: 9, swing: option.swing, rotation: option.rotation}));
    tl.add('Up');
    tl.add(this.animations['Up']({duration: 8, swing: option.swing, rotation: option.otation}));
    tl.add('Done');

    return tl;
  };

  goAroundSmall(){
    var tl = new TimelineLite({
      onComplete: self => {self.restart();},
      onCompleteParams: ["{self}"],
      repeat: -1
    });
    tl.add('goAroundSmall');
    tl.add(TweenLite.to(this.element, 2, {
      x: w / 2,
      y: h / 2 + 200,
      rotation: 720,
      xPercent: "-50%",
      yPercent: "-50%"
    }));
    var tl_around = new TimelineMax({repeat: -1});
    tl_around.add(TweenMax.to(this.element, 2, {
      xPercent: "-=130",
      yoyo: true,
      repeat: 1,
      ease: Sine.easeOut
    }));
    tl_around.add(TweenMax.to(this.element, 2, {
      xPercent: "+=130",
      yoyo: true,
      repeat: 1,
      ease: Sine.easeOut
    }));
    tl.add([
      TweenMax.to(this.element, 8, {
        rotation: 1080,
        ease: Linear.easeNone,
        repeat: -1
      }),
      TweenMax.to(this.element, 4, {
        yPercent: "-=390",
        yoyo: true,
        repeat: -1,
        ease: Sine.easeInOut
      }),
      tl_around
    ]);
    return tl;
  };

  returnOuterAround(){
    var tl = new TimelineLite();
    tl.add(TweenLite.to(this.element, 0.5, {scale: 1.0}))
    switch (this.state) {
      case 'Right':
        tl.add(this.goRight({
          duration: 1.0,
          rotation: this.rotation,
          swing: false,
          onComplete: (() => {
            this.selected = false;
            this.animations['around'].seek('Down').resume();
          }).bind(this)
        }));
        break;
      case 'Down':
        this.goDown({
          duration: 1.0,
          rotation: this.rotation,
          swing: false,
          onComplete: (() => {
            this.selected = false;
            TweenLite.to(this.element, 2, {scale: 1})
            this.animations['around'].seek('Left').resume();
          }).bind(this)
        });
        break;
      case 'Left':
        this.goLeft({
          duration: 1.0,
          rotation: this.rotation,
          swing: false,
          onComplete: () => {
            this.selected = false;
            TweenLite.to(this.element, 2, {scale: 1})
            this.animations['around'].seek('Up').resume();
          }
        });
        break;
      case 'Up':
        this.goUp({
          duration: 1.0,
          rotation: this.rotation,
          swing: false,
          onComplete: () => {
            this.selected = false;
            TweenLite.to(this.element, 2, {scale: 1})
            this.animations['around'].seek('Done').resume();
          }
        });
        break;
    }
  };
}
