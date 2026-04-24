import { formatComponentConfigurationEditLayout } from '../formatComponentConfigurationEditLayout';

import type {
  Component,
  FindComponentConfiguration,
} from '../../../../shared/contracts/components';

/**
 * When a sub-component in `data.components` contains a **nested** component field,
 * `convertEditLayoutToFieldLayouts` must receive the same
 * `{ configurations, schemas }` context as the top-level call. Otherwise
 * `getMainField` sees an empty `components` map and throws
 * `Cannot read properties of undefined (reading 'attributes')` (#25509, comment on nested configure-the-view).
 */
describe('formatComponentConfigurationEditLayout', () => {
  const uidCta = 'blog.nested-cta' as const;
  const uidReport = 'blog.nested-report' as const;
  const uidSection = 'blog.section' as const;

  const ctaComponent = {
    uid: uidCta,
    category: 'blog',
    isDisplayed: true,
    apiID: 'nested-cta',
    info: {
      displayName: 'CTA',
      icon: 'link',
      description: '',
    },
    options: {},
    pluginOptions: {},
    attributes: {
      title: {
        type: 'string' as const,
        required: true,
        pluginOptions: {},
      },
      link: {
        type: 'string' as const,
        pluginOptions: {},
      },
    },
  } as unknown as Component;

  const reportComponent = {
    uid: uidReport,
    category: 'blog',
    isDisplayed: true,
    apiID: 'nested-report',
    info: {
      displayName: 'Report',
      icon: 'bulletList',
      description: '',
    },
    options: {},
    pluginOptions: {},
    attributes: {
      cta: {
        type: 'component' as const,
        component: uidCta,
        repeatable: false,
        required: true,
        pluginOptions: {},
      },
    },
  } as unknown as Component;

  const sectionComponent = {
    uid: uidSection,
    category: 'blog',
    isDisplayed: true,
    apiID: 'section',
    info: {
      displayName: 'Section',
      icon: 'grid',
      description: '',
    },
    options: {},
    pluginOptions: {},
    attributes: {
      rep: {
        type: 'component' as const,
        component: uidReport,
        repeatable: true,
        required: false,
        pluginOptions: {},
      },
    },
  } as unknown as Component;

  const defaultSettings = {
    bulkable: true,
    filterable: true,
    searchable: true,
    pageSize: 10,
    mainField: 'title',
    defaultSortBy: 'title',
    defaultSortOrder: 'ASC' as const,
  };

  const data: FindComponentConfiguration.Response['data'] = {
    component: {
      settings: { ...defaultSettings, mainField: 'id', defaultSortBy: 'id' },
      metadatas: {
        rep: {
          edit: { label: 'rep', description: '', placeholder: '', visible: true, editable: true },
          list: { label: 'rep' },
        },
      },
      layouts: {
        edit: [[{ name: 'rep', size: 12 }]],
        list: [],
      },
      category: 'blog',
      isComponent: true,
      uid: uidSection,
    },
    components: {
      [uidReport]: {
        uid: uidReport,
        category: 'blog',
        isComponent: true,
        settings: { ...defaultSettings, mainField: 'cta', defaultSortBy: 'cta' },
        metadatas: {
          cta: {
            // `mainField` is present on saved edit metadata; nested convertEditLayoutToFieldLayouts
            // must receive component schemas or getMainField throws (see #25509).
            edit: {
              label: 'Cta',
              description: '',
              placeholder: '',
              visible: true,
              editable: true,
              // @ts-expect-error — mainField is used at runtime (see useDocumentLayout getMainField call).
              mainField: 'title',
            },
            list: { label: 'Cta' },
          },
        },
        layouts: {
          edit: [[{ name: 'cta', size: 12 }]],
          list: [],
        },
      },
      [uidCta]: {
        uid: uidCta,
        category: 'blog',
        isComponent: true,
        settings: defaultSettings,
        metadatas: {
          title: {
            edit: {
              label: 'Title',
              description: '',
              placeholder: '',
              visible: true,
              editable: true,
            },
            list: { label: 'Title' },
          },
          link: {
            edit: {
              label: 'Link',
              description: '',
              placeholder: '',
              visible: true,
              editable: true,
            },
            list: { label: 'Link' },
          },
        },
        layouts: {
          edit: [
            [
              { name: 'title', size: 6 },
              { name: 'link', size: 6 },
            ],
          ],
          list: [],
        },
      },
    },
  };

  const componentsDict = {
    [uidCta]: ctaComponent,
    [uidReport]: reportComponent,
    [uidSection]: sectionComponent,
  } as unknown as Record<string, Component>;

  it('resolves mainField for a component field nested inside a sub-component (configure-the-view for parent component)', () => {
    expect(() =>
      formatComponentConfigurationEditLayout(data, {
        schema: sectionComponent,
        components: componentsDict,
      })
    ).not.toThrow();
  });

  it('exposes a resolved main field type for the nested component column', () => {
    const editLayout = formatComponentConfigurationEditLayout(data, {
      schema: sectionComponent,
      components: componentsDict,
    });
    const reportRows = editLayout.components[uidReport]!.layout[0]!;
    const ctaField = reportRows.find((f) => f.name === 'cta')!;
    expect(ctaField.mainField).toEqual({ name: 'title', type: 'string' });
  });
});
