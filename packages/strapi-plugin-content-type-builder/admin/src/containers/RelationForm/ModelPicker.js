import React from 'react';
import PropTypes from 'prop-types';

import { Dropdown, DropdownToggle, DropdownMenu, DropdownItem } from 'reactstrap';

import styles from './styles.scss';

class ModelPicker extends React.Component {
  state = { isOpen: false };

  /* istanbul ignore next */
  toggle = () => this.setState(prevState => ({ isOpen: !prevState.isOpen }));

  render() {
    const { models, onClick, plugin, selectedModel } = this.props;
    const { isOpen } = this.state;

    return (
      <div className={styles.dropDown}>
        <Dropdown isOpen={isOpen} toggle={this.toggle} style={{ backgroundColor: 'transparent' }}>
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
  }
}

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
