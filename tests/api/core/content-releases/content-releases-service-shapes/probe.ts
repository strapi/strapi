/**
 * The content releases service calls an application makes, as it writes them with strict types. The
 * API test runs `probeContentReleasesServices` against a running instance and compares the shape of
 * each result with the type of the variable of the same name (`tests/api/utils/shapes.ts`). Each
 * result is a named `const`: the comparison reads its type by name. The services are registered only
 * when the license enables `cms-content-releases`, so the probe throws without them.
 */
import type {} from '@strapi/strapi/strict-types';
import type { Core, Data, UID } from '@strapi/strapi';

/** The names of the results, as `probeContentReleasesServices` returns them. */
export const resultNames = [
  'releaseCreated',
  'actionCreated',
  'actionsCreated',
  'releaseFound',
  'releaseFoundWithCreator',
  'releasesFound',
  'releasesWithActionFields',
  'releasesWithActions',
  'releasePage',
  'actionPage',
  'actionsCounted',
  'actionUpdated',
  'releaseUpdated',
  'actionDeleted',
] as const;

/** The entries the probe adds to its release: two documents of a Draft & Publish content type. */
export type ProbeEntries = {
  contentType: UID.ContentType;
  documentIds: [Data.DocumentID, Data.DocumentID];
};

export const probeContentReleasesServices = async (
  strapi: Core.Strapi,
  stamp: string,
  entries: ProbeEntries
) => {
  const releaseService = strapi.service('plugin::content-releases.release');
  const actionService = strapi.service('plugin::content-releases.release-action');
  if (releaseService === undefined || actionService === undefined) {
    throw new Error('The content releases services need the cms-content-releases license feature');
  }
  const userService = strapi.service('admin::user');

  const creator = await userService.create({
    email: `shapes-releases-${stamp}@example.com`,
    firstname: 'Shapes',
    lastname: 'Releases',
    isActive: true,
  });
  const [firstDocumentId, secondDocumentId] = entries.documentIds;

  const releaseCreated = await releaseService.create(
    { name: `Shapes ${stamp}`, scheduledAt: null, timezone: null },
    { user: creator }
  );
  const releaseId = releaseCreated.id;
  const actionCreated = await actionService.create(releaseId, {
    type: 'publish',
    contentType: entries.contentType,
    entryDocumentId: firstDocumentId,
  });
  const actionsCreated = await actionService.createMany(releaseId, [
    { type: 'publish', contentType: entries.contentType, entryDocumentId: secondDocumentId },
  ]);

  const releaseFound = await releaseService.findOne(releaseId);
  const releaseFoundWithCreator = await releaseService.findOne(releaseId, {
    populate: ['createdBy'],
  });
  const releasesFound = await releaseService.findMany({ where: { id: releaseId } });
  const releasesWithActionFields = await releaseService.findMany({
    where: { id: releaseId },
    populate: { actions: { fields: ['type', 'isEntryValid', 'reason'] } },
  });
  const releasesWithActions = await releaseService.findMany({
    where: { id: releaseId },
    populate: { actions: true },
  });
  const releasePage = await releaseService.findPage({ page: 1, pageSize: 10 });
  const actionPage = await actionService.findPage(releaseId, { page: 1, pageSize: 10 });
  const actionsCounted = await actionService.countActions({ filters: { release: releaseId } });

  const actionUpdated = await actionService.update(actionCreated.id, releaseId, {
    type: 'unpublish',
  });
  const releaseUpdated = await releaseService.update(
    releaseId,
    { name: `Shapes updated ${stamp}`, scheduledAt: null, timezone: null },
    { user: creator }
  );
  const actionDeleted = await actionService.delete(actionCreated.id, releaseId);

  await releaseService.delete(releaseId);
  await userService.deleteById(creator.id);

  return {
    releaseCreated,
    actionCreated,
    actionsCreated,
    releaseFound,
    releaseFoundWithCreator,
    releasesFound,
    releasesWithActionFields,
    releasesWithActions,
    releasePage,
    actionPage,
    actionsCounted,
    actionUpdated,
    releaseUpdated,
    actionDeleted,
  } satisfies Record<(typeof resultNames)[number], unknown>;
};
