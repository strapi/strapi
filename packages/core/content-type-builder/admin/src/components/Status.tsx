import { Typography } from '@strapi/design-system';

export const Status = ({ status }: { status: string }) => {
  switch (status) {
    case 'UNCHANGED':
      return null;
    case 'CHANGED':
      return <Typography textColor="warning500">C</Typography>;
    case 'REMOVED':
      return <Typography textColor="danger500">R</Typography>;
    case 'NEW':
      return <Typography textColor="success500">N</Typography>;
  }
};
