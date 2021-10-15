import React from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import upperFirst from 'lodash/upperFirst';
import styled from 'styled-components';
import { ModalLayout, ModalHeader, ModalFooter, ModalBody } from '@strapi/parts/ModalLayout';
import { ButtonText } from '@strapi/parts/Text';
import { Button } from '@strapi/parts/Button';
import { Row } from '@strapi/parts/Row';
import { Grid, GridItem } from '@strapi/parts/Grid';
import { TextInput } from '@strapi/parts/TextInput';
import { ToggleInput } from '@strapi/parts/ToggleInput';
import Date from '@strapi/icons/Date';
import Boolean from '@strapi/icons/Boolean';
import Email from '@strapi/icons/Email';
import Enumeration from '@strapi/icons/Enumeration';
import Media from '@strapi/icons/Media';
import Relation from '@strapi/icons/Relation';
import Text from '@strapi/icons/Text';
import Uid from '@strapi/icons/Uid';
import Numbers from '@strapi/icons/Numbers';
import { getTrad } from '../../../utils';

const iconByTypes = {
  biginteger: <Numbers />,
  boolean: <Boolean />,
  date: <Date />,
  datetime: <Date />,
  decimal: <Numbers />,
  email: <Email />,
  enum: <Enumeration />,
  enumeration: <Enumeration />,
  file: <Media />,
  files: <Media />,
  float: <Numbers />,
  integer: <Numbers />,
  media: <Media />,
  number: <Numbers />,
  relation: <Relation />,
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
  onCloseModal,
  onChangeEditLabel,
  onSubmit,
  type,
}) => {
  const { formatMessage } = useIntl();

  const relationType = attributes[fieldToEdit].relationType;

  let shouldDisplaySortToggle = !['media', 'relation'].includes(type);

  if (['oneWay', 'oneToOne', 'manyToOne'].includes(relationType)) {
    shouldDisplaySortToggle = true;
  }

  return (
    <ModalLayout onClose={onCloseModal} labelledBy="title">
      <form>
        <ModalHeader>
          <HeaderContainer>
            {iconByTypes[type]}
            <ButtonText textColor="neutral800" as="h2" id="title">
              {formatMessage(
                {
                  id: getTrad('containers.ListSettingsView.modal-form.edit-label'),
                  defaultMessage: 'Edit {fieldName}',
                },
                { fieldName: upperFirst(fieldToEdit) }
              )}
            </ButtonText>
          </HeaderContainer>
        </ModalHeader>
        <ModalBody>
          <Grid gap={4}>
            <GridItem s={12} col={6}>
              <TextInput
                id="label-input"
                label={formatMessage({
                  id: getTrad('form.Input.label'),
                  defaultMessage: 'Label',
                })}
                name="label"
                onChange={e => onChangeEditLabel(e)}
                value={fieldForm.label}
                hint={formatMessage({
                  id: getTrad('form.Input.label.inputDescription'),
                  defaultMessage: "This value overrides the label displayed in the table's head",
                })}
              />
            </GridItem>
            {shouldDisplaySortToggle && (
              <GridItem s={12} col={6}>
                <ToggleInput
                  data-testid="Enable sort on this field"
                  checked={fieldForm.sortable}
                  label={formatMessage({
                    id: getTrad('form.Input.sort.field'),
                    defaultMessage: 'Enable sort on this field',
                  })}
                  name="sortable"
                  onChange={e =>
                    onChangeEditLabel({ target: { name: 'sortable', value: e.target.checked } })}
                  onLabel={formatMessage({
                    id: 'app.components.ToggleCheckbox.on-label',
                    defaultMessage: 'on',
                  })}
                  offLabel={formatMessage({
                    id: 'app.components.ToggleCheckbox.off-label',
                    defaultMessage: 'off',
                  })}
                />
              </GridItem>
            )}
          </Grid>
        </ModalBody>
        <ModalFooter
          startActions={
            <Button onClick={onCloseModal} variant="tertiary">
              {formatMessage({ id: 'app.components.Button.cancel', defaultMessage: 'Cancel' })}
            </Button>
          }
          endActions={
            <Button type="button" onClick={e => onSubmit(e)}>
              {formatMessage({ id: 'form.button.finish', defaultMessage: 'Finish' })}
            </Button>
          }
        />
      </form>
    </ModalLayout>
  );
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
  onChangeEditLabel: PropTypes.func.isRequired,
  onCloseModal: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  type: PropTypes.string.isRequired,
};

export default EditFieldForm;
