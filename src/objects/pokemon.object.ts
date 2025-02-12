import * as Phaser from 'phaser';
import { Pokemon, pokemonData, PokemonName } from '../core/pokemon.model';
import { generateId, getBaseTexture } from '../helpers';
import { Coords, getTurnDelay } from '../scenes/game/combat/combat.helpers';
import { FloatingText } from './floating-text.object';

interface SpriteParams {
  readonly scene: Phaser.Scene;
  readonly x: number;
  readonly y: number;
  readonly name: PokemonName;
  readonly frame?: string | number;
  readonly side: 'player' | 'enemy';
}

export type PokemonAnimationType = 'left' | 'right' | 'up' | 'down';

export class PokemonObject extends Phaser.Physics.Arcade.Sprite {
  public static readonly Events = {
    Dead: 'dead',
  } as const;

  /**
   * A hacky little way of adding an outline to a Pokemon.
   * Draws a second, slightly larger sprite which serves as the outline.
   */
  outlineSprite: Phaser.GameObjects.Sprite;
  isOutlined = false;

  /** HP and PP bars above the Pokemon */
  bars: Phaser.GameObjects.Graphics;
  currentHP: number;
  maxHP: number;
  currentPP: number;
  maxPP?: number;

  id: string;
  name: PokemonName;
  side: 'player' | 'enemy';
  basePokemon: Pokemon;

  // TODO: clean up messiness in model
  constructor(params: SpriteParams) {
    super(
      params.scene,
      params.x,
      params.y,
      getBaseTexture(params.name),
      params.frame
    );

    // generate a random ID
    this.id = generateId();
    this.name = params.name;
    this.basePokemon = pokemonData[params.name];

    // load data from Pokemon data
    this.maxHP = this.basePokemon.maxHP;
    this.currentHP = this.maxHP;
    this.maxPP = this.basePokemon.maxPP;
    this.currentPP = 0;
    this.side = params.side;

    this.outlineSprite = this.scene.add
      .sprite(this.x, this.y, this.texture.key, params.frame)
      .setOrigin(0.5, 0.5)
      .setDisplaySize(this.width + 8, this.height + 8)
      .setTintFill(0xffffff)
      .setVisible(false);

    // default state is facing the player
    this.playAnimation('down');

    this.bars = this.scene.add
      .graphics({
        x: this.x,
        y: this.y,
      })
      .setDepth(1);
    this.redrawBars();
  }

  initPhysics() {
    // set circle to be small % of the body
    this.body.setCircle(this.height / 4);
  }

  setPosition(x: number, y: number) {
    super.setPosition(x, y);
    if (this.outlineSprite) {
      this.outlineSprite.setPosition(x, y);
    }
    if (this.bars) {
      this.bars.setPosition(x, y);
    }
    return this;
  }

  setVisible(visible: boolean) {
    this.bars.setVisible(visible);
    this.outlineSprite.setVisible(visible && this.isOutlined);
    return super.setVisible(visible);
  }

  destroy() {
    this.outlineSprite.destroy();
    this.bars.destroy();
    super.destroy();
  }

  redrawBars() {
    this.bars.clear();

    // The stat bars section is 10px tall
    // 1px of top border
    // 5px of hp bar
    // 1px of inner border
    // 2px of pp bar
    // 1 px of bottom border

    // bar background
    this.bars.fillStyle(0x000000, 1);
    this.bars.fillRect(-this.width / 2, -this.height / 2, this.width, 10);

    // hp bar
    const hpBarColor =
      this.side === 'player'
        ? 0x32cd32 // player: green
        : 0xdc143c; // enemy: red
    this.bars.fillStyle(hpBarColor, 1);
    this.bars.fillRect(
      -this.width / 2 + 1,
      -this.height / 2 + 1,
      this.width * (this.currentHP / this.maxHP) - 2,
      5
    );

    // pp bar
    this.bars.fillStyle(0x67aacb, 1); // sky blue
    this.bars.fillRect(
      -this.width / 2 + 1,
      -this.height / 2 + 7, // offset by 6 to put below the HP bar
      this.maxPP
        ? Math.max(0, this.width * (this.currentPP / this.maxPP) - 2) // use current PP if available
        : 0, // empty if no PP
      2
    );
  }

  public playAnimation(type: PokemonAnimationType) {
    this.play(`${this.texture.key}--${type}`);
    this.outlineSprite.play(`${this.texture.key}--${type}`);
  }

  public move({ x, y }: Coords) {
    this.scene.add.tween({
      targets: [this, this.bars],
      duration: getTurnDelay(this.basePokemon) * 0.75,
      x,
      y,
      ease: 'Quad',
      onComplete: () => {
        this.setPosition(x, y);
      },
    });
  }

  /**
   * Cause this pokemon to deal damage
   * Triggers effects that happen on attack, such as mana generation
   */
  public dealDamage(amount: number) {
    // damage / 10, capped at 2
    if (this.maxPP && this.currentPP < this.maxPP) {
      this.currentPP = Math.min(
        this.maxPP,
        this.currentPP + Math.min(2, Math.round(amount / 10))
      );
    }
    this.redrawBars();
  }

  /**
   * Cause this pokemon to take damage
   */
  public takeDamage(amount: number) {
    if (amount < 0 || this.currentHP <= 0) {
      return;
    }
    if (this.maxPP && this.currentPP < this.maxPP) {
      this.currentPP = Math.min(
        this.maxPP,
        this.currentPP + Math.min(2, Math.round(amount / 10))
      );
    }
    const actualDamage = Math.min(this.currentHP, amount);
    this.currentHP -= actualDamage;
    this.redrawBars();

    // display damage text
    this.scene.add.existing(
      new FloatingText(this.scene, this.x, this.y, `${amount}`)
    );
    // play flash effect
    this.scene.add.tween({
      targets: this,
      duration: 66,
      alpha: 0.9,
      onStart: () => this.setTint(0xdddddd), // slight darken
      onComplete: () => this.clearTint(),
    });

    // TODO: move this somewhere more appropriate?
    if (this.currentHP === 0) {
      // destroy UI elements first
      this.bars.destroy();
      this.emit(PokemonObject.Events.Dead);
      // add fade-out animation
      this.scene.add.tween({
        targets: this,
        duration: 600,
        ease: 'Exponential.Out',
        alpha: 0,
        onComplete: () => {
          this.destroy();
        },
        callbackScope: this,
      });
    }
  }

  public toggleOutline(): this {
    this.isOutlined = !this.isOutlined;
    this.outlineSprite.setVisible(this.isOutlined);
    return this;
  }
}
