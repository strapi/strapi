import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';

import getTrad from '../../utils/getTrad';

import Wrapper from './Wrapper';
import SortListItem from './SortListItem';

const SortList = ({ isShown, list, onClick, selected }) => {
  return (
    <Wrapper isShown={isShown}>
      {Object.keys(list).map(item => {
        return (
          <SortListItem
            key={item}
            isActive={list[item] === selected}
            onClick={() => {
              onClick(list[item]);
            }}
          >
            <FormattedMessage id={getTrad(`sort.${item}`)} />
          </SortListItem>
        );
      })}
    </Wrapper>
  );
};

SortList.defaultProps = {
  list: {},
  isShown: false,
  onClick: () => {},
  selected: null,
};

SortList.propTypes = {
  list: PropTypes.object,
  isShown: PropTypes.bool,
  onClick: PropTypes.func,
  selected: PropTypes.string,
};

export default SortList;
