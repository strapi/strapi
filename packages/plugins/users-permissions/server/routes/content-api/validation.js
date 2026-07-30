'use strict';

const { AbstractRouteValidator } = require('@strapi/utils');
const z = require('zod/v4');

// A single role relation entry, referenced by numeric `id` (legacy) or by
// `documentId` (the v5 default), but must carry at least one of them. The
// detailed rules (min one role on create, cannot remove the last role on
// update) stay in the Yup controller validator.
const roleRelationEntry = z
  .object({
    id: z.union([z.number(), z.string()]).optional(),
    documentId: z.string().optional(),
  })
  .refine((entry) => entry.id != null || entry.documentId != null, {
    message: 'Relation entry must include an id or documentId',
  });

// The `role` relation input: shorthand scalar (numeric id or documentId) or the
// longhand connect/disconnect object, matching every other v5 relation. The
// object form must carry at least one of connect/disconnect (an empty object is
// a no-op and almost certainly a mistake).
const roleRelationInput = z.union([
  z.number(),
  z.string(),
  z
    .object({
      connect: z.array(roleRelationEntry).optional(),
      disconnect: z.array(roleRelationEntry).optional(),
    })
    .refine((input) => input.connect != null || input.disconnect != null, {
      message: 'Relation input must include connect or disconnect',
    }),
]);

class UsersPermissionsRouteValidator extends AbstractRouteValidator {
  constructor(strapi) {
    super();
    this._strapi = strapi;
  }

  get userSchema() {
    return z.object({
      id: z.number(),
      documentId: z.string(),
      username: z.string(),
      email: z.string(),
      provider: z.string(),
      confirmed: z.boolean(),
      blocked: z.boolean(),
      role: z
        .union([
          z.number(),
          z.object({
            id: z.number(),
            name: z.string(),
            description: z.string().nullable(),
            type: z.string(),
            createdAt: z.string(),
            updatedAt: z.string(),
          }),
        ])
        .optional(),
      createdAt: z.string(),
      updatedAt: z.string(),
      publishedAt: z.string(),
    });
  }

  get roleSchema() {
    return z.object({
      id: z.number(),
      documentId: z.string(),
      name: z.string(),
      description: z.string().nullable(),
      type: z.string(),
      createdAt: z.string(),
      updatedAt: z.string(),
      publishedAt: z.string(),
      nb_users: z.number().optional(),
      permissions: z
        .record(
          z.string(), // plugin name
          z.object({
            controllers: z.record(
              z.string(), // controller name
              z.record(
                z.string(), // action name
                z.object({
                  enabled: z.boolean(),
                  policy: z.string(),
                })
              )
            ),
          })
        )
        .optional(),
      users: z.array(z.unknown()).optional(),
    });
  }

  get permissionSchema() {
    return z.object({
      id: z.number(),
      action: z.string(),
      role: z.object({
        id: z.number(),
        name: z.string(),
        description: z.string().nullable(),
        type: z.string(),
      }),
      createdAt: z.string(),
      updatedAt: z.string(),
    });
  }

  get authResponseSchema() {
    return z.object({
      jwt: z.string(),
      refreshToken: z.string().optional(),
      user: this.userSchema,
    });
  }

  get authResponseWithoutJwtSchema() {
    return z.object({
      user: this.userSchema,
    });
  }

  get authRegisterResponseSchema() {
    return z.union([this.authResponseSchema, this.authResponseWithoutJwtSchema]);
  }

  get forgotPasswordResponseSchema() {
    return z.object({
      ok: z.boolean(),
    });
  }

  get sendEmailConfirmationResponseSchema() {
    return z.object({
      email: z.string(),
      sent: z.boolean(),
    });
  }

  get rolesResponseSchema() {
    return z.object({
      roles: z.array(this.roleSchema),
    });
  }

  get roleResponseSchema() {
    return z.object({
      role: this.roleSchema,
    });
  }

  get roleSuccessResponseSchema() {
    return z.object({
      ok: z.boolean(),
    });
  }

  get permissionsResponseSchema() {
    return z.object({
      permissions: z.record(
        z.string(), // plugin name
        z.object({
          controllers: z.record(
            z.string(), // controller name
            z.record(
              z.string(), // action name
              z.object({
                enabled: z.boolean(),
                policy: z.string(),
              })
            )
          ),
        })
      ),
    });
  }

  get loginBodySchema() {
    return z.object({
      identifier: z.string(),
      password: z.string(),
    });
  }

  get registerBodySchema() {
    return z.object({
      username: z.string(),
      email: z.email(),
      password: z.string(),
    });
  }

  get forgotPasswordBodySchema() {
    return z.object({
      email: z.email(),
    });
  }

  get resetPasswordBodySchema() {
    return z.object({
      code: z.string(),
      password: z.string(),
      passwordConfirmation: z.string(),
    });
  }

  get changePasswordBodySchema() {
    return z.object({
      currentPassword: z.string(),
      password: z.string(),
      passwordConfirmation: z.string(),
    });
  }

  get sendEmailConfirmationBodySchema() {
    return z.object({
      email: z.email(),
    });
  }

  get createUserBodySchema() {
    return z.object({
      username: z.string(),
      email: z.email(),
      password: z.string(),
      role: roleRelationInput.optional(),
    });
  }

  get updateUserBodySchema() {
    return z.object({
      username: z.string().optional(),
      email: z.email().optional(),
      password: z.string().optional(),
      role: roleRelationInput.optional(),
    });
  }

  get createRoleBodySchema() {
    return z.object({
      name: z.string(),
      description: z.string().optional(),
      type: z.string(),
      permissions: z.record(z.string(), z.unknown()).optional(),
    });
  }

  get updateRoleBodySchema() {
    return z.object({
      name: z.string().optional(),
      description: z.string().optional(),
      type: z.string().optional(),
      permissions: z.record(z.string(), z.unknown()).optional(),
    });
  }

  get userIdParam() {
    return z.string();
  }

  get roleIdParam() {
    return z.string();
  }

  get providerParam() {
    return z.string();
  }
}

module.exports = {
  UsersPermissionsRouteValidator,
};
