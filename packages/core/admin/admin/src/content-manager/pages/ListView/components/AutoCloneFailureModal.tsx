import { Box, Flex, Icon, Typography } from '@strapi/design-system';
import { ChevronRight } from '@strapi/icons';
import { useIntl } from 'react-intl';

import { getTranslation } from '../../../utils/translations';

import type { Contracts } from '@strapi/plugin-content-manager/_internal/shared';

type ProhibitedCloningField = Contracts.CollectionTypes.ProhibitedCloningField;
type Reason = ProhibitedCloningField[1];

interface AutoCloneFailureModalBodyProps {
  prohibitedFields: ProhibitedCloningField[];
}

const AutoCloneFailureModalBody = ({ prohibitedFields }: AutoCloneFailureModalBodyProps) => {
  const { formatMessage } = useIntl();

  const getDefaultErrorMessage = (reason: Reason) => {
    switch (reason) {
      case 'relation':
        return 'Duplicating the relation could remove it from the original entry.';
      case 'unique':
        return 'Identical values in a unique field are not allowed';
      default:
        return reason;
    }
  };

  return (
    <>
      <Typography variant="beta">
        {formatMessage({
          id: getTranslation('containers.list.autoCloneModal.title'),
          defaultMessage: "This entry can't be duplicated directly.",
        })}
      </Typography>
      <Box marginTop={2}>
        <Typography textColor="neutral600">
          {formatMessage({
            id: getTranslation('containers.list.autoCloneModal.description'),
            defaultMessage:
              "A new entry will be created with the same content, but you'll have to change the following fields to save it.",
          })}
        </Typography>
      </Box>
      <Flex marginTop={6} gap={2} direction="column" alignItems="stretch">
        {prohibitedFields.map(([fieldPath, reason]) => (
          <Flex
            direction="column"
            gap={2}
            alignItems="flex-start"
            borderColor="neutral200"
            hasRadius
            padding={6}
            key={fieldPath.join()}
          >
            <Flex direction="row" as="ol">
              {fieldPath.map((pathSegment, index) => (
                <Typography fontWeight="semiBold" as="li" key={index}>
                  {pathSegment}
                  {index !== fieldPath.length - 1 && (
                    <Icon
                      as={ChevronRight}
                      color="neutral500"
                      height={2}
                      width={2}
                      marginLeft={2}
                      marginRight={2}
                    />
                  )}
                </Typography>
              ))}
            </Flex>
            <Typography as="p" textColor="neutral600">
              {formatMessage({
                id: getTranslation(`containers.list.autoCloneModal.error.${reason}`),
                defaultMessage: getDefaultErrorMessage(reason),
              })}
            </Typography>
          </Flex>
        ))}
      </Flex>
    </>
  );
};

export { AutoCloneFailureModalBody };
export type { AutoCloneFailureModalBodyProps };
