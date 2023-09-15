interface EntityManager {
  mapEntity<T = any>(entity: T): T;
  mapEntitiesResponse<T = any>(entities: T[], uid: string): T[];
  find(): any;
  findPage(): any;
  findOne(): any;
  create(): any;
  update(): any;
  delete(): any;
  deleteMany(): any;
  publish(): any;
  unpublish(): any;
  countDraftRelations(id: string, uid: string): number;
  countManyEntriesDraftRelations(ids: number[], uid: string, locale?: string): number;
}

export default function (opts: { strapi: Strapi }): EntityManager;
