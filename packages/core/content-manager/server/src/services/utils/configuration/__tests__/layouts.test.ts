import { syncLayouts } from '../layouts';

jest.mock('../../../../utils', () => ({
  getService: jest.fn().mockReturnValue({
    getFieldSize: jest.fn().mockImplementation((type) => {
      if (type === 'integer' || type === 'string') {
        return { default: 6, isResizable: true };
      }

      if (type === 'json' || type === 'customField') {
        return { default: 12, isResizable: false };
      }
    }),
    hasFieldSize: jest.fn().mockImplementation((type) => {
      return type === 'customField';
    }),
  }),
}));

const createMockSchema = ({ attributes = {} }) => ({
  attributes: {
    id: { type: 'integer' },
    title: { type: 'string' },
    nodes: { type: 'json' },
    ...attributes,
  },
  config: {
    attributes: {
      title: {},
      nodes: {},
    },
  },
});

describe('Layouts', () => {
  it('should create default layouts with valid fields if no configuration is provided', async () => {
    const configuration = { layouts: {} };

    const layout = await syncLayouts(configuration, createMockSchema({}));

    expect(layout.list).toEqual(['id', 'title']);
    expect(layout.edit).toEqual([[{ name: 'title', size: 6 }], [{ name: 'nodes', size: 12 }]]);
  });

  it('should append new fields at the end of the layouts', async () => {
    const configuration = {
      layouts: {
        list: ['id', 'title'],
        edit: [[{ name: 'title', size: 6 }], [{ name: 'nodes', size: 12 }]],
      },
      metadatas: { id: {}, title: {}, nodes: {} },
    };
    const schema = createMockSchema({ attributes: { description: { type: 'string' } } });

    const layout = await syncLayouts(configuration, schema);

    expect(layout.list).toEqual(['id', 'title', 'description']);
    expect(layout.edit).toEqual([
      [{ name: 'title', size: 6 }],
      [{ name: 'nodes', size: 12 }],
      [{ name: 'description', size: 6 }],
    ]);
  });

  it('should use the custom field size if the field is a custom field with custom size', async () => {
    const configuration = {
      layouts: {
        list: ['id', 'title'],
        edit: [[{ name: 'title', size: 6 }], [{ name: 'nodes', size: 12 }]],
      },
      metadatas: { id: {}, title: {}, nodes: {} },
    };
    const schema = createMockSchema({
      attributes: { color: { type: 'string', customField: 'customField' } },
    });

    const layout = await syncLayouts(configuration, schema);

    expect(layout.list).toEqual(['id', 'title', 'color']);
    expect(layout.edit).toEqual([
      [{ name: 'title', size: 6 }],
      [{ name: 'nodes', size: 12 }],
      [{ name: 'color', size: 12 }],
    ]);
  });
});
