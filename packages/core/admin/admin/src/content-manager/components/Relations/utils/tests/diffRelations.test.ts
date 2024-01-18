import { diffRelations } from '../diffRelations';

describe('diffRelations', () => {
  test('given that the browserState and serverState are the same it should return an array with two empty arrays', () => {
    const browserState = [
      {
        id: '1',
        name: 'Relation 1',
        __temp_key__: 1,
      },
      {
        id: '2',
        name: 'Relation 2',
        __temp_key__: 2,
      },
    ];
    const serverState = [
      {
        id: '1',
        name: 'Relation 1',
        __temp_key__: 1,
      },
      {
        id: '2',
        name: 'Relation 2',
        __temp_key__: 2,
      },
    ];

    expect(diffRelations(browserState, serverState)).toMatchInlineSnapshot(`
      [
        [],
        [],
      ]
    `);
  });

  test('given that the browserState is missing an ID that is in the serverState I should have that ID in the disconnect array', () => {
    const browserState = [
      {
        id: '1',
        name: 'Relation 1',
        __temp_key__: 1,
      },
    ];
    const serverState = [
      {
        id: '1',
        name: 'Relation 1',
        __temp_key__: 1,
      },
      {
        id: '2',
        name: 'Relation 2',
        __temp_key__: 2,
      },
    ];

    expect(diffRelations(browserState, serverState)).toMatchInlineSnapshot(`
      [
        [],
        [
          "2",
        ],
      ]
    `);
  });

  test('given that the browserState has one ID more than the serverState I should have that ID in the connect array', () => {
    const browserState = [
      {
        id: '1',
        name: 'Relation 1',
        __temp_key__: 1,
      },
      {
        id: '2',
        name: 'Relation 2',
        __temp_key__: 2,
      },
    ];
    const serverState = [
      {
        id: '1',
        name: 'Relation 1',
        __temp_key__: 1,
      },
    ];

    expect(diffRelations(browserState, serverState)).toMatchInlineSnapshot(`
      [
        [
          "2",
        ],
        [],
      ]
    `);
  });

  test('given that the browserState is completely different to the serverState the return value should reflect this', () => {
    const browserState = [
      {
        id: '1',
        name: 'Relation 1',
        __temp_key__: 1,
      },
      {
        id: '2',
        name: 'Relation 2',
        __temp_key__: 2,
      },
    ];
    const serverState = [
      {
        id: '3',
        name: 'Relation 3',
        __temp_key__: 3,
      },
      {
        id: '4',
        name: 'Relation 4',
        __temp_key__: 4,
      },
    ];

    expect(diffRelations(browserState, serverState)).toMatchInlineSnapshot(`
      [
        [
          "1",
          "2",
        ],
        [
          "3",
          "4",
        ],
      ]
    `);
  });
});
