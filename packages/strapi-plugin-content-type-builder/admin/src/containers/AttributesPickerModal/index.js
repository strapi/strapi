/**
 *
 * AttributesPickerModal
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { has } from 'lodash';
import { FormattedMessage } from 'react-intl';
import {
  GlobalContext,
  HeaderModal,
  HeaderModalTitle,
  Modal,
  ModalBody,
  ModalFooter,
} from 'strapi-helper-plugin';
import pluginId from '../../pluginId';

import AttributeOption from '../../components/AttributeOption';

import Icon from '../../assets/icons/icon_type_ct.png';
import IconGroup from '../../assets/icons/icon_type_groups.png';

import attributes from './attributes.json';

class AttributesPickerModal extends React.Component {
  // eslint-disable-line react/prefer-stateless-function
  static contextType = GlobalContext;

  state = { isDisplayed: false, nodeToFocus: 0 };

  componentDidMount() {
    const { isOpen } = this.props;

    if (isOpen) {
      this.addEventListener();
    }
  }

  componentDidUpdate(prevProps) {
    const { isOpen } = this.props;

    if (prevProps.isOpen !== isOpen) {
      this.updateNodeToFocus(0);

      if (isOpen) {
        this.addEventListener();
      } else {
        this.removeEventListener();
      }
    }
  }

  getAttributes = () => {
    const { plugins } = this.context;
    const appPlugins = plugins;

    return attributes.filter(attr => {
      if (has(appPlugins, 'upload')) {
        return true;
      }

      return attr.type !== 'media';
    });
  };

  getIcon = () => {
    const { featureType } = this.props;

    return featureType === 'model' ? Icon : IconGroup;
  };

  addEventListener = () => {
    document.addEventListener('keydown', this.handleKeyDown);
  };

  removeEventListener = () => {
    document.removeEventListener('keydown', this.handleKeyDown);
  };

  handleClick = type => {
    const { emitEvent } = this.context;
    const { push } = this.props;

    emitEvent('didSelectContentTypeFieldType', { type });
    push({
      search: `modalType=attributeForm&attributeType=${type}&settingType=base&actionType=create`,
    });
  };

  /* istanbul ignore next */
  handleKeyDown = e => {
    const { push } = this.props;

    /* istanbul ignore next */
    const { nodeToFocus } = this.state;
    /* istanbul ignore next */
    const attributesLength = this.getAttributes().length;
    /* istanbul ignore next */
    let next = 0;

    // Disable the tab behavior
    /* istanbul ignore next */
    if (e.keyCode === 9) {
      e.preventDefault();
    }

    /* istanbul ignore next */
    switch (e.keyCode) {
      case 9: // Tab
      case 39: // Right Arrow
        next = attributesLength - 1 === nodeToFocus ? 0 : nodeToFocus + 1;
        break;
      case 37: // Left Arrow
        next = nodeToFocus === 0 ? attributesLength - 1 : nodeToFocus - 1;
        break;
      case 13: // Enter
        e.preventDefault();

        push({
          search: `modalType=attributeForm&attributeType=${attributes[nodeToFocus].type}&settingType=base&actionType=create`,
        });
        break;
      default:
        next = 0;
    }

    /* istanbul ignore next */
    this.updateNodeToFocus(next);
  };

  handleOnClosed = () =>
    this.setState(prevState => ({ isDisplayed: !prevState.isDisplayed }));

  handleOnOpened = () =>
    this.setState(prevState => ({ isDisplayed: !prevState.isDisplayed }));

  handleToggle = () => {
    const { push } = this.props;

    push({ search: '' });
  };

  updateNodeToFocus = position => this.setState({ nodeToFocus: position });

  renderAttribute = (attribute, index) => {
    const { featureType } = this.props;
    const { isDisplayed, nodeToFocus } = this.state;

    if (attribute.type === featureType) {
      return null;
    }
    return (
      <AttributeOption
        autoFocus={nodeToFocus === index}
        key={attribute.type}
        tabIndex={index}
        isDisplayed={isDisplayed}
        nodeToFocus={nodeToFocus}
        onClick={this.handleClick}
        {...attribute}
      />
    );
  };

  render() {
    const { featureName, featureType, isOpen } = this.props;

    return (
      <Modal
        isOpen={isOpen}
        onToggle={this.handleToggle}
        onClosed={this.handleOnClosed}
        onOpened={this.handleOnOpened}
      >
        <HeaderModal>
          <section>
            <HeaderModalTitle>
              <img src={this.getIcon()} alt="feature" />
              <span>&nbsp;{featureName}</span>
            </HeaderModalTitle>
          </section>
          <section>
            <HeaderModalTitle>
              <FormattedMessage
                id={`${pluginId}.popUpForm.choose.attributes.header.subtitle.${featureType}`}
              />
            </HeaderModalTitle>
          </section>
        </HeaderModal>
        <ModalBody style={{ paddingTop: '0.5rem', paddingBottom: '3rem' }}>
          {attributes.map(this.renderAttribute)}
        </ModalBody>
        <ModalFooter />
      </Modal>
    );
  }
}

AttributesPickerModal.defaultProps = {
  isOpen: false,
  featureName: null,
  featureType: 'model',
};

AttributesPickerModal.propTypes = {
  featureName: PropTypes.string,
  featureType: PropTypes.string,
  isOpen: PropTypes.bool,
  push: PropTypes.func.isRequired,
};

export default AttributesPickerModal;
