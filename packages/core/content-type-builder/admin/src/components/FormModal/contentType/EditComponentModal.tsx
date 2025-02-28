import { Button, Flex } from '@strapi/design-system';
import { Formik } from 'formik';
import { useIntl } from 'react-intl';

import { getTrad } from '../../../utils/getTrad';
import { useDataManager } from '../../DataManager/useDataManager';
import { useFormModalNavigation } from '../../FormModalNavigation/useFormModalNavigation';
import { FormModal } from '../components/Modal';
import { forms } from '../forms/forms';

export const EditComponentModal = () => {
  const { formatMessage } = useIntl();
  const { onCloseModal, targetUid } = useFormModalNavigation();
  const { updateComponentSchema, components, deleteComponent } = useDataManager();

  const type = components[targetUid];

  if (!type) {
    throw new Error('The component does not exist');
  }

  const label = formatMessage(
    {
      id: getTrad(`modalForm.component.header-edit`),
      defaultMessage: 'Edit {name}',
    },
    {
      name: type.info.displayName,
    }
  );

  const baseForm = forms.component.form.base();

  const closeAfterConfirmation = () => {
    const confirm = window.confirm(
      formatMessage({
        id: 'window.confirm.close-modal.file',
        defaultMessage: 'Are you sure? Your changes will be lost.',
      })
    );

    if (confirm) {
      onCloseModal();
    }
  };

  const endActions = (
    <Flex gap={2}>
      <Button
        type="button"
        variant="danger"
        onClick={(e) => {
          e.preventDefault();
          deleteComponent(type.uid);
        }}
      >
        {formatMessage({
          id: 'global.delete',
          defaultMessage: 'Delete',
        })}
      </Button>
      <Button type="submit" variant="default">
        {formatMessage({
          id: 'global.finish',
          defaultMessage: 'Finish',
        })}
      </Button>
    </Flex>
  );

  return (
    <Formik
      initialValues={{
        displayName: type.info.displayName,
        icon: type.info.icon ?? '',
        category: type.category,
      }}
      validate={(value) => {
        return {};
      }}
      onSubmit={(values, {}) => {
        console.log('submit', values);

        // try {
        //    schema = forms.component.schema(
        //   Object.keys(components) as Internal.UID.Component[],
        //   modifiedData.category || '',
        //   reservedNames,
        //   actionType === 'edit',
        //   components,
        //   modifiedData.displayName || '',
        //   (type?.uid ?? null) as Internal.UID.Component
        //   // ctbFormsAPI
        // );
        // } catch (err) {
        //   setErrors(err);
        // }

        const { displayName, icon } = values;

        updateComponentSchema({
          data: {
            icon,
            displayName,
          },
          componentUID: targetUid,
        });

        // Close the modal
        onCloseModal();
      }}
    >
      {({ dirty }) => {
        const onClose = () => {
          if (dirty) {
            closeAfterConfirmation();
          } else {
            onCloseModal();
          }
        };

        return (
          <FormModal.Root onClose={onClose}>
            <FormModal.Header icon="component" label={label} />
            <FormModal.Body
              header={{
                title: formatMessage({ id: getTrad('configurations') }),
                // TODO: create new translation key
                subTitle: 'A type for modeling data',
              }}
              baseForm={baseForm}
            />
            <FormModal.Footer onClose={onClose} endActions={endActions} />
          </FormModal.Root>
        );
      }}
    </Formik>
  );
};
