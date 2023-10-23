/**
 *
 * FormModalEndActions
 *
 */

import React from 'react';

import { Button } from '@strapi/design-system';
import { Plus } from '@strapi/icons';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';

import { getTrad } from '../../utils';

const FormModalEndActions = ({
  categoryName,
  deleteCategory,
  deleteComponent,
  deleteContentType,
  isAttributeModal,
  isCustomFieldModal,
  isComponentAttribute,
  isComponentToDzModal,
  isContentTypeModal,
  isCreatingComponent,
  isCreatingComponentAttribute,
  isCreatingComponentInDz,
  isCreatingComponentWhileAddingAField,
  isCreatingContentType,
  isCreatingDz,
  isComponentModal,
  isDzAttribute,
  isEditingAttribute,
  isEditingCategory,
  isInFirstComponentStep,
  onSubmitAddComponentAttribute,
  onSubmitAddComponentToDz,
  onSubmitCreateContentType,
  onSubmitCreateComponent,
  onSubmitCreateDz,
  onSubmitEditAttribute,
  onSubmitEditCategory,
  onSubmitEditComponent,
  onSubmitEditContentType,
  onSubmitEditCustomFieldAttribute,
  onSubmitEditDz,
  onClickFinish,
}) => {
  const { formatMessage } = useIntl();

  if (isComponentToDzModal) {
    if (isCreatingComponentInDz) {
      return (
        <Button
          variant="secondary"
          type="submit"
          onClick={(e) => {
            e.preventDefault();

            onSubmitAddComponentToDz(e, true);
          }}
          startIcon={<Plus />}
        >
          {formatMessage({
            id: getTrad('form.button.add-first-field-to-created-component'),
            defaultMessage: 'Add first field to the component',
          })}
        </Button>
      );
    }

    return (
      <Button
        variant="default"
        type="submit"
        onClick={(e) => {
          e.preventDefault();

          onSubmitAddComponentToDz(e, false);
        }}
      >
        {formatMessage({
          id: 'global.finish',
          defaultMessage: 'Finish',
        })}
      </Button>
    );
  }

  if (isAttributeModal && isDzAttribute && !isCreatingDz) {
    return (
      <Button
        variant="default"
        type="submit"
        onClick={(e) => {
          e.preventDefault();

          onClickFinish();
          onSubmitEditDz(e, false);
        }}
      >
        {formatMessage({
          id: 'global.finish',
          defaultMessage: 'Finish',
        })}
      </Button>
    );
  }

  if (isAttributeModal && isDzAttribute && isCreatingDz) {
    return (
      <>
        <Button
          variant="secondary"
          type="submit"
          onClick={(e) => {
            e.preventDefault();

            onSubmitCreateDz(e, true);
          }}
          startIcon={<Plus />}
        >
          {formatMessage({
            id: getTrad('form.button.add-components-to-dynamiczone'),
            defaultMessage: 'Add components to the zone',
          })}
        </Button>
        {/* // TO FIX fix doesnt close the modal */}
        {/* <Button
          variant="default"
          type="button"
          onClick={e => {
            e.preventDefault();

            onSubmitCreateDz(e, false);
          }}
        >
          {formatMessage({
            id: 'global.finish',
            defaultMessage: 'Finish',
          })}
        </Button> */}
      </>
    );
  }

  if (isAttributeModal && isComponentAttribute) {
    if (isInFirstComponentStep) {
      return (
        <Button
          variant="secondary"
          type="submit"
          onClick={(e) => {
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
          onClick={(e) => {
            e.preventDefault();

            onSubmitAddComponentAttribute(e, true);
          }}
          startIcon={<Plus />}
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
          onClick={(e) => {
            e.preventDefault();

            onClickFinish();
            onSubmitAddComponentAttribute(e, false);
          }}
        >
          {formatMessage({
            id: 'global.finish',
            defaultMessage: 'Finish',
          })}
        </Button>
      </>
    );
  }

  if (isAttributeModal && !isComponentAttribute && !isDzAttribute) {
    return (
      <>
        <Button
          type={isEditingAttribute ? 'button' : 'submit'}
          variant="secondary"
          onClick={(e) => {
            e.preventDefault();

            onSubmitEditAttribute(e, true);
          }}
          startIcon={<Plus />}
        >
          {formatMessage({
            id: getTrad('form.button.add-field'),
            defaultMessage: 'Add another field',
          })}
        </Button>
        <Button
          type={isEditingAttribute ? 'submit' : 'button'}
          variant="default"
          onClick={(e) => {
            e.preventDefault();

            onClickFinish();
            onSubmitEditAttribute(e, false);
          }}
        >
          {formatMessage({
            id: 'global.finish',
            defaultMessage: 'Finish',
          })}
        </Button>
      </>
    );
  }

  if (isContentTypeModal) {
    return (
      <>
        {!isCreatingContentType && (
          <>
            <Button
              type="button"
              variant="danger"
              onClick={(e) => {
                e.preventDefault();
                deleteContentType();
              }}
            >
              {formatMessage({
                id: 'global.delete',
                defaultMessage: 'Delete',
              })}
            </Button>
            <Button
              type="submit"
              variant="default"
              onClick={(e) => {
                e.preventDefault();

                onSubmitEditContentType(e, false);
              }}
            >
              {formatMessage({
                id: 'global.finish',
                defaultMessage: 'Finish',
              })}
            </Button>
          </>
        )}
        {isCreatingContentType && (
          <Button
            type="submit"
            variant="secondary"
            onClick={(e) => {
              e.preventDefault();

              onSubmitCreateContentType(e, true);
            }}
          >
            {formatMessage({
              id: 'global.continue',
              defaultMessage: 'Continue',
            })}
          </Button>
        )}
      </>
    );
  }

  if (isComponentModal) {
    return (
      <>
        {!isCreatingComponent && (
          <>
            <Button
              type="button"
              variant="danger"
              onClick={(e) => {
                e.preventDefault();
                deleteComponent();
              }}
            >
              {formatMessage({
                id: 'global.delete',
                defaultMessage: 'Delete',
              })}
            </Button>
            <Button
              type="submit"
              variant="default"
              onClick={(e) => {
                e.preventDefault();

                onSubmitEditComponent(e, false);
              }}
            >
              {formatMessage({
                id: 'global.finish',
                defaultMessage: 'Finish',
              })}
            </Button>
          </>
        )}
        {isCreatingComponent && (
          <Button
            type="submit"
            variant="secondary"
            onClick={(e) => {
              e.preventDefault();

              onSubmitCreateComponent(e, true);
            }}
          >
            {formatMessage({
              id: 'global.continue',
              defaultMessage: 'Continue',
            })}
          </Button>
        )}
      </>
    );
  }

  if (isEditingCategory) {
    return (
      <>
        <Button
          type="button"
          variant="danger"
          onClick={(e) => {
            e.preventDefault();

            deleteCategory(categoryName);
          }}
        >
          {formatMessage({
            id: 'global.delete',
            defaultMessage: 'Delete',
          })}
        </Button>
        <Button
          type="submit"
          variant="default"
          onClick={(e) => {
            e.preventDefault();

            onSubmitEditCategory(e);
          }}
        >
          {formatMessage({
            id: 'global.finish',
            defaultMessage: 'finish',
          })}
        </Button>
      </>
    );
  }

  if (isCustomFieldModal) {
    return (
      <>
        <Button
          type={isEditingAttribute ? 'button' : 'submit'}
          variant="secondary"
          onClick={(e) => {
            e.preventDefault();

            onSubmitEditCustomFieldAttribute(e, true);
          }}
          startIcon={<Plus />}
        >
          {formatMessage({
            id: getTrad('form.button.add-field'),
            defaultMessage: 'Add another field',
          })}
        </Button>
        <Button
          type={isEditingAttribute ? 'submit' : 'button'}
          variant="default"
          onClick={(e) => {
            e.preventDefault();

            onClickFinish();
            onSubmitEditCustomFieldAttribute(e, false);
          }}
        >
          {formatMessage({
            id: 'global.finish',
            defaultMessage: 'Finish',
          })}
        </Button>
      </>
    );
  }

  return null;
};

FormModalEndActions.defaultProps = {
  categoryName: null,
  onClickFinish() {},
};

FormModalEndActions.propTypes = {
  categoryName: PropTypes.string,
  deleteCategory: PropTypes.func.isRequired,
  deleteComponent: PropTypes.func.isRequired,
  deleteContentType: PropTypes.func.isRequired,
  isAttributeModal: PropTypes.bool.isRequired,
  isCustomFieldModal: PropTypes.bool.isRequired,
  isComponentAttribute: PropTypes.bool.isRequired,
  isComponentModal: PropTypes.bool.isRequired,
  isComponentToDzModal: PropTypes.bool.isRequired,
  isContentTypeModal: PropTypes.bool.isRequired,
  isCreatingComponent: PropTypes.bool.isRequired,
  isCreatingComponentAttribute: PropTypes.bool.isRequired,
  isCreatingComponentInDz: PropTypes.bool.isRequired,
  isCreatingComponentWhileAddingAField: PropTypes.bool.isRequired,
  isCreatingContentType: PropTypes.bool.isRequired,
  isCreatingDz: PropTypes.bool.isRequired,
  isDzAttribute: PropTypes.bool.isRequired,
  isEditingAttribute: PropTypes.bool.isRequired,
  isEditingCategory: PropTypes.bool.isRequired,
  isInFirstComponentStep: PropTypes.bool.isRequired,
  onSubmitAddComponentAttribute: PropTypes.func.isRequired,
  onSubmitAddComponentToDz: PropTypes.func.isRequired,
  onSubmitCreateContentType: PropTypes.func.isRequired,
  onSubmitCreateComponent: PropTypes.func.isRequired,
  onSubmitCreateDz: PropTypes.func.isRequired,
  onSubmitEditAttribute: PropTypes.func.isRequired,
  onSubmitEditCategory: PropTypes.func.isRequired,
  onSubmitEditComponent: PropTypes.func.isRequired,
  onSubmitEditContentType: PropTypes.func.isRequired,
  onSubmitEditCustomFieldAttribute: PropTypes.func.isRequired,
  onSubmitEditDz: PropTypes.func.isRequired,
  onClickFinish: PropTypes.func,
};

export default FormModalEndActions;
