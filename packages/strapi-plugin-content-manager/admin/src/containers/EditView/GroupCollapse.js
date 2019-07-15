import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';

import pluginId from '../../pluginId';
import Grab from '../../assets/images/grab_icon.svg';
import Logo from '../../assets/images/caret_top.svg';
import { Flex, GroupCollapseWrapper, ImgWrapper } from './components';

function GroupCollapse({ isCreating, isOpen, removeField }) {
  const id = isCreating
    ? { id: `${pluginId}.containers.Edit.pluginHeader.title.new` }
    : {};

  return (
    <GroupCollapseWrapper>
      <Flex style={{ fontWeight: 500 }}>
        <ImgWrapper isOpen={isOpen}>
          <img src={Logo} alt="logo" />
        </ImgWrapper>
        <FormattedMessage {...id} />
      </Flex>
      <Flex>
        <button type="button" style={{ marginRight: 8 }} onClick={removeField}>
          <i className="fa fa-trash" />
        </button>
        <button type="button" style={{ lineHeigth: '32px' }}>
          <img src={Grab} alt="grab icon" />
        </button>
      </Flex>
    </GroupCollapseWrapper>
  );
}

GroupCollapse.defaultProps = {
  isCreating: true,
  isOpen: false,
  removeField: () => {},
};

GroupCollapse.propTypes = {
  isCreating: PropTypes.bool,
  isOpen: PropTypes.bool,
  removeField: PropTypes.func,
};

export default GroupCollapse;
