/**
 * The entity id of a form route, as a number. Anything but plain decimal digits answers `null`,
 * so the route responds 404: some databases still match ids such as `7e0` or `0x0A`, and core and
 * plugins must agree on the row.
 */
export const parseRouteId = (value: unknown): number | null => {
  if (typeof value === 'number') {
    return Number.isSafeInteger(value) && value >= 0 ? value : null;
  }

  if (typeof value !== 'string' || !/^[0-9]+$/.test(value)) {
    return null;
  }

  const id = Number(value);

  return Number.isSafeInteger(id) ? id : null;
};
