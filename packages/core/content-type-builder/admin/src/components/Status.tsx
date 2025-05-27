import { Typography, Badge } from '@strapi/design-system';

export const Status = ({ status }: { status: string }) => {
  switch (status) {
    case 'UNCHANGED':
      return null;
    case 'CHANGED':
      return (
        <Typography fontWeight="semiBold" textColor="alternative500">
          M
        </Typography>
      );
    case 'REMOVED':
      return (
        <Typography fontWeight="semiBold" textColor="danger500">
          D
        </Typography>
      );
    case 'NEW':
      return (
        <Typography fontWeight="semiBold" textColor="success500">
          N
        </Typography>
      );
  }
};

export const StatusBadge = ({ status }: { status: string }) => {
  switch (status) {
    case 'CHANGED':
      return (
        <Badge
          fontWeight="bold"
          textColor="alternative600"
          backgroundColor="alternative100"
          borderColor="alternative200"
        >
          Modified
        </Badge>
      );
    case 'REMOVED':
      return (
        <Badge
          fontWeight="bold"
          textColor="danger600"
          backgroundColor="danger100"
          borderColor="danger200"
        >
          Deleted
        </Badge>
      );
    case 'NEW':
      return (
        <Badge
          fontWeight="bold"
          textColor="success600"
          backgroundColor="success100"
          borderColor="success200"
        >
          New
        </Badge>
      );
    case 'UNCHANGED':
    default:
      return (
        <Badge
          style={{
            visibility: 'hidden',
          }}
          fontWeight="bold"
          textColor="warning600"
          backgroundColor="warning100"
          borderColor="warning200"
        >
          Unchanged
        </Badge>
      );
  }
};
