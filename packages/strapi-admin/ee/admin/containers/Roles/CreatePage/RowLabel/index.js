import React, { memo } from 'react';
import PropTypes from 'prop-types';
import { Checkbox, Text } from '@buffetjs/core';
import CollapseLabel from '../CollapseLabel';
import Wrapper from './Wrapper';

const RowLabel = ({ isCollapsable, label, children, onClick, textColor, width }) => {
  return (
    <Wrapper width={width}>
      <Checkbox name="todo" value={false} />
      <CollapseLabel
        title={label}
        alignItems="center"
        isCollapsable={isCollapsable}
        onClick={onClick}
      >
        <Text
          color={textColor}
          ellipsis
          fontSize="xs"
          fontWeight="bold"
          lineHeight="20px"
          textTransform="uppercase"
        >
          {label}
        </Text>
        {children}
      </CollapseLabel>
    </Wrapper>
  );
};

RowLabel.defaultProps = {
  children: null,
  isCollapsable: false,
  textColor: 'grey',
  width: '18rem',
};

RowLabel.propTypes = {
  children: PropTypes.node,
  isCollapsable: PropTypes.bool,
  label: PropTypes.string.isRequired,
  onClick: PropTypes.func.isRequired,
  textColor: PropTypes.string,
  width: PropTypes.string,
};

export default memo(RowLabel);
