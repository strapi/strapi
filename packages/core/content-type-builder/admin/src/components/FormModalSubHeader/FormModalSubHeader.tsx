import { Flex, Typography } from '@strapi/design-system';
import upperFirst from 'lodash/upperFirst';
import { useIntl } from 'react-intl';

import { getTrad } from '../../utils';

import { getModalTitleSubHeader } from './getModalTitleSubHeader';

type FormModalSubHeaderProps = {
  actionType: string;
  modalType: string;
  forTarget: string[];
  kind: string;
  step: string;
  attributeType: string;
  attributeName: string;
  customField: {
    intlLabel: object;
  };
};

export const FormModalSubHeader = ({
  actionType,
  modalType,
  forTarget,
  kind,
  step,
  attributeType,
  attributeName,
  customField,
}: FormModalSubHeaderProps) => {
  const { formatMessage } = useIntl();
  const intlLabel =
    modalType === 'customField'
      ? customField.intlLabel
      : { id: getTrad(`attribute.${attributeType}`) };

  return (
    <Flex direction="column" alignItems="flex-start" paddingBottom={2} gap={1}>
      <Typography as="h2" variant="beta">
        {formatMessage(
          {
            id: getModalTitleSubHeader({
              actionType,
              forTarget,
              kind,
              step,
              modalType,
            }),
            defaultMessage: 'Add new field',
          },
          {
            type: upperFirst(formatMessage(intlLabel)),
            name: upperFirst(attributeName),
            step,
          }
        )}
      </Typography>
      <Typography variant="pi" textColor="neutral600">
        {formatMessage({
          id: getTrad(`attribute.${attributeType}.description`),
          defaultMessage: 'A type for modeling data',
        })}
      </Typography>
    </Flex>
  );
};
