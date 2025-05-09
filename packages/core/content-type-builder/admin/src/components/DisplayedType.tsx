import { useIntl } from 'react-intl';

import { getTrad } from '../utils/getTrad';

type DisplayedTypeProps = {
  type: string;
  customField?: string | null;
  repeatable?: boolean;
  multiple?: boolean;
};

export const DisplayedType = ({
  type,
  customField = null,
  repeatable = false,
  multiple = false,
}: DisplayedTypeProps) => {
  const { formatMessage } = useIntl();

  let readableType = type;

  if (['integer', 'biginteger', 'float', 'decimal'].includes(type)) {
    readableType = 'number';
  } else if (['string'].includes(type)) {
    readableType = 'text';
  }

  if (customField) {
    return formatMessage({
      id: getTrad('attribute.customField'),
      defaultMessage: 'Custom field',
    });
  }

  return (
    <>
      {repeatable &&
        formatMessage({
          id: getTrad('component.repeatable'),
          defaultMessage: 'Repeatable',
        })}
      {multiple &&
        formatMessage({
          id: getTrad('media.multiple'),
          defaultMessage: 'Multiple',
        })}
      &nbsp;
      {formatMessage({
        id: getTrad(`attribute.${readableType}`),
        defaultMessage: type,
      })}
    </>
  );
};
