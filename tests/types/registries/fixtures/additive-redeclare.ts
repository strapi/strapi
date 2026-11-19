// An application redeclares keys that `@strapi/core` registers in the additive registries, with
// another payload. It imports nothing, so the test controls where the core declaration sits in
// program order. The exported aliases let the test read which declaration wins.
export {};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Strapi {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Registries {
      interface Events {
        'entry.create': [{ redeclared: true }];
      }

      interface Stores {
        'strapi_unidirectional-join-table-repair-ran': string;
      }
    }
  }
}

export type EntryCreatePayload = Strapi.Registries.Events['entry.create'];
export type RepairRanValue =
  Strapi.Registries.Stores['strapi_unidirectional-join-table-repair-ran'];
