import React, { useState, useMemo } from 'react';
import {
  HeaderModal,
  HeaderModalTitle,
  Modal,
  ModalBody,
  ModalFooter,
  ModalForm,
} from 'strapi-helper-plugin';
import { FormattedMessage } from 'react-intl';
import { Button } from '@buffetjs/core';
import { Inputs as Input } from '@buffetjs/custom';
import PropTypes from 'prop-types';
import pluginId from '../../pluginId';

const NewMenuItemForm = ({
  isModalVisible,
  setModalVisible,
  handleSubmit,
  modifiedData: { menuStates = [], menuTypes = [], pages = [] },
}) => {
  const [formData, setFormData] = useState({
    type: 1,
    state: 1,
    title: '',
    page: null,
  });

  const contentTypeId = useMemo(() => {
    const contentType_menuType = menuTypes.find(item => item.code === 'symlink');

    if (contentType_menuType) {
      return contentType_menuType.id || null;
    }

    return null;
  }, [menuTypes]);

  const formDataType_equals_contentTypeId = useMemo(
    () => parseInt(formData.type, 10) === contentTypeId,
    [contentTypeId, formData.type]
  );

  const handleFormChange = ({ target: { name, value } }) => {
    setFormData(prevFormData => ({
      ...prevFormData,
      [name]: value,
    }));
  };

  const handleFormSubmit = e => {
    e.preventDefault();
    setModalVisible(false);
    handleSubmit(formData);
    setFormData({});
  };

  return (
    <Modal
      isOpen={isModalVisible}
      onToggle={() => setModalVisible(!isModalVisible)}
      style={{ width: 300 }}
    >
      <HeaderModal>
        <section>
          <HeaderModalTitle>
            <div style={{ margin: 'auto 20px auto 0' }}>
              <FormattedMessage id={`${pluginId}.MenuEditor.createForm.newItem`} />
            </div>
          </HeaderModalTitle>
        </section>
      </HeaderModal>
      <form onSubmit={handleFormSubmit}>
        <ModalForm>
          <ModalBody>
            <div className="col-12" style={{ marginBottom: 0 }}>
              <FormattedMessage id={`${pluginId}.MenuEditor.createForm.name`}>
                {label => (
                  <Input
                    onChange={handleFormChange}
                    name="title"
                    type="text"
                    label={label}
                    value={formData.title}
                  />
                )}
              </FormattedMessage>
            </div>
            <div className="col-12" style={{ marginBottom: 0 }}>
              {/* use translation hook */}
              <FormattedMessage id={`${pluginId}.MenuEditor.createForm.state`}>
                {label => (
                  <Input
                    onChange={handleFormChange}
                    name="state"
                    type="select"
                    label={label}
                    options={menuStates.map(option => (
                      <option key={option.id} value={option.id}>
                        {option.title}
                      </option>
                    ))}
                    value={formData.state}
                  />
                )}
              </FormattedMessage>
            </div>
            <div className="col-12" style={{ marginBottom: 0 }}>
              <FormattedMessage id={`${pluginId}.MenuEditor.createForm.type`}>
                {label => (
                  <Input
                    onChange={handleFormChange}
                    name="type"
                    type="select"
                    label={label}
                    options={menuTypes.map(option => (
                      <option key={option.id} value={option.id}>
                        {option.title}
                      </option>
                    ))}
                    value={formData.type}
                  />
                )}
              </FormattedMessage>
            </div>
            <div className="col-12" style={{ marginBottom: 0 }}>
              {formDataType_equals_contentTypeId && (
                <FormattedMessage id={`${pluginId}.MenuEditor.createForm.linkToPage`}>
                  {label => (
                    <Input
                      onChange={handleFormChange}
                      name="page"
                      type="select"
                      label={label}
                      options={pages.map(option => (
                        <option key={option.id} value={option.id}>
                          {option.id} - {option.title}
                        </option>
                      ))}
                      value={formData.page}
                    />
                  )}
                </FormattedMessage>
              )}
            </div>
          </ModalBody>
        </ModalForm>
        <ModalFooter>
          <section>
            <Button onClick={() => setModalVisible(false)} color="cancel">
              <FormattedMessage id="components.popUpWarning.button.cancel" />
            </Button>
            <Button type="submit" color="success">
              <FormattedMessage id="form.button.done" />
            </Button>
          </section>
        </ModalFooter>
      </form>
    </Modal>
  );
};

NewMenuItemForm.propTypes = {
  isModalVisible: PropTypes.bool.isRequired,
  setModalVisible: PropTypes.func.isRequired,
  handleSubmit: PropTypes.func.isRequired,
  modifiedData: PropTypes.object.isRequired,
};

export default NewMenuItemForm;
