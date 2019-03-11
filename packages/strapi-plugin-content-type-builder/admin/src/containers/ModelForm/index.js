/**
 *
 * ModelForm
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import Input from 'components/InputsIndex';

import pluginId from '../../pluginId';


import BodyModal from '../../components/BodyModal';
import HeaderModal from '../../components/HeaderModal';
import HeaderModalTitle from '../../components/HeaderModalTitle';
import HeaderModalNavContainer from '../../components/HeaderModalNavContainer';
import HeaderNavLink from '../../components/HeaderNavLink';
import WrapperModal from '../../components/WrapperModal';

import forms from './forms.json';

const NAVLINKS = [
  { id: 'base' },
  { id: 'advanced' },
];

class ModelForm extends React.Component { // eslint-disable-line react/prefer-stateless-function
  handleGotTo = to => {
    const { actionType, pathname, push } = this.props;

    push({
      pathname,
      search: `modalType=model&settingType=${to}&actionType=${actionType}`,
    });
  }

  handleToggle = () => {
    const { pathname, push } = this.props;

    push({ pathname });
  };

  renderInput = (input) => {
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

    return (
      <Input
        key={input.name}
        {...input}
        onChange={() => {}}
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
        onClick={this.handleGotTo}
        nextTab={index === NAVLINKS.length - 1 ? 0 : index + 1}
      />
    );
  }

  render() {
    const { activeTab, isOpen } = this.props;

    return (
      <WrapperModal isOpen={isOpen} onToggle={this.handleToggle}>
        <HeaderModal>
          <HeaderModalTitle title={`${pluginId}.popUpForm.create.contentType.header.title`} />
          <HeaderModalNavContainer>
            {NAVLINKS.map(this.renderNavLinks)}
          </HeaderModalNavContainer>
        </HeaderModal>
        <BodyModal>
          {!!activeTab && forms[activeTab].items.map(this.renderInput)}
        </BodyModal>
      </WrapperModal>
    );
  }
}

ModelForm.defaultProps = {
  actionType: 'create',
  activeTab: 'base',
  isOpen: false,
};

ModelForm.propTypes = {
  actionType: PropTypes.string,
  activeTab: PropTypes.string,
  isOpen: PropTypes.bool,
  pathname: PropTypes.string.isRequired,
  push: PropTypes.func.isRequired,
};


export default ModelForm;
