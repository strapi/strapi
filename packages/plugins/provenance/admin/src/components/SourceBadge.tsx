import { Badge } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { getTranslation } from '../utils/translations';

import type { Source } from '../constants';
import type { BadgeProps } from '@strapi/design-system';

const SOURCE_DISPLAY: Record<Source, { variant: BadgeProps['variant']; label: string }> = {
  'ai-generated': { variant: 'alternative', label: 'AI generated' },
  'ai-assisted': { variant: 'secondary', label: 'AI assisted' },
  'human-entered': { variant: 'success', label: 'Human' },
  automated: { variant: 'primary', label: 'Integration' },
  unattributed: { variant: 'neutral', label: 'Unattributed' },
};

export const SourceBadge = ({ source }: { source: Source }) => {
  const { formatMessage } = useIntl();
  const { variant, label } = SOURCE_DISPLAY[source];

  return (
    // Never shrink: a long field name gets truncated instead
    <Badge size="S" variant={variant} shrink={0}>
      {formatMessage({ id: getTranslation(`source.${source}`), defaultMessage: label })}
    </Badge>
  );
};
