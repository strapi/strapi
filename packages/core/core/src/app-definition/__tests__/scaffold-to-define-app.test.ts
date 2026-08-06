import { join } from 'path';

import { defineApp } from '../define-app';
import { scaffoldToDefineApp, convertFileAttribute } from '../scaffold-to-define-app';
import { printDefineAppSource } from '../print-define-app-source';
import { fromDisk } from '../sources';
import { isDiskSource } from '../brand';

const FIXTURE = join(__dirname, 'resources', 'scaffolded-app');

describe('convertFileAttribute', () => {
  it('copies type and options without the builder wrapper', () => {
    expect(convertFileAttribute({ type: 'string', required: true })).toEqual({
      type: 'string',
      required: true,
    });
  });

  it('preserves relation targets', () => {
    expect(
      convertFileAttribute({
        type: 'relation',
        relation: 'manyToOne',
        target: 'api::category.category',
      })
    ).toEqual({
      type: 'relation',
      relation: 'manyToOne',
      target: 'api::category.category',
    });
  });
});

describe('scaffoldToDefineApp', () => {
  it('reads content types and components from a scaffolded project', () => {
    const { definition, warnings } = scaffoldToDefineApp({ projectRoot: FIXTURE });

    expect(warnings.some((w) => w.includes('recommendedPlugins'))).toBe(true);
    expect(definition.config).toEqual(fromDisk('./config'));
    expect(definition.contentTypes).toHaveLength(1);
    expect(definition.contentTypes![0]).toMatchObject({
      singularName: 'article',
      pluralName: 'articles',
      displayName: 'Article',
      attributes: {
        title: { type: 'string', required: true },
        slug: { type: 'uid', targetField: 'title' },
      },
    });
    expect(definition.components).toHaveLength(1);
    expect(definition.components![0]).toMatchObject({
      uid: 'shared.quote',
      displayName: 'Quote',
    });
    expect(definition.from).toBeUndefined();
  });

  it('produces a defineApp-compatible definition', () => {
    const { definition } = scaffoldToDefineApp({ projectRoot: FIXTURE });
    expect(() => defineApp(definition)).not.toThrow();
  });

  it('throws for a missing project root', () => {
    expect(() => scaffoldToDefineApp({ projectRoot: '/no/such/dir' })).toThrow(/not a directory/);
  });
});

describe('printDefineAppSource', () => {
  it('emits is.* builders for known attribute types', () => {
    const { definition } = scaffoldToDefineApp({ projectRoot: FIXTURE });
    const source = printDefineAppSource(definition, { useRecommendedPlugins: true });

    expect(source).toContain(
      "import { defineApp, defineComponent, fromDisk } from '@strapi/strapi';"
    );
    expect(source).toContain("import { recommendedPlugins } from '@strapi/strapi/plugins';");
    expect(source).toContain('plugins: recommendedPlugins()');
    expect(source).toContain('config: fromDisk("./config")');
    expect(source).toContain('is.string({');
    expect(source).toContain('required: true');
    expect(source).toContain('is.uid({');
    expect(source).toContain('defineComponent({');
    expect(source).toContain('uid: "shared.quote"');
    expect(source).toContain('export default defineApp({');
  });

  it('references fromDisk for plugins when the scaffold has custom plugin config', () => {
    const definition = {
      config: fromDisk('./config'),
      plugins: fromDisk('.'),
      contentTypes: [],
    };
    const source = printDefineAppSource(definition);

    expect(source).toContain('plugins: fromDisk(".")');
    expect(source).not.toContain('recommendedPlugins');
  });

  it('appends codemod warnings as a block comment', () => {
    const source = printDefineAppSource(
      { contentTypes: [] },
      { warnings: ['Custom API code left on disk.'] }
    );
    expect(source).toContain('/*\n * Custom API code left on disk.\n */');
  });
});

describe('scaffoldToDefineApp end-to-end source', () => {
  it('round-trips fixture scan → source → shape checks', () => {
    const { definition, source } = scaffoldToDefineApp({ projectRoot: FIXTURE });

    expect(isDiskSource(definition.config!)).toBe(true);
    expect(source).toMatch(/contentTypes:\s*\[/);
    expect(source).toMatch(/components:\s*\[/);
    expect(source).not.toContain('from: fromDisk');
  });
});
