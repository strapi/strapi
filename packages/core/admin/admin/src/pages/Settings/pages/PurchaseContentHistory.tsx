import { Box, Main, EmptyStateLayout, LinkButton } from '@strapi/design-system';
import { ExternalLink } from '@strapi/icons';
import { EmptyPermissions } from '@strapi/icons/symbols';
import { useIntl } from 'react-intl';

import { Layouts } from '../../../components/Layouts/Layout';

const PurchaseContentHistory = () => {
  const { formatMessage } = useIntl();

  return (
    <Layouts.Root>
      <Main>
        <Layouts.Header
          title={formatMessage({
            id: 'Settings.content-history.title',
            defaultMessage: 'Content History',
          })}
          subtitle={formatMessage({
            id: 'Settings.content-history.description',
            defaultMessage: 'Get more control over every step of your content’s lifecycle.',
          })}
        />
        <Box paddingLeft={10} paddingRight={10}>
          <EmptyStateLayout
            icon={<EmptyPermissions width="16rem" />}
            content={formatMessage({
              id: 'Settings.content-history.not-available',
              defaultMessage:
                "Content History is only available as part of a paid plan. Upgrade to get full control over your content's lifecycle.",
            })}
            action={
              <LinkButton
                variant="default"
                endIcon={<ExternalLink />}
                href="https://strapi.io/features/content-history?utm_campaign=In-Product-CTA&utm_source=Content-History"
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

export { PurchaseContentHistory };
