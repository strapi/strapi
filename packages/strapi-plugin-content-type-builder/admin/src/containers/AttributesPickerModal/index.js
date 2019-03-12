/**
 *
 * AttributesPickerModal
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
// import { connect } from 'react-redux';
// import { bindActionCreators, compose } from 'redux';
import pluginId from '../../pluginId';

import AttributeOption from '../../components/AttributeOption';
import BodyModal from '../../components/BodyModal';
import FooterModal from '../../components/FooterModal';
import HeaderModal from '../../components/HeaderModal';
import HeaderModalTitle from '../../components/HeaderModalTitle';
import WrapperModal from '../../components/WrapperModal';

import attributes from './attributes.json';

class AttributesPickerModal extends React.Component { // eslint-disable-line react/prefer-stateless-function
  state = { isDisplayed: false, nodeToFocus: 0 };

  componentDidMount() {
    const { isOpen } = this.props;

    if (isOpen) {
      document.addEventListener('keydown', this.handleKeyDown);
    }
  }

  componentDidUpdate(prevProps) {
    const { isOpen } = this.props;

    if (prevProps.isOpen !== isOpen) {
      this.updateNodeToFocus(0);

      if (isOpen) {
        document.addEventListener('keydown', this.handleKeyDown);
      } else {
        document.removeEventListener('keydown', this.handleKeyDown);
      }
    }
  }

  getAttributes = () => {
    const { plugins } = this.context;
    const appPlugins = plugins.toJS ? plugins.toJS() : plugins;

    return attributes.filter(attr => {
      if (appPlugins.hasOwnProperty('upload')) {
        return true;
      }

      return attr.type !== 'media';
    });
  }

  handleKeyDown = (e ) => {
    const { nodeToFocus } = this.state;
    const attributesLength = this.getAttributes().length;
    let next = 0;

    // Disable the tab behavior
    if (e.keyCode === 9) {
      e.preventDefault();
    }

    switch (e.keyCode) {
      case 9: // Tab
      case 39: // Right Arrow
        next = attributesLength - 1 === nodeToFocus ? 0 : nodeToFocus + 1;
        break;
      case 37: // Left Arrow
        next = nodeToFocus === 0 ? attributesLength - 1 : nodeToFocus - 1;
        break;
      default:
        next = 0;
    }

    this.updateNodeToFocus(next);
  }

  handleOnClosed = () => this.setState(prevState => ({ isDisplayed: !prevState.isDisplayed }));

  handleOnOpened = () => this.setState(prevState => ({ isDisplayed: !prevState.isDisplayed }));

  handleToggle = () => {
    const { push } = this.props;

    push({ search: '' });
  }


  updateNodeToFocus = position => this.setState({ nodeToFocus: position });

  renderAttribute = (attribute, index) => {
    const { isDisplayed, nodeToFocus } = this.state;

    return (
      <AttributeOption
        autoFocus={nodeToFocus === index}
        key={attribute.type}
        tabIndex={index}
        isDisplayed={isDisplayed}
        nodeToFocus={nodeToFocus}
        {...attribute}
      />
    );
  }

  render() {
    const { isOpen } = this.props;

    return (
      <WrapperModal
        isOpen={isOpen}
        onToggle={this.handleToggle}
        onClosed={this.handleOnClosed}
        onOpened={this.handleOnOpened}
      >
        <HeaderModal>
          <HeaderModalTitle
            title={`${pluginId}.popUpForm.choose.attributes.header.title`}
          />
        </HeaderModal>
        <BodyModal style={{ paddingTop: '2.3rem' }}>
          {attributes.map(this.renderAttribute)}
        </BodyModal>
        <FooterModal />
      </WrapperModal>
    );
  }
}

AttributesPickerModal.contextTypes = {
  plugins: PropTypes.object,
};

AttributesPickerModal.defaultProps = {
  isOpen: false,
};

AttributesPickerModal.propTypes = {
  isOpen: PropTypes.bool,
  push: PropTypes.func.isRequired,
};

export default AttributesPickerModal;
