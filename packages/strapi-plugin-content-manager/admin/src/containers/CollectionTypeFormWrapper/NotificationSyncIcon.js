import { Sync } from '@buffetjs/icons';
import styled from 'styled-components';

const NotificationSyncIcon = styled(Sync)`
  color: ${({ theme }) => theme.main.colors.blue};
  > path {
    fill: ${({ theme }) => theme.main.colors.blue};
  }
`;

export default NotificationSyncIcon;
