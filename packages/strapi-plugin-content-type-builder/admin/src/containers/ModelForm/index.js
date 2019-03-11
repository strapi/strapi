/**
 *
 * ModelForm
 *
 */

import React from 'react';
// import PropTypes from 'prop-types';
// import { FormattedMessage } from 'react-intl';
import pluginId from '../../pluginId';

import WrapperModal from '../../components/WrapperModal';
import HeaderModal from '../../components/HeaderModal';
import HeaderModalTitle from '../../components/HeaderModalTitle';
import HeaderModalNavContainer from '../../components/HeaderModalNavContainer';
import HeaderNavLink from '../../components/HeaderNavLink';


class ModelForm extends React.Component { // eslint-disable-line react/prefer-stateless-function
  handleToggle = () => {};

  render() {
    const NAVLINKS = [
      { id: `${pluginId}.popUpForm.navContainer.base`, isActive: true },
      { id: `${pluginId}.popUpForm.navContainer.advanced`, isActive: false },
    ];

    return (
      <WrapperModal isOpen onToggle={this.handleToggle}>
        <HeaderModal>
          <HeaderModalTitle title={`${pluginId}.popUpForm.create.contentType.header.title`} />
          <HeaderModalNavContainer>
            {NAVLINKS.map(link => <HeaderNavLink key={link.id} {...link} />)}
          </HeaderModalNavContainer>
        </HeaderModal>

      </WrapperModal>
    );
  }
}

ModelForm.propTypes = {};


export default ModelForm;
