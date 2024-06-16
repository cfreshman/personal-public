(() => {
    let Arc = this;

    Arc.V = class V {
        constructor(x, y) {
            this.x = x;
            this.y = y;
        }

        // Manhattan distance
        manhat(other) {
            return Math.abs(this.x - other.x) + Math.abs(this.y - other.y);
        }
        dist(other) {
            return Math.sqrt(Math.pow(this.x - other.x, 2) + Math.pow(this.y - other.y, 2));
        }
        equals(other) {
            return this.x === other.x && this.y === other.y;
        }
        add(other) {
            return new V(this.x + other.x, this.y + other.y);
        }
        sub(other) {
            return new V(this.x - other.x, this.y - other.y);
        }
        scale(c) {
            return new V(c * this.x, c * this.y);
        }
        angle(other) {
            let diff = (other) ? other.sub(this) : this;
            return Math.atan2(diff.y, diff.x);
        }
        clone() {
            return new V(this.x, this.y);
        }
    }

    Arc.Painted = class Painted {
        constructor(zIndex) {
            this.parent = false;
            this.zIndex = zIndex || 0;
        }

        _paint(ctx) {
            ctx.save();
            this.paint(ctx);
            ctx.restore();
        }

        paint(ctx) {}
    }

    Arc.PaintCommand = class PaintCommand extends Arc.Painted {
        constructor(command, zIndex) {
            super(zIndex)
            this.paint = command;
        }
    }
    Arc.command = function(command, zIndex) {
        return new Arc.PaintCommand(command, zIndex || 1);
    }

    Arc.Drawn = class Drawn {
        constructor() {
            this.command = Arc.command(ctx => this.draw(ctx), this.zIndex);
            this.add();
        }

        add() {
            this.command && Arc.add(this.command);
        }

        remove() {
            this.command && Arc.remove(this.command);
        }

        isAdded() {
            return this.command && this.command.parent;
        }
    }

    Arc.GraphicsObject = class GraphicsObject extends Arc.Painted {
        constructor(position, angle, scale, zIndex) {
            super(zIndex);
            this.position = position || new Arc.V(0, 0);
            this.angle = angle || 0;
            this.scale = scale || new Arc.V(1, 1);

            this.children = new Set();
        }

        add(child) {
            if (this !== child.parent) {
                child.parent && child.parent.remove(child);
                this.children.add(child);
                child.parent = this;
            }
            return child;
        }

        remove(child) {
            if (child && this === child.parent) {
                this.children.delete(child);
                child.parent = false;
            }
            return child;
        }

        clear() {
            this.children.forEach(c => this.remove(c));
        }

        _paint(ctx) {
            ctx.save();
            ctx.translate(this.position.x, this.position.y);
            ctx.rotate(this.angle);
            ctx.scale(this.scale.x, this.scale.y);

            this.paint(ctx);

            Array
                .from(this.children)
                .sort((a, b) => a.zIndex - b.zIndex)
                .forEach(c => c._paint(ctx));

            ctx.restore();
        }
    }

    Arc.throttled = function(func, rate) {
        rate = rate || 16; // 60 fps

        let funcTimeout;
        return () => {
            if (!funcTimeout) {
                funcTimeout = setTimeout(() => {
                    funcTimeout = false;
                    func();
                }, rate);
            }
        }
    }

    Arc.init = function(canvas, width, height) {
        Arc.canvas = canvas;
        Arc.ctx = canvas.getContext('2d');

        Arc.width = width;
        Arc.height = height;

        Arc.scene = new Arc.GraphicsObject();
        Arc.img = {};
        Arc.sprites = {};

        Arc._gui = document.createElement('div');
        Arc._gui.classList.add('gui-container');
        Arc._gui.style.width = `${Arc.width}px`;
        Arc._gui.style.height = `${Arc.height}px`;
        canvas.insertAdjacentElement('afterend', Arc._gui);

        Arc.gui = Arc.getGui();
        Arc._gui.appendChild(Arc.gui);

        let resize = () => {
            let save = document.createElement('canvas');
            save.width = canvas.width;
            save.height = canvas.height;
            save.getContext('2d').drawImage(canvas, 0, 0);

            let style = window.getComputedStyle(canvas.parentNode);
            let containerWidth = Number(style.width.slice(0, -2));
            let containerHeight = Number(style.height.slice(0, -2));

            let canvasScale = Math.min(containerWidth / Arc.width, containerHeight / Arc.height);
            canvas.style.width = `${canvasScale * Arc.width}px`;
            canvas.style.height = `${canvasScale * Arc.height}px`;

            Arc.gui.style.transform = `scale(${canvasScale})`;

            let contentScale = Arc.scale || Math.pow(2, Math.floor(Math.log2(canvasScale)));
            canvas.width = Arc.width * contentScale;
            canvas.height = Arc.height * contentScale;
            Arc.scene.scale = new Arc.V(contentScale, contentScale);

            Arc.ctx.imageSmoothingEnabled = false;
            Arc.ctx.drawImage(save, 0, 0, canvas.width, canvas.height);
            save.remove();
        };
        window.addEventListener('resize', Arc.throttled(resize, 500), false);
        resize();
    }

    Arc.load = function(files) {
        var loading = [];
        files.forEach(item => {
            let [name, src] = item;
            loading.push(new Promise((resolve, reject) => {
                var img = new Image();
                img.onload = function () {
                    Arc.ctx.imageSmoothingEnabled = false;
                    resolve(true);
                };
                img.src = src;
                Arc.img[name] = img;
            }));
        });

        return Promise.all(loading);
    }

    Arc.loadSheet = function(sheet, sprites) {
        return new Promise((resolve, reject) => {
            var img = new Image();
            img.onload = function () {
                Arc.ctx.imageSmoothingEnabled = false;
                sprites.forEach(sprite => {
                    let [name, sX, sY, sWidth, sHeight, ...anim] = sprite;
                    if (anim[0]) {
                        let [count, xOff, yOff] = anim;
                        Arc.sprites[name] = [];
                        for (let i = 0; i < count; i++) {
                            let entry = [img, sX + i*xOff, sY + i*yOff, sWidth, sHeight, ];
                            Arc.sprites[name].push(entry);
                            Arc.sprites[name + String(i)] = entry;
                        }
                    } else {
                        Arc.sprites[name] = [img, sX, sY, sWidth, sHeight];
                    }
                });
                resolve(true);
            };
            img.src = sheet;
            Arc.img[sheet] = img;
        });
    }

    Arc.drawSprite = function(sprite, x, y, width, height, xLerp=0, yLerp=0) {
        if (typeof(sprite) === 'string') {
            sprite = Arc.sprites[sprite];
        }

        Arc.ctx.drawImage(...sprite,
            x - xLerp*width, y - yLerp*height, width, height);
    }
    Arc.drawScaledSprite = function(sprite, x, y, scale, xLerp=0, yLerp=0) {
        if (typeof(sprite) === 'string') {
            sprite = Arc.sprites[sprite];
        }
        let width = scale * sprite[3];
        let height = scale * sprite[4];

        Arc.ctx.drawImage(...sprite,
            x - xLerp*width, y - yLerp*height, width, height);
    }

    Arc.drawNumber = function(num, x, y, xScale, yScale, xLerp=0, yLerp=0) {
        let sprites = String(num).split('').map(digit => Arc.sprites[digit]);
        let sWidth = sprites.reduce((acc, val) => acc + val[3]-1, 1);
        let width = sWidth * xScale;

        let currWidth = 0;
        sprites.forEach((sprite, i) => {
            let isLast = i === sprites.length-1;
            let [img, sX, sY, sW, sH] = sprite;
            let xPercent = currWidth / sWidth;
            Arc.ctx.drawImage(img, sX, sY, isLast ? sW : sW-1, sH,
                              x - xLerp*width + xPercent*width,
                              y - yLerp*sH*yScale,
                              (isLast ? sW : sW-1) * xScale, sH * yScale);
            currWidth += sW-1;
        });
    }

    Arc.update = () => {};
    Arc.tickTime = 16;
    Arc.setUpdate = function(updateFunc, tickTime) {
        Arc.update = updateFunc;
        Arc.tickTime = tickTime || Arc.tickTime;
    }

    Arc.loop = function() {
        let repaint = false;

        let paintCallback = () => {
            repaint && Arc.paint();
            requestAnimationFrame(paintCallback);
        }
        paintCallback();

        let prevstamp = Date.now();
        let updateCallback = () => {
            let now = Date.now();
            if (now > prevstamp + Arc.tickTime) {
                prevstamp = now;
                Arc.update();
                repaint = true;
            }
            setTimeout(updateCallback, (prevstamp + Arc.tickTime) - now);
        }
        updateCallback();
    }

    Arc.add = function(child) {
        if (child instanceof Function) {
            child = new Arc.PaintCommand(child);
        }
        return Arc.scene.add(child);
    };
    Arc.remove = (child) => Arc.scene.remove(child);
    Arc.clear = () => Arc.scene.clear();
    Arc.paint = function() {
        Arc.ctx.clearRect(0, 0, Arc.canvas.width, Arc.canvas.height);
        Arc.scene._paint(Arc.ctx);
    };

    let id = 1;
    Arc.newId = function() {
        return id++;
    };

    Arc._guis = {};
    Arc._currentGui = false;
    Arc.setGui = function(key) {
        let prevGui = Arc._gui.removeChild(Arc.gui);
        if (Arc._currentGui) {
            Arc._guis[Arc._currentGui] = prevGui;
        }

        Arc._currentGui = key;
        Arc._gui.appendChild(Arc.getGui(key));
        Arc.gui = Arc._gui.firstChild;
        Arc.gui.setAttribute('style', prevGui.getAttribute('style'));
    };
    Arc.getGui = function(key) {
        let gui = key && Arc._guis[key];
        if (!gui) {
            gui = document.createElement('div');
            gui.classList.add('gui');
        }
        return gui;
    };

    Arc.addButton = function(sprite, x, y, xScale=1, yScale=1, xLerp=0, yLerp=0) {
        if (typeof(sprite) === 'string') {
            sprite = Arc.sprites[sprite];
        }

        let [img, sX, sY, sWidth, sHeight] = sprite;
        let width = sWidth * xScale;
        let height = sHeight * yScale;
        let button = document.createElement('button');
        button.setAttribute('id', `button${Arc.newId()}`);
        button.innerHTML = `
        <style type="text/css">
            #${button.getAttribute('id')} {
                background-color: transparent;
                background-image: url(${img.src});
                background-position: -${sX}px -${sY}px;
                width: ${sWidth}px;
                height: ${sHeight}px;
                transform: translate(${x - xLerp*width}px, ${y - yLerp*height}px)
                           scale(${xScale}, ${yScale});
            }

            #${button.getAttribute('id')}:active {
                height: ${sHeight - 1}px;
                transform: translate(${x - xLerp*width}px, ${y - yLerp*height + yScale}px)
                           scale(${xScale}, ${yScale});
            }
        </style>`;
        Arc.gui.appendChild(button);
        return button;
    }

    Arc.addElement = function(sprite, x, y, xScale=1, yScale=1, xLerp=0, yLerp=0) {
        if (typeof(sprite) === 'string') {
            sprite = Arc.sprites[sprite];
        }

        let [img, sX, sY, sWidth, sHeight] = sprite;
        let width = sWidth * xScale;
        let height = sHeight * yScale;
        let element = document.createElement('div');
        element.setAttribute('id', `element${Arc.newId()}`);
        element.innerHTML = `
        <style type="text/css">
            #${element.getAttribute('id')} {
                background-color: transparent;
                background-image: url(${img.src});
                background-position: -${sX}px -${sY}px;
                width: ${sWidth}px;
                height: ${sHeight}px;
                transform: translate(${x - xLerp*width}px, ${y - yLerp*height}px)
                           scale(${xScale}, ${yScale});
            }
        </style>`;
        Arc.gui.appendChild(element);
        return element;
    }

    window.Arc = Arc;
})()