import React from 'react';
import PropTypes from 'prop-types';
import { Checkbox } from '@buffetjs/core';
import { get } from 'lodash';
import Card from '../Card';
import CardControlsWrapper from '../CardControlsWrapper';
import ListWrapper from '../ListWrapper';
import ListCell from './ListCell';

const List = ({
  clickable,
  data,
  onChange,
  onCardClick,
  selectedItems,
  canSelect,
  renderCardControl,
}) => {
  const handleClick = e => {
    e.stopPropagation();
  };

  return (
    <ListWrapper>
      <div className="row">
        {data.map(item => {
          const { id } = item;
          const url = get(item, ['formats', 'thumbnail', 'url'], item.url);
          const checked = selectedItems.findIndex(file => file.id === id) !== -1;
          const fileUrl = url.startsWith('/') ? `${strapi.backendURL}${url}` : url;

          return (
            <ListCell key={id}>
              <Card
                checked={checked}
                {...item}
                hasIcon={clickable}
                url={fileUrl}
                onClick={onCardClick}
              >
                {(checked || canSelect) && (
                  <>
                    <CardControlsWrapper leftAlign className="card-control-wrapper">
                      <Checkbox
                        name={`${id}`}
                        onChange={onChange}
                        onClick={handleClick}
                        value={checked}
                      />
                    </CardControlsWrapper>
                    {renderCardControl && (
                      <CardControlsWrapper className="card-control-wrapper">
                        {renderCardControl(id)}
                      </CardControlsWrapper>
                    )}
                  </>
                )}
              </Card>
            </ListCell>
          );
        })}
      </div>
    </ListWrapper>
  );
};

List.defaultProps = {
  clickable: false,
  canSelect: true,
  data: [],
  onChange: () => {},
  onCardClick: () => {},
  renderCardControl: null,
  selectedItems: [],
};

List.propTypes = {
  clickable: PropTypes.bool,
  canSelect: PropTypes.bool,
  data: PropTypes.array,
  onChange: PropTypes.func,
  onCardClick: PropTypes.func,
  renderCardControl: PropTypes.func,
  selectedItems: PropTypes.array,
};

export default List;
