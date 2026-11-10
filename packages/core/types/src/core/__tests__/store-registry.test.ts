import type { Strapi as StrapiInstance } from '../strapi';
import type { Equal, Expect } from '../../../tests/helpers/assert';

type LabSettings = { enabled: boolean; label?: string };
type LabLayout = { widgets: string[] };

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Strapi {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Registries {
      interface Stores {
        plugin_store_lab_settings: LabSettings;
        core_persisted_lab: string[];
        [key: `core_store-lab_layout:${string}`]: LabLayout;
        core_selector_lab: number;
        plugin_selector_lab: string;
        plugin_store_lab_selector_lab: boolean;
        core_shared_lab: { a: string };
        plugin_shared_lab: { a: string; b?: number };
      }
    }
  }
}

declare const strapi: StrapiInstance;
declare const dynamicKey: string;
declare const userId: number;

// The three call forms build the same storage key as the runtime: `<type>_<name>_<key>`.
const direct = strapi.store.get({ type: 'plugin', name: 'store_lab', key: 'settings' });
const bound = strapi.store({ type: 'plugin', name: 'store_lab' }).get({ key: 'settings' });
const boundWithKey = strapi.store({ type: 'plugin', name: 'store_lab', key: 'settings' }).get();
// Call params override bound ones.
const overridden = strapi
  .store({ type: 'plugin', name: 'store_lab', key: 'other' })
  .get({ key: 'settings' });
// `get` reads `'core'` rows when the params have no type, and an empty name adds no segment.
const defaultType = strapi.store.get({ key: 'persisted_lab' });
const emptyName = strapi.store.get({ type: 'core', name: '', key: 'persisted_lab' });
// Keys built at runtime match template-literal keys.
const layout = strapi.store({ type: 'core', name: 'store-lab' }).get({ key: `layout:${userId}` });
// Unregistered and wide keys keep `unknown`.
const unregistered = strapi.store.get({ type: 'plugin', name: 'store_lab', key: 'unregistered' });
const wide = strapi.store.get({ type: 'plugin', name: 'store_lab', key: dynamicKey });
declare const reads: [
  // A registered read is its value or `null`: no row, or a non-JSON row.
  Expect<Equal<Awaited<typeof direct>, LabSettings | null>>,
  Expect<Equal<Awaited<typeof bound>, LabSettings | null>>,
  Expect<Equal<Awaited<typeof boundWithKey>, LabSettings | null>>,
  Expect<Equal<Awaited<typeof overridden>, LabSettings | null>>,
  Expect<Equal<Awaited<typeof defaultType>, string[] | null>>,
  Expect<Equal<Awaited<typeof emptyName>, string[] | null>>,
  Expect<Equal<Awaited<typeof layout>, LabLayout | null>>,
  Expect<Equal<Awaited<typeof unregistered>, unknown>>,
  Expect<Equal<Awaited<typeof wide>, unknown>>,
];
reads satisfies unknown;

// Writes of a registered key take its value, in every call form.
strapi.store.set({ type: 'plugin', name: 'store_lab', key: 'settings', value: { enabled: true } });
strapi.store({ type: 'plugin', name: 'store_lab' }).set({
  key: 'settings',
  value: { enabled: false, label: 'x' },
});
strapi.store({ type: 'core', key: 'persisted_lab' }).set({ value: ['table'] });
strapi.store({ type: 'core', name: 'store-lab' }).set({
  key: `layout:${userId}`,
  value: { widgets: [] },
});
// @ts-expect-error A partial value would replace the whole stored value.
strapi.store.set({ type: 'plugin', name: 'store_lab', key: 'settings', value: {} });
strapi
  .store({ type: 'plugin', name: 'store_lab' })
  // @ts-expect-error The registered value is checked through a bound store too.
  .set({ key: 'settings', value: { enabled: 'yes' } });
// @ts-expect-error The registered value is required.
strapi.store({ type: 'plugin', name: 'store_lab', key: 'settings' }).set({});
strapi
  .store({ type: 'core', name: 'store-lab' })
  // @ts-expect-error Template-literal keys are checked too.
  .set({ key: `layout:${userId}`, value: { widgets: [1] } });

