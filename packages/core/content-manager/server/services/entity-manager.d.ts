interface EntityManager {
  assocCreatorRoles(): any;
  find(): any;
  findPage(): any;
  findWithRelationCountsPage(): any;
  count(): any;
  findOne(): any;
  findOneWithCreatorRoles(): any;
  create(): any;
  update(): any;
  delete(): any;
  deleteMany(): any;
  publish(): any;
  unpublish(): any;
  getNumberOfDraftRelations(id: string, uid: string): number;
  getMultipleEntriesNumberOfDraftRelations(ids: number[], uid: string): number;
}

export default function (opts: { strapi: Strapi }): EntityManager;
