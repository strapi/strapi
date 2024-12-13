import { Layouts } from '@strapi/admin/strapi-admin';
import {
  Box,
  Main,
  EmptyStateLayout,
  LinkButton,
  Typography,
  Flex,
  Button,
  Divider,
} from '@strapi/design-system';
import { ExternalLink } from '@strapi/icons';
import { EmptyPermissions } from '@strapi/icons/symbols';
import { useIntl } from 'react-intl';

import { useAppInfo } from '../../../../admin/admin/src/features/AppInfo';

const PurchaseContentReleases = () => {

  const communityEdition = useAppInfo('ApplicationInfoPage', (state) => state.communityEdition);
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
                href="https://strapi.io/features/releases?utm_campaign=In-Product-CTA&utm_source=Releases"
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
          {communityEdition && (
            <Flex
              paddingBottom={10}
              background="neutral0"
              display="flex"
              justifyContent="center"
              alignItems="center"
            >
              <Box
                position="absolute"
                top="45%"
                left="30%"
                width="100px"
                height="100px"
                background="primary100"
                borderRadius="20%"
                opacity={0.3}
                transform="rotate(60deg)"
              />
              <Box
                position="absolute"
                bottom="15%"
                right="10%"
                width="150px"
                height="150px"
                background="secondary100"
                borderRadius="20%"
                opacity={0.3}
                transform="rotate(25deg)"
              />
              <Box
                padding={6}
                borderWidth="1px"
                borderStyle="solid"
                borderColor="neutral200"
                background="neutral0"
                shadow="tableShadow"
                borderRadius="4px"
                width="300px"
              >
                <Flex direction="column" alignItems="center" gap={4}>
                  <Box
                    background="primary100"
                    paddingLeft={3}
                    paddingRight={3}
                    paddingTop={2}
                    paddingBottom={2}
                    borderRadius="20px"
                    marginBottom={2}
                  >
                    <Typography variant="omega" textColor="primary600" fontWeight={600}>
                      Perfect for you
                    </Typography>
                  </Box>
                  <Typography variant="alpha" textColor="neutral800">
                    Growth
                  </Typography>

                  <Typography variant="delta" textColor="neutral900">
                    $15
                    <Typography variant="epsilon" textColor="neutral600">
                      &nbsp;per seat monthly
                    </Typography>
                  </Typography>

                  <Typography textColor="neutral600" textAlign="center" paddingBottom={4}>
                    Best for an individual building a small project.
                  </Typography>

                  <Button
                    variant="secondary"
                    fullWidth
                    onClick={() => window.open('https://strapi.io/pricing-self-hosted', '_blank')}
                  >
                    Continue with Growth
                  </Button>

                  <Divider />

                  <Box paddingTop={2} paddingBottom={2}>
                    <Typography variant="epsilon" textColor="neutral800">
                      Everything in Community, plus:
                    </Typography>
                  </Box>
                </Flex>
                <Flex direction="column" alignItems="left" padding={4} gap={2}>
                  <Typography variant="omega" textColor="neutral800">
                    ✅ Preview
                  </Typography>
                  <Typography variant="omega" textColor="neutral800">
                    ✅ Releases
                  </Typography>
                  <Typography variant="omega" textColor="neutral800">
                    ✅ Content History
                  </Typography>
                </Flex>
              </Box>
            </Flex>
          )}
        </Box>
      </Main>
    </Layouts.Root>
  );
};

export { PurchaseContentReleases };
