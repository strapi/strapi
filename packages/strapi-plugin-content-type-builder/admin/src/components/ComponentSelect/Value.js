import React from 'react';
import PropTypes from 'prop-types';
import { components } from 'react-select';
import { get, size } from 'lodash';
import { FormattedMessage } from 'react-intl';
import useDataManager from '../../hooks/useDataManager';
import getTrad from '../../utils/getTrad';
import UpperFirst from '../UpperFirst';

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
    selectProps: {
      componentCategory,
      componentName,
      isCreatingComponent,
      isMultiple,
    },
  } = props;

  const displayedCategory = isCreatingComponent ? componentCategory : category;
  const displayedName = isCreatingComponent ? componentName : name;
  const style = { color: '#333740' };
  const valueLength = size(value);
  const message =
    valueLength > '0'
      ? getTrad('components.componentSelect.value-components')
      : getTrad('components.componentSelect.value-component');

  return (
    <SingleValue {...props}>
      {!!value && !isMultiple && (
        <>
          <span style={{ fontWeight: 700, ...style }}>
            <UpperFirst content={displayedCategory} />
          </span>
          <span style={style}>&nbsp;—&nbsp;</span>
          <span style={style}>{displayedName}</span>
        </>
      )}
      {isMultiple && (
        <FormattedMessage id={message} values={{ number: valueLength }}>
          {msg => <span style={style}>{msg}</span>}
        </FormattedMessage>
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
    isMultiple: false,
  },
};

Value.propTypes = {
  children: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.arrayOf(PropTypes.string),
  ]),
  selectProps: PropTypes.shape({
    componentCategory: PropTypes.string,
    componentName: PropTypes.string,
    isCreatingComponent: PropTypes.bool,
    isMultiple: PropTypes.bool,
  }),
};

export default Value;
