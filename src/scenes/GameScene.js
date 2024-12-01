import Soldier from '../entities/Soldier.js';
import RangedSoldier from '../entities/RangedSoldier.js';

export default class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
        this.playerGold = 10000;
        this.enemyGold = 10000;
        this.spawnCooldown = false;
        this.GAME_WIDTH = 1200;
        this.GAME_HEIGHT = 600;
        this.GROUND_Y = 450;
        this.SOLDIER_Y = this.GAME_HEIGHT - 80;
        this.SOLDIER_SPACING = 15;
        this.ATTACK_RANGE = 25;
        this.spawnQueue = [];
        this.maxQueueSize = 5;
        this.spawnInterval = 1000; // 1 second between spawns
        this.lastSpawnTime = 0;
    }

    preload() {
        this.load.svg('base', 'src/assets/base.svg');
        this.load.svg('soldier-1', 'src/assets/soldier-1.svg');
        this.load.svg('soldier-2', 'src/assets/soldier-2.svg');
        this.load.svg('soldier-attack-1', 'src/assets/soldier-attack-1.svg');
        this.load.svg('soldier-attack-2', 'src/assets/soldier-attack-2.svg');
        this.load.svg('soldier-wait', 'src/assets/soldier-wait.svg');
        this.load.svg('ranged-soldier-1', 'src/assets/ranged-soldier-1.svg');
        this.load.svg('ranged-soldier-2', 'src/assets/ranged-soldier-2.svg');
        this.load.svg('ranged-soldier-attack-1', 'src/assets/ranged-soldier-attack-1.svg');
        this.load.svg('ranged-soldier-attack-2', 'src/assets/ranged-soldier-attack-2.svg');
    }

    create() {
        this.createAnimations();

        // Background
        this.cameras.main.setBackgroundColor('#4488AA');
        this.add.rectangle(this.GAME_WIDTH/2, this.GAME_HEIGHT - 50, this.GAME_WIDTH, 100, 0x654321);

        // Create bases
        this.playerBase = this.add.image(150, this.GROUND_Y, 'base')
            .setTint(0x0000ff)
            .setScale(1.5);
        this.enemyBase = this.add.image(this.GAME_WIDTH - 150, this.GROUND_Y, 'base')
            .setTint(0xff0000)
            .setScale(1.5);
        
        // Base HP
        this.playerBase.hp = 1000;
        this.enemyBase.hp = 1000;

        // HP bars
        this.playerBaseHP = this.createHealthBar(150, this.GROUND_Y - 120, 100, 10);
        this.enemyBaseHP = this.createHealthBar(this.GAME_WIDTH - 150, this.GROUND_Y - 120, 100, 10);
        
        // HP text
        this.playerBaseHPText = this.add.text(100, this.GROUND_Y - 140, `Base: ${this.playerBase.hp}`, { fontSize: '16px', fill: '#fff' });
        this.enemyBaseHPText = this.add.text(this.GAME_WIDTH - 200, this.GROUND_Y - 140, `Base: ${this.enemyBase.hp}`, { fontSize: '16px', fill: '#fff' });

        // Soldier groups
        this.playerSoldiers = [];
        this.enemySoldiers = [];

        // UI
        const spawnButton = this.add.rectangle(100, 550, 140, 40, 0x00ff00);
        spawnButton.setInteractive();
        spawnButton.on('pointerdown', () => this.queueSoldier('player', 'melee'));
        
        const spawnText = this.add.text(50, 540, 'Spawn Melee (20g)', { 
            fontSize: '16px', 
            fill: '#fff' 
        });

        // Create spawn button for ranged soldiers
        const spawnRangedButton = this.add.rectangle(260, 550, 140, 40, 0x00aaff);
        spawnRangedButton.setInteractive();
        spawnRangedButton.on('pointerdown', () => this.queueSoldier('player', 'ranged'));
        
        const spawnRangedText = this.add.text(210, 540, 'Spawn Ranged (30g)', { 
            fontSize: '16px', 
            fill: '#fff' 
        });

        // Add spawn cooldown progress bar
        this.spawnCooldownBar = this.add.rectangle(220, 50, 100, 10, 0x666666);
        this.spawnCooldownProgress = this.add.rectangle(220, 50, 100, 10, 0x00ff00);
        this.spawnCooldownBar.setOrigin(0.5, 0.5);
        this.spawnCooldownProgress.setOrigin(0, 0.5);
        this.spawnCooldownProgress.x = this.spawnCooldownBar.x - (this.spawnCooldownBar.width / 2);
        this.spawnCooldownProgress.setScale(0, 1); // Start empty
        
        // Queue squares display (moved below the progress bar)
        this.queueSquares = [];
        const squareSize = 20;
        const squareSpacing = 25;
        const startX = 170;
        
        for (let i = 0; i < this.maxQueueSize; i++) {
            const square = this.add.rectangle(
                startX + (i * squareSpacing),
                80, // Moved down below the progress bar
                squareSize,
                squareSize,
                0x666666
            );
            square.setStrokeStyle(2, 0x00ff00);
            this.queueSquares.push(square);
        }
        
        this.goldText = this.add.text(10, 10, `Gold: ${this.playerGold}`, { fontSize: '16px', fill: '#fff' });
        
        // Start the spawn processor
        this.time.addEvent({
            delay: 100,
            callback: this.processSpawnQueue,
            callbackScope: this,
            loop: true
        });
    }

    createAnimations() {
        // Regular soldier animations
        this.anims.create({
            key: 'walk',
            frames: [{ key: 'soldier-1' }, { key: 'soldier-2' }],
            frameRate: 4,
            repeat: -1
        });

        this.anims.create({
            key: 'attack',
            frames: [{ key: 'soldier-attack-1' }, { key: 'soldier-attack-2' }],
            frameRate: 4,
            repeat: -1
        });

        // Ranged soldier animations
        this.anims.create({
            key: 'ranged-walk',
            frames: [{ key: 'ranged-soldier-1' }, { key: 'ranged-soldier-2' }],
            frameRate: 4,
            repeat: -1
        });

        this.anims.create({
            key: 'ranged-attack',
            frames: [{ key: 'ranged-soldier-attack-1' }, { key: 'ranged-soldier-attack-2' }],
            frameRate: 4,
            repeat: -1
        });
    }

    createHealthBar(x, y, width, height) {
        const background = this.add.rectangle(x, y, width, height, 0xff0000);
        const foreground = this.add.rectangle(x, y, width, height, 0x00ff00);
        
        // Center both bars
        background.setOrigin(0.5, 0.5);
        foreground.setOrigin(0, 0.5);
        
        // Adjust foreground position to align with background
        foreground.x = background.x - (width / 2);
        
        return { background, foreground };
    }

    queueSoldier(team, unitType) {
        const cost = unitType === 'ranged' ? 30 : 20;
        
        if (team === 'player' && this.playerGold >= cost && this.spawnQueue.length < this.maxQueueSize) {
            this.spawnQueue.push({ team, cost, unitType });
            this.playerGold -= cost;
            this.goldText.setText(`Gold: ${this.playerGold}`);
            
            // Fill the next empty square
            this.queueSquares[this.spawnQueue.length - 1].setFillStyle(unitType === 'ranged' ? 0x00aaff : 0x00ff00);
        }
    }

    processSpawnQueue() {
        const currentTime = this.time.now;
        
        if (this.spawnQueue.length > 0) {
            // Update cooldown progress bar
            const timeSinceLastSpawn = currentTime - this.lastSpawnTime;
            const progress = Math.min(timeSinceLastSpawn / this.spawnInterval, 1);
            this.spawnCooldownProgress.setScale(progress, 1);
            
            if (timeSinceLastSpawn >= this.spawnInterval) {
                const { team, unitType } = this.spawnQueue.shift();
                
                // Reset progress bar
                this.spawnCooldownProgress.setScale(0, 1);
                
                // Update queue squares
                for (let i = 0; i < this.maxQueueSize; i++) {
                    if (i < this.spawnQueue.length) {
                        const queuedUnit = this.spawnQueue[i];
                        this.queueSquares[i].setFillStyle(queuedUnit.unitType === 'ranged' ? 0x00aaff : 0x00ff00);
                    } else {
                        this.queueSquares[i].setFillStyle(0x666666);
                    }
                }
                
                if (team === 'player') {
                    let soldier;
                    if (unitType === 'ranged') {
                        soldier = new RangedSoldier(this, 200, this.SOLDIER_Y, 'player');
                    } else {
                        soldier = new Soldier(this, 200, this.SOLDIER_Y, 'player');
                    }
                    this.playerSoldiers.push(soldier);
                }
                
                this.lastSpawnTime = currentTime;
            }
        } else {
            // No units in queue, keep progress bar empty
            this.spawnCooldownProgress.setScale(0, 1);
        }
    }

    update() {
        // Enemy AI
        if (Math.random() < 0.01 && this.enemyGold >= 20) {
            const soldier = new Soldier(this, this.GAME_WIDTH - 200, this.SOLDIER_Y, 'enemy');
            this.enemySoldiers.push(soldier);
            this.enemyGold -= 20;
        }

        // Update soldiers
        this.updateSoldiers(this.playerSoldiers, this.enemySoldiers, this.enemyBase, 1);
        this.updateSoldiers(this.enemySoldiers, this.playerSoldiers, this.playerBase, -1);
    }

    updateSoldiers(soldiers, enemies, enemyBase, direction) {
        const MINIMUM_SPACING = 40;

        for (let i = soldiers.length - 1; i >= 0; i--) {
            const soldier = soldiers[i];
            const soldierInFront = soldiers[i - 1];
            
            if (soldierInFront) {
                const distance = Math.abs(soldier.x - soldierInFront.x);
                if (distance < MINIMUM_SPACING) {
                    soldier.state = 'waiting';
                    soldier.update();
                    continue;
                }
            }

            if (soldier.state === 'waiting') {
                soldier.state = 'walking';
            }

            // Check for combat
            if (enemies.length > 0) {
                if (soldier.canAttack(enemies, soldiers)) {
                    soldier.state = 'attacking';
                    const closestEnemy = enemies.reduce((closest, enemy) => {
                        const distance = Math.abs(soldier.x - enemy.x);
                        if (!closest || distance < Math.abs(soldier.x - closest.x)) {
                            return enemy;
                        }
                        return closest;
                    }, null);

                    const enemyDied = soldier.attack(closestEnemy);
                    if (enemyDied) {
                        const enemyIndex = enemies.indexOf(closestEnemy);
                        closestEnemy.destroy();
                        enemies.splice(enemyIndex, 1);
                        soldier.state = 'walking';
                    }
                } else if (soldier.state !== 'waiting') {
                    soldier.state = 'walking';
                    soldier.x += soldier.speed;
                }
            }
            // Base attacking logic
            else if (Math.abs(soldier.x - enemyBase.x) < this.ATTACK_RANGE) {
                soldier.state = 'attacking';
                enemyBase.hp -= 0.42;
                this.updateBaseHealth(enemyBase);

                if (enemyBase.hp <= 0) {
                    this.handleBaseDestruction(enemyBase);
                    soldier.destroy();
                    soldiers.splice(i, 1);
                    continue;
                }
            } 
            else if (soldier.state === 'walking') {
                soldier.x += soldier.speed;
            }

            soldier.update();
        }
    }

    updateBaseHealth(base) {
        const hp = base === this.playerBase ? this.playerBaseHP : this.enemyBaseHP;
        const text = base === this.playerBase ? this.playerBaseHPText : this.enemyBaseHPText;
        const healthPercent = Math.max(0, base.hp / 1000);
        hp.foreground.setScale(healthPercent, 1);
        text.setText(`Base: ${Math.ceil(base.hp)}`);
    }

    handleBaseDestruction(base) {
        base.destroy();
        const hp = base === this.playerBase ? this.playerBaseHP : this.enemyBaseHP;
        const text = base === this.playerBase ? this.playerBaseHPText : this.enemyBaseHPText;
        hp.background.destroy();
        hp.foreground.destroy();
        text.setText('Destroyed!');
    }
} 
