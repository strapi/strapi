import React from 'react';
import PropTypes from 'prop-types';

import Title from './Title';
import Wrapper from './Wrapper';

/* eslint-disable react/jsx-one-expression-per-line */
function ListHeader({ actions, title }) {
  return (
    <Wrapper>
      <div className="list-header-actions">{actions}</div>
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
