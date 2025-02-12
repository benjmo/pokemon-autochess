import * as expect from 'expect';
import { PokemonObject } from '../../../objects/pokemon.object';
import { getFacing, getNearestTarget, pathfind } from './combat.helpers';

// eslint-disable-next-line @typescript-eslint/no-object-literal-type-assertion
const playerMock = { side: 'player' } as PokemonObject;
// eslint-disable-next-line @typescript-eslint/no-object-literal-type-assertion
const enemyMock = { side: 'enemy' } as PokemonObject;

describe('getNearestTarget', () => {
  it(`should find an enemy if they're right next to the player
      ...
      .AB
      ...`, () => {
    expect(
      getNearestTarget(
        [[], [undefined, playerMock], [undefined, enemyMock]],
        { x: 1, y: 1 },
        3,
        3
      )
    ).toEqual({ x: 2, y: 1 });
  });

  it(`should find an enemy if they're right above the player
      .B.
      .A.
      ...`, () => {
    expect(
      getNearestTarget(
        [[], [enemyMock, playerMock, undefined], []],
        { x: 1, y: 1 },
        3,
        3
      )
    ).toEqual({ x: 1, y: 0 });
  });

  it(`should not break if it can't find anything
      ...
      .A.
      ...`, () => {
    expect(
      getNearestTarget(
        [[], [undefined, playerMock, undefined], []],
        { x: 1, y: 1 },
        3,
        3
      )
    ).toEqual(undefined);
  });

  it(`should not break if it isn't given a valid player can't find anything
      ...
      ...
      ...`, () => {
    expect(getNearestTarget([[], [], []], { x: 1, y: 1 }, 3, 3)).toEqual(
      undefined
    );
  });

  it(`should prioritise enemies in a clockwise order
      .b.
      .AB
      ...`, () => {
    expect(
      getNearestTarget(
        [[], [undefined, playerMock, enemyMock], [undefined, enemyMock]],
        { x: 1, y: 1 },
        3,
        3
      )
    ).toEqual({ x: 2, y: 1 });
  });

  it(`should ignore allies
      ...
      .Aa
      .B.`, () => {
    expect(
      getNearestTarget(
        [[], [undefined, playerMock, enemyMock], [undefined, playerMock]],
        { x: 1, y: 1 },
        3,
        3
      )
    ).toEqual({ x: 1, y: 2 });
  });

  it(`should work at longer distances
      ...
      A.B
      ...`, () => {
    expect(
      getNearestTarget(
        [[undefined, playerMock], [], [undefined, enemyMock]],
        { x: 0, y: 1 },
        3,
        3
      )
    ).toEqual({ x: 2, y: 1 });
  });

  it(`should prioritise closer units
      ...
      A.b
      B..`, () => {
    expect(
      getNearestTarget(
        [[undefined, playerMock, enemyMock], [], [undefined, enemyMock]],
        { x: 0, y: 1 },
        3,
        3
      )
    ).toEqual({ x: 0, y: 2 });
  });

  it(`should work in the top-right quadrant
      ..B
      ...
      A..`, () => {
    expect(
      getNearestTarget(
        [[undefined, undefined, playerMock], [], [enemyMock]],
        { x: 0, y: 2 },
        3,
        3
      )
    ).toEqual({ x: 2, y: 0 });
  });

  it(`should work in the bottom-right quadrant
      A..
      ...
      ..B`, () => {
    expect(
      getNearestTarget(
        [[playerMock], [], [undefined, undefined, enemyMock]],
        { x: 0, y: 0 },
        3,
        3
      )
    ).toEqual({ x: 2, y: 2 });
  });

  it(`should work in the bottom-left quadrant
      ..A
      ...
      B..`, () => {
    expect(
      getNearestTarget(
        [[undefined, undefined, enemyMock], [], [playerMock]],
        { x: 2, y: 0 },
        3,
        3
      )
    ).toEqual({ x: 0, y: 2 });
  });

  it(`should work in the top-left quadrant
      B..
      ...
      ..A`, () => {
    expect(
      getNearestTarget(
        [[enemyMock], [], [undefined, undefined, playerMock]],
        { x: 2, y: 2 },
        3,
        3
      )
    ).toEqual({ x: 0, y: 0 });
  });

  it(`should prioritise distant enemies in a clockwise order
      .b.
      A..
      .B.`, () => {
    expect(
      getNearestTarget(
        [[undefined, playerMock], [enemyMock, undefined, enemyMock], []],
        { x: 0, y: 1 },
        3,
        3
      )
    ).toEqual({ x: 1, y: 2 });
  });

  it(`should work for bigger boards
      ....
      .A..
      ...B
      ....`, () => {
    expect(
      getNearestTarget(
        [[], [undefined, playerMock], [], [undefined, undefined, enemyMock]],
        { x: 1, y: 1 },
        4,
        4
      )
    ).toEqual({ x: 3, y: 2 });
  });
});

describe('pathfind', () => {
  it(`should find a path between two points
    A>B
    ...
    ...`, () => {
    expect(
      pathfind(
        [[enemyMock], [], [playerMock]],
        { x: 0, y: 0 },
        { x: 2, y: 0 },
        1
      )
    ).toEqual({ x: 1, y: 0 });
  });

  it(`should find a path between distant points
    A>.
    ...
    ..B`, () => {
    expect(
      pathfind(
        [[enemyMock], [], [undefined, undefined, playerMock]],
        { x: 0, y: 0 },
        { x: 2, y: 2 },
        1
      )
    ).toEqual({ x: 1, y: 0 });
  });

  it(`should go around obstacles
    AX.
    v..
    ..B`, () => {
    expect(
      pathfind(
        [[enemyMock], [playerMock], [undefined, undefined, playerMock]],
        { x: 0, y: 0 },
        { x: 2, y: 2 },
        1
      )
    ).toEqual({ x: 0, y: 1 });
  });

  it(`should return cleanly if there's no path
    A.X
    .X.
    X.B`, () => {
    expect(
      pathfind(
        [
          [enemyMock, playerMock],
          [playerMock],
          [playerMock, undefined, playerMock],
        ],
        { x: 0, y: 0 },
        { x: 2, y: 2 },
        1
      )
    ).toEqual(undefined);
  });
});

describe('getFacing', () => {
  it('should return facing properly in cardinal directions', () => {
    expect(getFacing({ x: 0, y: 0 }, { x: 0, y: -3 })).toEqual('up');
    expect(getFacing({ x: 0, y: 0 }, { x: 0, y: 3 })).toEqual('down');
    expect(getFacing({ x: 0, y: 0 }, { x: -3, y: 0 })).toEqual('left');
    expect(getFacing({ x: 0, y: 0 }, { x: 3, y: 0 })).toEqual('right');
  });

  it('should return facing at a semi-horizontal angle', () => {
    expect(getFacing({ x: 0, y: 0 }, { x: 2, y: 1 })).toEqual('right');
  });

  it('should return facing at a semi-vertical angle', () => {
    expect(getFacing({ x: 0, y: 0 }, { x: 1, y: 2 })).toEqual('down');
  });

  it('should return something valid at a full diagonal', () => {
    expect(['up', 'down', 'left', 'right']).toContain(
      getFacing({ x: 0, y: 0 }, { x: 1, y: 1 })
    );
  });
});
