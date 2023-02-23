import { getSelectedValues, getNestedOptions, getNewStateFromChangedValues } from '../options';

describe('ActionRow | utils | getSelectedValues', () => {
  test('should reduce the default values to a flat array', () => {
    const FIXTURE = {
      something: {
        'admin::billing-amount-under-10k': false,
        'admin::billing-amount-above-20k': true,
      },
      default: {
        'admin::is-creator': true,
        'admin::has-same-role-as-creator': false,
      },
    };

    expect(getSelectedValues(FIXTURE)).toStrictEqual([
      'admin::billing-amount-above-20k',
      'admin::is-creator',
    ]);
  });
});

describe('ActionRow | utils | getNestedOptions', () => {
  test('should reduce the default values to a flat array', () => {
    const FIXTURE = [
      [
        'default',
        [
          {
            id: 'default:id:1',
            displayName: 'default:displayName:1',
            category: 'default:category',
          },

          {
            id: 'default:id:2',
            displayName: 'default:displayName:2',
            category: 'default:category',
          },
        ],
      ],

      [
        'something',
        [
          {
            id: 'something:id:1',
            displayName: 'something:displayName:1',
            category: 'something:category',
          },
        ],
      ],
    ];

    expect(getNestedOptions(FIXTURE)).toStrictEqual([
      {
        label: 'Default',
        children: [
          {
            label: 'default:displayName:1',
            value: 'default:id:1',
          },

          {
            label: 'default:displayName:2',
            value: 'default:id:2',
          },
        ],
      },

      {
        label: 'Something',
        children: [
          {
            label: 'something:displayName:1',
            value: 'something:id:1',
          },
        ],
      },
    ]);
  });
});

describe('ActionRow | utils | getNewStateFromChangedValues', () => {
  const FIXTURE_OPTIONS = [
    [
      'default',
      [
        {
          id: 'default:id:1',
          displayName: 'default:displayName:1',
          category: 'default:category',
        },

        {
          id: 'default:id:2',
          displayName: 'default:displayName:2',
          category: 'default:category',
        },
      ],
    ],

    [
      'something',
      [
        {
          id: 'something:id:1',
          displayName: 'something:displayName:1',
          category: 'something:category',
        },
      ],
    ],
  ];
  test('should generate false for all values if nothing was selected', () => {
    expect(getNewStateFromChangedValues(FIXTURE_OPTIONS, [])).toStrictEqual({
      'default:id:1': false,
      'default:id:2': false,
      'something:id:1': false,
    });
  });

  test('should generate true for selected values', () => {
    expect(getNewStateFromChangedValues(FIXTURE_OPTIONS, ['default:id:1'])).toStrictEqual({
      'default:id:1': true,
      'default:id:2': false,
      'something:id:1': false,
    });

    expect(
      getNewStateFromChangedValues(FIXTURE_OPTIONS, ['default:id:1', 'something:id:1'])
    ).toStrictEqual({
      'default:id:1': true,
      'default:id:2': false,
      'something:id:1': true,
    });
  });

  test('should ignore unknown values', () => {
    expect(getNewStateFromChangedValues(FIXTURE_OPTIONS, ['random:id:1'])).toStrictEqual({
      'default:id:1': false,
      'default:id:2': false,
      'something:id:1': false,
    });
  });
});
