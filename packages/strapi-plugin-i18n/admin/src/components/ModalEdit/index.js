import React from 'react';
import PropTypes from 'prop-types';
import { Modal, ModalHeader, ModalSection, ModalFooter } from 'strapi-helper-plugin';
import { useIntl } from 'react-intl';
import { Button, Label, InputText } from '@buffetjs/core';
import Select from 'react-select';
import { Formik } from 'formik';
import { object, string } from 'yup';
import useEditLocale from '../../hooks/useEditLocale';
import { getTrad } from '../../utils';

const ModalEdit = ({ localeToEdit, onClose, locales }) => {
  const { isEditing, editLocale } = useEditLocale();
  const { formatMessage } = useIntl();
  const isOpened = Boolean(localeToEdit);

  const handleSubmit = ({ displayName }) => {
    const id = localeToEdit.id;
    const name = displayName || localeToEdit.code;

    return editLocale(id, name).then(onClose);
  };

  let options = [];
  let defaultOption;

  if (localeToEdit) {
    options = locales.map(locale => ({ label: locale.code, value: locale.id }));
    defaultOption = options.find(option => option.value === localeToEdit.id);
  }

  return (
    <Modal isOpen={isOpened} onToggle={onClose}>
      <Formik
        initialValues={{ displayName: localeToEdit ? localeToEdit.name : '' }}
        onSubmit={handleSubmit}
        validationSchema={object().shape({
          displayName: string().max(50, 'Settings.locales.modal.edit.locales.displayName.error'),
        })}
      >
        {({ values, handleSubmit, handleChange, errors }) => (
          <form onSubmit={handleSubmit}>
            <ModalHeader
              headerBreadcrumbs={[formatMessage({ id: getTrad('Settings.list.actions.edit') })]}
            />
            <ModalSection>
              <div>
                <span id="locale-code">
                  <Label htmlFor="">
                    {formatMessage({ id: getTrad('Settings.locales.modal.edit.locales.label') })}
                  </Label>
                </span>

                <Select
                  aria-labelledby="locale-code"
                  options={options}
                  defaultValue={defaultOption}
                  isDisabled
                />
              </div>

              <div>
                <Label htmlFor="displayName">
                  {formatMessage({
                    id: getTrad('Settings.locales.modal.edit.locales.displayName'),
                  })}
                </Label>
                <InputText name="displayName" value={values.displayName} onChange={handleChange} />

                {errors.displayName && (
                  <small>
                    {formatMessage({
                      id: getTrad(' Settings.locales.modal.edit.locales.displayName.error'),
                    })}
                  </small>
                )}
              </div>
            </ModalSection>
            <ModalFooter>
              <section>
                <Button type="button" color="cancel" onClick={onClose}>
                  {formatMessage({ id: 'app.components.Button.cancel' })}
                </Button>
                <Button
                  color="success"
                  type="submit"
                  isLoading={isEditing}
                  disabled={Object.keys(errors).length > 0}
                >
                  {formatMessage({ id: getTrad('Settings.locales.modal.edit.confirmation') })}
                </Button>
              </section>
            </ModalFooter>
          </form>
        )}
      </Formik>
    </Modal>
  );
};

ModalEdit.defaultProps = {
  localeToEdit: undefined,
  locales: [],
};

ModalEdit.propTypes = {
  localeToEdit: PropTypes.shape({
    id: PropTypes.number.isRequired,
    name: PropTypes.string.isRequired,
    code: PropTypes.string.isRequired,
  }),
  onClose: PropTypes.func.isRequired,
  locales: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number.isRequired,
      name: PropTypes.string.isRequired,
      code: PropTypes.string.isRequired,
    })
  ),
};

export default ModalEdit;
