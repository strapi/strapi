import { StrapiAppContextValue } from '@strapi/admin/strapi-admin';
import { Flex, Typography } from '@strapi/design-system';
import upperFirst from 'lodash/upperFirst';
import { useIntl } from 'react-intl';

import { getTrad } from '../utils';

import type { SchemaType } from '../types';

type ModalTitleProps = {
  forTarget?: SchemaType;
  step?: string;
  kind?: string;
  modalType?: string;
  actionType?: string;
};

export const getModalTitleSubHeader = ({
  modalType,
  forTarget,
  kind,
  actionType,
  step,
}: ModalTitleProps) => {
  switch (modalType) {
    case 'chooseAttribute':
      return getTrad(
        `modalForm.sub-header.chooseAttribute.${
          forTarget?.includes('component') ? 'component' : kind || 'collectionType'
        }`
      );
    case 'attribute': {
      return getTrad(
        `modalForm.sub-header.attribute.${actionType}${
          step !== 'null' && step !== null && actionType !== 'edit' ? '.step' : ''
        }`
      );
    }
    case 'customField': {
      return getTrad(`modalForm.sub-header.attribute.${actionType}`);
    }
    case 'addComponentToDynamicZone':
      return getTrad('modalForm.sub-header.addComponentToDynamicZone');
    default:
      return getTrad('configurations');
  }
};

type FormModalSubHeaderProps = {
  actionType: string;
  modalType: string;
  forTarget: SchemaType;
  kind?: string;
  step?: string;
  attributeType: string;
  attributeName: string;
  customField?: ReturnType<StrapiAppContextValue['customFields']['get']>;
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
      ? customField?.intlLabel
      : { id: getTrad(`attribute.${attributeType}`) };

  return (
    <Flex direction="column" alignItems="flex-start" paddingBottom={1} gap={1}>
      <Typography tag="h2" variant="beta">
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
            type: intlLabel ? upperFirst(formatMessage(intlLabel)) : '',
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
