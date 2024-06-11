import React from 'react';

import {
  ModalLayout,
  ModalBody,
  ModalHeader,
  ModalFooter,
  Typography,
  Button,
} from '@strapi/design-system';

interface ImportDataModalProps {
  isVisible: boolean;
  onClose: () => void;
  onSubmit: (data: unknown) => void; // Adjust the type of data as needed
}

const ImportDataModal: React.FC<ImportDataModalProps> = ({ isVisible, onClose, onSubmit }) => {
  const handleFinish = () => {
    const data = {}; // Gather the data you need to submit
    onSubmit(data);
    onClose();
  };

  return isVisible ? (
    <ModalLayout onClose={onClose} labelledBy="title">
      <ModalHeader>
        <Typography fontWeight="bold" textColor="neutral800" as="h2" id="title">
          Import content from an existing component
        </Typography>
      </ModalHeader>
      <ModalBody>Hello</ModalBody>
      <ModalFooter
        startActions={
          <Button onClick={onClose} variant="tertiary">
            Cancel
          </Button>
        }
        endActions={
          <>
            <Button variant="secondary">Add new stuff</Button>
            <Button onClick={handleFinish}>Finish</Button>
          </>
        }
      />
    </ModalLayout>
  ) : null;
};

export { ImportDataModal };
