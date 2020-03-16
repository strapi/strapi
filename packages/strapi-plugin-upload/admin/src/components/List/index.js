import React from 'react';
import PropTypes from 'prop-types';
import { Checkbox } from '@buffetjs/core';

import { createMatrix } from '../../utils';

import Card from '../Card';
import CardControlsWrapper from '../CardControlsWrapper';
import Wrapper from './Wrapper';

const List = ({ data, onChange, selectedItems }) => {
  const matrix = createMatrix(data);

  return (
    <Wrapper>
      {matrix.map(({ key, rowContent }) => {
        return (
          <div className="row" key={key}>
            {rowContent.map(item => {
              const { id, url } = item;
              const checked = selectedItems.includes(`${id}`);

              return (
                <div className="col-xs-12 col-md-6 col-xl-3" key={JSON.stringify(item)}>
                  <Card small checked={checked} {...item} url={`${strapi.backendURL}${url}`}>
                    <CardControlsWrapper leftAlign className="card-control-wrapper">
                      <Checkbox name={`${id}`} onChange={onChange} value={checked} />
                    </CardControlsWrapper>
                  </Card>
                </div>
              );
            })}
          </div>
        );
      })}
    </Wrapper>
  );
};

List.defaultProps = {
  data: [],
  onChange: () => {},
  selectedItems: [],
};

List.propTypes = {
  data: PropTypes.array,
  onChange: PropTypes.func,
  selectedItems: PropTypes.array,
};

export default List;
