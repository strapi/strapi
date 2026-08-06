import * as React from 'react';

import { Page, usePersistentState } from '@strapi/admin/strapi-admin';
import { Alert, Badge, Box, Flex, Typography } from '@strapi/design-system';
import { useIntl } from 'react-intl';
import { Route, Routes } from 'react-router-dom';

import { AssetsPage } from './pages/Assets/AssetsPage';
import { getTranslationKey } from './utils/translations';

export const BetaMediaLibrary = () => {
  const { formatMessage } = useIntl();
  const [isBetaNoticeDismissed, setIsBetaNoticeDismissed] = usePersistentState(
    'STRAPI_UPLOAD_LIBRARY_BETA_NOTICE_DISMISSED',
    false
  );

  const title = formatMessage({
    id: getTranslationKey('plugin.name'),
    defaultMessage: 'Media Library',
  });

  return (
    <Page.Main>
      <Page.Title>{title}</Page.Title>

      {/**
       * The beta indicator sits here rather than on the page header: that header's
       * title follows the folder you are in, so a badge attached to it would read as
       * "this folder is beta". This notice covers the whole Media Library, and stays
       * dismissed once a tester has read it.
       */}
      {!isBetaNoticeDismissed && (
        <Box paddingLeft={10} paddingRight={10} paddingTop={6}>
          <Alert
            variant="default"
            onClose={() => setIsBetaNoticeDismissed(true)}
            closeLabel={formatMessage({
              id: getTranslationKey('beta.notice.close'),
              defaultMessage: 'Close',
            })}
            title={title}
          >
            <Flex gap={2} alignItems="center">
              <Badge>
                {formatMessage({
                  id: getTranslationKey('beta.badge'),
                  defaultMessage: 'Beta',
                })}
              </Badge>
              <Typography>
                {formatMessage({
                  id: getTranslationKey('beta.notice.content'),
                  defaultMessage:
                    'This is a beta version of the Media Library. Some features are still in progress — please report any issue you run into.',
                })}
              </Typography>
            </Flex>
          </Alert>
        </Box>
      )}

      <Routes>
        <Route index element={<AssetsPage />} />
      </Routes>
    </Page.Main>
  );
};
