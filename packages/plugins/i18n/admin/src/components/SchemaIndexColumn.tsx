import { Typography } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { getTranslation } from '../utils/getTranslation';

interface SchemaLike {
  pluginOptions?: { i18n?: { localized?: boolean } };
}

export const isLocalized = (schema: unknown): boolean =>
  (schema as SchemaLike)?.pluginOptions?.i18n?.localized === true;

/**
 * The "Internationalization" cell of the schema index. A content type is either
 * translated or it is not, and that has been invisible outside the settings
 * modal — which is the whole reason the index exists.
 */
export const LocalizedCell = ({ schema }: { schema: unknown }) => {
  const { formatMessage } = useIntl();

  if (!isLocalized(schema)) {
    return <Typography textColor="neutral400">—</Typography>;
  }

  return (
    <Typography textColor="success600" fontWeight="bold">
      {formatMessage({ id: getTranslation('index.column.on'), defaultMessage: 'On' })}
    </Typography>
  );
};
