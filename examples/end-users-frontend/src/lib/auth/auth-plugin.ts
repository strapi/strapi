import type {
  AuthPluginComponents,
  AuthPlugin as AuthPluginPrimitive,
} from '@better-auth-ui/react';

declare module '@better-auth-ui/core' {
  /** Widens `useAuth().plugins` to the shadcn-typed `AuthPlugin`. */
  interface AuthPluginRegister {
    shadcn: AuthPlugin;
  }
}

/** Props the shadcn `<Auth>` router spreads onto plugin-contributed auth views. */
export type AuthViewProps = {
  className?: string;
  socialLayout?: 'auto' | 'horizontal' | 'vertical' | 'grid';
  socialPosition?: 'top' | 'bottom';
};

/** Props the shadcn `<Settings>` router spreads onto plugin-contributed settings views. */
export type SettingsViewProps = {
  className?: string;
};

/** Shadcn plugin type. Plugin authors import this from `@/lib/auth/auth-plugin`. */
export type AuthPlugin = AuthPluginPrimitive<
  AuthPluginComponents,
  AuthViewProps,
  SettingsViewProps
>;
