import queryParams from '../query-params';

describe('Documentation plugin | query params', () => {
  it('documents populate as either a string or an array of strings', () => {
    const populateParam = queryParams.find((param) => param.name === 'populate');

    expect(populateParam?.schema).toEqual({
      oneOf: [
        { type: 'string' },
        {
          type: 'array',
          items: {
            type: 'string',
          },
        },
      ],
    });
  });
});
