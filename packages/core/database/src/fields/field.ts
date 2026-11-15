export default class Field {
  config: unknown;

  constructor(config: unknown) {
    this.config = config;
  }

  toDB(value: unknown) {
    return value;
  }

  /**
   * Casts a filter value. Defaults to `toDB`; override when filters must be stricter than
   * writes, so an unrecognised value fails instead of matching the wrong rows.
   */
  toFilterValue(value: unknown) {
    return this.toDB(value);
  }

  fromDB(value: unknown) {
    return value;
  }
}
