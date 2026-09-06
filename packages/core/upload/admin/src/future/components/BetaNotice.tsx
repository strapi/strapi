import { usePersistentState } from '@strapi/admin/strapi-admin';
import { Alert, Box, Flex, Typography } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { getTranslationKey } from '../utils/translations';

/**
 * The beta indicator is a notice rather than a badge on the page header: that
 * header's title follows the folder you are in, so a badge attached to it would
 * read as "this folder is beta". This notice covers the whole Media Library, and
 * stays dismissed once a tester has read it.
 *
 * It renders inside `Layouts.Content` so it picks up the content column's gutter.
 * Rendered above the layout instead, it would span the full viewport width and
 * sit over the folder sidebar.
 */
export const BetaNotice = () => {
  const { formatMessage } = useIntl();
  const [isBetaNoticeDismissed, setIsBetaNoticeDismissed] = usePersistentState(
    'STRAPI_UPLOAD_LIBRARY_BETA_NOTICE_DISMISSED',
    false
  );

  if (isBetaNoticeDismissed) {
    return null;
  }

  return (
    <Box paddingBottom={4}>
      <Alert
        variant="default"
        onClose={() => setIsBetaNoticeDismissed(true)}
        closeLabel={formatMessage({
          id: getTranslationKey('beta.notice.close'),
          defaultMessage: 'Close',
        })}
        title={formatMessage({
          id: getTranslationKey('plugin.name'),
          defaultMessage: 'Media Library',
        })}
      >
        {/* `Alert` renders its children inside a `<p>`, so everything here stays
            inline to keep the markup valid. That rules out `Badge`, which always
            renders a `<div>` — the badge below reproduces its look on a `<span>`. */}
        <Flex tag="span" gap={2} alignItems="center">
          <Box
            tag="span"
            background="neutral150"
            hasRadius
            paddingLeft={2}
            paddingRight={2}
            shrink={0}
          >
            <Typography variant="sigma" textColor="neutral600">
              {formatMessage({
                id: getTranslationKey('beta.badge'),
                defaultMessage: 'Beta',
              })}
            </Typography>
          </Box>
          <Typography tag="span">
            {formatMessage({
              id: getTranslationKey('beta.notice.content'),
              defaultMessage:
                'This is a beta version of the Media Library. Some features are still in progress — please report any issue you run into.',
            })}
          </Typography>
        </Flex>
      </Alert>
    </Box>
  );
};
