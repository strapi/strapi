import {
  Grid,
  Table,
  Thead,
  Tr,
  Th,
  Td,
  Tbody,
  Typography,
  IconButton,
  Link,
} from '@strapi/design-system';
import { Eye } from '@strapi/icons';
import { formatDistanceToNow } from 'date-fns';

import type { Activity } from '../../../../../../server/src/services/statistics';

interface ListProps {
  latestActivities: Activity[];
  col?: number;
  s?: number;
}

export const Audit: React.FC<ListProps> = ({ latestActivities, col, s }) => {
  return (
    <Grid.Item col={col || 6} s={s || 6}>
      <Table colCount={4} rowCount={4}>
        <Thead>
          <Tr>
            <Th>
              <Typography variant="sigma">Action</Typography>
            </Th>
            <Th>
              <Typography variant="sigma">Date</Typography>
            </Th>
            <Th>
              <Typography variant="sigma">User</Typography>
            </Th>
          </Tr>
        </Thead>
        <Tbody>
          {latestActivities.map((activity: Activity) => (
            <Tr key={activity.id}>
              <Td>
                <Typography textColor="neutral800">{activity.action}</Typography>
              </Td>
              <Td>
                <Typography textColor="neutral800">
                  {formatDistanceToNow(new Date(activity.createdAt))}
                </Typography>
              </Td>
              <Td>
                <Typography textColor="neutral800">
                  {activity.user?.username || activity.user?.firstname + activity.user?.lastname}
                </Typography>
              </Td>
              {activity?.payload?.entry && (
                <Td>
                  <Link
                    href={`/admin/content-manager/collection-types/${activity?.payload?.uid}/${activity?.payload?.entry?.documentId}${activity?.payload?.entry?.locale ? '?plugins[i18n][locale]=' + activity?.payload?.entry?.locale : ''}`}
                  >
                    <IconButton label="More actions">
                      <Eye />
                    </IconButton>
                  </Link>
                </Td>
              )}
            </Tr>
          ))}
        </Tbody>
      </Table>
    </Grid.Item>
  );
};
