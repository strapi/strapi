import React, { memo } from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import pluginId from '../../../pluginId';
import Card from './Card';
import Wrapper from './Wrapper';

const Picker = ({ components, isOpen, onClickAddComponent }) => {
  return (
    <Wrapper isOpen={isOpen}>
      <div>
        <p className="componentPickerTitle">
          <FormattedMessage id={`${pluginId}.components.DynamicZone.pick-compo`} />
        </p>
        <div className="componentsList">
          {components.map(componentUid => {
            return (
              <Card key={componentUid} componentUid={componentUid} onClick={onClickAddComponent} />
            );
          })}
        </div>
      </div>
    </Wrapper>
  );
};

Picker.propTypes = {
  components: PropTypes.array.isRequired,
  isOpen: PropTypes.bool.isRequired,
  onClickAddComponent: PropTypes.func.isRequired,
};

export default memo(Picker);
