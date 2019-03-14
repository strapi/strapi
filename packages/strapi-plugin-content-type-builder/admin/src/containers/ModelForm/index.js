/**
 *
 * ModelForm
 *
 */

import React from 'react';
import { connect } from 'react-redux';
import { createStructuredSelector } from 'reselect';
import { compose } from 'redux';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { camelCase, get } from 'lodash';

import Input from 'components/InputsIndex';

import pluginId from '../../pluginId';


import BodyModal from '../../components/BodyModal';
import ButtonModalPrimary from '../../components/ButtonModalPrimary';
import ButtonModalSecondary from '../../components/ButtonModalSecondary';
import FooterModal from '../../components/FooterModal';
import HeaderModal from '../../components/HeaderModal';
import HeaderModalTitle from '../../components/HeaderModalTitle';
import HeaderModalNavContainer from '../../components/HeaderModalNavContainer';
import HeaderNavLink from '../../components/HeaderNavLink';
import WrapperModal from '../../components/WrapperModal';

import { makeSelectConnections } from '../App/selectors';

import forms from './forms.json';

const NAVLINKS = [
  { id: 'base' },
  { id: 'advanced' },
];

export class ModelForm extends React.Component { // eslint-disable-line react/prefer-stateless-function
  state = { didCheckErrors: false, formErrors: {}, isVisible: false };

  handleBlur = (e) => {
    if (e.target.name === 'name') {
      const value = camelCase(e.target.value.trim()).toLowerCase();
      const target = {
        name: e.target.name,
        value,
      };

      this.props.onChangeNewContentType({ target });
    }
  }

  handleCancel = () => {
    const { actionType, cancelNewContentType, push } = this.props;

    if (actionType === 'create') {
      cancelNewContentType();
    }

    push({ search: '' });
  }

  handleGoTo = to => {
    const { actionType, push } = this.props;

    push({
      search: `modalType=model&settingType=${to}&actionType=${actionType}`,
    });
  }

  handleOnOpened = () => this.setState({ isVisible: true });

  handleOnClosed = () => this.setState({ isVisible: false });

  handleSubmit = (e) => {
    e.preventDefault();

    const { currentData, modifiedData, actionType, createTempContentType, push } = this.props;
    const alreadyTakenContentTypeNames = Object.keys(currentData);
    let formErrors = [];

    if (alreadyTakenContentTypeNames.includes(modifiedData.name)) {
      formErrors =  { name: [{ id: `${pluginId}.error.contentTypeName.taken` }] };
    }

    if (modifiedData.name === '') {
      formErrors =  { name: [{ id: `${pluginId}.error.validation.required` }] };
    }

    this.setState(prevState => ({ formErrors, didCheckErrors: !prevState.didCheckErrors }));

    if (formErrors.length === 0) {
      if (actionType === 'create') {
        createTempContentType();
        push({
          pathname: `/plugins/${pluginId}/models/${modifiedData.name}`,
          search: 'modalType=chooseAttributes',
        });
      } else {
        console.log('not ready yet');
      }
    }
  }

  renderInput = (input) => {
    const { connections, modifiedData, onChangeNewContentType } = this.props;
    const { didCheckErrors, formErrors, isVisible } = this.state;

    if (!isVisible) {
      return null;
    }

    if (input.inputDescriptionParams) {
      input.inputDescription = {
        ...input.inputDescription,
        params: {
          link: (
            <FormattedMessage id={input.inputDescriptionParams.id}>
              {msg => <a href={input.inputDescriptionParams.href} target="_blank">{msg}</a>}
            </FormattedMessage>
          ),
        },
      };
    }

    const errors = get(formErrors, input.name, []);

    return (
      <Input
        key={input.name}
        {...input}
        didCheckErrors={didCheckErrors}
        errors={errors}
        onChange={onChangeNewContentType}
        onBlur={this.handleBlur}
        selectOptions={connections}
        value={get(modifiedData, [input.name], '')}
      />
    );
  }

  renderNavLinks = (link, index) => {
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
    const { activeTab, isOpen } = this.props;
    const currentForm = get(forms, activeTab, forms.base);

    return (
      <WrapperModal isOpen={isOpen} onOpened={this.handleOnOpened} onClosed={this.handleOnClosed} onToggle={this.handleCancel}>
        <HeaderModal>
          <HeaderModalTitle title={`${pluginId}.popUpForm.create.contentType.header.title`} />
          <HeaderModalNavContainer>
            {NAVLINKS.map(this.renderNavLinks)}
          </HeaderModalNavContainer>
        </HeaderModal>
        <form onSubmit={this.handleSubmit}>
          <BodyModal>
            {currentForm.items.map(this.renderInput)}
          </BodyModal>
          <FooterModal>
            <ButtonModalSecondary message={`${pluginId}.form.button.cancel`} onClick={this.handleCancel} />
            <ButtonModalPrimary message={`${pluginId}.form.button.save`} type="submit" />
          </FooterModal>
        </form>
      </WrapperModal>
    );
  }
}

ModelForm.defaultProps = {
  actionType: 'create',
  activeTab: 'base',
  cancelNewContentType: () => {},
  connections: ['default'],
  createTempContentType: () => {},
  currentData: {},
  isOpen: false,
  modifiedData: {},
  onSubmit: (e) => {
    e.preventDefault();
  },
};

ModelForm.propTypes = {
  actionType: PropTypes.string,
  activeTab: PropTypes.string,
  cancelNewContentType: PropTypes.func,
  connections: PropTypes.arrayOf(
    PropTypes.string,
  ),
  createTempContentType: PropTypes.func,
  currentData: PropTypes.object,
  isOpen: PropTypes.bool,
  modifiedData: PropTypes.object,
  onChangeNewContentType: PropTypes.func.isRequired,
  onSubmit: PropTypes.func,
  pathname: PropTypes.string.isRequired,
  push: PropTypes.func.isRequired,
};

const mapStateToProps = createStructuredSelector({
  connections: makeSelectConnections(),
});

const withConnect = connect(mapStateToProps, null);

export default compose(withConnect)(ModelForm);
