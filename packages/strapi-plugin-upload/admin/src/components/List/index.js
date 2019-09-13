/**
 *
 * List
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';

import Li from '../Li';
import ListHeader from '../ListHeader';
import EmptyLi from './EmptyLi';
import Wrapper from './Wrapper';

function List(props) {
  return (
    <Wrapper className="container-fluid">
      <div className="row">
        <ul className="list">
          <ListHeader changeSort={props.changeSort} sort={props.sort} />
          {props.data.map((item, key) => (
            <Li key={item.hash || key} item={item} />
          ))}
          {props.data.length === 0 && (
            <EmptyLi>
              <div>
                <FormattedMessage id="upload.EmptyLi.message" />
              </div>
            </EmptyLi>
          )}
        </ul>
      </div>
    </Wrapper>
  );
}

List.defaultProps = {
  sort: 'id',
};

List.propTypes = {
  changeSort: PropTypes.func.isRequired,
  data: PropTypes.arrayOf(PropTypes.object).isRequired,
  sort: PropTypes.string,
};

export default List;
