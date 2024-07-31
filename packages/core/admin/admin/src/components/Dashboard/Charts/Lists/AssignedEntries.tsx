import {
  Grid,
  Flex,
  Table,
  Box,
  Thead,
  Tr,
  Th,
  Td,
  Tbody,
  Typography,
  IconButton,
  Link,
  Tabs,
} from '@strapi/design-system';
import { Eye } from '@strapi/icons';
import { UID } from '@strapi/types';
import { formatDistanceToNow } from 'date-fns';

import type { PieData } from '../../../../../../server/src/services/statistics';

interface AssignedEntriesListProps {
  data: PieData[];
  col?: number;
  s?: number;
  uid: UID.ContentType | null;
}

export const AssignedEntries: React.FC<AssignedEntriesListProps> = ({ data, col, s, uid }) => {
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
        <Tabs.Root
          variant="simple"
          defaultValue={data?.[0]?.name.toLowerCase().replace(/\s+/g, '-')}
        >
          <Tabs.List aria-label="Manage your attribute">
            {data.map((stage) => (
              <Tabs.Trigger key={stage.name} value={stage.name.toLowerCase().replace(/\s+/g, '-')}>
                {stage.name}
              </Tabs.Trigger>
            ))}
          </Tabs.List>
          {data.map((stage) => (
            <Tabs.Content key={stage.name} value={stage.name.toLowerCase().replace(/\s+/g, '-')}>
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
                        <Typography variant="sigma">Stage</Typography>
                      </Th>
                      <Th>
                        <Typography variant="sigma">Updated</Typography>
                      </Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {stage?.entries &&
                      stage.entries.map((entry) => (
                        <Tr key={entry.id}>
                          <Td>
                            <Typography textColor="neutral800">{entry.id}</Typography>
                          </Td>
                          <Td>
                            <Typography textColor="neutral800">{entry.documentId}</Typography>
                          </Td>
                          <Td>
                            <Typography textColor="neutral800">{stage.name}</Typography>
                          </Td>
                          <Td>
                            <Typography textColor="neutral800">
                              {formatDistanceToNow(new Date(entry.updatedAt), { addSuffix: true })}
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
          ))}
        </Tabs.Root>
      </Flex>
    </Grid.Item>
  );
};
