
class MovingObject {
    constructor(params) {
        this.position = params["position"];
        this.velocity = params["velocity"];
        this.game = params["game"];
        this.drawing = new Image();
        // this.size
    }

    draw(ctx) {
        ctx.beginPath();
        ctx.arc(this.position[0], this.position[1], 4, 0, 2 * Math.PI, true);
        ctx.stroke();
    }

    move(dt) {
        // const velocityScale = dt / (1000 / 60),
        //     offsetX = this.velocity[0] * velocityScale,
        //     offsetY = this.velocity[1] * velocityScale;

        // this.position = [this.position[0] + offsetX, this.position[1] + offsetY];

        this.position[0] += this.velocity[0];
        this.position[1] += this.velocity[1];
    }

    isCollidedWith(otherMO) {
        return Math.abs(this.position[0] - otherMO.position[0]) < 25 && Math.abs(this.position[1] - otherMO.position[1]) < 25
    }

    willCollideWith(otherMO) {
        return Math.abs(this.position[0] + this.velocity[0] - otherMO.position[0]) < 25 && Math.abs(this.position[1] + this.velocity[1] - otherMO.position[1]) < 25
    }

    remove() {
        this.game.remove(this);
    }
}

module.exports = MovingObject;