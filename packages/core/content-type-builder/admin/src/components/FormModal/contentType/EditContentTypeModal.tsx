import { useNotification } from '@strapi/admin/strapi-admin';
import { Button, Flex } from '@strapi/design-system';
import { Formik } from 'formik';
import { useIntl } from 'react-intl';

import { useFormsAPI } from '../../../hooks/useFormsAPI';
import { getTrad } from '../../../utils/getTrad';
import { useDataManager } from '../../DataManager/useDataManager';
import { useFormModalNavigation } from '../../FormModalNavigation/useFormModalNavigation';
import { FormModal } from '../components/Modal';
import { forms } from '../forms/forms';
import { canEditContentType } from '../utils/canEditContentType';

export const EditContentTypeModal = () => {
  const { formatMessage } = useIntl();
  const { kind, onCloseModal, targetUid } = useFormModalNavigation();
  const { updateSchema, contentTypes, deleteContentType } = useDataManager();
  const { toggleNotification } = useNotification();
  const formsApi = useFormsAPI();

  const type = contentTypes[targetUid];

  if (!type) {
    throw new Error('The content type does not exist');
  }

  const label = formatMessage(
    {
      id: getTrad(`modalForm.header-edit`),
      defaultMessage: 'Edit {name}',
    },
    { name: type.info.displayName }
  );

  const baseForm = forms.contentType.form.base({ actionType: 'edit' });
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
    <Flex gap={2}>
      <Button
        type="button"
        variant="danger"
        onClick={(e) => {
          e.preventDefault();
          deleteContentType(type.uid);
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
        draftAndPublish: type.options?.draftAndPublish || false,
        kind: type.kind,
        pluginOptions: type.pluginOptions ?? {},
        pluralName: type.info.pluralName,
        singularName: type.info.singularName,
      }}
      validate={(value) => {
        return {};
        // try {
        //   forms.contentType
        //     .schema({
        //       alreadyTakenNames: [],
        //       isEditing: true,
        //       contentTypes: [],
        //       ctUid: '',
        //       formsApi,
        //     })
        //     .validate(value, { abortEarly: false });
        // } catch (err) {
        //   setErrors(err);
        // }
      }}
      onSubmit={async (values, { setErrors }) => {
        if (canEditContentType(type, values)) {
          onCloseModal();

          await updateSchema({
            uid: type.uid,
            data: {
              displayName: values.displayName,
              kind: values.kind,
              draftAndPublish: values.draftAndPublish,
              pluginOptions: values.pluginOptions,
            },
          });
        } else {
          toggleNotification({
            type: 'danger',
            message: formatMessage({ id: 'notification.contentType.relations.conflict' }),
          });
        }
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
