import {
  Box,
  EmptyStateLayout,
  Flex,
  Grid,
  GridItem,
  Loader,
  Typography,
} from '@strapi/design-system';
import { AnErrorOccurred } from '@strapi/helper-plugin';
import { EmptyDocuments } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { useHistory } from 'react-router-dom';

import { Release } from '../../../shared/contracts/releases';

interface ReleasesGridProps {
  status: 'loading' | 'error' | 'success';
  sectionTitle: 'pending' | 'done';
  releases?: Array<Release>;
}

const ReleasesGrid = ({ status, sectionTitle, releases }: ReleasesGridProps) => {
  const { formatMessage } = useIntl();
  const { push } = useHistory();

  if (status === 'error') {
    return (
      <Flex paddingTop={8}>
        <AnErrorOccurred />
      </Flex>
    );
  }

  if (status === 'loading') {
    return (
      <Flex justifyContent="center" paddingTop={8}>
        <Loader>Loading content...</Loader>
      </Flex>
    );
  }

  const emptyEntriesMessage = formatMessage(
    {
      id: 'content-releases.page.Releases.tab.emptyEntries',
      defaultMessage: 'No {target} entries',
    },
    {
      target: sectionTitle,
    }
  );

  if (releases?.length === 0) {
    return (
      <Box paddingTop={10}>
        <EmptyStateLayout content={emptyEntriesMessage} icon={<EmptyDocuments width="10rem" />} />
      </Box>
    );
  }

  const handleClick = (id: Release['id']) => {
    push(`/plugins/content-releases/${id}`);
  };

  return (
    <Box paddingTop={9}>
      <Grid gap={4}>
        {releases?.map((release) => (
          <GridItem col={3} s={6} xs={12} style={{ height: '100%' }} key={release.id}>
            <Flex
              direction="column"
              justifyContent="space-between"
              padding={4}
              hasRadius
              background="neutral0"
              shadow="tableShadow"
              height="100%"
              width="100%"
              alignItems="start"
              cursor="pointer"
              as="button"
              onClick={() => handleClick(release.id)}
            >
              <Typography as="h3" variant="delta" fontWeight="bold">
                {release.name}
              </Typography>
            </Flex>
          </GridItem>
        ))}
      </Grid>
    </Box>
  );
};

export { ReleasesGrid };
