/**
 *
 * FormModalEndActions
 *
 */

import React from 'react';
import { useIntl } from 'react-intl';
import PropTypes from 'prop-types';
import { Button } from '@strapi/parts/Button';
import AddIcon from '@strapi/icons/AddIcon';
import { getTrad } from '../../utils';

const FormModalEndActions = ({
  categoryName,
  deleteCategory,
  isAttributeModal,
  isEditingAttribute,
  isContentTypeModal,
  isEditingCategory,
  onSubmitEditAttribute,
  onSubmitCreateContentType,
  onSubmitEditCategory,
}) => {
  const { formatMessage } = useIntl();

  if (isAttributeModal) {
    return (
      <>
        <Button
          type={isEditingAttribute ? 'button' : 'submit'}
          variant="secondary"
          onClick={e => {
            e.preventDefault();

            onSubmitEditAttribute(e, true);
          }}
          startIcon={<AddIcon />}
        >
          {formatMessage({
            id: getTrad('form.button.add-field'),
            defaultMessage: 'Add another field',
          })}
        </Button>
        <Button
          type={isEditingAttribute ? 'submit' : 'button'}
          variant="default"
          onClick={e => {
            e.preventDefault();

            onSubmitEditAttribute(e, false);
          }}
        >
          {formatMessage({
            id: getTrad('form.button.finish'),
            defaultMessage: 'finish',
          })}
        </Button>
      </>
    );
  }

  if (isContentTypeModal) {
    // TODO diff between edit and create

    return (
      <Button
        type="submit"
        variant="secondary"
        onClick={e => {
          e.preventDefault();

          onSubmitCreateContentType(e, true);
        }}
      >
        {formatMessage({
          id: getTrad('form.button.continue'),
          defaultMessage: 'Continue',
        })}
      </Button>
    );
  }

  if (isEditingCategory) {
    return (
      <>
        <Button
          type="button"
          variant="danger"
          onClick={e => {
            e.preventDefault();

            deleteCategory(categoryName);
          }}
        >
          {formatMessage({
            id: getTrad('form.button.delete'),
            defaultMessage: 'Delete',
          })}
        </Button>
        <Button
          type="submit"
          variant="default"
          onClick={e => {
            e.preventDefault();

            onSubmitEditCategory(e);
          }}
        >
          {formatMessage({
            id: getTrad('form.button.finish'),
            defaultMessage: 'finish',
          })}
        </Button>
      </>
    );
  }

  return (
    <div>
      <p>
        {formatMessage({ id: getTrad('component.name'), defaultMessage: 'Form Modal End Actions' })}
      </p>
    </div>
  );
};

FormModalEndActions.defaultProps = {
  categoryName: null,
};

FormModalEndActions.propTypes = {
  categoryName: PropTypes.string,
  deleteCategory: PropTypes.func.isRequired,
  isAttributeModal: PropTypes.bool.isRequired,
  isContentTypeModal: PropTypes.bool.isRequired,
  isEditingAttribute: PropTypes.bool.isRequired,
  isEditingCategory: PropTypes.bool.isRequired,
  onSubmitEditAttribute: PropTypes.func.isRequired,
  onSubmitCreateContentType: PropTypes.func.isRequired,
  onSubmitEditCategory: PropTypes.func.isRequired,
};

export default FormModalEndActions;
