export function createDatabaseManager(strapi: any): Promise<DatabaseManager>;

interface ConnectionInfo {
  name: string;
}

export class DatabaseManager {
  connections: Array<ConnectionInfo>;

  initialize(): Promise<DatabaseManager>;
  query(model: string, plugin: string): Repository;
  getModel(model: string, plugin: string): Model;
}

class Model {}

export class Repository {
  model: Model;
  find(params: object): Promise<Array<ModelValue>>;
  findOne(params: object): Promise<ModelValue>;
  create(input: object): Promise<ModelValue>;
  update(params: object, input: object): Promise<ModelValue>;
  delete(params: object): Promise<ModelValue | Array<ModelValue>>;
  count(params: object): Promise<number>;
  search(params: object): Promise<Array<ModelValue>>;
  countSearch(params: object): Promise<number>;
}

interface ModelValue {
  id: string | number;
  [propName: string]: any;
}
