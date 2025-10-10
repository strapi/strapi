import { yup, validateYupSchema } from '@strapi/utils';

const providerOptionsUpdateSchema = yup.object().shape({
  autoRegister: yup.boolean().required(),
  defaultRole: yup
    .strapiID()
    .when('autoRegister', (value, initSchema) => {
      return value ? initSchema.required() : initSchema.nullable();
    })
    .test('is-valid-role', 'You must submit a valid default role', (roleId) => {
      if (roleId === null) {
        return true;
      }
      return strapi.service('admin::role').exists({ id: roleId });
    }),
  ssoLockedRoles: yup
    .array()
    .nullable()
    .of(
      yup
        .strapiID()
        .test(
          'is-valid-role',
          'You must submit a valid role for the SSO Locked roles',
          (roleId) => {
            return strapi.service('admin::role').exists({ id: roleId });
          }
        )
    ),
});

export const validateProviderOptionsUpdate = validateYupSchema(providerOptionsUpdateSchema);

export default {
  validateProviderOptionsUpdate,
};
