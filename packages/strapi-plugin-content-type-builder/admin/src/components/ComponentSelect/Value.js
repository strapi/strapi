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
  const {
    selectProps: { componentCategory, componentName, isCreatingComponent },
  } = props;
  console.log({ props });
  const displayedCategory = isCreatingComponent ? componentCategory : category;
  const displayedName = isCreatingComponent ? componentName : name;
  const style = { color: '#333740' };

  return (
    <SingleValue {...props}>
      {!!value && (
        <>
          <span style={{ fontWeight: 700, ...style }}>
            {upperFirst(displayedCategory)}
          </span>
          <span style={style}>&nbsp;—&nbsp;</span>
          <span style={style}>{displayedName}</span>
        </>
      )}
    </SingleValue>
  );
};

Value.defaultProps = {
  children: null,
  selectProps: {
    componentCategory: null,
    componentName: null,
    isCreatingComponent: false,
  },
};

Value.propTypes = {
  children: PropTypes.string,
  selectProps: PropTypes.shape({
    componentCategory: PropTypes.string,
    componentName: PropTypes.string,
    isCreatingComponent: PropTypes.bool,
  }),
};

export default Value;
