import type { MessageDescriptor, PrimitiveType } from 'react-intl';
import type { AnyObjectSchema } from 'yup';

export type PermissionAction = { enabled: boolean; policy: string };
export type ControllerPermissions = Record<string, PermissionAction>;
export type PluginPermissions = { controllers: Record<string, ControllerPermissions> };
export type Permissions = Record<string, PluginPermissions>;
export type Route = { method: string; path: string; handler: string };
export type Routes = Record<string, Route[]>;

export type Role = {
  id: number;
  name: string;
  description: string;
  type: string;
  code?: string;
  nb_users: number;
  permissions: Permissions;
};
export type RoleForm = Pick<Role, 'name' | 'description'>;
export type RolePayload = RoleForm & { permissions: Permissions; users: number[] };
export type RoleSummary = Omit<Role, 'permissions'>;

export type AdvancedSettings = {
  allow_register: boolean;
  default_role: string;
  email_confirmation: boolean;
  email_confirmation_redirection: string;
  email_reset_password: string;
  unique_email: boolean;
};
export type AdvancedSettingsResponse = {
  settings: AdvancedSettings;
  roles: Pick<Role, 'name' | 'type'>[];
};

export type Provider = {
  enabled: boolean;
  icon?: string;
  key?: string;
  secret?: string;
  callback?: string;
  redirectUri?: string;
  subdomain?: string;
  jwksurl?: string;
  scope?: string[];
};
export type Providers = Record<string, Provider>;
export type ProviderFormValues = Omit<Provider, 'scope'>;
export type Translation = MessageDescriptor & { values?: Record<string, PrimitiveType> };
export type ProviderField = {
  name: keyof ProviderFormValues;
  type: 'bool' | 'text';
  intlLabel: Translation;
  description?: Translation;
  placeholder?: Translation;
  size: number;
  disabled?: boolean;
  validations?: { required?: boolean };
};
export type ProviderFormLayout = { form: ProviderField[][]; schema: AnyObjectSchema };

export type EmailTemplate = {
  display: string;
  icon?: string;
  options: {
    from: { name: string; email: string };
    message: string;
    object: string;
    response_email: string;
  };
};
export type EmailTemplateName = 'reset_password' | 'email_confirmation';
export type EmailTemplates = Record<EmailTemplateName, EmailTemplate>;

export type PermissionChangeEvent<T extends string | boolean = string | boolean> = {
  target: { name: string; value: T };
};
