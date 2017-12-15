/**
*
* AttributeRow
*
*/

import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { capitalize } from 'lodash';

import PopUpWarning from 'components/PopUpWarning';
import IcoContainer from 'components/IcoContainer';

import IcoBoolean from '../../assets/images/icon_boolean.png';
import IcoDate from '../../assets/images/icon_date.png';
import IcoImage from '../../assets/images/icon_image.png';
import IcoNumber from '../../assets/images/icon_number.png';
import IcoJson from '../../assets/images/icon_json.png';
import IcoRelation from '../../assets/images/icon_relation.png';
import IcoString from '../../assets/images/icon_string.png';
import IcoText from '../../assets/images/icon_text.png';
import styles from './styles.scss';

/* eslint-disable jsx-a11y/no-static-element-interactions */
class AttributeRow extends React.Component { // eslint-disable-line react/prefer-stateless-function
  constructor(props) {
    super(props);
    this.asset = {
      'boolean': IcoBoolean,
      'date': IcoDate,
      'media': IcoImage,
      'number': IcoNumber,
      'json': IcoJson,
      'relation': IcoRelation,
      'string': IcoString,
      'text': IcoText,
      'integer': IcoNumber,
      'float': IcoNumber,
      'decimal': IcoNumber,
      // TODO
      'email': IcoString,
      'password': IcoString,
    };
    this.state = {
      showWarning: false,
    };
  }

  handleEdit = () => this.props.onEditAttribute(this.props.row.name);

  handleDelete = () => {
    this.props.onDelete(this.props.row.name);
    this.setState({ showWarning: false });
  }

  handleShowModalWarning = () => this.setState({ showWarning: !this.state.showWarning });

  toggleModalWarning = () => this.setState({ showWarning: !this.state.showWarning });

  renderAttributesBox = () => {
    const attributeType = this.props.row.params.type || 'relation';
    const src = this.asset[attributeType];
    return <img src={src} alt="ico" />;
  }

  render() {
    const relationType = this.props.row.params.type ?
      <FormattedMessage id={`content-type-builder.attribute.${this.props.row.params.type}`} />
      : (
        <div>
          <FormattedMessage id="content-type-builder.modelPage.attribute.relationWith" />
          &nbsp;
          <span style={{ fontStyle: 'italic' }}>
            {capitalize(this.props.row.params.target)}&nbsp;
            {this.props.row.params.pluginValue ? (
              `(Plugin: ${this.props.row.params.pluginValue})`
            ) : ''}
          </span>
        </div>
      );

    const relationStyle = !this.props.row.params.type ? styles.relation : '';
    const icons = [{ icoType: 'pencil', onClick: this.handleEdit }, { icoType: 'trash', onClick: () => this.setState({ showWarning: !this.state.showWarning }) }];

    return (
      <li className={`${styles.attributeRow} ${relationStyle}`} onClick={this.handleEdit}>
        <div className={styles.flex}>
          <div className={styles.nameContainer}>
            {this.renderAttributesBox()}
            <div>{this.props.row.name}</div>
          </div>
          <div className={styles.relationContainer}>{relationType}</div>
          <div className={styles.mainField}></div>
          <IcoContainer icons={icons} />
        </div>
        <PopUpWarning
          isOpen={this.state.showWarning}
          toggleModal={this.toggleModalWarning}
          content={{ message: 'content-type-builder.popUpWarning.bodyMessage.attribute.delete' }}
          popUpWarningType={'danger'}
          onConfirm={this.handleDelete}
        />
      </li>
    );
  }
}

AttributeRow.propTypes = {
  onDelete: PropTypes.func.isRequired,
  onEditAttribute: PropTypes.func.isRequired,
  row: PropTypes.object.isRequired,
};

export default AttributeRow;
