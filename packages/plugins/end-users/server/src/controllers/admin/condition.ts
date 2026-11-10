import { errors } from '@strapi/utils';
import type Koa from 'koa';
import type { Core } from '@strapi/types';

import type { ConditionPreviewRequest } from '../../../../shared/contracts/conditions';
import { PLUGIN_ID, PROFILE_UID, USER_UID } from '../../constants';
import { ConditionsUpdatingError } from '../../services/condition';
import type builderLayoutService from '../../services/builder-layout';
import type conditionService from '../../services/condition';
import type { ValidateRead } from '../../services/condition';
import { isPlain } from '../../utils/is-plain';


/** What the Content Manager asks of an admin to list a content type's entries */
const CONTENT_MANAGER_READ = 'plugin::content-manager.explorer.read';

const refuse = (message: string): never => {
  throw new errors.ValidationError(message);
};

/**
 * The parts of a preview. The condition is left as it is: the service checks it, and only for an
 * admin who may read what it counts.
 */
const toPreviewRequest = (body: unknown): ConditionPreviewRequest => {
  if (!isPlain(body)) {
    return refuse('A preview is an object: { condition, subject, userDocumentId, inputs }');
  }

  const { condition, subject, userDocumentId, inputs = {} } = body;

  if (typeof subject !== 'string' || subject === '') {
    refuse('subject is the uid of a content type');
  }

  if (typeof userDocumentId !== 'string' || userDocumentId === '') {
    refuse('userDocumentId is the documentId of an end user');
  }

  if (!isPlain(inputs)) {
    refuse('inputs is an object: the value of each input');
  }

  return { condition, subject, userDocumentId, inputs } as ConditionPreviewRequest;
};

/**
 * The slug a create names, for the service to compare with the condition's own: anything that is not
 * a text is `''`, which the service's check of the condition refuses first.
 */
const slugOf = (body: unknown): string =>
  isPlain(body) && typeof body.slug === 'string' ? body.slug : '';

/**
 * `/end-users/conditions`. Answers are `{ data }`, as every admin route's are.
 *
 * Every write that changes a condition tells `strapi.eventHub` once the service has resolved, so a
 * write that was refused or failed is never reported: `end-users.condition.create`,
 * `update` and `delete`, with the admin who did it and the condition's name. Nothing else.
 */
const conditionController = ({ strapi }: { strapi: Core.Strapi }) => {
  const conditions = () =>
    strapi.plugin(PLUGIN_ID).service('condition') as ReturnType<typeof conditionService>;

  /**
   * What the admin may read of a content type in the Content Manager, which is what it lists their
   * entries with: their read query, `{}` for an admin who may read all of it, and the manager's own
   * `validateQuery` on that type, which rejects a field they may not read. A 403 for an admin who
   * may not read the type at all, and for a query that is not a filter, which is no permission to
   * count with: a `PolicyError`, so that core lets the message through (see `refuseUnreadable`).
   */
  const readScope = (
    ctx: Koa.Context,
    model: string,
    what = 'the content type and to end users'
  ): { query: object; validate: ValidateRead } => {
    const permissions = strapi.service('admin::permission').createPermissionsManager({
      ability: ctx.state.userAbility,
      action: CONTENT_MANAGER_READ,
      model,
    });
    const query: unknown = permissions.isAllowed ? permissions.getQuery() : undefined;

    if (!isPlain(query)) {
      throw new errors.PolicyError(
        `Previewing a condition needs Content Manager read access to ${what}`
      );
    }

    return {
      query,
      validate: (toValidate) =>
        permissions.validateQuery(toValidate, { subject: model, action: CONTENT_MANAGER_READ }),
    };
  };

  const emit = (ctx: Koa.Context, event: 'create' | 'update' | 'delete', name: string) => {
    strapi.eventHub.emit(`end-users.condition.${event}`, {
      adminUserId: ctx.state.user?.documentId,
      condition: { name },
    });
  };

  /**
   * Runs a write. One that is refused because another waits for its restart is a 409 `{ code }`: it
   * wrote nothing, and the page waits for the status to say the server is back.
   */
  const attempt = async (ctx: Koa.Context, write: () => Promise<void>): Promise<void> => {
    try {
      await write();
    } catch (error) {
      if (!(error instanceof ConditionsUpdatingError)) {
        throw error;
      }

      ctx.conflict(error.message, error.details);
    }
  };

  const layout = () =>
    strapi.plugin(PLUGIN_ID).service('builder-layout') as ReturnType<typeof builderLayoutService>;

  return {
    async find(ctx: Koa.Context) {
      ctx.body = { data: await conditions().listForAdmin() };
    },

    /**
     * The admin must be allowed to read the subject and the end-user type in the
     * Content Manager, and what they may read of each limits what is counted, which fields the
     * condition may filter on and which attributes of the user and of their profile it may read. The two reads are
     * answered before the condition is looked at, so a refusal tells an admin who may not read
     * nothing about it.
     */
    async preview(ctx: Koa.Context) {
      const request = toPreviewRequest(ctx.request.body);
      const subject = readScope(ctx, request.subject);
      const user = readScope(ctx, USER_UID);

      ctx.body = {
        data: await conditions().preview(request, {
          subjectQuery: subject.query,
          userQuery: user.query,
          validateSubject: subject.validate,
          validateUser: user.validate,
          // Looked up only for a condition that reads the profile: any other needs no access to it
          profileQuery: () =>
            readScope(ctx, PROFILE_UID, 'profiles, which this condition reads').query,
          validateProfile: async (toValidate) =>
            readScope(ctx, PROFILE_UID, 'profiles, which this condition reads').validate(
              toValidate
            ),
        }),
      };
    },

    /** The fields the builder offers, from the schemas, and the role names */
    async builderLayout(ctx: Koa.Context) {
      ctx.body = { data: await layout().builderLayout() };
    },

    /** Whether a builder write waits for its restart, in any environment */
    async status(ctx: Koa.Context) {
      ctx.body = { data: conditions().status() };
    },

    /** Development only (the route's policy, and the service again). The body is the service's to check. */
    async create(ctx: Koa.Context) {
      const { body } = ctx.request;

      await attempt(ctx, async () => {
        const written = await conditions().writeFile(body, { slug: slugOf(body), create: true });

        emit(ctx, 'create', written.data.name);
        ctx.created(written);
      });
    },

    /** The slug is the URL's, never the body's: a body that names another is refused */
    async update(ctx: Koa.Context) {
      await attempt(ctx, async () => {
        const written = await conditions().writeFile(ctx.request.body, {
          slug: ctx.params.slug,
          create: false,
        });

        emit(ctx, 'update', written.data.name);
        ctx.body = written;
      });
    },

    /** Refused while a role uses the condition */
    async delete(ctx: Koa.Context) {
      const { slug } = ctx.params;

      await attempt(ctx, async () => {
        await conditions().removeFile(slug);

        emit(ctx, 'delete', `api::${slug}`);
        ctx.body = { data: { name: `api::${slug}` } };
      });
    },
  };
};

export default conditionController;
