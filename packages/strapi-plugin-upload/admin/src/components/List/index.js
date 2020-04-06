import React from 'react';
import PropTypes from 'prop-types';
import { Checkbox } from '@buffetjs/core';
import { get } from 'lodash';
import { prefixFileUrlWithBackendUrl } from 'strapi-helper-plugin';
import { getTrad } from '../../utils';
import Card from '../Card';
import CardControlsWrapper from '../CardControlsWrapper';
import ListWrapper from '../ListWrapper';
import IntlText from '../IntlText';
import ListCell from './ListCell';
import ListRow from './ListRow';

const List = ({
  clickable,
  data,
  onChange,
  onCardClick,
  selectedItems,
  smallCards,
  canSelect,
  renderCardControl,
}) => {
  const selectedAssets = selectedItems.length;

  const handleClick = e => {
    e.stopPropagation();
  };

  return (
    <ListWrapper>
      {selectedAssets > 0 && (
        <IntlText
          id={getTrad(`list.assets.selected.${selectedAssets > 1 ? 'plural' : 'singular'}`)}
          values={{ number: selectedAssets }}
          lineHeight="18px"
        />
      )}
      <ListRow>
        {data.map(item => {
          const { id } = item;
          const url = get(item, ['formats', 'thumbnail', 'url'], item.url);
          const checked = selectedItems.findIndex(file => file.id === id) !== -1;
          const fileUrl = prefixFileUrlWithBackendUrl(url);

          return (
            <ListCell key={id}>
              <Card
                checked={checked}
                {...item}
                hasIcon={clickable}
                url={fileUrl}
                onClick={onCardClick}
                small={smallCards}
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
      </ListRow>
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
  smallCards: false,
};

List.propTypes = {
  clickable: PropTypes.bool,
  canSelect: PropTypes.bool,
  data: PropTypes.array,
  onChange: PropTypes.func,
  onCardClick: PropTypes.func,
  renderCardControl: PropTypes.func,
  selectedItems: PropTypes.array,
  smallCards: PropTypes.bool,
};

export default List;
