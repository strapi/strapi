import { Typography } from '@strapi/design-system';

export const Status = ({ status }: { status: string }) => {
  switch (status) {
    case 'UNCHANGED':
      return null;
    case 'CHANGED':
      return (
        <Typography fontWeight="semiBold" textColor="warning500">
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
