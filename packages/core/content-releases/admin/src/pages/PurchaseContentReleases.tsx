import { Layouts } from '@strapi/admin/strapi-admin';
import { Box, Main, EmptyStateLayout, LinkButton } from '@strapi/design-system';
import { ExternalLink } from '@strapi/icons';
import { EmptyPermissions } from '@strapi/icons/symbols';
import { useIntl } from 'react-intl';

const PurchaseContentReleases = () => {
  const { formatMessage } = useIntl();

  return (
    <Layouts.Root>
      <Main>
        <Layouts.Header
          title={formatMessage({
            id: 'content-releases.pages.Releases.title',
            defaultMessage: 'Releases',
          })}
          subtitle={formatMessage({
            id: 'content-releases.pages.PurchaseRelease.subTitle',
            defaultMessage: 'Manage content updates and releases.',
          })}
        />
        <Box paddingLeft={10} paddingRight={10}>
          <EmptyStateLayout
            icon={<EmptyPermissions width="16rem" />}
            content={formatMessage({
              id: 'content-releases.pages.PurchaseRelease.not-available',
              defaultMessage:
                'Releases is only available as part of a paid plan. Upgrade to create and manage releases.',
            })}
            action={
              <LinkButton
                variant="default"
                endIcon={<ExternalLink />}
                href="https://strapi.io/pricing-self-hosted?utm_campaign=Growth-Experiments&utm_source=In-Product&utm_medium=Releases"
                isExternal
                target="_blank"
              >
                {formatMessage({
                  id: 'global.learn-more',
                  defaultMessage: 'Learn more',
                })}
              </LinkButton>
            }
          />
        </Box>
      </Main>
    </Layouts.Root>
  );
};

export { PurchaseContentReleases };
