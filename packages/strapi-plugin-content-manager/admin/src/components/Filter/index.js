/**
 *
 * Filter
 */


import React from 'react';
import moment from 'moment';
import { FormattedMessage } from 'react-intl';
import PropTypes from 'prop-types';
import { isObject, toString, upperFirst } from 'lodash';
import Flex from './Flex';
import Remove from './Remove';
import Separator from './Separator';


function Filter({ filter, index, onClick }) {
  const value = isObject(filter.value) && filter.value._isAMomentObject === true ?
    moment(filter.value, 'YYYY-MM-DD HH:mm:ss').format('YYYY-MM-DD') : filter.value;

  return (
    <Flex>
      <span>{upperFirst(filter.attr)}&nbsp;</span>
      <FormattedMessage id={`content-manager.components.FilterOptions.FILTER_TYPES.${filter.filter}`} />
      <span>&nbsp;{toString(value)}</span>
      <Separator />
      <Remove onClick={() => onClick(index)} />
    </Flex>
  );
}

Filter.defaultProps = {
  filter: {},
  index: 0,
  onClick: () => {},
};

Filter.propTypes = {
  filter: PropTypes.object,
  index: PropTypes.number,
  onClick: PropTypes.func,
};

export default Filter;
