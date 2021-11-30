type Entity = object;

interface BaseService {
  getFetchParams(params: object): object;
}

export interface SingleTypeService extends BaseService {
  find(params: object): Promise<Entity>;
  createOrUpdate(params: object): Promise<Entity>;
  delete(params: object): Promise<Entity>;
}

export interface CollectionTypeService extends BaseService {
  find(params: object): Promise<Entity[]>;
  findOne(params: object): Promise<Entity>;
  create(params: object): Promise<Entity>;
  update(params: object): Promise<Entity>;
  delete(params: object): Promise<Entity>;
}

export type Service = SingleTypeService | CollectionTypeService;
