const MovingObject = require("../moving_object");
const Projectile = require("../projectile");
const SpecialTile = require("../../floors/special_tile");


class Character extends MovingObject {
    constructor(params) {
        super(params);

        // General status things
        this.status = "idle"
        this.direction = Math.random() > 0.5 ? "right" : "left"; // Randomly set direction on spawn
        this.attacking = false;
        this.kicking = false;
        this.rolling = false;
        this.busy = false;

        // Knockback / stun
        this.knockedBack = false;
        this.knockedBackCounter = 0;
        this.stunned = false;
        this.stunnedCounter = 0;
        this.stunnedImage = new Image();
        this.stunnedImage.src = "./dist/assets/stunned.png";

        this.step = 0; // Used for animation
        this.target = []; // Used when firing an attack (kind of an unnecessary instance variable)
    }


    /**
     * Basic move method that handles the movement logic for Characters. Called in the
     * Enemy and Player move() methods.
     */
    move() {
        // --------- Moves character if future position is valid ---------
        let validMove = this.validMove();
        if (validMove) super.move();

        // --------- Sets status (used in animation) of Player based on velocity ---------
        if (this.game.player === this) {
            if (this.velocity[0] === 0 && this.velocity[1] === 0) this.status = "idle";
            if (this.velocity[0] !== 0 || this.velocity[1] !== 0) this.status = "moving";
        }
    }


    /**
     * Bottom level draw method. For animations that are shared by all Characters 
     * (moving and idle).
     * @param {CanvasRenderingContext2D} ctx - 2D Canvas context to draw the game
     */
    draw(ctx) {
        // --------- Figuring out which part of animation to do next ---------
        let stepXCoord = this._selectFrame(18 / this.animationPace);

        // --------- Figuring out which general animation to do ---------
        if (this.status === "moving") {
            if (this.direction === "right") {
                // Adjust if Meathead or Tank (they have really large sprites)
                this.constructor.name === "Meathead" || this.constructor.name === "Tank" ? stepXCoord -= 5 : null;
                this.drawing.src = `${this.images}/run_r.png`;
            } else {
                this.drawing.src = `${this.images}/run_l.png`;
            }
        } else if (this.status === "idle") {
            if (this.direction === "right") {
                this.drawing.src = `${this.images}/idle_r.png`;
            } else {
                this.drawing.src = `${this.images}/idle_l.png`;
            }
        }
        // --------- Drawing image ---------
        ctx.drawImage(this.drawing, stepXCoord, 0, 40, 80, this.position[0], this.position[1], 75, 90);
    }


    /**
     * Very important helper method. Called in draw(), determines which frame of an 
     * animation to use from an animation sheet.
     * 
     * @param {Number} stepFactor - Basically, this number determines how fast to animate. 
     * At each iteration of the game loop, this.step is incremented by 1. I determine 
     * which frame of the animation sheet to use based on this.step and stepFactor. For 
     * example, if stepFactor is 1, the first frame is used when this.step is 0, the second
     * when this.step is 1, etc. This is problematic because then the animation is really 
     * fast. Therefore, stepFactor is generally a larger number, that can then be lessened
     * by some factor when time slows down.
     * 
     * @returns - Number. The x-position of the frame to draw in the animation sheet.
     */
    _selectFrame(stepFactor) {
        // --------- If past last step of animation, reset to first step ---------
        if ((this.status === "idle" || this.stunned) && !this.busy && this.step >= this.idleFrames * stepFactor) this.step = 0;
        if (this.status === "moving" && !this.busy && this.step >= this.runningFrames * stepFactor) this.step = 0;

        // --------- Using step to find correct part of animation ---------
        let selection;
        if (this.step < 1 * stepFactor) { // Values are large to slow animation down
            selection = 0;
        } else if (this.step < 2 * stepFactor) {
            selection = 48;
        } else if (this.step < 3 * stepFactor) {
            selection = 96;
        } else if (this.step < 4 * stepFactor) {
            selection = 144;
        } else if (this.step < 5 * stepFactor) {
            selection = 196;
        } else if (this.step < 6 * stepFactor) {
            selection = 240;
        } else if (this.step < 7 * stepFactor) {
            selection = 288;
        } else {
            selection = 336;
        }

        // --------- Correcting x values for left facing animations, incrementing step ---------
        if (this.direction === "left") selection += 10;
        this.step += (1 * (this.game.dt / (1000 / 60))); // Adjusting for refresh rate

        return selection;
    }


