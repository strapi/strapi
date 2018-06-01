/**
 *
 * Filter
 */


import React from 'react';
import moment from 'moment';
import { FormattedMessage } from 'react-intl';
import PropTypes from 'prop-types';
import { get, toString, upperFirst } from 'lodash';
import Flex from './Flex';
import Remove from './Remove';
import Separator from './Separator';


function Filter({ filter, index, onClick, onClickOpen, schema }) {
  let value = filter.value;

  if (get(schema, [filter.attr, 'type']) === 'date') {
    const date = moment(filter.value.slice(0, -1), moment.ISO_8601);
    const format = date.valueOf() === date.startOf('day').valueOf() ?
      'MMMM Do YYYY' :'MMMM Do YYYY, h:mm:ss a' ;
    value = date.format(format);
  }

  return (
    <Flex
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClickOpen(index);
      }}
    >
      <span>{upperFirst(filter.attr)}&nbsp;</span>
      <FormattedMessage id={`content-manager.components.FilterOptions.FILTER_TYPES.${filter.filter}`} />
      <span>&nbsp;{toString(value)}</span>
      <Separator />
      <Remove
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onClick(index);
        }}
      />
    </Flex>
  );
}

Filter.defaultProps = {
  filter: {},
  index: 0,
  onClick: () => {},
  onClickOpen: (e) => {
    e.preventDefault();
    e.stopPropagation();
  },
  schema: {},
};

Filter.propTypes = {
  filter: PropTypes.object,
  index: PropTypes.number,
  onClick: PropTypes.func,
  onClickOpen: PropTypes.func,
  schema: PropTypes.object,
};

export default Filter;
