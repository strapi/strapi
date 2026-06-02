import type { Attribute } from '../types';

export default class Field {
  attribute: Attribute;

  constructor(attribute: Attribute) {
    this.attribute = attribute;
  }

  toDB(value: unknown) {
    return value;
  }

  fromDB(value: unknown) {
    return value;
  }
}
