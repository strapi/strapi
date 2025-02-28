import { Button, Flex } from '@strapi/design-system';
import { Formik } from 'formik';
import { useIntl } from 'react-intl';
import { useNavigate } from 'react-router-dom';

import { getTrad } from '../../../utils/getTrad';
import { useDataManager } from '../../DataManager/useDataManager';
import { useFormModalNavigation } from '../../FormModalNavigation/useFormModalNavigation';
import { FormModal } from '../components/Modal';
import { forms } from '../forms/forms';
import { createComponentUid } from '../utils/createUid';

export const CreateComponentModal = () => {
  const { formatMessage } = useIntl();
  const { onCloseModal } = useFormModalNavigation();
  const { createComponentSchema } = useDataManager();
  const navigate = useNavigate();

  const label = formatMessage({
    id: getTrad(`modalForm.component.header-create`),
    defaultMessage: 'Create a new component',
  });

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
    <Flex>
      <Button type="submit" variant="secondary">
        {formatMessage({
          id: 'global.continue',
          defaultMessage: 'Continue',
        })}
      </Button>
    </Flex>
  );

  return (
    <Formik
      initialValues={{
        displayName: '',
        category: '',
        icon: '',
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

        // Create the component schema
        const componentUid = createComponentUid(values.displayName, values.category);
        const { category, displayName, icon } = values;

        createComponentSchema({
          data: {
            displayName,
            icon,
          },
          uid: componentUid,
          componentCategory: category,
        });

        // Redirect the user to the created component
        navigate({
          pathname: `/plugins/content-type-builder/component-categories/${category}/${componentUid}`,
        });

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
