import React from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import upperFirst from 'lodash/upperFirst';
import {
  ModalLayout,
  ModalHeader,
  ModalFooter,
  ModalBody,
} from '@strapi/design-system/ModalLayout';
import { ButtonText } from '@strapi/design-system/Text';
import { Button } from '@strapi/design-system/Button';
import { Flex } from '@strapi/design-system/Flex';
import { Grid, GridItem } from '@strapi/design-system/Grid';
import Date from '@strapi/icons/Date';
import Boolean from '@strapi/icons/Boolean';
import Email from '@strapi/icons/Email';
import Enumeration from '@strapi/icons/Enumeration';
import Picture from '@strapi/icons/Picture';
import Relation from '@strapi/icons/Relation';
import Text from '@strapi/icons/Text';
import Uid from '@strapi/icons/Uid';
import Number from '@strapi/icons/Number';
import Json from '@strapi/icons/Json';
import Component from '@strapi/icons/Component';
import DynamicZone from '@strapi/icons/DynamicZone';
import styled from 'styled-components';
import { getTrad } from '../../../utils';
import { useLayoutDnd } from '../../../hooks';

// Create a file
const iconByTypes = {
  biginteger: <Number />,
  boolean: <Boolean />,
  date: <Date />,
  datetime: <Date />,
  decimal: <Number />,
  email: <Email />,
  enum: <Enumeration />,
  enumeration: <Enumeration />,
  file: <Picture />,
  files: <Picture />,
  float: <Number />,
  integer: <Number />,
  media: <Picture />,
  number: <Number />,
  relation: <Relation />,
  string: <Text />,
  text: <Text />,
  time: <Date />,
  timestamp: <Date />,
  json: <Json />,
  uid: <Uid />,
  component: <Component />,
  dynamiczone: <DynamicZone />,
};

const HeaderContainer = styled(Flex)`
  svg {
    width: ${32 / 16}rem;
    height: ${24 / 16}rem;
    margin-right: ${({ theme }) => theme.spaces[3]};
  }
`;

const ModalForm = ({ onToggle, onSubmit, type }) => {
  const { selectedField } = useLayoutDnd();
  const { formatMessage } = useIntl();

  const getAttrType = () => {
    if (type === 'timestamp') {
      return 'date';
    }

    if (['decimal', 'float', 'integer', 'biginter'].includes(type)) {
      return 'number';
    }

    return type;
  };

  return (
    <ModalLayout onClose={onToggle} labelledBy="title">
      <form onSubmit={onSubmit}>
        <ModalHeader>
          <HeaderContainer>
            {iconByTypes[getAttrType(type)]}
            <ButtonText textColor="neutral800" as="h2" id="title">
              {formatMessage(
                {
                  id: getTrad('containers.ListSettingsView.modal-form.edit-label'),
                  defaultMessage: 'Edit {fieldName}',
                },
                { fieldName: upperFirst(selectedField) }
              )}
            </ButtonText>
          </HeaderContainer>
        </ModalHeader>
        <ModalBody>
          <Grid gap={4}>
            <GridItem s={12} col={6}>
              TO DO
            </GridItem>
          </Grid>
        </ModalBody>
        <ModalFooter
          startActions={
            <Button onClick={onToggle} variant="tertiary">
              {formatMessage({ id: 'app.components.Button.cancel', defaultMessage: 'Cancel' })}
            </Button>
          }
          endActions={
            <Button type="submit">
              {formatMessage({ id: 'form.button.finish', defaultMessage: 'Finish' })}
            </Button>
          }
        />
      </form>
    </ModalLayout>
  );
};

ModalForm.propTypes = {
  onSubmit: PropTypes.func.isRequired,
  onToggle: PropTypes.func.isRequired,
  type: PropTypes.string.isRequired,
};

export default ModalForm;
