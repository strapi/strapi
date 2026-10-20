import type * as Core from '..';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Strapi {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Registries {
      interface PackageServices {
        'plugin::drift-lab.reader': { read(): string };
        'plugin::drift-lab.writer': { write(value: string): void };
        'plugin::drift-lab-extra.reader': { read(): number };
        'admin::drift-lab': { audit(): void };
      }
    }
  }
}

type Equal<T, U> =
  (<V>() => V extends T ? 1 : 2) extends <V>() => V extends U ? 1 : 2 ? true : false;

type Registered = Core.RegisteredFor<Strapi.Registries.PackageServices, 'plugin::drift-lab'>;

declare const checks: [
  // Only the namespace's own entries, keyed by name: `plugin::drift-lab-extra` is another plugin.
  Core.Assert<
    Equal<Registered, { reader: { read(): string }; writer: { write(value: string): void } }>
  >,
  // A namespace ending with `::` is followed by the name, without a dot.
  Core.Assert<
    'drift-lab' extends keyof Core.RegisteredFor<Strapi.Registries.PackageServices, 'admin::'>
      ? true
      : false
  >,
  Core.Assert<Equal<keyof Core.RegisteredFor<Strapi.Registries.PackageServices, 'admin'>, never>>,
  Core.Assert<Core.SameNames<'reader' | 'writer', keyof Registered>>,
  Core.Assert<Equal<Core.IsStrict, true>>,
];
checks satisfies unknown;

// A plain literal map is checked both ways.
({ reader: {}, writer: {} }) satisfies Record<keyof Registered, unknown>;
// @ts-expect-error A registered name without an implementation is missing.
({ reader: {} }) satisfies Record<keyof Registered, unknown>;
// @ts-expect-error An implementation without a registered name is an excess property.
({ reader: {}, writer: {}, extra: {} }) satisfies Record<keyof Registered, unknown>;

// `SameNames` names the drift in both directions.
declare const drift: [
  // @ts-expect-error `extra` is not registered.
  Core.Assert<Core.SameNames<'reader' | 'writer' | 'extra', keyof Registered>>,
  // @ts-expect-error `writer` has no implementation.
  Core.Assert<Core.SameNames<'reader', keyof Registered>>,
  // @ts-expect-error A map with an index signature leaks every name.
  Core.Assert<Core.SameNames<string, keyof Registered>>,
  Core.Assert<
    Equal<
      Core.SameNames<'reader' | 'extra', keyof Registered>,
      { unregistered: 'extra'; unimplemented: 'writer' }
    >
  >,
];
drift satisfies unknown;
