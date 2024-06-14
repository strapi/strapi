/**
 *
 * FormModalEndActions
 *
 */

import { SyntheticEvent } from 'react';

import { Button, Flex } from '@strapi/design-system';
import { Plus } from '@strapi/icons';
import { useIntl } from 'react-intl';

import { getTrad } from '../utils';

type FormModalEndActionsProps = {
  categoryName?: string;
  deleteCategory: (categoryName: string) => void;
  deleteComponent: () => void;
  deleteContentType: () => void;
  isAttributeModal: boolean;
  isCustomFieldModal: boolean;
  isComponentAttribute: boolean;
  isComponentModal: boolean;
  isComponentToDzModal: boolean;
  isContentTypeModal: boolean;
  isCreatingComponent: boolean;
  isCreatingComponentAttribute: boolean;
  isCreatingComponentInDz: boolean;
  isCreatingComponentWhileAddingAField: boolean;
  isCreatingContentType: boolean;
  isCreatingDz: boolean;
  isDzAttribute: boolean;
  isEditingAttribute: boolean;
  isEditingCategory: boolean;
  isInFirstComponentStep: boolean;
  onSubmitAddComponentAttribute: (e: SyntheticEvent, shouldContinue: boolean) => void;
  onSubmitAddComponentToDz: (e: SyntheticEvent, shouldContinue: boolean) => void;
  onSubmitCreateContentType: (e: SyntheticEvent, shouldContinue: boolean) => void;
  onSubmitCreateComponent: (e: SyntheticEvent, shouldContinue: boolean) => void;
  onSubmitCreateDz: (e: SyntheticEvent, shouldContinue: boolean) => void;
  onSubmitEditAttribute: (e: SyntheticEvent, shouldContinue: boolean) => void;
  onSubmitEditCategory: (e: SyntheticEvent) => void;
  onSubmitEditComponent: (e: SyntheticEvent, shouldContinue: boolean) => void;
  onSubmitEditContentType: (e: SyntheticEvent, shouldContinue: boolean) => void;
  onSubmitEditCustomFieldAttribute: (e: SyntheticEvent, shouldContinue: boolean) => void;
  onSubmitEditDz: (e: SyntheticEvent, shouldContinue: boolean) => void;
  onClickFinish: () => void;
};

export const FormModalEndActions = ({
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
}: FormModalEndActionsProps) => {
  const { formatMessage } = useIntl();

  if (isComponentToDzModal) {
    if (isCreatingComponentInDz) {
      return (
        <Button
          variant="secondary"
          type="submit"
          onClick={(e: SyntheticEvent) => {
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
        onClick={(e: SyntheticEvent) => {
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
        onClick={(e: SyntheticEvent) => {
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
          onClick={(e: SyntheticEvent) => {
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
          onClick={(e: SyntheticEvent) => {
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
      <Flex gap={2}>
        <Button
          variant="secondary"
          type="submit"
          onClick={(e: SyntheticEvent) => {
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
          onClick={(e: SyntheticEvent) => {
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
      </Flex>
    );
  }

  if (isAttributeModal && !isComponentAttribute && !isDzAttribute) {
    return (
      <Flex gap={2}>
        <Button
          type={isEditingAttribute ? 'button' : 'submit'}
          variant="secondary"
          onClick={(e: SyntheticEvent) => {
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
          onClick={(e: SyntheticEvent) => {
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
      </Flex>
    );
  }

  if (isContentTypeModal) {
    return (
      <Flex gap={2}>
        {!isCreatingContentType && (
          <>
            <Button
              type="button"
              variant="danger"
              onClick={(e: SyntheticEvent) => {
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
              onClick={(e: SyntheticEvent) => {
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
            onClick={(e: SyntheticEvent) => {
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
      </Flex>
    );
  }

  if (isComponentModal) {
    return (
      <Flex gap={2}>
        {!isCreatingComponent && (
          <>
            <Button
              type="button"
              variant="danger"
              onClick={(e: SyntheticEvent) => {
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
              onClick={(e: SyntheticEvent) => {
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
            onClick={(e: SyntheticEvent) => {
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
      </Flex>
    );
  }

  if (isEditingCategory) {
    return (
      <Flex gap={2}>
        <Button
          type="button"
          variant="danger"
          onClick={(e: SyntheticEvent) => {
            e.preventDefault();
            if (categoryName) {
              deleteCategory(categoryName);
            }
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
          onClick={(e: SyntheticEvent) => {
            e.preventDefault();

            onSubmitEditCategory(e);
          }}
        >
          {formatMessage({
            id: 'global.finish',
            defaultMessage: 'finish',
          })}
        </Button>
      </Flex>
    );
  }

  if (isCustomFieldModal) {
    return (
      <Flex gap={2}>
        <Button
          type={isEditingAttribute ? 'button' : 'submit'}
          variant="secondary"
          onClick={(e: SyntheticEvent) => {
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
          onClick={(e: SyntheticEvent) => {
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
      </Flex>
    );
  }

  return null;
};
