import { Typography } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { getTrad } from '../utils/getTrad';

type DisplayedTypeProps = {
  type: string;
  customField?: string | null;
  repeatable?: boolean;
};

export const DisplayedType = ({
  type,
  customField = null,
  repeatable = false,
}: DisplayedTypeProps) => {
  const { formatMessage } = useIntl();

  let readableType = type;

  if (['integer', 'biginteger', 'float', 'decimal'].includes(type)) {
    readableType = 'number';
  } else if (['string'].includes(type)) {
    readableType = 'text';
  }

  if (customField) {
    return (
      <Typography>
        {formatMessage({
          id: getTrad('attribute.customField'),
          defaultMessage: 'Custom field',
        })}
      </Typography>
    );
  }

  return (
    <Typography textColor="neutral800">
      {formatMessage({
        id: getTrad(`attribute.${readableType}`),
        defaultMessage: type,
      })}
      &nbsp;
      {repeatable &&
        formatMessage({
          id: getTrad('component.repeatable'),
          defaultMessage: '(repeatable)',
        })}
    </Typography>
  );
};
