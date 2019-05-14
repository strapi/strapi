/**
 *
 * AttributeOption
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';

import pluginId from '../../pluginId';

import assets from '../AttributeLi/assets';
import styles from './styles.scss';

class AttributeOption extends React.Component {
  componentDidUpdate(prevProps) {
    const { isDisplayed, nodeToFocus, tabIndex } = this.props;

    if (
      prevProps.isDisplayed !== isDisplayed &&
      isDisplayed &&
      nodeToFocus === tabIndex
    ) {
      this.focusNode();
    }

    if (prevProps.nodeToFocus !== nodeToFocus && nodeToFocus === tabIndex) {
      this.focusNode();
    }
  }

  button = React.createRef();

  focusNode = () => {
    const { current } = this.button;

    current.focus();
  };

  render() {
    const { description, onClick, tabIndex, type } = this.props;

    return (
      <div className="col-md-6">
        <button
          className={styles.attributeOption}
          id={`attrCard${type}`}
          onClick={() => onClick(type)}
          type="button"
          tabIndex={tabIndex + 1}
          ref={this.button}
        >
          <div className={styles.card}>
            <img src={assets[type]} alt="ico" />
            <FormattedMessage
              id={`${pluginId}.popUpForm.attributes.${type}.name`}
            >
              {message => (
                <span className={styles.attributeType}>{message}</span>
              )}
            </FormattedMessage>
            <FormattedMessage id={description} />
          </div>
        </button>
      </div>
    );
  }
}

AttributeOption.defaultProps = {
  description: 'app.utils.defaultMessage',
  isDisplayed: false,
  nodeToFocus: -1,
  onClick: () => {},
  tabIndex: 0,
  type: 'string',
};

AttributeOption.propTypes = {
  description: PropTypes.string,
  isDisplayed: PropTypes.bool,
  nodeToFocus: PropTypes.number,
  onClick: PropTypes.func,
  tabIndex: PropTypes.number,
  type: PropTypes.string,
};

export default AttributeOption;
