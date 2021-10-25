export interface AdminApiToken {
  id: string;
  name: string;
  description: string;
  type: 'read-only' | 'full-access';
  accessKey: string;
}

/**
 * Domain representation of a Condition (RBAC)
 */
export interface AdminCondition {
  /**
   * The identifier of the condition
   */
  id: string;
  /**
   * The display name of a condition
   */
  displayName: string;
  /**
   * The name of a condition
   */
  name: string;
  /**
   * The plugin which provide the condition
   */
  plugin?: string;
  /**
   * The main category of a condition
   */
  category?: string;
  /**
   * The handler of a condition
   */
  handler?: (user: AdminUser, options: any) => any | boolean;
}

/**
 * Domain representation of an Action (RBAC)
 */
export interface AdminAction {
  /**
   * The unique identifier of the action
   */
  actionId: string;
  /**
   * The section linked to the action
   */
  section: string;
  /**
   * The human readable name of an action
   */
  displayName: string;
  /**
   * The main category of an action
   */
  category: string;
  /**
   * The secondary category of an action (only for settings and plugins section)
   */
  subCategory?: string;
  /**
   * The plugin which provide the action
   */
  pluginName?: string;
  /**
   * A list of subjects on which the action can be applied
   */
  subjects?: string[];
  /**
   * The options of an action
   */
  options?: {
    /**
     * The list of properties that can be associated with an action
     */
    applyToProperties?: string[];
  };
}

/**
 * Domain representation of a Permission (RBAC)
 */
export interface AdminPermission {
  /**
   * The unique identifier of the permission
   */
  id: string;
  /**
   * The human readable name of an action
   */
  action: string;
  /**
   * The subject on which the permission should applies
   */
  subject: string;
  /**
   * A set of properties used to define the permission with more granularity
   */
  properties?: any;
  /**
   * Conditions to check when evaluating the permission
   */
  conditions?: any;
  /**
   * The role associated to a permission
   */
  role?: AdminRole;
}
export interface AdminRole {
  id: string;
  name: string;
  code: string;
  description: string;
  users: AdminUser[];
  permissions: AdminPermission[];
}
export interface AdminUser {
  id: string;
  firstname: string;
  lastname: string;
  username: string;
  email: string;
  password: string;
  resetPasswordToken: string;
  registrationToken: string;
  isActive: boolean;
  roles: AdminRole[];
  blocked: boolean;
  preferedLanguage: string;
}

declare module '@strapi/strapi' {
  interface StrapiContentTypes {
    'admin::api-token': AdminApiToken;
    'admin::permission': AdminPermission;
    'admin::role': AdminRole;
    'admin::user': AdminUser;
  }
}
