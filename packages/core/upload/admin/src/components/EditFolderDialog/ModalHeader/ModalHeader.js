import { useIntl } from 'react-intl';
import PropTypes from 'prop-types';
import React from 'react';
import { ModalHeader, Typography } from '@strapi/design-system';
import { getTrad } from '../../../utils';

export const EditFolderModalHeader = ({ isEditing }) => {
  const { formatMessage } = useIntl();

  return (
    <ModalHeader>
      <Typography fontWeight="bold" textColor="neutral800" as="h2" id="title">
        {formatMessage(
          isEditing
            ? {
                id: getTrad('modal.folder.edit.title'),
                defaultMessage: 'Edit folder',
              }
            : {
                id: getTrad('modal.folder.create.title'),
                defaultMessage: 'Add new folder',
              }
        )}
      </Typography>
    </ModalHeader>
  );
};

EditFolderModalHeader.defaultProps = {
  isEditing: false,
};

EditFolderModalHeader.propTypes = {
  isEditing: PropTypes.bool,
};
