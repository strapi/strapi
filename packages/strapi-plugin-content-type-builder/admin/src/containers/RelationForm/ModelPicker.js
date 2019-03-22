import React, { useState } from 'react';
import PropTypes from 'prop-types';

import { Dropdown, DropdownToggle, DropdownMenu, DropdownItem } from 'reactstrap';

import styles from './styles.scss';

const ModelPicker = ({ models, onClick, plugin, selectedModel }) => {
  const [isOpen, toggleIsOpen] = useState(false);
  /* istanbul ignore next */
  const handleToggle = () => toggleIsOpen(!isOpen);

  return (
    <div className={styles.dropDown}>
      <Dropdown isOpen={isOpen} toggle={handleToggle} style={{ backgroundColor: 'transparent' }}>
        <DropdownToggle caret>
          <p>
            <i className="fa fa-caret-square-o-right" />
            {selectedModel}
            {!!plugin && <span style={{ fontStyle: 'italic', fontWeight: '500' }}>&nbsp;({plugin})</span>}
          </p>
        </DropdownToggle>
        <DropdownMenu>
          {models.map(model => {
            return (
              <DropdownItem key={model.name} onClick={() => onClick(model)} className={styles.dropdownItem}>
                <p>
                  <i className="fa fa-caret-square-o-right" />
                  {model.name}
                  {!!model.source && <span style={{ fontStyle: 'italic' }}>&nbsp;({model.source})</span>}
                </p>
              </DropdownItem>
            );
          })}
        </DropdownMenu>
      </Dropdown>
    </div>
  );
};

ModelPicker.defaultProps = {
  models: [],
  onClick: () => {},
  plugin: null,
  selectedModel: '',
};

ModelPicker.propTypes = {
  models: PropTypes.array,
  onClick: PropTypes.func,
  plugin: PropTypes.string,
  selectedModel: PropTypes.string,
};

export default ModelPicker;
