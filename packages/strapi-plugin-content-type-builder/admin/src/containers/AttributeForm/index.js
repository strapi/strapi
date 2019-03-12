/**
 *
 * AttributeForm
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { get } from 'lodash';
// import { connect } from 'react-redux';
// import { bindActionCreators, compose } from 'redux';

import Input from 'components/InputsIndex';

import pluginId from '../../pluginId';

import BodyModal from '../../components/BodyModal';
import ButtonModalPrimary from '../../components/ButtonModalPrimary';
import ButtonModalSecondary from '../../components/ButtonModalSecondary';
import CustomCheckbox from '../../components/CustomCheckbox';
import FooterModal from '../../components/FooterModal';
import HeaderModal from '../../components/HeaderModal';
import HeaderModalNavContainer from '../../components/HeaderModalNavContainer';
import HeaderNavLink from '../../components/HeaderNavLink';
import WrapperModal from '../../components/WrapperModal';

import supportedAttributes from './supportedAttributes.json';

const NAVLINKS = [
  { id: 'base' },
  { id: 'advanced' },
];

class AttributeForm extends React.Component { // eslint-disable-line react/prefer-stateless-function
  state = { showForm: false };

  handleCancel = () => {
    const { push } = this.props;

    push({ search: '' });
  }

  handleGoTo = to => {
    const { attributeType, push } = this.props;

    push({
      search: `modalType=attributeForm&attributeType=${attributeType}&settingType=${to}&actionType=create`,
    });
  }

  handleOnClosed = () => {
    const { onCancel } = this.props;

    onCancel();
    this.setState({ showForm: false });
  }

  handleOnOpened = () => this.setState({ showForm: true });

  handleToggle = () => {
    const { push } = this.props;

    push({ search: '' });
  }

  renderInput = (input, index) => {
    const { modifiedData, onChange } = this.props;
    const { custom } = input;
    const value = get(modifiedData, input.name, input.defaultValue);

    if (custom) {
      return (
        <CustomCheckbox
          key={input.name}
          {...input}
          onChange={onChange}
          value={value}
        />
      );
    }

    return (
      <Input
        autoFocus={index === 0}
        key={input.name}
        {...input}
        onChange={onChange}
        value={value}
      />
    );
  }

  renderNavLink = (link, index) => {
    const { activeTab } = this.props;

    return (
      <HeaderNavLink
        isActive={activeTab === link.id}
        key={link.id}
        {...link}
        onClick={this.handleGoTo}
        nextTab={index === NAVLINKS.length - 1 ? 0 : index + 1}
      />
    );
  }

  render() {
    const { activeTab, attributeType, isOpen, onSubmit } = this.props;
    const { showForm } = this.state;
    const currentForm = get(supportedAttributes, [attributeType, activeTab, 'items'], []);

    return (
      <WrapperModal
        isOpen={isOpen}
        onClosed={this.handleOnClosed}
        onOpened={this.handleOnOpened}
        onToggle={this.handleToggle}
      >
        <HeaderModal>
          <div style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>
            <FormattedMessage id={`${pluginId}.popUpForm.create`} />
            &nbsp;
            <span style={{ fontStyle: 'italic', textTransform: 'capitalize' }}>string</span>
            &nbsp;
            <FormattedMessage id={`${pluginId}.popUpForm.field`} />
          </div>
          <HeaderModalNavContainer>
            {NAVLINKS.map(this.renderNavLink)}
          </HeaderModalNavContainer>
        </HeaderModal>
        <form onSubmit={onSubmit}>
          <BodyModal>
            {showForm && currentForm.map(this.renderInput)}
          </BodyModal>
          <FooterModal>
            <ButtonModalSecondary message={`${pluginId}.form.button.cancel`} onClick={this.handleCancel} />
            <ButtonModalPrimary message={`${pluginId}.form.button.continue`} type="submit" add />
            <ButtonModalPrimary message={`${pluginId}.form.button.save`} type="button" />
          </FooterModal>
        </form>
      </WrapperModal>
    );
  }
}

AttributeForm.defaultProps = {
  activeTab: 'base',
  attributeType: 'string',
  isContentTypeTemporary: true,
  isOpen: false,
  modifiedData: {},
  onCancel: () => {},
  onChange: () => {},
  onSubmit: (e) => {
    e.preventDefault();
  },
  push: () => {},
};

AttributeForm.propTypes = {
  activeTab: PropTypes.string,
  attributeType: PropTypes.string,
  isContentTypeTemporary: PropTypes.bool,
  isOpen: PropTypes.bool,
  modifiedData: PropTypes.object, // TODO: Clearly define this object (It's working without it though)
  onCancel: PropTypes.func,
  onChange: PropTypes.func,
  onSubmit: PropTypes.func,
  push: PropTypes.func,
};

export default AttributeForm;
