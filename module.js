(function(){
  // Node.js で動作しているか
  var isNode = (typeof process !== "undefined" && typeof require !== "undefined");
  var ipcRenderer = null;
  var capture = null;

  if(isNode) window.electron = require('electron');
  var w = window.innerWidth;
  var h = window.innerHeight;
  /* ランダムなID(文字列)の生成 */
  const generateRandomID = function(){return String(Math.random().toString(36).slice(-8))};
  /* ランダムな整数の生成 */
  const generateRandomInt = function(min,max){return Math.floor( Math.random() * (max - min + 1) ) + min};

  document.addEventListener('DOMContentLoaded', () => {
    if(isNode){
      ipcRenderer = electron.ipcRenderer;
      capture = electron.desktopCapturer;
    }
    window.Sky = Sky;
    window.Cloud = Cloud;
    window.MickrSky = MickrSky;
    window.MickrCloud = MickrCloud;
    window.MickrClient = MickrClient;
  })

  /*
  EventEmitter.js
  yusuken@toralab.org
  */
  class EventEmitter extends Object{
    constructor(){
      super()
      this.eventHandlerListByEventType = {};
      this.eventTypeList = [];
      this.eventHandlerListList = [];
    };
    on(eventType, eventHandler){
      let eventHandlerList = this.eventHandlerListByEventType[eventType];
      if (eventHandlerList == null) {
        eventHandlerList = [];
        this.eventHandlerListByEventType[eventType] = eventHandlerList;
      }
      eventHandlerList.push(eventHandler);
    };
    off(eventType, eventHandler){
      let eventHandlerList = this.eventHandlerListByEventType[eventType];
      if (eventHandlerList != null) {
        _eventHandlerListByEventType[eventType] = eventHandlerList.filter(x => x !== eventHandler);
      }
    };
    emit(eventType, ...eventArguments){
      let eventHandlerList = this.eventHandlerListByEventType[eventType];
      if (eventHandlerList != null) {
        for (let i = 0, n = eventHandlerList.length; i < n; i++) {
          let eventHandler = eventHandlerList[i];
          eventHandler.apply(self, eventArguments);
        }
      }
    };
  };


  class MickrClient extends EventEmitter{
    /* メンバー要素 */
    constructor(option){
      console.log(option);
      super()
      this.client = new TelepathyClient();
      this.isConnected = false;
      this.syncing = false;
      this.settings = option;
      this.contexts = {}

      this.client.on('error', event => {console.log('error', event);});
      this.client.on('close', event => {console.log('close', event);});

      /* 返信処理 */
      this.client.on('response', (req, res) => {
        // if(res.method != "ECHO") console.log('message: ');
      });

      /* 接続時の処理 */
      this.client.on('connect', event => {
        console.log('connect', event);
        this.connected()
      });

      /* メッセージを受信した時の処理 */
      this.client.on('message', message => {
        const self = this;
        if(message.body.key in self.contexts){
          console.log("responce: ", message);
          var req = self.contexts[message.body.key].message;
          var callback = self.contexts[message.body.key].callback;
          delete self.contexts[message.body.key];
          callback(req, message);
        }else{
          console.log("message: ",message);
          var response = {
            "from": message.to,
            "to": message.from,
            "body": {
              "key": message.body.key,
              "command": message.body.command,
              "content": message.body.content,
              "response": message.body.response
            }
          };
          /* message中のコマンドの実行 */
          self.emit(message.body.command, message, response);
        }
      });
      this.client.connect(this.settings.url, this.settings.site, this.settings.token);
    }

    /* 通信確認 */
    connect(callback){
      return new Promise((resolve)=>{
        if(this.isConnected){
          console.log("connected");
          if(typeof callback == 'function') callback()
          resolve()
        }
        else{
          console.log("wait");
          this.on('connect', ()=>{
            console.log("connected", callback);
            if(typeof callback == 'function') callback()
            resolve()
          })
        }
      })
    }

    /* Helloリクエストによる接続確認 */
    connected(){
      return new Promise((resolve, reject) => {
        /* 既に通信が完了しているか確認 */
        const self = this;
        if(self.isConnected) console.log("Connected");
        else{
          self.client.hello({"from": self.settings.id }, (req, res) => {
            // console.log("hello:callback", req, res);
            self.isConnected = res.status == 200;
            /* 接続があるならHelloリクエストによる確認を行う */
            if(self.isConnected){
              console.log("HELLO: " + (self.isConnected ? "OK" : "NO"));
              /* HeartBeat: 接続確認 */
              setInterval(() => {
                if(self.isConnected){
                  self.client.echo({});
                  console.log("HeartBeat");
                }else{
                  console.log("ReConnection");
                  self.client.connect(self.settings.url, self.settings.site, self.settings.token );
                }
              }, 30000);
              self.emit('connect');
              resolve();
            }
          });
        }
      })
    }


    send(command, option, callback){
      return new Promise((resolve, reject) => {
        console.log("option:",option);
        this.connect().then(()=>{
          const message = {
            "from": option.from === undefined ? this.settings.id : option.from,
            "to": option.to === undefined ? undefined : option.to,
            "body": {
              "key": option.body.key === undefined ? this.generateRandomID() : option.body.key,
              "command": command === undefined ? "test" : command,
              "content": option.body.content === undefined ? "" : option.body.content,
              "response": option.body.response === undefined ? true : option.body.response
            }
          }

          /* 送信処理 */
          this.client.send(message, (req, res) => {
            console.log("send mes", req);
            this.contexts[message.body.key] = { "message": req, callback: callback };
          });
        })
      })
    }
    /* ブロードキャスト送信 */
    broadcast(command, option, callback){
      console.log(option);
      return this.send(command, {
        "from": option.from === undefined ? this.settings.id : option.from,
        "to": undefined,
        "body": {
          "key": option.body.key === undefined ? this.generateRandomID() : option.body.key,
          "command": command === undefined ? "test" : command,
          "content": option.body.content === undefined ? "" : option.body.content,
          "response": option.body.response === undefined ? true : option.body.response
        }
      }, callback)
    };
    response(message){
      this.send(message)
    }
    generateRandomID(){
      var id = null;
      while (true) {
        id = Math.random().toString(16).slice(-8).toUpperCase();
        if (id in this.contexts == false) {
          break;
        }
      }
      return id;
    };
  };

  /* 雲を表示するベースの生成 */
  class Sky extends EventEmitter{
    constructor(option){
      super()
      option = option || {};
      this.client = null;
      this.clouds = [];
      this.selected = [];

      if(option.element === undefined){
        var div = document.createElement('div');
        div.id = "sky";
        div.className = 'sky';
        document.body.appendChild(div)
        this.element = div;
      }else{
        this.element = document.getElementById(option.elementID);
      }
    }

    send(command, message, callback){if(this.client !== null) this.client.send(command, message, callback)}
    on(command, message, callback){if(this.client !== null) this.client.on(command, message, callback)}
    broadcast(command, message, callback){if(this.client !== null) this.client.broadcast(command, message, callback)}

    appendCloud(cloud){
      cloud.parent.appendChild(cloud.element)
      this.clouds.push(cloud);
    }

    /* sky上に雲の追加 */
    addCloud(option){
      if(option){
        option.parent = option.parent || this.element;
        option.mouseover = option.mouseover || this.mouseover.bind(this);
        option.mouseout = option.mouseout || this.mouseout.bind(this);
        option.onComplete = option.onComplete || this.onComplete.bind(this);
        option.onClick = option.onClick || this.onClick.bind(this);
      }

      var cloud = new Cloud(option)
      cloud.addHandler(option);
      cloud.option = option;
      this.appendCloud(cloud);
      return cloud;
    };

    outerPause(){
      this.clouds.forEach(cloud => {
        if(!cloud.selected){
          cloud.animator.pause('around')
        }
      });
    };

    outerResume(){
      this.clouds.forEach((cloud) => {
        if(!cloud.selected){
          cloud.animator.resume('around')
        }
      });
    };

    mouseover(cloud){};
    mouseout(cloud){};
    onComplete(cloud){this.clouds.splice(this.clouds.indexOf(cloud), 1);};

    returnClouds(){
      this.selected.forEach(c => {
        c.onClick();
        this.clouds.push(c);
      });
      this.selected = [];
    };

    onClick(cloud){
      if (!cloud.selected) {
        this.selected.push(cloud);
        this.clouds.splice(this.clouds.indexOf(cloud), 1);
        this.outerResume();
      }
      else {
        this.selected.splice(this.selected.indexOf(cloud), 1);
        this.clouds.push(cloud);
      }
      cloud.onClick()
    };

    selectedText(){return(this.selected ? this.selected.map(cloud => cloud.text) : []);};
  }

  /* 雲オブジェクトの生成 */
  class Cloud{
    constructor(option){
      option = option !== undefined ? option : {
        parent: document.getElementById('sky'),
        id: generateRandomID(),
        size: 1.0,
        tags: ["none"]
      }
      this.parent = option.parent || document.getElementById('sky');
      this.element = null;
      this.clickAnimation = () => {}

      this.visible = option.visible === undefined ? true : option.visible;
      this.color = option.color || "#FFFFFF";

      this.id = option.id || generateRandomID();
      this.size = option.size || 1.0;
      this.tags = option.tags || ["none"];
      this.createCloud(option);
      this.setAnimator(option)
    };

    export(){
      var ret = this.option;
      ret.text = this.text;
      ret.position = this.getPosition();
    }

    appendSky(parent){
      this.parent = parent || this.parent;
      parent.appendChild(this.element);
    };


    setAnimator(option){
      this.animator = new Animator({
        parent: this,
        element: this.element
      })
      this.animator.initAnimation(option);
    }

    isCollision(x, y){
      var rect = this.element.getBoundingClientRect();
      var X = x - rect.left;
      var Y = y - rect.top;
      var W = rect.width;
      var H = rect.height;
      return(X >= 0 && X <= W && Y >=0 && Y <= H);
    }

    createCloud(option){
      if(this.element) return 0;
      switch(option.type) {
        case "rect":
          console.log("rect");
          var rect = document.createElement('div');
          rect.style.position = "absolute"
          rect.style.fontSize = "x-large";
          rect.style.fontColor = "black";
          rect.style.border = 'black solid 1px'
          rect.style.backgroundColor = option.color;
          rect.style.opacity = this.visible && this.visible === undefined ? 1.0 : 0.0;
          rect.innerText = option.text;
          this.element = rect;
          this.setPosition(option.position)
          break;
        case "custom":
          this.element = option.body || document.getElementById('div');
          break;
        default:
          this.element = this.createCloudElement();
          this.setColor(option.color);
          this.setText(option.text, option.textColor);
          this.setImage(option.url);
          this.setPosition(option.position)
          this.setSize(option.size)
          break;
      }
    };

    getSize(){
      return {
        width: this.element.getBoundingClientRect().width,
        height: this.element.getBoundingClientRect().height
      }
    }

    setSize(scale, duration=0.5){
      TweenLite.to(this.element, duration, {scale: scale})
    }

    getPosition(){
      var rect = this.element.getBoundingClientRect();
      return {
        x: parseInt(rect.left),
        y: parseInt(rect.top)
      }
    }

    setPosition(position){
      position = position || {x:0, y:0};
      // this.element.style.left = position.x+"px";
      // this.element.style.top = position.y+"px";
      // this.animator.animations['to'](position, 0)
    }

    setText(text, color){
      this.text = text === undefined ? "" : text;
      color = color === undefined ? "#000000" : color;
      this.element.querySelector('.cloud_text').innerText = this.text;
      this.element.querySelector('.cloud_text').style.color = color;
    };

    setColor(color){
      this.color = color || "#FFFFFF";
      this.element.querySelector('.cloud path').style.fill = this.color;
    };

    setImage(url){
      this.src = url;
      // var data = new Uint8Array(this.response);
      // var oURL = URL.createObjectURL(new Blob([data], { type: "image/png" }));

      if(url){
        this.element.querySelector('.cloud_image').style.display = 'block'
        this.element.querySelector('.cloud_image').src = url
      }
      else{this.element.querySelector('.cloud_image').style.display = 'none'}
    }

    remove(){
      this.parent.removeChild(this.element);
    };

    addHandler(option){
      this.element.addEventListener('mouseover', (() => {option.mouseover(this);}).bind(this));
      this.element.addEventListener('mouseout', (() => {option.mouseout(this);}).bind(this));
      this.element.addEventListener('click', (e => {this.onClick();}).bind(this));
    };

    onClick(){
      if (this.selected) {
        this.animator.returnOuterAround()
      }
      else{
        if(this.animator.timeline['click']) this.animator.resume('click');
        this.selected = true;
      }
    };

    getPosition(){
      this.position = {x: this.element.getBoundingClientRect().left, y: this.element.getBoundingClientRect().top};
      return this.position;
    }

    createCloudElement(){
      var div = document.createElement('div')
      var svg_div = document.createElement('div')
      var text = document.createElement('div')
      var svg = document.createElementNS("http://www.w3.org/2000/svg", 'svg')
      var path = document.createElementNS("http://www.w3.org/2000/svg", 'path')
      var _img = document.createElement('img')
      div.id = "rcmnd";
      div.classList.add('rcmnd');
      div.setAttribute('draggable', true);
      svg_div.classList.add("cloud-div");
      text.className = "cloud_text flexiblebox";
      _img.className = "cloud_image flexiblebox";
      svg.setAttribute('xmlns', "http://www.w3.org/2000/svg");
      svg.setAttribute('xmlns:xlink', "http://www.w3.org/1999/xlink");
      svg.setAttribute("xml:space","preserve");
      svg.setAttribute('class', "cloud");
      svg.setAttribute('viewBox', "343.523 211.385 160.252 109.403");
      svg.setAttribute('style', "enable-background:new 343.523 211.385 160.252 109.403;");
      svg.setAttribute('width', "100%");
      svg.setAttribute('height', "100%");
      path.setAttribute('class', "st0")
      path.setAttribute('style', `fill: rgba(200, 200, 200, 0.6); stroke-width: 3px;`)
      path.setAttribute('d', `M491.348,254.364c0.067-0.643,0.1-1.294,0.1-1.954c0-10.53-8.537-19.068-19.068-19.068
            c-1.038,0-2.054,0.086-3.045,0.246c-1.761-6.571-7.741-11.417-14.868-11.417c-2.479,0-4.814,0.601-6.891,1.642
            c-7.422-7.661-17.812-12.428-29.319-12.428c-13.639,0-25.708,6.694-33.124,16.969c-1.776-0.51-3.65-0.789-5.59-0.789
            c-11.17,0-20.225,9.054-20.225,20.224c0,0.567,0.029,1.127,0.075,1.684c-9.136,2.431-15.869,10.757-15.869,20.659
            c0,9.252,5.879,17.131,14.105,20.108c-0.145,0.854-0.237,1.725-0.237,2.621c0,8.616,6.985,15.601,15.602,15.601
            c2.671,0,5.184-0.674,7.382-1.857c4.336,6.022,11.403,9.946,19.39,9.946c4.801,0,9.267-1.42,13.011-3.858
            c3.879,4.928,9.894,8.096,16.651,8.096c3.79,0,7.345-1,10.422-2.745c2.309,0.874,4.985,1.376,7.843,1.376
            c4.795,0,9.084-1.41,11.966-3.629c1.977,0.493,4.042,0.76,6.172,0.76c13.647,0,24.798-10.673,25.571-24.127
            c7.288-3.235,12.374-10.529,12.374-19.017C503.776,264.897,498.665,257.587,491.348,254.364z`);
      svg.appendChild(path)
      svg_div.appendChild(svg)
      div.appendChild(_img)
      div.appendChild(svg_div)
      div.appendChild(text)
      return div;
    }
  }

  class Animator extends EventEmitter{
    constructor(option){
      super()
      this.parent = option.parent || {};
      this.state = 'init';
      this.element = option.element || document.createElement('div');
      this.animations = {};
      this.timeline = {};
    }

    initAnimation(op){
      const self = this;
      this.animations = {
        zero: () => {
          var tl = new TimelineLite();
          tl.add([TweenLite.to(self.element, 0.5, {scale: 1.0, x: 0, y: 0})])
          return tl
        },
        expand: (ratio, duration=0.5) => {
          var tl = new TimelineLite();
          ratio = ratio === undefined ? 2.5 : ratio;
          tl.add([TweenLite.to(self.element, 0.5, {scale: 2.5})])
          return tl
        },
        /* 振動 */
        swing: (option) => {
          var tl = new TimelineLite();

          var params = {
            yoyo: true,
            repeat: 1,
            ease: Sine.easeOut,
            transformOrigin: 'initial'
          };

          for (var i = 0; i < option.interval; i++) {
            var forward_params = JSON.parse(JSON.stringify(params));
            forward_params[option.direction] = "+=" + (Math.random() * option.range + 3);
            tl.add(TweenMax.to(self.element, (option.duration / 4) / option.interval, forward_params));
            var backward_params = JSON.parse(JSON.stringify(params));
            backward_params[option.direction] = "-=" + (Math.random() * option.range + 3);
            tl.add(TweenMax.to(self.element, (option.duration / 4) / option.interval, backward_params));
          }

          return tl;
        },

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
          if (option.rotation) animations.push(TweenLite.to(self.element, option.duration, {rotation: '-135'}));
          if (option.swing) animations.push(self.animations["swing"]({duration: option.duration, interval: 10, range: 5, direction: 'top'}));

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
          if (option.rotation) animations.push(TweenLite.to(self.element, option.duration, {rotation: '-45'}));
          if (option.swing) animations.push(self.animations["swing"]({duration: option.duration, interval: 10, range: 5, direction: 'left'}));

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
          if (option.rotation) animations.push(TweenLite.to(self.element, option.duration, {rotation: '45'}));
          if (option.swing) animations.push(self.animations["swing"]({duration: option.duration, interval: 10, range: 5, direction: 'top'}));

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
          if(option.rotation) animations.push(TweenLite.to(self.element, option.duration, {rotation: '135'}));
          if(option.swing) animations.push(self.animations["swing"]({duration: option.duration, interval: 10, range: 5, direction: 'left'}));

          tl.add(animations);

          return tl;
        },

        to: (position={x:0, y:0}, duration=2) => {
          var tl = new TimelineLite();
          tl.add([TweenLite.to(self.element, duration, {left: position.x, top: position.y})])
          return tl
        },
        fromTo: (start={x:0, y:0}, end={x:0, y:0}, duration=2) => TweenLite.fromTo(self.element, duration, {left: start.x, top: start.y}, {left: end.x, top: end.y}),
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
        centering: (position, ratio=3.0, duration=2.0) => {
          var tl = new TimelineLite();
          position = position || {x: w/2 - 100, y: h/2 - 100};
          position.x = position.x || w/2 - 100;
          position.y = position.y || h/2 - 100;
          var animations = [TweenLite.to(self.element, 2, {
            rotation: 0,
            xPercent: 0,
            yPercent: 0,
            x: position.x,
            y: position.y
          }), TweenLite.to(self.element, 2, {
            scale: 3.0
          })];
          tl.add(animations);
          return tl;
        }
      };
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
    pauseAll(){Object.keys(this.timeline).forEach(k => this.pause(k))}
    resumeAll(){Object.keys(this.timeline).forEach(k => this.resume(k))}
    startAll(){Object.keys(this.timeline).forEach(k => this.start(k))}

    addGoAround(option){
      this.timeline['around'] = this.goAround({
        el: this.element,
        swing: option.swing === undefined ? false : option.swing,
        rotation: option.rotation === undefined ? false : option.rotation,
        position: option.position,
        onUpdate: (tl => {this.now = tl.totalTime();}).bind(this),
        onComplete: option.onComplete
      });
    };

    goAround(option){
      var tl = new TimelineLite({onComplete: option.onComplete.bind(this.parent), onUpdate: option.onUpdate, onUpdateParams: ["{self}"]});

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

    goAroundSmall(center, r){
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
          this.animations['Right']({
            duration: 1.0,
            rotation: this.rotation,
            swing: false,
            onComplete: () => {
              this.selected = false;
              this.timeline['around'].seek('Down').resume();
            }
          }
        );
          break;
        case 'Down':
          this.animations['Down']({
            duration: 1.0,
            rotation: this.rotation,
            swing: false,
            onComplete: () => {
              this.selected = false;
              TweenLite.to(this.element, 2, {scale: 1})
              this.timeline['around'].seek('Left').resume();
            }
          });
          break;
        case 'Left':
          this.animations['Left']({
            duration: 1.0,
            rotation: this.rotation,
            swing: false,
            onComplete: () => {
              this.selected = false;
              TweenLite.to(this.element, 2, {scale: 1})
              this.timeline['around'].seek('Up').resume();
            }
          });
          break;
        case 'Up':
          this.animations['Up']({
            duration: 1.0,
            rotation: this.rotation,
            swing: false,
            onComplete: () => {
              this.selected = false;
              TweenLite.to(this.element, 2, {scale: 1})
              this.timeline['around'].seek('Done').resume();
            }
          });
          break;
      }
    };
  }

  class MickrSky extends Sky{
    constructor(option){
      option = option || {};
      super(option)
      if(!isNode && option.client){
        option.id = option.id || generateRandomID();
        option.url = "ws://apps.wisdomweb.net:64260/ws/mik";
        option.site = option.site || "test";
        option.token = option.token || "Pad:9948";
        this.client = new MickrClient(option);
      }

      if(isNode) this.setRendererEvent()
    }

    /* sky上に雲の追加 */
    addCloud(option){
      if(option){
        option.parent = option.parent || document.getElementById('sky');
        option.mouseover = option.mouseover || this.mouseover.bind(this);
        option.mouseout = option.mouseout || this.mouseout.bind(this);
        option.onComplete = option.onComplete || this.onComplete.bind(this);
        option.onClick = option.onClick || this.onClick.bind(this);
        option.swing = option.swing === undefined ? true : option.swing;
        option.rotation = option.rotation === undefined ? false : option.rotation;
        option.around = option.around === undefined ? true : option.around;
        option.visible = option.visible === undefined ? true : option.visible;
        option.random = option.random === undefined ? true : option.random;
        option.immortal = option.immortal === undefined ? false : option.immortal;
      }

      var cloud = new MickrCloud(option)
      cloud.addHandler(option)
      this.appendCloud(cloud);
      return cloud;
    };

    setRendererEvent(){
      this.element.addEventListener('click', e => {
        if(this.clouds.length > 0){
          if(!this.clouds.some(c=>c.isCollision(e.pageX, e.pageY))){
            ipcRenderer.send('collision', {
              transparent_mode: true
            });
          }
        }
      })

      ipcRenderer.on('mickr', (e, data) => {
        this.addCloud(data)
      });

      /* 透明画面の切り替え */
      ipcRenderer.on('switch_mode', (e, transparent_mode) => {
        if(transparent_mode) {
          document.body.style.backgroundColor = 'transparent';
        } else {
          document.body.style.backgroundColor = 'rgba(0, 0, 0, 0.3)';
        }
      });
      ipcRenderer.on('switch_pause', (e, pause) => {
        if(pause) {
          this.animator.pauseAll()
        } else {
          this.animator.resumeAll()
        }
      });
      ipcRenderer.on('click', (e, data) => {
        var text = "";
        if(this.clouds.some(c => {
          var q = c.isCollision(data.x, data.y)
          if(q){text = c.text}
          return q
        }))
        {
          ipcRenderer.send('collision', {
            text: text,
            transparent_mode: false
          });
        }
      });
    }
  }

  class MickrCloud extends Cloud{
    constructor(option){
      super(option)
      option.parent = option.parent || this.parent;
      option.color = option.color || "#FFFFFF";
      this.element = this.createCloudElement();
      this.setColor(option.color);
      this.setText(option.text, option.textColor);
      this.setImage(option.url);
      this.setPosition(option.position)
      this.setSize(option.size)
      this.setAnimator(option)

      option['onComplete'] = this.remove;
      if(option.around){this.animator.addGoAround(option);}
      else {
        if(option.random) this.setPosition(generateRandomInt(0, w-150), generateRandomInt(0, h-150));
        if(!option.immortal){setTimeout(() => {this.remove()}, 10000)}
      }
      this.option = option;

      this.animator.animations['click'] = this.animator.animations['centering'].bind(this.animator);
      this.animator.animations['clicked'] = this.animator.returnOuterAround.bind(this.animator);
    }
    onClick(){
      if (this.selected) {
        this.animator.pause('click')
        this.animator.animations['clicked']()
        // this.animator.returnOuterAround()
        this.selected = false;
      }
      else{
        this.animator.pause('around')
        this.animator.timeline['click'] = this.animator.animations['click']()
        this.selected = true;
      }
    }
  }
})();
