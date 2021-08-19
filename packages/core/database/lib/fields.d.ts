interface Field {
  config: {};
  toDB(value: any): any;
  fromDB(value: any): any;
}

interface Attribute {
  type: string
}
export function createField(attribute: Attribute): Field;
