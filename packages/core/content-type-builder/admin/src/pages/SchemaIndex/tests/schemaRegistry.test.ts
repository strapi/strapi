import {
  clearSchemaRegistry,
  getSchemaColumns,
  getSchemaFilters,
  registerSchemaColumn,
  registerSchemaFilter,
} from '../schemaRegistry';

const Cell = () => null;

const column = (id: string, appliesTo?: Array<'contentType' | 'component'>) => ({
  id,
  header: { id: `header.${id}`, defaultMessage: id },
  Cell,
  ...(appliesTo ? { appliesTo } : {}),
});

beforeEach(() => {
  clearSchemaRegistry();
});

describe('schema registry', () => {
  it('keeps columns in registration order', () => {
    registerSchemaColumn(column('i18n'));
    registerSchemaColumn(column('workspaces'));

    expect(getSchemaColumns('contentType').map((c) => c.id)).toEqual(['i18n', 'workspaces']);
  });

  /**
   * Registration runs on every plugin bootstrap, and a plugin that registers
   * twice must not double its column.
   */
  it('replaces a column registered twice under the same id', () => {
    registerSchemaColumn(column('i18n'));
    registerSchemaColumn({ ...column('i18n'), header: { id: 'x', defaultMessage: 'Localized' } });

    const columns = getSchemaColumns('contentType');
    expect(columns).toHaveLength(1);
    expect(columns[0].header.defaultMessage).toBe('Localized');
  });

  /**
   * Components have no entries, so options about entries say nothing about
   * them — the default keeps plugin columns off that tab.
   */
  it('gives components only the columns that claim them', () => {
    registerSchemaColumn(column('i18n'));
    registerSchemaColumn(column('usage', ['contentType', 'component']));

    expect(getSchemaColumns('component').map((c) => c.id)).toEqual(['usage']);
    expect(getSchemaColumns('contentType').map((c) => c.id)).toEqual(['i18n', 'usage']);
  });

  it('registers filters the same way', () => {
    const filter = {
      id: 'i18n',
      label: { id: 'i18n', defaultMessage: 'Internationalization' },
      useOptions: () => [{ value: 'on', label: 'On' }],
      matches: () => true,
    };

    registerSchemaFilter(filter);
    registerSchemaFilter(filter);

    expect(getSchemaFilters()).toHaveLength(1);
  });
});
