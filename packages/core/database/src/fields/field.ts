export default class Field {
  config: unknown;

  constructor(config: unknown) {
    this.config = config;
  }

  toDB(value: unknown) {
    return value;
  }

  fromDB(value: unknown) {
    return value;
  }
}
