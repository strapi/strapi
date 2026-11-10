// Type checks only, run by `yarn test:ts`. Packages declare their content-type schemas by hand; this
// app extends none of them, so each declaration must equal the schema type generation writes from
// the runtime. A package that starts declaring one is checked here once it is installed in this app.
type Equal<T, U> =
  (<V>() => V extends T ? 1 : 2) extends <V>() => V extends U ? 1 : 2 ? true : false;

type Declared = Strapi.Registries.PackageContentTypeSchemas;
type Generated = Strapi.Registries.AppContentTypeSchemas;

// `true` for each declared UID whose schema, then attributes, equal the generated ones. A UID type
// generation did not write is a drift too.
type Drift = {
  [TUID in keyof Declared]: TUID extends keyof Generated
    ? Equal<Omit<Declared[TUID], 'attributes'>, Omit<Generated[TUID], 'attributes'>> extends true
      ? Equal<Declared[TUID]['attributes'], Generated[TUID]['attributes']>
      : false
    : false;
};

export const noDrift: { [TUID in keyof Drift]: true } = {} as Drift;
