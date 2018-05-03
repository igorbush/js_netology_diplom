'use strict';

class Vector {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }
    plus(vector) {
        if ((vector instanceof Vector)) {
            return new Vector(this.x + vector.x, this.y + vector.y);
        } else {
            throw new Error("Можно прибавлять к вектору только вектор типа Vector");
        }
    }
    times(n) {
        return new Vector(this.x * n, this.y * n);
    }
}

class Actor {
    constructor(pos = new Vector(), size = new Vector(1, 1), speed = new Vector()) {
        if ((pos instanceof Vector) && (size instanceof Vector) && (speed instanceof Vector)) {
            this.pos = pos;
            this.size = size;
            this.speed = speed;
        } else {
            throw new Error("pos, size or speed is not instanceof Vector");
        }
    }
    act() {}
    get type() {
        return 'actor';
    }
    get left() {
        return this.pos.x;
    }
    get top() {
        return this.pos.y;
    }
    get right() {
        return this.pos.x + this.size.x;
    }
    get bottom() {
        return this.pos.y + this.size.y;
    }
    isIntersect(actor) {
        if ((actor instanceof Actor) || actor === undefined) {
            if (actor === this) {
                return false;
            }
            return !(this.right <= actor.left || this.left >= actor.right || this.bottom <= actor.top || this.top >= actor.bottom);
        } else {
            throw new Error("actor is not instanceof Actor");
        }
    }
}

class Level {
    constructor(grid = [], actors = []) {
        this.grid = grid;
        this.actors = actors;
        this.player = this.actors.find(actor => actor.type === 'player');
        this.height = grid.length;
        this.width = this.height > 0 ? Math.max(...grid.map(el => el.length)) : 0;
        this.status = null;
        this.finishDelay = 1;
    }
    isFinished() {
        return (this.status !== null && this.finishDelay < 0);
    }
    actorAt(obj) {
        if (!(obj instanceof(Actor)) || obj === undefined) {
            throw new Error('actor is not instanceof Actor or undefined')
        }
        if (this.actors === undefined) {
            return undefined;
        }
        for (const actor of this.actors) {
            if (actor.isIntersect(obj)) {
                return actor;
            }
        }
        return undefined;
    }
    obstacleAt(destination, size) {
        if (!(destination instanceof(Vector)) || !(size instanceof(Vector))) {
            throw new Error("position or size is not instanceof Vector")
        }
        let actor = new Actor(destination, size);
        if (actor.top < 0 || actor.left < 0 || actor.right > this.width) {
            return 'wall';
        }
        if (actor.bottom > this.height) {
            return 'lava';
        }
        for (let col = Math.floor(actor.top); col < Math.ceil(actor.bottom); col++) {
            for (let row = Math.floor(actor.left); row < Math.ceil(actor.right); row++) {
                if (this.grid[col][row] !== undefined) {
                    return this.grid[col][row];
                }
            }
        }
        return undefined;
    }
    removeActor(actor) {
        this.actors = this.actors.filter(item => item.pos !== actor.pos || item.size !== actor.size || item.speed !== actor.speed);
    }
    noMoreActors(type) {
        if (!(this.actors.find(actor => actor.type === type))) {
            return true;
        }
        return false;
    }
    playerTouched(type, actor) {
        if (type === 'lava' || type === 'fireball') {
            this.status = 'lost';
        }
        if (type === 'coin' && actor.type === 'coin') {
            this.removeActor(actor);
            if (this.noMoreActors('coin')) {
                this.status = 'won';
            }
        }
    }
}

class LevelParser {
    constructor(dictionary) {
        this.dictionary = dictionary;
    }
    actorFromSymbol(str) {
        return (str) ? this.dictionary[str] : undefined;
    }
    obstacleFromSymbol(str) {
        return (str === 'x') ? 'wall' : (str === '!') ? 'lava' : undefined;
    }
    createGrid(plan) {
        return plan.map(str => str.split('').map(symb => this.obstacleFromSymbol(symb)));
    }
    createActors(plan) {
        let finalArr = [];
        if (this.dictionary) {
            for (let y = 0; y < plan.length; y++) {
                for (let x = 0; x < plan[y].length; x++) {
                    let symb = plan[y][x];
                    let objClass = this.actorFromSymbol(symb);
                    if (typeof objClass === 'function') {
                        let vector = new Vector(x, y);
                        let movObj = new objClass(vector);
                        if (movObj instanceof Actor) {
                            finalArr.push(movObj);
                        }
                    }
                }
            }
        }
        return finalArr;
    }
    parse(plan) {
        return new Level(this.createGrid(plan), this.createActors(plan));
    }
}

class Fireball extends Actor {
    constructor(pos = new Vector(), speed = new Vector()) {
        super(pos, new Vector(1, 1), speed);
    }
    get type() {
        return 'fireball';
    }
    getNextPosition(time = 1) {
        return new Vector(this.pos.x + this.speed.x * time, this.pos.y + this.speed.y * time);
    }
    handleObstacle() {
        this.speed = new Vector(-this.speed.x, -this.speed.y);
    }
    act(time, level) {
        let position = this.getNextPosition(time);
        if (level.obstacleAt(position, this.size)) {
            this.handleObstacle();
        } else {
            this.pos = position;
        }
    }
}

class HorizontalFireball extends Fireball {
    constructor(pos) {
        super(pos, new Vector(2, 0));
    }
}

class VerticalFireball extends Fireball {
    constructor(pos) {
        super(pos, new Vector(0, 2));
    }
}

class FireRain extends Fireball {
    constructor(pos) {
        super(pos, new Vector(0, 3));
        this.startPos = pos;
    }
    handleObstacle() {
        this.pos = this.startPos;
    }
}

class Coin extends Actor {
    constructor(pos = new Vector()) {
        super(new Vector(pos.x + 0.2, pos.y + 0.1), new Vector(0.6, 0.6), new Vector());
        this.startPos = new Vector(pos.x + 0.2, pos.y + 0.1);
        this.springSpeed = 8;
        this.springDist = 0.07;
        this.spring = (Math.random() * 2 * Math.PI);
    }
    get type() {
        return 'coin';
    }
    updateSpring(time = 1) {
        this.spring += this.springSpeed * time;
    }
    getSpringVector() {
        return new Vector(0, Math.sin(this.spring) * this.springDist);
    }
    getNextPosition(time = 1) {
        this.updateSpring(time);
        return new Vector(this.startPos.x + this.getSpringVector().x, this.startPos.y + this.getSpringVector().y);
    }
    act(time) {
        this.pos = this.getNextPosition(time);
    }
}

class Player extends Actor {
    constructor(pos = new Vector()) {
        super(new Vector(pos.x, pos.y - 0.5), new Vector(0.8, 1.5), new Vector());
    }
    get type() {
        return 'player';
    }
}

const actors = {
    '@': Player,
    'o': Coin,
    '=': HorizontalFireball,
    '|': VerticalFireball,
    'v': FireRain
};
const parser = new LevelParser(actors);

loadLevels()
    .then(result => runGame(JSON.parse(result), parser, DOMDisplay))
    .then(() => alert('Вы выиграли приз!'));