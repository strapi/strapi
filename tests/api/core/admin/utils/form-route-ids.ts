/**
 * Route ids the form extension tests send to the role, user and API token update routes. Only
 * `id` and `zeroPadded` are plain digits that match the entity.
 */
export const formRouteIds = (id: number) =>
  ({
    id: `${id}`,
    zeroPadded: `0${id}`,
    missing: '999999',
    exponent: `${id}e0`,
    decimalPoint: `${id}.0`,
    leadingSpace: ` ${id}`,
    hex: '0x0A',
    letters: 'abc',
  }) as const;

export type FormRouteIdKind = keyof ReturnType<typeof formRouteIds>;

export const matchesEntity = (kind: FormRouteIdKind) => kind === 'id' || kind === 'zeroPadded';
