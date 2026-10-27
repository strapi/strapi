import { useQueryParams } from '@strapi/admin/strapi-admin';
import { Button } from '@strapi/design-system';
import { Sparkle } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { useParams } from 'react-router-dom';

import { isGovernanceEnabled } from '../constants';
import { getTranslation } from '../utils/translations';

type Query = { page?: number; plugins?: Record<string, unknown> };

/**
 * List view toggle that keeps the entries with AI content left to review. The Content
 * Manager sends `plugins[provenance]` values to the server as query parameters.
 */
export const AiReviewFilter = () => {
  const { formatMessage } = useIntl();
  const { slug = '' } = useParams<{ slug: string }>();
  const [{ query }, setQuery] = useQueryParams<Query>();

  if (!slug.startsWith('api::') || !isGovernanceEnabled()) {
    return null;
  }

  const plugins = query.plugins ?? {};
  const active =
    (plugins.provenance as { provenanceReview?: string } | undefined)?.provenanceReview ===
    'pending';

  return (
    <Button
      variant={active ? 'secondary' : 'tertiary'}
      size="S"
      startIcon={<Sparkle />}
      onClick={() =>
        setQuery({
          page: 1,
          plugins: {
            ...plugins,
            provenance: active ? undefined : { provenanceReview: 'pending' },
          },
        })
      }
    >
      {formatMessage({ id: getTranslation('list.filter'), defaultMessage: 'AI to review' })}
    </Button>
  );
};
