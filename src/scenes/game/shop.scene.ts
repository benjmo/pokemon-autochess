import * as Phaser from 'phaser';
import { buyablePokemon } from '../../core/pokemon.model';
import { Button } from '../../objects/button.object';
import { Player } from '../../objects/player.object';
import { PokemonForSaleObject } from '../../objects/pokemon-for-sale.object';
import { Coords } from './combat/combat.helpers';
import { GameScene } from './game.scene';

const CELL_WIDTH = 70;
const CELL_COUNT = 6;
const POKEMON_OFFSET = 20;
const REROLL_COST = 2;
const BORDER_SIZE = 100;

export class ShopScene extends Phaser.Scene {
  static readonly KEY = 'ShopScene';
  private centre: Coords = { x: 0, y: 0 };
  private pokemonForSale: PokemonForSaleObject[] = new Array(CELL_COUNT);

  public player: Player; // hacky temporary solution

  constructor() {
    super({
      key: ShopScene.KEY,
    });
  }

  create(): void {
    this.drawBase();
    this.reroll();

    const rerollButton = this.add.existing(
      new Button(this, this.centre.x, this.centre.y + 60, 'Reroll')
    );

    rerollButton.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => {
      // maybe not best to be handled by the shop
      if (this.player.gold >= REROLL_COST) {
        this.player.gold -= REROLL_COST;
        this.reroll();
      } else {
        console.log('Not enough gold to reroll');
      }
    });

    this.input.on(
      Phaser.Input.Events.POINTER_DOWN,
      (event: Phaser.Input.Pointer) => {
        const i = this.getShopIndexForCoordinates({
          x: event.downX,
          y: event.downY,
        });
        if (i !== undefined) {
          if (this.pokemonForSale[i] === undefined) {
            console.log('No pokemon here');
            return;
          }

          if (!this.buyPokemon(i)) {
            console.log('Not enough gold to buy this pokemon');
          }
        }
      }
    );
  }

  setCentre(centre: Coords): void {
    this.centre = centre;
  }

  /**
   * Draws the shop without the pokemon
   */
  drawBase(): void {
    const width = CELL_WIDTH * CELL_COUNT + BORDER_SIZE;
    const height = CELL_WIDTH + BORDER_SIZE;
    this.add.rectangle(this.centre.x, this.centre.y, width, height, 0x2f4858);

    this.add.grid(
      this.centre.x, // center x
      this.centre.y - POKEMON_OFFSET, // center y
      CELL_WIDTH * CELL_COUNT, // total width
      CELL_WIDTH, // total height
      CELL_WIDTH, // cell width
      CELL_WIDTH, // cell height
      0, // fill: none
      0, // fill alpha: transparent
      0xffaa00, // lines: yellow
      1 // line alpha: solid
    );
  }

  /**
   * Refreshes the shop with new pokemon.
   */
  reroll(): void {
    // Remove the old pokemon
    this.pokemonForSale.forEach(pokemon => {
      pokemon.destroy();
    });

    // For now, just populate with random pokemon
    for (let i = 0; i < CELL_COUNT; ++i) {
      const currCoords = this.getCoordinatesForShopIndex(i);
      this.pokemonForSale[i] = new PokemonForSaleObject(
        this,
        currCoords,
        buyablePokemon[Math.floor(Math.random() * buyablePokemon.length)]
      );
    }
  }

  buyPokemon(index: number): boolean {
    const price = this.pokemonForSale[index].cost;
    if (this.player.gold < price) {
      return false;
    }

    const gameScene = this.scene.get(GameScene.KEY) as GameScene;
    if (!gameScene.canAddPokemonToSideboard()) {
      return false;
    }

    gameScene.addPokemonToSideboard(this.pokemonForSale[index].pokemonName);
    this.player.gold -= price;
    this.pokemonForSale[index].destroy();
    delete this.pokemonForSale[index];

    return true;
  }

  /**
   * Returns the graphical x and y coordinates for a spot in the sideboard.
   */
  getCoordinatesForShopIndex(i: number): Coords {
    return {
      x: this.centre.x + CELL_WIDTH * (i - (CELL_COUNT - 1) / 2),
      y: this.centre.y - POKEMON_OFFSET,
    };
  }

  /**
   * Returns the sideboard index for a graphical coordinate,
   * or `undefined` if the point isn't within the sideboard
   */
  getShopIndexForCoordinates({ x, y }: Coords): number | undefined {
    // 35 = CELL_WIDTH / 2
    // ie. the distance to the top of the sideboard
    if (
      y < this.centre.y - POKEMON_OFFSET - 35 ||
      y > this.centre.y - POKEMON_OFFSET + 35
    ) {
      return undefined;
    }

    // (this.centre.x - CELL_WIDTH * CELL_COUNT / 2)
    // is the distance from start of grid to the left edge of the sideboard
    const index =
      (x - (this.centre.x - (CELL_WIDTH * CELL_COUNT) / 2)) / CELL_WIDTH;
    if (index < 0 || index >= CELL_COUNT) {
      return undefined;
    }
    return Math.floor(index);
  }
}
