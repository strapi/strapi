/**
 *
 * FormModal
 *
 */

import React from 'react';
import { useIntl } from 'react-intl';
import {
  ModalLayout,
  ModalHeader,
  ModalFooter,
  ModalBody,
  Button,
  Breadcrumbs,
  Crumb,
} from '@strapi/parts';
import PropTypes from 'prop-types';
// import { getTrad } from '../../../utils';

const FormModal = ({ headerBreadcrumbs, isOpen, onToggle }) => {
  const { formatMessage } = useIntl();

  if (!isOpen) {
    return null;
  }

  return (
    <ModalLayout onClose={onToggle} labelledBy="title">
      <ModalHeader>
        <Breadcrumbs label={headerBreadcrumbs.join(', ')}>
          {headerBreadcrumbs.map(crumb => (
            <Crumb key={crumb}>{crumb}</Crumb>
          ))}
        </Breadcrumbs>
      </ModalHeader>
      <ModalBody>Hello world</ModalBody>
      <ModalFooter
        startActions={
          <Button variant="tertiary" onClick={onToggle} type="button">
            {formatMessage({ id: 'app.components.Button.cancel', defaultMessage: 'Cancel' })}
          </Button>
        }
        endActions={
          <>
            <Button>
              {formatMessage({ id: 'app.components.Button.save', defaultMessage: 'Save' })}
            </Button>
          </>
        }
      />
    </ModalLayout>
  );
};

FormModal.propTypes = {
  headerBreadcrumbs: PropTypes.arrayOf(PropTypes.string).isRequired,
  isOpen: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
};

export default FormModal;
