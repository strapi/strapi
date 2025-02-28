import { useStrapiApp } from '@strapi/admin/strapi-admin';
import { Link, Button, Flex } from '@strapi/design-system';
import { ArrowLeft, Plus } from '@strapi/icons';
import { Formik } from 'formik';
import { useIntl } from 'react-intl';
import { useNavigate } from 'react-router-dom';

import { useFormsAPI } from '../../../hooks/useFormsAPI';
import { getTrad } from '../../../utils/getTrad';
import { useDataManager } from '../../DataManager/useDataManager';
import { useFormModalNavigation } from '../../FormModalNavigation/useFormModalNavigation';
import { FormModal } from '../components/Modal';
import { forms } from '../forms/forms';

export const CreateAttributeModal = () => {
  const { formatMessage } = useIntl();
  const {
    onCloseModal,
    forTarget,
    modalType,
    customFieldUid,
    targetUid,
    attributeType,
    step,
    onOpenModalAddField,
    onNavigateToChooseAttributeModal,
  } = useFormModalNavigation();
  const { components, contentTypes } = useDataManager();
  const getCustomField = useStrapiApp('CreateAttributeModal', (state) => state.customFields.get);
  const formsApi = useFormsAPI();

  const type = forTarget === 'component' ? components[targetUid] : contentTypes[targetUid];

  const displayName = type?.info.displayName;

  const breadcrumbs = [
    {
      label: displayName,
      info: {
        category: ('category' in type && type?.category) || '',
        name: type?.info?.displayName,
      },
    },
  ];

  const baseForm = forms.attribute.form.base({
    data: {},
    type: attributeType,
    step,
    attributes: [],
  });
  const advancedForm = forms.attribute.form.advanced({
    data: {},
    type: attributeType,
    step,
    attributes: [],
    extensions: formsApi,
    forTarget,
  });

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

  const customField = getCustomField(customFieldUid);

  const intlLabel =
    modalType === 'customField'
      ? customField?.intlLabel
      : { id: getTrad(`attribute.${attributeType}`) };

  const backLink = (
    <Link
      aria-label={formatMessage({
        id: getTrad('modalForm.header.back'),
        defaultMessage: 'Back',
      })}
      startIcon={<ArrowLeft />}
      onClick={() => onOpenModalAddField({ forTarget, targetUid })}
      href="#back"
      isExternal={false}
    />
  );

  return (
    <Formik
      initialValues={{
        name: '',
        type: '',
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
      }}
    >
      {({ dirty, submitForm }) => {
        const onClose = () => {
          if (dirty) {
            closeAfterConfirmation();
          } else {
            onCloseModal();
          }
        };

        const endActions = (
          <Flex gap={2}>
            <Button
              type="submit"
              variant="secondary"
              startIcon={<Plus />}
              onClick={async (e) => {
                // add field
                e.preventDefault();
                try {
                  await submitForm();

                  // if errors stop

                  onNavigateToChooseAttributeModal({
                    forTarget,
                    targetUid,
                  });
                } catch (e) {}
              }}
            >
              {formatMessage({
                id: getTrad('form.button.add-field'),
                defaultMessage: 'Add another field',
              })}
            </Button>
            <Button
              type="button"
              variant="default"
              onClick={async (e) => {
                e.preventDefault();
                // submit and finish

                try {
                  await submitForm();

                  // if errors stop

                  onCloseModal();
                } catch (e) {}
              }}
            >
              {formatMessage({
                id: 'global.finish',
                defaultMessage: 'Finish',
              })}
            </Button>
          </Flex>
        );

        return (
          <FormModal.Root onClose={onClose}>
            <FormModal.Header icon={attributeType} breadcrumbs={breadcrumbs} backLink={backLink} />
            <FormModal.Body
              header={{
                title: formatMessage(
                  {
                    id: getTrad('modalForm.sub-header.attribute.create'),
                  },
                  {
                    type: intlLabel ? formatMessage(intlLabel) : '',
                  }
                ),
                subTitle: formatMessage({
                  id: getTrad(`attribute.${attributeType}.description`),
                  defaultMessage: 'create a new attribute',
                }),
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
