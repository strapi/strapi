import { Flex } from '@strapi/design-system';
import { Earth, EarthStriked } from '@strapi/icons';
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
 *
 * A globe and a struck-through globe rather than the tick and cross the other
 * columns use: the option has a symbol of its own, and a column of them is read
 * at a glance without going back to the header to remember what is being asked.
 */
export const LocalizedCell = ({ schema }: { schema: unknown }) => {
  const { formatMessage } = useIntl();
  const on = isLocalized(schema);

  const Icon = on ? Earth : EarthStriked;

  return (
    <Flex tag="span" alignItems="center">
      <Icon
        fill={on ? 'success600' : 'neutral400'}
        width="2rem"
        height="2rem"
        aria-label={formatMessage(
          on
            ? { id: getTranslation('index.column.localized'), defaultMessage: 'Localized' }
            : { id: getTranslation('index.column.notLocalized'), defaultMessage: 'Not localized' }
        )}
      />
    </Flex>
  );
};
