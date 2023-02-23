import React from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import upperFirst from 'lodash/upperFirst';
import {
  ModalLayout,
  ModalHeader,
  ModalFooter,
  ModalBody,
  Typography,
  Button,
  Flex,
  Grid,
} from '@strapi/design-system';
import styled from 'styled-components';
import { getTrad } from '../../../utils';
import { useLayoutDnd } from '../../../hooks';
import FieldTypeIcon from '../../../components/FieldTypeIcon';
import ModalForm from './ModalForm';

const HeaderContainer = styled(Flex)`
  svg {
    width: ${32 / 16}rem;
    height: ${24 / 16}rem;
    margin-right: ${({ theme }) => theme.spaces[3]};
  }
`;

const FormModal = ({ onToggle, onMetaChange, onSizeChange, onSubmit, type, customFieldUid }) => {
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
            <FieldTypeIcon type={getAttrType()} customFieldUid={customFieldUid} />
            <Typography fontWeight="bold" textColor="neutral800" as="h2" id="title">
              {formatMessage(
                {
                  id: getTrad('containers.ListSettingsView.modal-form.edit-label'),
                  defaultMessage: 'Edit {fieldName}',
                },
                { fieldName: upperFirst(selectedField) }
              )}
            </Typography>
          </HeaderContainer>
        </ModalHeader>
        <ModalBody>
          <Grid gap={4}>
            <ModalForm onMetaChange={onMetaChange} onSizeChange={onSizeChange} />
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
              {formatMessage({ id: 'global.finish', defaultMessage: 'Finish' })}
            </Button>
          }
        />
      </form>
    </ModalLayout>
  );
};

FormModal.defaultProps = {
  customFieldUid: null,
};

FormModal.propTypes = {
  customFieldUid: PropTypes.string,
  onSubmit: PropTypes.func.isRequired,
  onToggle: PropTypes.func.isRequired,
  onMetaChange: PropTypes.func.isRequired,
  onSizeChange: PropTypes.func.isRequired,
  type: PropTypes.string.isRequired,
};

export default FormModal;
