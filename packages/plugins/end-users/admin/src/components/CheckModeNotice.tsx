import * as React from 'react';

import { Layouts, Page } from '@strapi/admin/strapi-admin';
import { Flex, Link, Typography } from '@strapi/design-system';
import { Information } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { NavLink } from 'react-router-dom';

import { MIGRATION_PATH } from '../constants';
import { useGetMigrationStatusQuery } from '../services/migration';
import { getTranslation } from '../utils/getTranslation';

/** What each page that has nothing to show in check mode calls itself: its title and subtitle */
const PAGES = {
  roles: {
    title: { id: getTranslation('roles.list.title'), defaultMessage: 'Roles' },
    subtitle: { id: getTranslation('roles.list.subtitle'), defaultMessage: 'List of roles' },
  },
  conditions: {
    title: { id: getTranslation('conditions.list.title'), defaultMessage: 'Conditions' },
    subtitle: {
      id: getTranslation('conditions.list.subtitle'),
      defaultMessage: 'List of conditions',
    },
  },
  providers: {
    title: { id: getTranslation('providers.title'), defaultMessage: 'Providers' },
    subtitle: {
      id: getTranslation('providers.subtitle'),
      defaultMessage: 'The identity providers end users can sign in with',
    },
  },
  'sign-in': {
    title: { id: getTranslation('settings.sign-in.title'), defaultMessage: 'Sign-in' },
    subtitle: {
      id: getTranslation('settings.sign-in.subtitle'),
      defaultMessage: 'How end users register and sign in',
    },
  },
} as const;

interface CheckModeNoticeProps {
  /** The page this stands in for, so it keeps its title and subtitle */
  page: keyof typeof PAGES;
  children?: React.ReactNode;
}

/**
 * In check mode only the migration routes exist, so the other End users pages have nothing to show:
 * they show this in place of their content, under their own header, and say where the check is. It
 * wraps the page's permission check, because the actions a page is protected by are not registered
 * in check mode, and an admin who opens the page by its address would be told they have no access.
 * Outside check mode it renders `children`, which are not mounted (and ask for nothing) until the
 * mode is known. A refused status read (no `settings.read`) is not check mode.
 */
const CheckModeNotice = ({ page, children }: CheckModeNoticeProps) => {
  const { formatMessage } = useIntl();
  const { data, isLoading } = useGetMigrationStatusQuery();

  if (isLoading) {
    return <Page.Loading />;
  }

  if (data?.mode !== 'check') {
    return <>{children}</>;
  }

  const title = formatMessage(PAGES[page].title);

  return (
    <Page.Main>
      <Page.Title>
        {formatMessage(
          { id: 'Settings.PageTitle', defaultMessage: 'Settings — {name}' },
          { name: title }
        )}
      </Page.Title>
      <Layouts.Header title={title} subtitle={formatMessage(PAGES[page].subtitle)} />
      <Layouts.Content>
        {/* Not an Alert: its close button would leave the page empty */}
        <Flex gap={3} padding={4} background="neutral100" borderColor="neutral200" hasRadius>
          <Information fill="neutral600" aria-hidden />
          <Flex direction="column" alignItems="flex-start" gap={1}>
            <Typography textColor="neutral800">
              {formatMessage({
                id: getTranslation('migration.check-mode.message'),
                defaultMessage: 'End users turns on when the migration runs',
              })}
            </Typography>
            <Link tag={NavLink} to={MIGRATION_PATH}>
              {formatMessage({
                id: getTranslation('migration.check-mode.link'),
                defaultMessage: 'Open the migration check',
              })}
            </Link>
          </Flex>
        </Flex>
      </Layouts.Content>
    </Page.Main>
  );
};

export { CheckModeNotice };
