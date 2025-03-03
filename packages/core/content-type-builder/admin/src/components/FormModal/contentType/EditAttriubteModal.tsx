import { useStrapiApp } from '@strapi/admin/strapi-admin';
import { Link, Button, Flex } from '@strapi/design-system';
import { ArrowLeft, Plus } from '@strapi/icons';
import { Formik } from 'formik';
import { useIntl } from 'react-intl';

import { useFormsAPI } from '../../../hooks/useFormsAPI';
import { findAttribute } from '../../../utils/findAttribute';
import { getTrad } from '../../../utils/getTrad';
import { useDataManager } from '../../DataManager/useDataManager';
import { useFormModalNavigation } from '../../FormModalNavigation/useFormModalNavigation';
import { FormModal } from '../components/Modal';
import { forms } from '../forms/forms';

export const EditAttributeModal = () => {
  const { formatMessage } = useIntl();
  const {
    onCloseModal,
    forTarget,
    attributeName,
    targetUid,
    attributeType,
    step,
    onOpenModalAddField,
    onNavigateToChooseAttributeModal,
  } = useFormModalNavigation();
  const { components, contentTypes, addAttribute } = useDataManager();
  const formsApi = useFormsAPI();

  const type = forTarget === 'component' ? components[targetUid] : contentTypes[targetUid];

  if (!type) {
    throw new Error('The content type does not exist');
  }

  const displayName = type?.info.displayName;

  const initialAttribute = findAttribute(type.attributes, attributeName);
  const attributeToEdit: any = {
    ...initialAttribute,
    name: attributeName,
  };

  if (attributeType === 'component') {
    if (!('repeatable' in attributeToEdit) || !attributeToEdit.repeatable) {
      attributeToEdit.repeatable = false;
    }
  }

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

  const intlLabel = { id: getTrad(`attribute.${attributeType}`) };

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
      initialValues={attributeToEdit}
      validate={(value) => {
        return {};
      }}
      onSubmit={(values, {}) => {
        console.log('submit', values);

        // try {
        // schema = forms.attribute.schema(
        //   type,
        //   computedAttrbiuteType,
        //   reservedNames,
        //   alreadyTakenTargetContentTypeAttributes,
        //   { modifiedData, initialData },
        //   ctbFormsAPI
        // );
        // );
        // } catch (err) {
        //   setErrors(err);
        // }

        addAttribute({
          attributeToSet: values,
          forTarget,
          targetUid,
          isEditing: true,
          initialAttribute,
        });
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
                e.preventDefault();
                await submitForm();
                onNavigateToChooseAttributeModal({
                  forTarget,
                  targetUid,
                });
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
                await submitForm();
                onCloseModal();
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
                    id: getTrad('modalForm.sub-header.attribute.edit'),
                  },
                  {
                    name: attributeName,
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
