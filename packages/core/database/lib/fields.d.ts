import { Attribute } from './schema';

interface Field {
  config: {};
  toDB(value: any): any;
  fromDB(value: any): any;
}

export function createField(attribute: Attribute): Field;
