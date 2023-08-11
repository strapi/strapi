import { validateWorkflow } from '../validateWorkflow';

const generateStringWithLength = (length) => new Array(length + 1).join('_');

const formatMessage = (message) => message.defaultMessage;

const setup = (values) => validateWorkflow({ values, formatMessage });

describe('Settings | Review Workflows | validateWorkflow()', () => {
  test('name: valid input', async () => {
    expect(await setup({ name: 'short name' })).toEqual(true);
  });

  test('name: empty', async () => {
    expect(await setup({ name: '' })).toMatchInlineSnapshot(`
      {
        "name": "name is a required field",
      }
    `);
  });

  test('name: too long', async () => {
    expect(await setup({ name: generateStringWithLength(256) })).toMatchInlineSnapshot(`
      {
        "name": "Name can not be longer than 255 characters",
      }
    `);
  });

  test('contentTypes: valid input', async () => {
    expect(await setup({ name: 'name', contentTypes: ['1'] })).toEqual(true);
  });

  test('stages: empty array', async () => {
    expect(
      await setup({
        name: 'name',
        stages: [],
      })
    ).toMatchInlineSnapshot(`
      {
        "stages": "stages field must have at least 1 items",
      }
    `);
  });

  test('stages.name: valid input', async () => {
    expect(
      await setup({
        name: 'name',
        stages: [
          {
            name: 'stage-1',
            color: '#ffffff',
          },
        ],
      })
    ).toEqual(true);
  });

  test('stages.name: duplicated name', async () => {
    expect(
      await setup({
        name: 'name',
        stages: [
          {
            name: 'stage-1',
            color: '#ffffff',
          },

          {
            name: 'stage-1',
            color: '#ffffff',
          },
        ],
      })
    ).toMatchInlineSnapshot(`
      {
        "stages": [
          {
            "name": "Stage name must be unique",
          },
          {
            "name": "Stage name must be unique",
          },
        ],
      }
    `);
  });

  test('stages.name: name too long', async () => {
    expect(
      await setup({
        name: 'name',
        stages: [
          {
            name: generateStringWithLength(256),
            color: '#ffffff',
          },
        ],
      })
    ).toMatchInlineSnapshot(`
      {
        "stages": [
          {
            "name": "Name can not be longer than 255 characters",
          },
        ],
      }
    `);
  });

  test('stages.color: valid input', async () => {
    expect(
      await setup({
        name: 'name',
        stages: [
          {
            name: 'stage-1',
            color: '#ffffff',
          },
        ],
      })
    ).toEqual(true);
  });

  test('stages.color: invalid hex code', async () => {
    expect(
      await setup({
        name: 'name',
        stages: [
          {
            name: 'stage-1',
            color: 'non-hex-code',
          },
        ],
      })
    ).toMatchInlineSnapshot(`
      {
        "stages": [
          {
            "color": "stages[0].color must match the following: "/^#(?:[0-9a-fA-F]{3}){1,2}$/i"",
          },
        ],
      }
    `);
  });
});
