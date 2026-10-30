import * as React from 'react';

import { useQueryParams } from '@strapi/admin/strapi-admin';
import { Badge, Typography } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { loadSummary, type EntrySummary } from '../utils/summaries';
import { getTranslation } from '../utils/translations';

type Row = {
  documentId: string;
  updatedAt?: string;
};

export const ListViewCell = ({ row, model }: { row: Row; model: string }) => {
  const { formatMessage } = useIntl();
  const [{ query }] = useQueryParams<{ plugins?: { i18n?: { locale?: string } } }>();
  const locale = query.plugins?.i18n?.locale;
  const [summary, setSummary] = React.useState<EntrySummary | null>(null);
  const version = row.updatedAt ?? '';

  React.useEffect(() => {
    let active = true;

    loadSummary({ uid: model, locale, documentId: row.documentId, version }).then((result) => {
      if (active) {
        setSummary(result);
      }
    });

    return () => {
      active = false;
    };
  }, [model, locale, row.documentId, version]);

  if (summary === null || summary.ai === 0) {
    return <Typography textColor="neutral800">-</Typography>;
  }

  if (summary.toReview > 0) {
    return (
      <Badge size="S" variant="warning">
        {formatMessage(
          { id: getTranslation('list.to-review'), defaultMessage: '{count} AI to review' },
          { count: summary.toReview }
        )}
      </Badge>
    );
  }

  return (
    <Badge size="S" variant="success">
      {formatMessage({ id: getTranslation('list.reviewed'), defaultMessage: 'AI reviewed' })}
    </Badge>
  );
};
