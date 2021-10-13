import React from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import get from 'lodash/get';
import upperFirst from 'lodash/upperFirst';
import styled from 'styled-components';
import { ModalLayout, ModalHeader, ModalFooter, ModalBody } from '@strapi/parts/ModalLayout';
import { ButtonText, H2 } from '@strapi/parts/Text';
import { Button } from '@strapi/parts/Button';
import { Box } from '@strapi/parts/Box';
import { Row } from '@strapi/parts/Row';
import { Divider } from '@strapi/parts/Divider';
import { Grid, GridItem } from '@strapi/parts/Grid';
import { TextInput } from '@strapi/parts/TextInput';
import { ToggleInput } from '@strapi/parts/ToggleInput';
import Component from '@strapi/icons/Component';
import CT from '@strapi/icons/Ct';
import Date from '@strapi/icons/Date';
import Boolean from '@strapi/icons/Boolean';
import DynamicZone from '@strapi/icons/DynamicZone';
import Email from '@strapi/icons/Email';
import Enumeration from '@strapi/icons/Enumeration';
import Json from '@strapi/icons/Json';
import LongDescription from '@strapi/icons/LongDescription';
import Media from '@strapi/icons/Media';
import Password from '@strapi/icons/Password';
import Relation from '@strapi/icons/Relation';
import St from '@strapi/icons/St';
import Text from '@strapi/icons/Text';
import Uid from '@strapi/icons/Uid';
import Numbers from '@strapi/icons/Numbers';

const iconByTypes = {
  biginteger: <Numbers />,
  boolean: <Boolean />,
  component: <Component />,
  contentType: <CT />,
  date: <Date />,
  datetime: <Date />,
  decimal: <Numbers />,
  dynamiczone: <DynamicZone />,
  email: <Email />,
  enum: <Enumeration />,
  enumeration: <Enumeration />,
  file: <Media />,
  files: <Media />,
  float: <Numbers />,
  integer: <Numbers />,
  json: <Json />,
  JSON: <Json />,
  media: <Media />,
  number: <Numbers />,
  password: <Password />,
  relation: <Relation />,
  richtext: <LongDescription />,
  singleType: <St />,
  string: <Text />,
  text: <Text />,
  time: <Date />,
  timestamp: <Date />,
  uid: <Uid />,
};

const HeaderContainer = styled(Row)`
  svg {
    width: ${32 / 16}rem;
    height: ${24 / 16}rem;
    margin-right: ${({ theme }) => theme.spaces[3]};
  }
`;

const EditFieldForm = ({
  attributes,
  fieldForm,
  fieldToEdit,
  handleCloseModal,
  handleChangeEditLabel,
  onSubmit,
  type,
}) => {
  const { formatMessage } = useIntl();

  const relationType = get(attributes, [fieldToEdit, 'relationType']);
  let shouldDisplaySortToggle = !['media', 'relation'].includes(type);

  if (['oneWay', 'oneToOne', 'manyToOne'].includes(relationType)) {
    shouldDisplaySortToggle = true;
  }

  const title = fieldForm.label ? fieldForm.label : fieldToEdit;

  return (
    <ModalLayout onClose={handleCloseModal} labelledBy="title">
      <ModalHeader>
        <HeaderContainer>
          {iconByTypes[type]}
          <ButtonText textColor="neutral800" as="h2" id="title">
            {formatMessage({
              id: 'content-manager.containers.ListSettingsView.modal-form.edit-label',
              defaultMessage: 'Edit the label',
            })}
          </ButtonText>
        </HeaderContainer>
      </ModalHeader>
      <ModalBody>
        <H2>{upperFirst(title)}</H2>
        <Box paddingTop={4} paddingBottom={6}>
          <Divider />
        </Box>
        <Grid gap={4}>
          <GridItem s={12} col={6}>
            <TextInput
              label={formatMessage({
                id: 'content-manager.form.Input.label',
                defaultMessage: 'Label',
              })}
              name="label"
              onChange={e => handleChangeEditLabel(e)}
              value={fieldForm.label}
              hint={formatMessage({
                id: 'content-manager.form.Input.label.inputDescription',
                defaultMessage: "This value overrides the label displayed in the table's head",
              })}
            />
          </GridItem>
          {shouldDisplaySortToggle && (
            <GridItem s={12} col={6}>
              <ToggleInput
                checked={fieldForm.sortable}
                label={formatMessage({
                  id: 'content-manager.form.Input.sort.field',
                  defaultMessage: 'Enable sort on this field',
                })}
                name="sortable"
                onChange={e =>
                  handleChangeEditLabel({ target: { name: 'sortable', value: e.target.checked } })}
                onLabel="on"
                offLabel="off"
              />
            </GridItem>
          )}
        </Grid>
      </ModalBody>
      <ModalFooter
        startActions={
          <Button onClick={handleCloseModal} variant="tertiary">
            Cancel
          </Button>
        }
        endActions={
          <Button type="button" onClick={e => onSubmit(e)}>
            Finish
          </Button>
        }
      />
    </ModalLayout>
  );
};

EditFieldForm.defaultProps = {
  handleChangeEditLabel: () => {},
  handleCloseModal: () => {},
  onSubmit: () => {},
};

EditFieldForm.propTypes = {
  attributes: PropTypes.objectOf(
    PropTypes.shape({
      relationType: PropTypes.string,
    })
  ).isRequired,
  fieldForm: PropTypes.shape({
    label: PropTypes.string,
    sortable: PropTypes.bool,
  }).isRequired,
  fieldToEdit: PropTypes.string.isRequired,
  handleChangeEditLabel: PropTypes.func,
  handleCloseModal: PropTypes.func,
  onSubmit: PropTypes.func,
  type: PropTypes.string.isRequired,
};

export default EditFieldForm;
