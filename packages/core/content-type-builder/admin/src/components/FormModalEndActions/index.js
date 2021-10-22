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
  deleteContentType,
  deleteComponent,
  isAttributeModal,
  isEditingAttribute,
  isContentTypeModal,
  isCreatingContentType,
  isComponentAttribute,
  isCreatingComponent,
  isCreatingComponentAttribute,
  isCreatingComponentWhileAddingAField,
  isComponentModal,
  isDynamicZoneAttribute,
  isEditingCategory,
  isInFirstComponentStep,
  onSubmitEditAttribute,
  onSubmitCreateContentType,
  onSubmitCreateComponent,
  onSubmitAddComponentAttribute,
  onSubmitEditCategory,
  onSubmitEditContentType,
  onSubmitEditComponent,
}) => {
  const { formatMessage } = useIntl();
  // TO DO
  // component attribute
  // dz attribute

  if (isAttributeModal && isComponentAttribute && !isDynamicZoneAttribute) {
    console.log('is component attribute');

    if (isInFirstComponentStep) {
      return (
        <Button
          variant="secondary"
          type="submit"
          onClick={e => {
            e.preventDefault();

            onSubmitAddComponentAttribute(e, true);
          }}
        >
          {isCreatingComponentAttribute
            ? formatMessage({
                id: getTrad('form.button.configure-component'),
                defaultMessage: 'Configure the component',
              })
            : formatMessage({
                id: getTrad('form.button.select-component'),
                defaultMessage: 'Configure the component',
              })}
        </Button>
      );
    }

    return (
      <>
        <Button
          variant="secondary"
          type="submit"
          onClick={e => {
            e.preventDefault();

            onSubmitAddComponentAttribute(e, true);
          }}
          startIcon={<AddIcon />}
        >
          {isCreatingComponentWhileAddingAField
            ? formatMessage({
                id: getTrad('form.button.add-first-field-to-created-component'),
                defaultMessage: 'Add first field to the component',
              })
            : formatMessage({
                id: getTrad('form.button.add-field'),
                defaultMessage: 'Add another field',
              })}
        </Button>
        <Button
          variant="default"
          type="button"
          onClick={e => {
            e.preventDefault();

            onSubmitAddComponentAttribute(e, false);
          }}
        >
          {formatMessage({
            id: getTrad('form.button.finish'),
            defaultMessage: 'Finish',
          })}
        </Button>
      </>
    );
  }

  if (isAttributeModal && !isComponentAttribute && !isDynamicZoneAttribute) {
    console.log('is attribute modal');

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
            defaultMessage: 'Finish',
          })}
        </Button>
      </>
    );
  }

  if (isContentTypeModal) {
    console.log('is contentType modal');

    return (
      <>
        {!isCreatingContentType && (
          <>
            <Button
              type="button"
              variant="danger"
              onClick={e => {
                e.preventDefault();
                deleteContentType();
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

                onSubmitEditContentType(e, false);
              }}
            >
              {formatMessage({
                id: getTrad('form.button.finish'),
                defaultMessage: 'Finish',
              })}
            </Button>
          </>
        )}
        {isCreatingContentType && (
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
        )}
      </>
    );
  }

  if (isComponentModal) {
    console.log('is component modal');

    return (
      <>
        {!isCreatingComponent && (
          <>
            <Button
              type="button"
              variant="danger"
              onClick={e => {
                e.preventDefault();
                deleteComponent();
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

                onSubmitEditComponent(e, false);
              }}
            >
              {formatMessage({
                id: getTrad('form.button.finish'),
                defaultMessage: 'Finish',
              })}
            </Button>
          </>
        )}
        {isCreatingComponent && (
          <Button
            type="submit"
            variant="secondary"
            onClick={e => {
              e.preventDefault();

              onSubmitCreateComponent(e, true);
            }}
          >
            {formatMessage({
              id: getTrad('form.button.continue'),
              defaultMessage: 'Continue',
            })}
          </Button>
        )}
      </>
    );
  }

  if (isEditingCategory) {
    console.log('is editing category');

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
  deleteComponent: PropTypes.func.isRequired,
  deleteContentType: PropTypes.func.isRequired,
  isAttributeModal: PropTypes.bool.isRequired,
  isContentTypeModal: PropTypes.bool.isRequired,
  isCreatingContentType: PropTypes.bool.isRequired,
  isCreatingComponent: PropTypes.bool.isRequired,
  isComponentAttribute: PropTypes.bool.isRequired,
  isCreatingComponentAttribute: PropTypes.bool.isRequired,
  isCreatingComponentWhileAddingAField: PropTypes.bool.isRequired,
  isComponentModal: PropTypes.bool.isRequired,
  isDynamicZoneAttribute: PropTypes.bool.isRequired,
  isEditingAttribute: PropTypes.bool.isRequired,
  isEditingCategory: PropTypes.bool.isRequired,
  isInFirstComponentStep: PropTypes.bool.isRequired,
  onSubmitEditAttribute: PropTypes.func.isRequired,
  onSubmitCreateContentType: PropTypes.func.isRequired,
  onSubmitCreateComponent: PropTypes.func.isRequired,
  onSubmitAddComponentAttribute: PropTypes.func.isRequired,
  onSubmitEditCategory: PropTypes.func.isRequired,
  onSubmitEditContentType: PropTypes.func.isRequired,
  onSubmitEditComponent: PropTypes.func.isRequired,
};

export default FormModalEndActions;
