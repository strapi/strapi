import React from 'react';
import PropTypes from 'prop-types';

import { ListHeaderButton } from '../ListButton';
import Wrapper from './Wrapper';
import Title from './Title';

function ListHeader({ actions, title }) {
  return (
    <Wrapper>
      {actions.map(action => {
        const { disabled, label, onClick } = action;

        return (
          <ListHeaderButton
            key={label}
            onClick={onClick}
            disabled={disabled || false}
            {...action}
          >
            {label}
          </ListHeaderButton>
        );
      })}
      <div className="list-header-title">
        {title.map(item => {
          return <Title key={item}>{item}&nbsp;</Title>;
        })}
      </div>
    </Wrapper>
  );
}

ListHeader.defaultProps = {
  actions: [],
  title: [],
};

ListHeader.propTypes = {
  actions: PropTypes.arrayOf(
    PropTypes.shape({
      disabled: PropTypes.bool,
      onClick: PropTypes.func,
      title: PropTypes.string,
    })
  ),
  title: PropTypes.arrayOf(PropTypes.string),
};

export default ListHeader;
