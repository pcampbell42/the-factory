const Enemy = require("./enemy.js");
const Player = require("./player.js");
const Projectile = require("./projectile.js");

class Game {
    constructor() {
        this.player = new Player({
            position: [400, 500],
            velocity: [0, 0],
            game: this
        });
        this.projectiles = [];
        this.enemies = [];
        this.spawnEnemies(6);
    }

    spawnEnemies(num) {
        for (let i = 0; i < num; i++) {
            let randomPos = [800 * Math.random(), 500 * Math.random()];
            let e = new Enemy({
                position: randomPos,
                velocity: [0, 0],
                game: this
            });
            this.enemies.push(e);
        }
    }

    draw(ctx) {
        ctx.clearRect(0, 0, 900, 600);
        this.player.draw(ctx);
        this.enemies.forEach(ele => ele.draw(ctx));
        this.projectiles.forEach(ele => ele.draw(ctx));
    }

    step(dt) {
        this.player.move(dt);
        this.enemies.forEach(ele => ele.action(dt));
        this.projectiles.forEach(ele => ele.move(dt));
        // this.checkProjectileCollisions();
    }

    checkProjectileCollisions() {
        this.projectiles.forEach( proj => {
            this.enemies.forEach( enemy => {
                if (proj.ticksSinceFired >= 20 && proj.isCollidedWith(enemy)) proj.collidedWith(enemy);
            });
            if (proj.ticksSinceFired >= 20 && proj.isCollidedWith(this.player)) proj.collidedWith(this.player);
        });
    }

    remove(obj) {
        if (obj instanceof Projectile) {
            this.projectiles.splice(this.projectiles.indexOf(obj), 1);
        } else if (obj instanceof Enemy) {
            this.enemies.splice(this.enemies.indexOf(obj), 1);
        }
    }
}

module.exports = Game;