import Soldier from './Soldier.js';

export default class RangedSoldier extends Soldier {
    constructor(scene, x, y, team) {
        super(scene, x, y, team);
        this.setTexture('ranged-soldier-1');
        
        // Ranged soldier specific properties
        this.attackRange = 150;
        this.damage = 10.5;
        this.cost = 30;
        this.maxHp = 80;
        this.hp = this.maxHp;
        this.lastShotTime = 0;
        this.shootCooldown = 1000; // 1 second between shots
        
        // Adjust speed to be slightly slower
        this.speed = team === 'player' ? 0.8 : -0.8;
        
        // Start with ranged walking animation after setting texture
        if (this.scene.anims.exists('ranged-walk')) {
            this.play('ranged-walk');
        }
    }

    attack(target) {
        const currentTime = this.scene.time.now;
        if (currentTime - this.lastShotTime >= this.shootCooldown) {
            this.shoot(target);
            this.lastShotTime = currentTime;
            return target.hp <= 0;
        }
        return false;
    }

    shoot(target) {
        // Create bullet
        const bullet = this.scene.add.rectangle(
            this.x + (this.team === 'player' ? 20 : -20),
            this.y,
            6,
            3,
            this.team === 'player' ? 0x00ffff : 0xff0000
        );

        // Calculate bullet trajectory
        const angle = Math.atan2(target.y - this.y, target.x - this.x);
        const speed = 5;
        const velocityX = Math.cos(angle) * speed;
        const velocityY = Math.sin(angle) * speed;

        // Update bullet position each frame
        this.scene.time.addEvent({
            delay: 16, // 60fps
            callback: () => {
                bullet.x += velocityX;
                bullet.y += velocityY;

                // Check if bullet hits target
                const distance = Phaser.Math.Distance.Between(bullet.x, bullet.y, target.x, target.y);
                if (distance < 20) {
                    target.takeDamage(this.damage);
                    bullet.destroy();
                }
                // Destroy bullet if it goes too far
                else if (Math.abs(bullet.x - this.x) > this.attackRange) {
                    bullet.destroy();
                }
            },
            loop: true
        });
    }

    canAttack(enemies, allies) {
        if (!enemies.length) return false;
        
        // Get position in formation (index from front)
        const positionInLine = allies.indexOf(this);
        
        // Can only attack if first or second in line
        if (positionInLine > 1) return false;
        
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

    update() {
        switch (this.state) {
            case 'walking':
                if (this.anims.currentAnim?.key !== 'ranged-walk') {
                    this.play('ranged-walk');
                }
                break;
            case 'attacking':
                if (this.anims.currentAnim?.key !== 'ranged-attack') {
                    this.play('ranged-attack');
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
} 