'use client';

import type { AuthView } from '@better-auth-ui/core';
import { useAuth } from '@better-auth-ui/react';
import { type ComponentType, useEffect } from 'react';

import { AuthRedirect } from './auth-redirect';
import { AuthCallback, AuthError } from './auth-result';
import { ForgotPassword } from './forgot-password';
import type { SocialLayout } from './provider-buttons';
import { ResetLinkSent } from './reset-link-sent';
import { ResetPassword } from './reset-password';
import { SignIn } from './sign-in';
import { SignOut } from './sign-out';
import { SignUp } from './sign-up';
import { VerifyEmail } from './verify-email';

export type AuthProps = {
  className?: string;
  path?: string;
  socialLayout?: SocialLayout;
  socialPosition?: 'top' | 'bottom';
  /** @remarks `AuthView` */
  view?: AuthView;
};

/**
 * Built-in views that only make sense when email + password auth is enabled.
 * When it's disabled, the `<Auth>` router redirects these to `signIn` so a
 * plugin's `fallbackViews.auth.signIn` (e.g. magic link) takes over.
 */
const PASSWORD_ONLY_VIEWS = ['signUp', 'forgotPassword', 'resetPassword', 'resetLinkSent'];

const AUTH_VIEWS: Partial<Record<AuthView, ComponentType<AuthProps>>> = {
  callback: AuthCallback,
  error: AuthError,
  redirect: AuthRedirect,
  signIn: SignIn,
  signOut: SignOut,
  signUp: SignUp,
  forgotPassword: ForgotPassword,
  resetPassword: ResetPassword,
  resetLinkSent: ResetLinkSent,
  verifyEmail: VerifyEmail,
};

/**
 * Render the appropriate authentication view based on the provided `view` or `path`.
 *
 * Resolution order:
 *   1. Plugin overrides (`plugin.views.auth[currentView]`) — first registered wins.
 *   2. Plugin fallbacks (`plugin.fallbackViews.auth.signIn`) when password auth is off.
 *   3. Built-in views.
 *
 * @param path - Route path used to resolve an auth view when `view` is not provided
 * @param socialLayout - Social layout to apply to sign-in/sign-up/magic-link views
 * @param socialPosition - Position for social buttons (`"top"` or `"bottom"`)
 * @param view - Explicit auth view to render (e.g., `"signIn"`, `"signUp"`)
 * @returns The React element for the resolved authentication view
 */
export function Auth({ className, path, socialLayout, socialPosition, view }: AuthProps) {
  const { basePaths, emailAndPassword, plugins, viewPaths, navigate } = useAuth();

  if (!view && !path) {
    throw new Error('[Better Auth UI] Either `view` or `path` must be provided');
  }

  const authView =
    view || (Object.keys(viewPaths.auth) as AuthView[]).find((key) => viewPaths.auth[key] === path);

  // When email + password auth is disabled, password-only views (signUp,
  // forgotPassword, resetPassword) have no meaning. Redirect them to signIn,
  // where a plugin's `fallbackViews.auth.signIn` (e.g. magic link) takes
  // over as the primary entry point.
  const shouldRedirectToSignIn =
    !emailAndPassword?.enabled && authView && PASSWORD_ONLY_VIEWS.includes(authView);

  useEffect(() => {
    if (shouldRedirectToSignIn) {
      navigate({
        to: `${basePaths.auth}/${viewPaths.auth.signIn}`,
        replace: true,
      });
    }
  }, [shouldRedirectToSignIn, navigate, basePaths.auth, viewPaths.auth.signIn]);

  if (shouldRedirectToSignIn) {
    return null;
  }

  // 1. Plugin overrides (`views.auth[currentView]`) — first plugin wins,
  //    including over built-in views. Resolves the view key from `view`,
  //    then `authView` (built-in path match), then plugin-introduced paths
  //    (e.g. `magicLink` → `/auth/magic-link`).
  for (const plugin of plugins) {
    const pluginAuthPaths = plugin.viewPaths?.auth;

    const pluginView =
      view ??
      authView ??
      (pluginAuthPaths &&
        Object.keys(pluginAuthPaths).find((key) => pluginAuthPaths[key] === path));
    if (!pluginView) continue;

    const PluginView = plugin.views?.auth?.[pluginView];
    if (!PluginView) continue;

    return (
      <PluginView
        className={className}
        socialLayout={socialLayout}
        socialPosition={socialPosition}
      />
    );
  }

  // 2. Plugin fallbacks — only when the built-in `signIn` isn't viable
  //    (password auth is off). Used by `magicLinkPlugin` to render the
  //    magic-link form as the primary passwordless sign-in surface.
  if (authView === 'signIn' && !emailAndPassword?.enabled) {
    const Fallback = plugins.find((plugin) => plugin.fallbackViews?.auth?.signIn)?.fallbackViews
      ?.auth?.signIn;

    if (Fallback) {
      return (
        <Fallback
          className={className}
          socialLayout={socialLayout}
          socialPosition={socialPosition}
        />
      );
    }
  }

  const AuthView = authView ? AUTH_VIEWS[authView] : undefined;

  if (!AuthView) {
    throw new Error(
      `[Better Auth UI] Unknown view "${authView}". Valid views are: ${Object.keys(AUTH_VIEWS).join(', ')}`
    );
  }

  return (
    <AuthView className={className} socialLayout={socialLayout} socialPosition={socialPosition} />
  );
}
