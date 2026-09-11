import { LinkButton, Typography } from '@strapi/design-system';
import { ExternalLink } from '@strapi/icons';
import { useIntl } from 'react-intl';

import { useScopedPersistentState } from '../hooks/usePersistentState';

import { DismissibleBanner } from './DismissibleBanner';

const Banner = ({
  isLegacyMediaLibrary,
  onDismiss,
}: {
  isLegacyMediaLibrary: boolean;
  onDismiss: () => void;
}) => {
  const { formatMessage } = useIntl();

  return (
    <DismissibleBanner
      onDismiss={onDismiss}
      closeLabel={formatMessage({
        id: 'app.components.MediaLibraryBanner.close',
        defaultMessage: 'Close',
      })}
      message={
        <>
          <Typography
            variant="delta"
            fontWeight="bold"
            textColor="neutral0"
            textAlign="center"
            fontSize={2}
          >
            {formatMessage({
              id: 'app.components.MediaLibraryBanner.intro',
              defaultMessage: 'Introducing the new Media Library ',
            })}
          </Typography>
          <Typography
            variant="delta"
            textColor="neutral0"
            textAlign="center"
            paddingRight={4}
            fontSize={2}
          >
            {formatMessage(
              isLegacyMediaLibrary
                ? {
                    id: 'app.components.MediaLibraryBanner.text',
                    defaultMessage:
                      'Check the documentation to learn how to switch to the new one.',
                  }
                : {
                    id: 'app.components.MediaLibraryBanner.text.enabled',
                    defaultMessage: "You're now using the revamped version.",
                  }
            )}
          </Typography>
        </>
      }
      action={
        isLegacyMediaLibrary ? (
          <LinkButton
            width="max-content"
            variant="tertiary"
            startIcon={<ExternalLink />}
            href="https://docs.strapi.io/cms/features/media-library"
            target="_blank"
          >
            {formatMessage({
              id: 'app.components.MediaLibraryBanner.button',
              defaultMessage: 'Docs',
            })}
          </LinkButton>
        ) : (
          <LinkButton
            width="max-content"
            variant="tertiary"
            href="https://strapi.io/blog/strapi-release-roundup-everything-that-changed-between-june-and-august-2026"
            target="_blank"
          >
            {formatMessage({
              id: 'app.components.MediaLibraryBanner.button.enabled',
              defaultMessage: 'Read blog post',
            })}
          </LinkButton>
        )
      }
    />
  );
};

const MediaLibraryBanner = () => {
  const isLegacyMediaLibrary = window.strapi.featureFlags.isEnabled('useLegacyMediaLibrary');

  // The flag state is part of the key (not the stored value) so dismissing one
  // message never collides with the other, and toggling `useLegacyMediaLibrary`
  // (enabling it, or rolling it back) brings the banner back with the right message.
  const [isDismissed, setIsDismissed] = useScopedPersistentState<boolean>(
    `STRAPI_MEDIA_LIBRARY_BANNER_DISMISSED_FOR_${isLegacyMediaLibrary}`,
    false
  );

  if (isDismissed) {
    return null;
  }

  return (
    <Banner isLegacyMediaLibrary={isLegacyMediaLibrary} onDismiss={() => setIsDismissed(true)} />
  );
};

export { MediaLibraryBanner };
