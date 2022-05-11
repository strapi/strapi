type Entity = object;

interface BaseService {
  getFetchParams?(params: object): object;
}

export interface SingleTypeService extends BaseService {
  find?(params: object): Promise<Entity> | Entity;
  createOrUpdate?(params: object): Promise<Entity> | Entity;
  delete?(params: object): Promise<Entity> | Entity;
}

export interface CollectionTypeService extends BaseService {
  find?(params: object): Promise<Entity[]> | Entity;
  findOne?(entityId: string,params: object): Promise<Entity> | Entity;
  create?(params: object): Promise<Entity> | Entity;
  update?(entityId: string,params: object): Promise<Entity> | Entity;
  delete?(entityId: string,params: object): Promise<Entity> | Entity;
}

export type Service = SingleTypeService | CollectionTypeService;

