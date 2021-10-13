import React from 'react';
import PropTypes from 'prop-types';
import { Checkbox } from '@buffetjs/core';
import { get, pick } from 'lodash';
import { prefixFileUrlWithBackendUrl } from 'strapi-helper-plugin';
import { getTrad, getType } from '../../utils';
import Card from '../Card';
import CardControlsWrapper from '../CardControlsWrapper';
import ListWrapper from '../ListWrapper';
import IntlText from '../IntlText';
import ListCell from './ListCell';
import ListRow from './ListRow';

const List = ({
  allowedTypes,
  data,
  onChange,
  onCardClick,
  selectedItems,
  smallCards,
  canSelect,
  renderCardControl,
  showCheckbox,
}) => {
  const selectedAssets = selectedItems.length;

  const handleCheckboxClick = e => {
    e.stopPropagation();
  };

  return (
    <ListWrapper>
      {!smallCards && selectedAssets > 0 && (
        <IntlText
          id={getTrad(`list.assets.selected.${selectedAssets > 1 ? 'plural' : 'singular'}`)}
          values={{ number: selectedAssets }}
          lineHeight="18px"
        />
      )}
      <ListRow>
        {data.map(item => {
          const { id } = item;
          const thumbnail = get(item, ['formats', 'small'], item);
          const isAllowed =
            allowedTypes.length > 0 ? allowedTypes.includes(getType(item.mime)) : true;
          const checked = selectedItems.findIndex(file => file.id === id) !== -1;

          const fileUrl = prefixFileUrlWithBackendUrl(thumbnail.url);

          const cardOptions = {
            ...pick(item, ['ext', 'name', 'mime', 'height', 'width', 'size', 'previewUrl', 'id']),
            isDisabled: !isAllowed,
            checked,
            url: fileUrl,
            onClick: onCardClick,
            small: smallCards,
          };

          return (
            <ListCell key={id}>
              <Card options={cardOptions}>
                {(checked || canSelect) && (
                  <>
                    {(checked || isAllowed) && showCheckbox && (
                      <CardControlsWrapper leftAlign className="card-control-wrapper">
                        <Checkbox
                          name={`${id}`}
                          onChange={onChange}
                          onClick={handleCheckboxClick}
                          value={checked}
                        />
                      </CardControlsWrapper>
                    )}
                    {renderCardControl && (
                      <CardControlsWrapper className="card-control-wrapper card-control-wrapper-hidden">
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
  allowedTypes: [],
  canSelect: true,
  data: [],
  onChange: () => {},
  onCardClick: () => {},
  renderCardControl: null,
  selectedItems: [],
  smallCards: false,
  showCheckbox: true,
};

List.propTypes = {
  allowedTypes: PropTypes.array,
  canSelect: PropTypes.bool,
  data: PropTypes.array,
  onChange: PropTypes.func,
  onCardClick: PropTypes.func,
  renderCardControl: PropTypes.func,
  selectedItems: PropTypes.array,
  smallCards: PropTypes.bool,
  showCheckbox: PropTypes.bool,
};

export default List;
