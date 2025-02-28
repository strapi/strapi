import { Button, Flex } from '@strapi/design-system';
import { Formik } from 'formik';
import { useIntl } from 'react-intl';
import { useNavigate } from 'react-router-dom';

import { useFormsAPI } from '../../../hooks/useFormsAPI';
import { getTrad } from '../../../utils/getTrad';
import { useDataManager } from '../../DataManager/useDataManager';
import { useFormModalNavigation } from '../../FormModalNavigation/useFormModalNavigation';
import { FormModal } from '../components/Modal';
import { forms } from '../forms/forms';
import { createUid } from '../utils/createUid';

export const CreateContentTypeModal = () => {
  const { formatMessage } = useIntl();
  const { kind, onCloseModal } = useFormModalNavigation();
  const { createSchema } = useDataManager();
  const navigate = useNavigate();
  const formsApi = useFormsAPI();

  const label = formatMessage({
    id: getTrad(`modalForm.${kind}.header-create`),
    defaultMessage: 'Create a new {kind}',
  });

  const baseForm = forms.contentType.form.base({ actionType: 'create' });
  const advancedForm = forms.contentType.form.advanced({ formsApi });

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
        singularName: '',
        pluralName: '',
        draftAndPublish: true,
        pluginOptions: {},
      }}
      validate={(value) => {
        return {};
      }}
      onSubmit={(values, {}) => {
        console.log('submit', values);

        // try {
        //   forms.contentType
        //     .schema({
        //       alreadyTakenNames: [],
        //       isEditing: false,
        //       contentTypes: [],
        //       ctUid: '',
        //       formsApi,
        //     })
        //     .validate(value, { abortEarly: false });
        // } catch (err) {
        //   setErrors(err);
        // }
        const uid = createUid(values.displayName);

        createSchema({
          data: {
            kind,
            displayName: values.displayName,
            draftAndPublish: values.draftAndPublish,
            pluginOptions: values.pluginOptions,
            singularName: values.singularName,
            pluralName: values.pluralName,
          },
          uid,
        });

        // Redirect the user to the created content type
        navigate({ pathname: `/plugins/content-type-builder/content-types/${uid}` });
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
            <FormModal.Header icon={kind} label={label} />
            <FormModal.Body
              header={{
                title: formatMessage({ id: getTrad('configurations') }),
                // TODO: create new translation key
                subTitle: 'A type for modeling data',
              }}
              baseForm={baseForm}
              advancedForm={advancedForm}
            />
            <FormModal.Footer onClose={onClose} endActions={endActions} />
          </FormModal.Root>
        );
      }}
    </Formik>
  );
};
