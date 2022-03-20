interface EntityManager {
  assocCreatorRoles(): any;
  find(): any;
  findPage(): any;
  findWithRelationCounts(): any;
  count(): any;
  sum(): any;
  avg(): any;
  findOne(): any;
  findOneWithCreatorRoles(): any;
  create(): any;
  update(): any;
  delete(): any;
  deleteMany(): any;
  publish(): any;
  unpublish(): any;
}

export default function(opts: { strapi: Strapi }): EntityManager;
