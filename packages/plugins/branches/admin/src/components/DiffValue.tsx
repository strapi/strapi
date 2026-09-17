import { Box, Typography } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { getTranslation } from '../utils/getTranslation';

interface DiffValueProps {
  type: string;
  value: unknown;
}

const isRef = (value: unknown): value is { documentId?: string; id?: unknown } =>
  !!value && typeof value === 'object' && !Array.isArray(value);

/** Compact, readable rendering of a snapshot value in the diff table. */
export const DiffValue = ({ type, value }: DiffValueProps) => {
  const { formatMessage } = useIntl();
  const empty = (
    <Typography textColor="neutral500" variant="pi">
      {formatMessage({ id: getTranslation('diff.empty'), defaultMessage: '(empty)' })}
    </Typography>
  );

  if (value === null || value === undefined || value === '') {
    return empty;
  }

  switch (type) {
    case 'relation':
    case 'media': {
      const items = Array.isArray(value) ? value : [value];
      if (items.length === 0) {
        return empty;
      }
      return (
        <Typography variant="pi">
          {items
            .map((item) =>
              isRef(item) ? (item.documentId ?? String(item.id ?? '')) : String(item)
            )
            .join(', ')}
        </Typography>
      );
    }
    case 'component':
    case 'dynamiczone':
    case 'json':
    case 'blocks': {
      const items = Array.isArray(value) ? value : null;
      return (
        <Box>
          {items ? (
            <Typography variant="pi" textColor="neutral600">
              {formatMessage(
                {
                  id: getTranslation('diff.value.items'),
                  defaultMessage: '{count, plural, one {# item} other {# items}}',
                },
                { count: items.length }
              )}
            </Typography>
          ) : null}
          <Box
            tag="pre"
            fontSize={1}
            lineHeight={4}
            maxHeight="12rem"
            overflow="auto"
            padding={2}
            background="neutral100"
            hasRadius
            style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
          >
            {JSON.stringify(value, null, 2)}
          </Box>
        </Box>
      );
    }
    case 'boolean':
      return <Typography variant="pi">{value ? 'true' : 'false'}</Typography>;
    default: {
      const text = typeof value === 'string' ? value : JSON.stringify(value);
      return (
        <Typography variant="pi" style={{ wordBreak: 'break-word' }}>
          {text.length > 400 ? `${text.slice(0, 400)}…` : text}
        </Typography>
      );
    }
  }
};