    /**
     * Important helper method that's used to check if a Character's move is going to be valid.
     * Checks if the Character is moving into the player, an enemy, or a pit. Note that
     * this method is used to check for valid spawns in spawnEnemies in Game.
     * @returns - A boolean (true for valid move, false for not)
     */
    validMove() {
        // ------------------ Checking if moving into player ------------------
        if (this !== this.game.player && this.willCollideWith(this.game.player)) return false;

        // ------------------ Checking if moving into an enemy ------------------
        for (let i = 0; i < this.game.enemies.length; i++) {
            if (!this.rolling && this !== this.game.enemies[i]) {
                if (this.willCollideWith(this.game.enemies[i])) {

                    // If a character was knocked into another character, the knockback is 
                    // halted, they both get stunned, and they both take small damage
                    if (this.knockedBack && this !== this.game.player) {
                        this.knockedBack = false;
                        this.stunned = true;
                        this.stunnedCounter = 0;
                        this.velocity = [0, 0];
                        this.step = 0;
                        this.takeDamage(5);

                        if (this.game.enemies[i]) {
                            this.game.enemies[i].stunned = true;
                            this.game.enemies[i].stunnedCounter = 0;
                            this.velocity = [0, 0];
                            this.step = 0;
                            this.game.enemies[i].takeDamage(5);
                        }
                    }
                    return false;
                }
            }
        }

        // ------------------ Pit Collision - Preventing Enemies from walking into Pits ------------------

        // Enemies pit collision (they shouldn't just walk into a pit for no reason)
        let futureXCoord = this.position[0] + this.velocity[0];
        let futureYCoord = this.position[1] + this.velocity[1];

        // Check that indices are valid before getting tile. If not, return false. Don't do this check for the Player.
        let nextTileIndices = [Math.floor((futureYCoord + 5) / 40) + 1, Math.floor((futureXCoord - 5) / 40) + 1];
        if (this !== this.game.player && (nextTileIndices[0] <= 0 || nextTileIndices[0] >= this.game.floor.numRows - 1 || 
            nextTileIndices[1] <= 0 || nextTileIndices[1] >= this.game.floor.numCols - 1)) return false;

        // Get tile and check if valid
        let nextTile = this.game.floor.floorTiles[nextTileIndices[0]][nextTileIndices[1]];
        if (this !== this.game.player && !this.knockedBack &&
            nextTile instanceof SpecialTile && nextTile.type === "pit") return false;


        // ------------------ Pit Collision - Checking if Character is in Pit ------------------

        // Check that indices are valid before getting tile. Don't do this check for the Player.
        let currentTileIndices = [Math.floor((this.position[1] + 5) / 40) + 1, Math.floor((this.position[0] - 5) / 40) + 1];
        if (this !== this.game.player && (currentTileIndices[0] <= 0 || currentTileIndices[0] >= this.game.floor.numRows - 1 ||
            currentTileIndices[1] <= 0 || currentTileIndices[1] >= this.game.floor.numCols - 1)) return false;

        // Get tile and check if in pit
        let currentTile = this.game.floor.floorTiles[currentTileIndices[0]][currentTileIndices[1]];
        if (currentTile instanceof SpecialTile && currentTile.type === "pit") this.dead();


        // If nothing was hit, its a valid move!
        return true;
    }


