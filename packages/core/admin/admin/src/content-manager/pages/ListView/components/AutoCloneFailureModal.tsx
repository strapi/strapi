import * as React from 'react';

import {
  Box,
  Button,
  Flex,
  Icon,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalLayout,
  Typography,
} from '@strapi/design-system';
import { LinkButton } from '@strapi/design-system/v2';
import { ChevronRight } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { useLocation, NavLink } from 'react-router-dom';

import { getTranslation } from '../../../utils/translations';

import type { Entity } from '@strapi/types';

type Reason = 'relation' | 'unique';
type ProhibitedCloningField = [string[], Reason];

interface AutoCloneFailureModalProps {
  onClose: () => void;
  entryId: Entity.ID | null;
  prohibitedFields: ProhibitedCloningField[];
  pluginQueryParams: string;
}

const AutoCloneFailureModal = ({
  onClose,
  entryId,
  prohibitedFields,
  pluginQueryParams,
}: AutoCloneFailureModalProps) => {
  const { formatMessage } = useIntl();
  const { pathname } = useLocation();

  if (!entryId) {
    return null;
  }

  const editPath = `${pathname}/create/clone/${entryId}?${pluginQueryParams}`;

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
    <ModalLayout onClose={onClose} labelledBy="title">
      <ModalHeader>
        <Typography variant="omega" fontWeight="bold" as="h2" id="title">
          {formatMessage({
            id: getTranslation('containers.ListPage.autoCloneModal.header'),
            defaultMessage: 'Duplicate',
          })}
        </Typography>
      </ModalHeader>
      <ModalBody>
        <Typography variant="beta">
          {formatMessage({
            id: getTranslation('containers.ListPage.autoCloneModal.title'),
            defaultMessage: "This entry can't be duplicated directly.",
          })}
        </Typography>
        <Box marginTop={2}>
          <Typography textColor="neutral600">
            {formatMessage({
              id: getTranslation('containers.ListPage.autoCloneModal.description'),
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
                  id: getTranslation(`containers.ListPage.autoCloneModal.error.${reason}`),
                  defaultMessage: getDefaultErrorMessage(reason),
                })}
              </Typography>
            </Flex>
          ))}
        </Flex>
      </ModalBody>
      <ModalFooter
        startActions={
          <Button onClick={onClose} variant="tertiary">
            {formatMessage({
              id: 'cancel',
              defaultMessage: 'Cancel',
            })}
          </Button>
        }
        endActions={
          // @ts-expect-error - types are not inferred correctly through the as prop.
          <LinkButton as={NavLink} to={editPath}>
            {formatMessage({
              id: getTranslation('containers.ListPage.autoCloneModal.create'),
              defaultMessage: 'Create',
            })}
          </LinkButton>
        }
      />
    </ModalLayout>
  );
};

export { AutoCloneFailureModal };
export type { ProhibitedCloningField };
