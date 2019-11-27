import React from 'react';
import PropTypes from 'prop-types';
import { components } from 'react-select';
import { get, upperFirst } from 'lodash';
import useDataManager from '../../hooks/useDataManager';

const Value = ({ children, ...props }) => {
  const SingleValue = components.SingleValue;
  const { components: appComponents } = useDataManager();
  const value = children;
  const selectedComponent = get(appComponents, value, {
    category: '',
    schema: { name: '' },
  });
  const {
    category,
    schema: { name },
  } = selectedComponent;

  const style = { color: '#333740' };

  return (
    <SingleValue {...props}>
      {!!value && (
        <>
          <span style={{ fontWeight: 700, ...style }}>
            {upperFirst(category)}
          </span>
          <span style={style}>&nbsp;—&nbsp;</span>
          <span style={style}>{name}</span>
        </>
      )}
    </SingleValue>
  );
};

Value.defaultProps = {
  children: null,
};

Value.propTypes = {
  children: PropTypes.string,
};

export default Value;
