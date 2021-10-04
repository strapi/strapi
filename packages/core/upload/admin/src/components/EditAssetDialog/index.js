/**
 *
 * EditAssetDialog
 *
 */

import PropTypes from 'prop-types';
import React from 'react';
import { useIntl } from 'react-intl';
import { ModalLayout, ModalHeader, ModalBody, ModalFooter } from '@strapi/parts/ModalLayout';
import { ButtonText } from '@strapi/parts/Text';
import { Box } from '@strapi/parts/Box';
import { Button } from '@strapi/parts/Button';
import { getTrad } from '../../utils';

export const EditAssetDialog = ({ onClose }) => {
  const { formatMessage } = useIntl();

  // TODO implement when the code is ready
  const handleSubmit = () => {};

  return (
    <ModalLayout onClose={onClose} labelledBy="title">
      <ModalHeader>
        <ButtonText textColor="neutral800" as="h2" id="title">
          Title
        </ButtonText>
      </ModalHeader>
      <ModalBody>
        <p>Lol</p>
      </ModalBody>
      <ModalFooter
        startActions={
          <Button onClick={onClose} variant="tertiary">
            Cancel
          </Button>
        }
        endActions={
          <>
            <Button variant="secondary">Add new stuff</Button>
            <Button onClick={handleSubmit}>Finish</Button>
          </>
        }
      />
    </ModalLayout>
  );
};

EditAssetDialog.propTypes = {
  onClose: PropTypes.func.isRequired,
};
