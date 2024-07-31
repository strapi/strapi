import {
  Grid,
  Flex,
  Table,
  Tabs,
  Box,
  Thead,
  Tr,
  Th,
  Td,
  Tbody,
  Typography,
  IconButton,
  Link,
} from '@strapi/design-system';
import { Eye, Pencil } from '@strapi/icons';
import { formatDistanceToNow } from 'date-fns';

import type { Entry, User } from '../../../../../server/src/services/statistics';

interface Contributor extends User {
  count?: number;
}

interface ListProps {
  uid: string | null;
  contributors: Contributor[];
  latestDraftEntries: Entry[];
  latestPublishedEntries: Entry[];
  col?: number;
  s?: number;
}

export const List: React.FC<ListProps> = ({
  uid,
  contributors,
  latestDraftEntries,
  latestPublishedEntries,
  col,
  s,
}) => {
  return (
    <Grid.Item col={col || 6} s={s || 6}>
      <Flex
        shadow="tableShadow"
        hasRadius
        padding={6}
        background="neutral0"
        direction="column"
        gap={4}
        height="100%"
      >
        <Tabs.Root variant="simple" defaultValue="contributors">
          <Tabs.List aria-label="Manage your attribute">
            <Tabs.Trigger value="contributors">Top Contributors</Tabs.Trigger>
            <Tabs.Trigger value="draft">Latest Draft</Tabs.Trigger>
            <Tabs.Trigger value="published">Latest Published</Tabs.Trigger>
          </Tabs.List>
          <Tabs.Content value="contributors">
            <Box paddingTop={6}>
              <Table colCount={4} rowCount={4}>
                <Thead>
                  <Tr>
                    <Th>
                      <Typography variant="sigma">ID</Typography>
                    </Th>
                    <Th>
                      <Typography variant="sigma">Username</Typography>
                    </Th>
                    <Th>
                      <Typography variant="sigma">Firstname</Typography>
                    </Th>
                    <Th>
                      <Typography variant="sigma">Lastname</Typography>
                    </Th>
                    <Th>
                      <Typography variant="sigma">Contributions (create/update)</Typography>
                    </Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {contributors.map((contributor) => (
                    <Tr key={contributor.id}>
                      <Td>
                        <Typography textColor="neutral800">{contributor.id}</Typography>
                      </Td>
                      <Td>
                        <Typography textColor="neutral800">{contributor.username}</Typography>
                      </Td>
                      <Td>
                        <Typography textColor="neutral800">{contributor.firstname}</Typography>
                      </Td>
                      <Td>
                        <Typography textColor="neutral800">{contributor.lastname}</Typography>
                      </Td>
                      <Td>
                        <Typography textColor="neutral800">{contributor.count}</Typography>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </Box>
          </Tabs.Content>
          <Tabs.Content value="draft">
            <Box paddingTop={6}>
              <Table colCount={4} rowCount={4}>
                <Thead>
                  <Tr>
                    <Th>
                      <Typography variant="sigma">ID</Typography>
                    </Th>
                    <Th>
                      <Typography variant="sigma">Document Id</Typography>
                    </Th>
                    <Th>
                      <Typography variant="sigma">Updated</Typography>
                    </Th>
                    <Th>
                      <Typography variant="sigma">Updated By</Typography>
                    </Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {latestDraftEntries.map((entry) => (
                    <Tr key={entry.id}>
                      <Td>
                        <Typography textColor="neutral800">{entry.id}</Typography>
                      </Td>
                      <Td>
                        <Typography textColor="neutral800">{entry.documentId}</Typography>
                      </Td>
                      <Td>
                        <Typography textColor="neutral800">
                          {formatDistanceToNow(new Date(entry.updatedAt), { addSuffix: true })}
                        </Typography>
                      </Td>
                      <Td>
                        <Typography textColor="neutral800">
                          {entry.updatedBy.username || entry.updatedBy.firstname}
                        </Typography>
                      </Td>
                      <Td>
                        <Link
                          href={`/admin/content-manager/collection-types/${uid}/${entry.documentId}${entry.locale ? '?plugins[i18n][locale]=' + entry.locale : ''}`}
                        >
                          <IconButton label="More actions">
                            <Pencil />
                          </IconButton>
                        </Link>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </Box>
          </Tabs.Content>
          <Tabs.Content value="published">
            <Box paddingTop={6}>
              <Table colCount={4} rowCount={4}>
                <Thead>
                  <Tr>
                    <Th>
                      <Typography variant="sigma">ID</Typography>
                    </Th>
                    <Th>
                      <Typography variant="sigma">Document Id</Typography>
                    </Th>
                    <Th>
                      <Typography variant="sigma">Published</Typography>
                    </Th>
                    <Th>
                      <Typography variant="sigma">Updated By</Typography>
                    </Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {latestPublishedEntries.map((entry) => (
                    <Tr key={entry.id}>
                      <Td>
                        <Typography textColor="neutral800">{entry.id}</Typography>
                      </Td>
                      <Td>
                        <Typography textColor="neutral800">{entry.documentId}</Typography>
                      </Td>
                      <Td>
                        <Typography textColor="neutral800">
                          {entry.publishedAt &&
                            formatDistanceToNow(new Date(entry.publishedAt), { addSuffix: true })}
                        </Typography>
                      </Td>
                      <Td>
                        <Typography textColor="neutral800">
                          {entry?.updatedBy?.username || entry?.updatedBy?.firstname || '???'}
                        </Typography>
                      </Td>
                      <Td>
                        <Link
                          href={`/admin/content-manager/collection-types/${uid}/${entry.documentId}${entry.locale ? '?plugins[i18n][locale]=' + entry.locale : ''}`}
                        >
                          <IconButton label="More actions">
                            <Eye />
                          </IconButton>
                        </Link>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </Box>
          </Tabs.Content>
        </Tabs.Root>
      </Flex>
    </Grid.Item>
  );
};
