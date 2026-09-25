import hasPermissions from './hasPermissions';

type RegisteredPolicyNames = {
  [TUID in keyof Strapi.Registries.PackagePolicies]: TUID extends `plugin::content-manager.${infer TName}`
    ? TName
    : never;
}[keyof Strapi.Registries.PackagePolicies];

export default {
  hasPermissions,
} satisfies Record<RegisteredPolicyNames, typeof hasPermissions>;
