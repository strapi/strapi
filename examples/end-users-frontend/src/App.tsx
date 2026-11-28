import { type ComponentProps, type ReactNode, useState } from 'react';
import { BrowserRouter, Link as RouterLink, Route, Routes, useNavigate } from 'react-router-dom';
import { QueryClient } from '@tanstack/react-query';
import type { AdditionalFields, AuthView } from '@better-auth-ui/core';

import { Auth } from '@/components/auth/auth';
import { AuthProvider } from '@/components/auth/auth-provider';
import { UserButton } from '@/components/auth/user/user-button';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AUTH_MODE, authClient } from '@/lib/auth-client';
import { twoFactorPlugin } from '@/lib/auth/two-factor-plugin';
import { AccountPage } from '@/pages/account';
import { ArticlesPage } from '@/pages/articles';
import { HomePage } from '@/pages/home';

// Better Auth UI renders its links with a `Link` that takes `href`, React Router's takes `to`.
function AppLink({ href, ...props }: ComponentProps<'a'> & { href: string; to?: string }) {
  return <RouterLink to={href} {...(props as object)} />;
}

// What the sign-up form asks for besides name, email and password. Better Auth UI sends each one as
// an extra key of the sign-up body (`POST /api/auth/sign-up/email`), and the end-users plugin writes
// the keys it is told to accept (`registrationFields`, set by the example's seed) to the new user's
// profile, in the same transaction as the user. `profile: false` keeps them out of Better Auth UI's
// own profile card: that one saves to the Better Auth user, and these live on the Strapi profile,
// which the "Profile" card on the account page reads and saves.
const signUpFields: AdditionalFields = [
  { name: 'company', type: 'string', label: 'Company', signUp: 'below', profile: false },
  {
    name: 'newsletter',
    type: 'boolean',
    inputType: 'checkbox',
    label: 'Send me the newsletter',
    signUp: 'below',
    profile: false,
  },
];

function AuthPage(props: { view: AuthView } | { path: string }) {
  return (
    <div className="mx-auto w-full max-w-md">
      <Auth {...props} />
    </div>
  );
}

function Providers({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [queryClient] = useState(() => new QueryClient());

  return (
    <AuthProvider
      authClient={authClient}
      queryClient={queryClient}
      // The origin of this front end, not of Strapi: Better Auth UI builds the absolute callback
      // URLs it sends to Strapi from it, and Strapi only accepts the ones it trusts.
      baseURL={window.location.origin}
      redirectTo="/"
      navigate={({ to, replace }) => navigate(to, { replace })}
      Link={AppLink}
      // The views live at /sign-in, /sign-up and /account instead of /auth/... and /settings/...
      basePaths={{ auth: '', settings: '' }}
      // The example Strapi writes its emails to `examples/end-users/.tmp/emails` (see its
      // `config/plugins.ts`), so the reset-password flow works: open the file and follow the link.
      // Email verification is Strapi's setting (Settings > End users > Sign-in), not this front
      // end's: with it on, Strapi sends the sign-up a verification email and no session. This
      // stays `false` so that a sign-up (verification off, the default) ends signed in; with the
      // setting on, the user is sent home and signs in once the link is followed.
      emailAndPassword={{ enabled: true, forgotPassword: true, requireEmailVerification: false }}
      additionalFields={signUpFields}
      // The two-factor sign-in challenge reads a cookie that Bearer mode never has (see README)
      plugins={AUTH_MODE === 'cookie' ? [twoFactorPlugin()] : []}
    >
      {children}
    </AuthProvider>
  );
}

function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-svh max-w-3xl flex-col gap-8 p-6">
      <header className="flex items-center justify-between gap-4">
        <nav className="flex items-center gap-4 text-sm font-medium">
          <RouterLink to="/">End users example</RouterLink>
          <RouterLink to="/articles" className="text-muted-foreground hover:text-foreground">
            Articles
          </RouterLink>
          <RouterLink to="/account" className="text-muted-foreground hover:text-foreground">
            Your account
          </RouterLink>
        </nav>
        <UserButton
          hideSettings
          links={[{ label: 'Your account', href: '/account', visibility: 'authenticated' }]}
        />
      </header>
      <main className="flex flex-1 flex-col gap-6">{children}</main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <TooltipProvider>
        <Providers>
          <Layout>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/sign-in" element={<AuthPage view="signIn" />} />
              <Route path="/sign-up" element={<AuthPage view="signUp" />} />
              <Route path="/sign-out" element={<AuthPage view="signOut" />} />
              <Route path="/forgot-password" element={<AuthPage view="forgotPassword" />} />
              <Route path="/reset-link-sent" element={<AuthPage view="resetLinkSent" />} />
              <Route path="/reset-password" element={<AuthPage view="resetPassword" />} />
              <Route path="/verify-email" element={<AuthPage view="verifyEmail" />} />
              {AUTH_MODE === 'cookie' && (
                <Route path="/two-factor" element={<AuthPage path="two-factor" />} />
              )}
              <Route path="/account" element={<AccountPage />} />
              <Route path="/articles" element={<ArticlesPage />} />
            </Routes>
          </Layout>
          <Toaster />
        </Providers>
      </TooltipProvider>
    </BrowserRouter>
  );
}
