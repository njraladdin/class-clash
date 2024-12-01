export default class Soldier extends Phaser.GameObjects.Sprite {
    constructor(scene, x, y, team) {
        super(scene, x, y, 'soldier-1');
        scene.add.existing(this);

        // Basic properties
        this.team = team;
        this.hp = 100;
        this.maxHp = 100;
        this.speed = team === 'player' ? 1 : -1;
        this.state = 'walking';
        this.attackRange = 40; // Default melee range
        this.setTint(team === 'player' ? 0x0000ff : 0xff0000);
        if (team === 'enemy') this.setFlipX(true);

        this.attackOffset = Math.random() * 20 * (team === 'player' ? 1 : -1);

        // Create health bar
        this.healthBar = scene.createHealthBar(x, y - 30, 30, 4);
        
        // Add state debug text
        this.stateText = scene.add.text(x, y - 50, this.state, { 
            fontSize: '12px', 
            fill: '#fff',
            backgroundColor: '#000'
        });
        
        this.play('walk');
    }

    canAttack(enemies, allies) {
        if (!enemies.length) return false;
        
        const closestEnemy = enemies.reduce((closest, enemy) => {
            const distance = Math.abs(this.x - enemy.x);
            if (!closest || distance < Math.abs(this.x - closest.x)) {
                return enemy;
            }
            return closest;
        }, null);

        if (!closestEnemy) return false;

        const distance = Math.abs(this.x - closestEnemy.x);
        return distance <= this.attackRange;
    }

    attack(target) {
        if (this.state !== 'attacking') {
            this.play('attack');
        }
        target.takeDamage(0.42);
        return target.hp <= 0;
    }

    update() {
        switch (this.state) {
            case 'walking':
                if (this.anims.currentAnim?.key !== 'walk') {
                    this.play('walk');
                }
                break;
            case 'attacking':
                if (this.anims.currentAnim?.key !== 'attack') {
                    this.play('attack');
                }
                break;  
            case 'waiting':
                this.setTexture('soldier-wait');
                break;
        }

        // Update state text position and content
        this.stateText.setPosition(this.x - 20, this.y - 50);
        this.stateText.setText(this.state);

        // Update health bar position
        const barX = this.x;
        const barY = this.y - 30;
        this.healthBar.background.setPosition(barX, barY);
        this.healthBar.foreground.setPosition(barX - this.healthBar.background.width / 2, barY);
    }

    takeDamage(amount) {
        this.hp -= amount;
        this.updateHealthBar();
        return this.hp <= 0;
    }

    updateHealthBar() {
        const healthPercent = Math.max(0, this.hp / this.maxHp);
        this.healthBar.foreground.setScale(healthPercent, 1);
    }

    destroy() {
        this.stateText.destroy();
        this.healthBar.background.destroy();
        this.healthBar.foreground.destroy();
        super.destroy();
    }
} 