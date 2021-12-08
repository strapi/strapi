import createAttributesLayout from '../createAttributesLayout';

describe('Content Manager | EditView | utils | createAttributesLayout', () => {
  it('Should return an array of size 1 if there is no dynamic zone', () => {
    const attributes = {
      full_name: {
        type: 'string',
      },
      postal_code: {
        type: 'string',
      },
      city: {
        type: 'string',
      },
      geolocation: {
        type: 'json',
      },
      dynamicZone1: {
        type: 'dynamiczone',
      },
    };
    const currentLayout = [
      [
        { name: 'full_name', size: 6 },
        { name: 'city', size: 6 },
      ],
      [{ name: 'postal_code', size: 6 }],
      [{ name: 'geolocation', size: 12 }],
    ];
    const expected = [
      [
        [
          { name: 'full_name', size: 6 },
          { name: 'city', size: 6 },
        ],
        [{ name: 'postal_code', size: 6 }],
        [{ name: 'geolocation', size: 12 }],
      ],
    ];

    expect(createAttributesLayout(currentLayout, attributes)).toEqual(expected);
  });

  it('Should return an array of size 2 if there is a dynamic zone at the end of the layout', () => {
    const attributes = {
      full_name: {
        type: 'string',
      },
      postal_code: {
        type: 'string',
      },
      city: {
        type: 'string',
      },
      geolocation: {
        type: 'json',
      },
      dynamicZone1: {
        type: 'dynamiczone',
      },
    };
    const currentLayout = [
      [
        { name: 'full_name', size: 6 },
        { name: 'city', size: 6 },
      ],
      [{ name: 'postal_code', size: 6 }],
      [{ name: 'geolocation', size: 12 }],
      [{ name: 'dynamicZone1', size: 12 }],
    ];
    const expected = [
      [
        [
          { name: 'full_name', size: 6 },
          { name: 'city', size: 6 },
        ],
        [{ name: 'postal_code', size: 6 }],
        [{ name: 'geolocation', size: 12 }],
      ],
      [[{ name: 'dynamicZone1', size: 12 }]],
    ];

    expect(createAttributesLayout(currentLayout, attributes)).toEqual(expected);
  });

  it('Should return an array of size 2 if there is a dynamic zone at the beginning of the layout', () => {
    const attributes = {
      full_name: {
        type: 'string',
      },
      postal_code: {
        type: 'string',
      },
      city: {
        type: 'string',
      },
      geolocation: {
        type: 'json',
      },
      dynamicZone1: {
        type: 'dynamiczone',
      },
      dynamicZone2: {
        type: 'dynamiczone',
      },
    };
    const currentLayout = [
      [{ name: 'dynamicZone1', size: 12 }],
      [
        { name: 'full_name', size: 6 },
        { name: 'city', size: 6 },
      ],

      [{ name: 'postal_code', size: 6 }],
      [{ name: 'geolocation', size: 12 }],
    ];
    const expected = [
      [[{ name: 'dynamicZone1', size: 12 }]],
      [
        [
          { name: 'full_name', size: 6 },
          { name: 'city', size: 6 },
        ],
        [{ name: 'postal_code', size: 6 }],
        [{ name: 'geolocation', size: 12 }],
      ],
    ];

    expect(createAttributesLayout(currentLayout, attributes)).toEqual(expected);
  });

  it('Should return an array of size 5 if there are 3 dynamic zones', () => {
    const attributes = {
      full_name: {
        type: 'string',
      },
      postal_code: {
        type: 'string',
      },
      city: {
        type: 'string',
      },
      geolocation: {
        type: 'json',
      },
      dynamicZone1: {
        type: 'dynamiczone',
      },
      dynamicZone2: {
        type: 'dynamiczone',
      },
      dynamicZone3: {
        type: 'dynamiczone',
      },
    };
    const currentLayout = [
      [{ name: 'dynamicZone1', size: 12 }],
      [
        { name: 'full_name', size: 6 },
        { name: 'city', size: 6 },
      ],
      [{ name: 'dynamicZone2', size: 12 }],
      [{ name: 'postal_code', size: 6 }],
      [{ name: 'geolocation', size: 12 }],
      [{ name: 'dynamicZone3', size: 12 }],
    ];
    const expected = [
      [[{ name: 'dynamicZone1', size: 12 }]],
      [
        [
          { name: 'full_name', size: 6 },
          { name: 'city', size: 6 },
        ],
      ],
      [[{ name: 'dynamicZone2', size: 12 }]],
      [[{ name: 'postal_code', size: 6 }], [{ name: 'geolocation', size: 12 }]],
      [[{ name: 'dynamicZone3', size: 12 }]],
    ];

    expect(createAttributesLayout(currentLayout, attributes)).toEqual(expected);
  });
});