    /**
     * This method is called when an attack is initiated. The actual attack is 
     * launched from the draw methods of Enemy and Player (so as to line up
     * with the animation).
     * @param {Array} target - [x, y] coords. Either the position of the player 
     * or the player's mouse position
     */
    startAttack(target) {
        // If meathead or tank, set animationPace faster so it looks better. Adjust properly if time slowed
        this.constructor.name === "Meathead" || this.constructor.name === "Tank" ? 
            this.game.slowed ?
                this.animationPace = 1 : 
                this.animationPace = 2 : 
                null;

        this.attacking = true; // The draw() method sees this and animates / fires off attacks
        this.busy = true; // Prevents the character from doing anything else
        this.step = 0; // Sets the animation step to 0 to begin attack animation
        this.target = target;

        this.constructor.name === "Punk" ? this.step = 1 : null; // Skipping first fram of Punk attack animation
    }


    /**
     * Simple method that launches a projectile at this.target. Called from the draw() 
     * methods of Enemy and Player.
     */
    launchProjectile() {
        // If this is a Shooter or Punk, adjust the target to make more visual sense 
        // (have to use targ bc references and all that).
        let targ = [this.target[0], this.target[1]];
        if (this.constructor.name === "Shooter" || this.constructor.name === "Punk") {
            targ[0] += 30;
            targ[1] += 25;
        }

        let z = Math.sqrt((targ[0] - (this.position[0] + 30)) ** 2 + (targ[1] - (this.position[1] + 25)) ** 2);

        let speed;
        (this.game.player === this) ? speed = 10 : speed = 7;
        const p = new Projectile({
            position: [this.position[0] + 30, this.position[1] + 25],
            velocity: [(targ[0] - (this.position[0] + 30)) / z * speed, (targ[1] - (this.position[1] + 25)) / z * speed],
            damage: 10,
            shooter: this,
            game: this.game
        });
        
        // If the game is slowed, the projectile's velocity is lowered appropriately
        if (this.game.slowed) {
            p.velocity[0] /= 4;
            p.velocity[1] /= 4;
        }
        this.game.projectiles.push(p);
    }


    /**
     * Called when f is pressed by player or Punk fires off locl. Sets kicking to true, 
     * which is then used in the draw() method to fire off a kick.
     */
    startKick() {
        this.kicking = true;
        this.busy = true;
        this.step = 5;
    }


    /**
     * Simple method that's called in kick() when a kick lands on an Enemy. Initiates
     * a knockback by setting this.knockedBack to true.
     * @param {String} knockedDirection - Specified in kick(), "up", "down", "left", or "right"
     */
    startKnockback(knockedDirection) {
        // Setting instance vars
        this.knockedBack = true;
        this.knockedBackCounter = 0;
        this.step = 0;

        // Figuring out direction to knock enemy and setting velocity
        switch (knockedDirection) {
            case "up":
                this.velocity[0] = 0;
                this.velocity[1] = -8;
                break;

            case "down":
                this.velocity[0] = 0;
                this.velocity[1] = 8;
                break;

            case "right":
                this.velocity[0] = 8;
                this.velocity[1] = 0;
                break;

            case "left":
                this.velocity[0] = -8;
                this.velocity[1] = 0;
                break;

            default:
                break;
        }

        // If time is slowed, cut the velocity
        if (this.game.slowed) {
            this.velocity[0] === 0 ? this.velocity[1] /= 4 : this.velocity[0] /= 4;
        }
    }


    /**
     * This method is called to initiate a roll. 
     * @returns - null if not moving
     */
    roll() {
        if (this.velocity[0] === 0 && this.velocity[1] === 0) return; // If not moving, can't roll
        this.rolling = true; // Used in many places (such as collision check, draw())
        this.busy = true; // Prevents character from doing other things while rolling
        this.step = 0; // Sets the animation step to 0 to begin roll animation
    }


    /**
     * When a Character is hit by an attack, this method is called on them.
     * @param {Number} damage - Amount of damage for Character to take
     */
    takeDamage(damage) {
        // If journalistDifficulty is on, the player only ever takes 1 damage from attacks
        if (this.game.journalistDifficulty && this.game.player === this) {
            this.health -= 1;
        } else {
            this.health -= damage;
        }
        if (this.health <= 0) this.dead(); 
    }
}


module.exports = Character;
