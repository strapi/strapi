import React from 'react';
import PropTypes from 'prop-types';
import { Checkbox } from '@buffetjs/core';
import { get } from 'lodash';
import { createMatrix } from '../../utils';
import Card from '../Card';
import CardControlsWrapper from '../CardControlsWrapper';
import ListWrapper from '../ListWrapper';

const List = ({ clickable, data, onChange, onClickEditFile, selectedItems, canSelect }) => {
  const matrix = createMatrix(data);

  const handleClick = e => {
    e.stopPropagation();
  };

  return (
    <ListWrapper>
      {matrix.map(({ key, rowContent }) => {
        return (
          <div className="row" key={key}>
            {rowContent.map(item => {
              const { id } = item;
              const url = get(item, ['formats', 'thumbnail', 'url'], '');

              const checked = selectedItems.findIndex(file => file.id === id) !== -1;
              const fileUrl = url.startsWith('/') ? `${strapi.backendURL}${url}` : url;

              return (
                <div className="col-xs-12 col-md-6 col-xl-3" key={id}>
                  <Card
                    checked={checked}
                    {...item}
                    hasIcon={clickable}
                    url={fileUrl}
                    onClick={onClickEditFile}
                  >
                    {(checked || canSelect) && (
                      <CardControlsWrapper leftAlign className="card-control-wrapper">
                        <Checkbox
                          name={`${id}`}
                          onChange={onChange}
                          onClick={handleClick}
                          value={checked}
                        />
                      </CardControlsWrapper>
                    )}
                  </Card>
                </div>
              );
            })}
          </div>
        );
      })}
    </ListWrapper>
  );
};

List.defaultProps = {
  clickable: false,
  canSelect: true,
  data: [],
  onChange: () => {},
  onClickEditFile: () => {},
  selectedItems: [],
};

List.propTypes = {
  clickable: PropTypes.bool,
  canSelect: PropTypes.bool,
  data: PropTypes.array,
  onChange: PropTypes.func,
  onClickEditFile: PropTypes.func,
  selectedItems: PropTypes.array,
};

export default List;
