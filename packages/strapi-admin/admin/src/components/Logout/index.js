/**
 *
 * Logout
 *
 */

/* eslint-disable */
import React, { useState } from 'react';
import { FormattedMessage } from 'react-intl';
import { withRouter } from 'react-router-dom';
import { get } from 'lodash';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { ButtonDropdown, DropdownItem, DropdownMenu, DropdownToggle } from 'reactstrap';
import { auth } from 'strapi-helper-plugin';
import Wrapper from './components';

const Logout = ({ history: { push } }) => {
  const [isOpen, setIsOpen] = useState(false);
  const toggle = () => setIsOpen(prev => !prev);
  const handleGoTo = () => {
    const id = get(auth.getUserInfo(), 'id');

    push({
      pathname: `/plugins/content-manager/collectionType/strapi::administrator/${id}`,
      search:
        '?redirectUrl=/plugins/content-manager/collectionType/strapi::administrator/&_page=0&_limit=0&_sort=id',
    });
  };
  const handleGoToAdministrator = () => {
    push({
      pathname: '/plugins/content-manager/collectionType/strapi::administrator',
    });
  };
  const handleLogout = () => {
    auth.clearAppStorage();
    push('/auth/login');
  };

  return (
    <Wrapper>
      <ButtonDropdown isOpen={isOpen} toggle={toggle}>
        <DropdownToggle>
          {get(auth.getUserInfo(), 'username')}
          <FontAwesomeIcon icon="caret-down" />
        </DropdownToggle>
        <DropdownMenu className="dropDownContent">
          <DropdownItem onClick={handleGoTo} className="item">
            <FormattedMessage id="app.components.Logout.profile" />
          </DropdownItem>
          <DropdownItem onClick={handleGoToAdministrator} className="item">
            <FormattedMessage id="app.components.Logout.admin" />
          </DropdownItem>
          <DropdownItem onClick={handleLogout}>
            <FormattedMessage id="app.components.Logout.logout" />
            <FontAwesomeIcon icon="sign-out-alt" />
          </DropdownItem>
        </DropdownMenu>
      </ButtonDropdown>
    </Wrapper>
  );
};

export default withRouter(Logout);
