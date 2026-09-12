import { Flex } from '@strapi/design-system';
import { CheckCircle, CrossCircle } from '@strapi/icons';
import { useIntl } from 'react-intl';

/**
 * A yes-or-no option in a list of schemas.
 *
 * A mark reads down a column faster than a word does, and the column is only
 * ever asking one question — so the words were carrying no information the
 * header did not already give. Off is a cross rather than a dash: a dash reads
 * as missing data, and this data is not missing.
 *
 * Exported for the plugins that contribute their own columns, so an option
 * they own looks like an option the builder owns.
 */
export const SchemaOption = ({ on }: { on: boolean }) => {
  const { formatMessage } = useIntl();

  if (!on) {
    return (
      <Flex tag="span" alignItems="center">
        <CrossCircle
          fill="neutral400"
          width="2rem"
          height="2rem"
          aria-label={formatMessage({ id: 'global.off', defaultMessage: 'Off' })}
        />
      </Flex>
    );
  }

  return (
    <Flex tag="span" alignItems="center">
      <CheckCircle
        fill="success600"
        width="2rem"
        height="2rem"
        aria-label={formatMessage({ id: 'global.on', defaultMessage: 'On' })}
      />
    </Flex>
  );
};
