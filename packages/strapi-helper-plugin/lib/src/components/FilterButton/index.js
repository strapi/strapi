import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { upperFirst } from 'lodash';

import Wrapper from './Wrapper';
import RemoveButton from './RemoveButton';

import Close from '../../svgs/Close';

function Filter({ label, onClick }) {
  const { name, filter, value } = label;
  return (
    <Wrapper>
      <span>{upperFirst(name)}&nbsp;</span>
      <FormattedMessage
        id={`components.FilterOptions.FILTER_TYPES.${filter}`}
      />
      <span>&nbsp;{value}</span>
      <RemoveButton type="button" onClick={() => onDelete(index)}>
        <Close onClick={onClick} width="11px" height="11px" fill="#007eff" />
      </RemoveButton>
    </Wrapper>
  );
}

Filter.defaultProps = {
  children: null,
  onClick: () => {},
};

Filter.propTypes = {
  children: PropTypes.node,
  label: PropTypes.shape({
    name: PropTypes.string,
    filter: PropTypes.string,
    value: PropTypes.string,
  }),
  onClick: PropTypes.func,
};

export default Filter;