// `set` does not default the type: the runtime writes `'undefined_<…>'`, an unregistered row.
strapi.store.set({ key: 'persisted_lab', value: 1 });
// Unregistered and wide keys accept any value, as without strict types.
strapi.store.set({ type: 'plugin', name: 'store_lab', key: 'unregistered', value: 1 });
strapi.store.set({ type: 'plugin', name: 'store_lab', key: dynamicKey, value: 1 });
strapi.store({ type: 'plugin', name: 'store_lab' }).set({ key: 'unregistered' });
// @ts-expect-error A direct write still takes a value, as without strict types.
strapi.store.set({ type: 'plugin', name: 'store_lab', key: 'unregistered' });
strapi.store.delete({ type: 'plugin', name: 'store_lab', key: 'settings' });
strapi.store({ type: 'plugin', name: 'store_lab' }).delete({ key: 'settings' });

// A `type` or `name` that is optional, a union, or may be `undefined` selects every row it can
// build: its declared values, plus the runtime default when it may be missing or `undefined`.
declare const optionalType: { key: 'selector_lab'; type?: 'plugin' };
declare const optionalName: { type: 'plugin'; key: 'selector_lab'; name?: 'store_lab' };
declare const maybeType: 'plugin' | undefined;
declare const unionType: 'core' | 'plugin';
declare const optionalCore: { key: 'selector_lab'; type?: 'core' };
declare const optionalOther: { key: 'selector_lab'; type?: 'other' };
const readOptionalType = strapi.store.get(optionalType);
const readOptionalName = strapi.store.get(optionalName);
const readUndefinedType = strapi.store.get({ key: 'selector_lab', type: undefined });
const readMaybeType = strapi.store.get({ key: 'selector_lab', type: maybeType });
const readUnionType = strapi.store.get({ key: 'selector_lab', type: unionType });
// An optional override may be missing: the bound value stays possible.
const readBoundOptional = strapi.store({ type: 'plugin' }).get(optionalCore);
// A required override replaces the bound value, even `undefined`, as the runtime spread does.
const readBoundRequired = strapi
  .store({ type: 'plugin' })
  .get({ key: 'selector_lab', type: 'core' });
const readBoundUndefined = strapi
  .store({ type: 'plugin' })
  .get({ key: 'selector_lab', type: undefined });
// A row without a registered value makes the whole read `unknown`.
const readOptionalOther = strapi.store.get(optionalOther);
declare const selectorReads: [
  Expect<Equal<Awaited<typeof readOptionalType>, number | string | null>>,
  Expect<Equal<Awaited<typeof readOptionalName>, string | boolean | null>>,
  Expect<Equal<Awaited<typeof readUndefinedType>, number | null>>,
  Expect<Equal<Awaited<typeof readMaybeType>, number | string | null>>,
  Expect<Equal<Awaited<typeof readUnionType>, number | string | null>>,
  Expect<Equal<Awaited<typeof readBoundOptional>, number | string | null>>,
  Expect<Equal<Awaited<typeof readBoundRequired>, number | null>>,
  Expect<Equal<Awaited<typeof readBoundUndefined>, number | null>>,
  Expect<Equal<Awaited<typeof readOptionalOther>, unknown>>,
];
selectorReads satisfies unknown;

// A write may land on any of the rows: its value must fit every registered one.
// @ts-expect-error `plugin_selector_lab` takes a string.
strapi.store.set({ key: 'selector_lab', type: maybeType, value: 123 });
strapi.store.set({ key: 'selector_lab', type: maybeType, value: 'x' });
// @ts-expect-error No value is both a number and a string.
strapi.store.set({ key: 'selector_lab', type: unionType, value: 123 });
// @ts-expect-error No value is both a string and a boolean.
strapi.store.set({ ...optionalName, value: 'x' });
strapi.store.set({ key: 'shared_lab', type: unionType, value: { a: 'x' } });
// @ts-expect-error `core_shared_lab` takes `a`.
strapi.store.set({ key: 'shared_lab', type: unionType, value: { b: 1 } });
// @ts-expect-error The bound `plugin` row takes a string, the `core` override a number.
strapi.store({ type: 'plugin' }).set({ ...optionalCore, value: 1 });
strapi.store({ type: 'plugin' }).set({ key: 'selector_lab', type: 'core', value: 1 });
strapi
  .store({ type: 'plugin' })
  // @ts-expect-error A required override replaces the bound `plugin` row.
  .set({ key: 'selector_lab', type: 'core', value: 'x' });
