import * as React from 'react';

import { HeaderLayout, Typography } from '@strapi/design-system';
import { Link } from '@strapi/design-system/v2';
import { useQueryParams } from '@strapi/helper-plugin';
import { ArrowLeft } from '@strapi/icons';
import { stringify } from 'qs';
import { useIntl } from 'react-intl';
import { NavLink, type To, useParams, useMatch } from 'react-router-dom';

import { useHistoryContext } from '../pages/History';

interface VersionHeaderProps {
  headerId: string;
}

export const VersionHeader = ({ headerId }: VersionHeaderProps) => {
  const { formatMessage, formatDate } = useIntl();
  const { version, layout } = useHistoryContext('VersionHeader', (state) => ({
    version: state.selectedVersion,
    layout: state.layout,
  }));
  const [{ query }] = useQueryParams<{
    plugins?: Record<string, unknown>;
  }>();
  const isCollectionType = useMatch('/content-manager/collection-types/:slug/:id/history');
  const mainFieldValue = version.data[layout.contentType.settings.mainField];

  const getBackLink = (): To => {
    const pluginsQueryParams = stringify({ plugins: query.plugins }, { encode: false });

    if (isCollectionType) {
      return {
        pathname: `../collection-types/${version.contentType}/${version.relatedDocumentId}`,
        search: pluginsQueryParams,
      };
    }

    return {
      pathname: `../single-types/${version.contentType}`,
      search: pluginsQueryParams,
    };
  };

  return (
    <HeaderLayout
      id={headerId}
      title={formatDate(new Date(version.createdAt), {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
      })}
      subtitle={
        <Typography variant="epsilon">
          {formatMessage(
            {
              id: 'content-manager.history.version.subtitle',
              defaultMessage:
                '{hasLocale, select, true {{subtitle}, in {locale}} other {{subtitle}}}',
            },
            {
              hasLocale: Boolean(version.locale),
              subtitle: `${mainFieldValue || ''} (${layout.contentType.info.singularName})`.trim(),
              locale: version.locale?.name,
            }
          )}
        </Typography>
      }
      navigationAction={
        <Link
          startIcon={<ArrowLeft />}
          as={NavLink}
          // @ts-expect-error - types are not inferred correctly through the as prop.
          to={getBackLink()}
        >
          {formatMessage({
            id: 'global.back',
            defaultMessage: 'Back',
          })}
        </Link>
      }
    />
  );
};
