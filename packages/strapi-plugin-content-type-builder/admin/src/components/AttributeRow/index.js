/**
*
* AttributeRow
*
*/

import React from 'react';
import { FormattedMessage } from 'react-intl';
import { capitalize } from 'lodash';
import PopUpWarning from 'components/PopUpWarning';
import IcoBoolean from '../../assets/images/icon_boolean.svg';
import IcoDate from '../../assets/images/icon_date.svg';
import IcoImage from '../../assets/images/icon_image.svg';
import IcoJson from '../../assets/images/icon_json.svg';
import IcoRelation from '../../assets/images/icon_relation.svg';
import IcoString from '../../assets/images/icon_string.svg';
import IcoText from '../../assets/images/icon_text.svg';
import styles from './styles.scss';

/* eslint-disable jsx-a11y/no-static-element-interactions */
class AttributeRow extends React.Component { // eslint-disable-line react/prefer-stateless-function
  constructor(props) {
    super(props);
    this.asset = {
      'boolean': IcoBoolean,
      'date': IcoDate,
      'image': IcoImage,
      'json': IcoJson,
      'relation': IcoRelation,
      'string': IcoString,
      'text': IcoText,
    };
    this.state = {
      showWarning: false,
    };
  }

  edit = () => {
    this.props.handleEdit(this.props.row.name);
  }

  delete = () => {
    this.props.handleDelete(this.props.row.name);
    this.setState({ showWarning: false });
  }

  toggleModalWarning = () => {
    // e.preventDefault();
    // e.stopPropagation()
    this.setState({ showWarning: !this.state.showWarning });
  }

  renderAttributesBox = () => {
    const attributeType = this.props.row.params.type || 'relation';
    const src = this.asset[attributeType];
    return <img src={src} role="presentation" />;
  }

  render() {
    const relationType = capitalize(this.props.row.params.type)
    || <div><FormattedMessage id="modelPage.attribute.relationWith" /> <span style={{ fontStyle: 'italic' }}>{capitalize(this.props.row.params.model)}</span></div>;

    return (
      <li className={styles.attributeRow}>
        <div className={styles.flex}>
          <div className={styles.nameContainer}>
            {this.renderAttributesBox()}
            <div>{this.props.row.name}</div>
          </div>
          <div className={styles.relationContainer}>{relationType}</div>
          <div className={styles.mainField}>n temporary</div>
          <div className={styles.icoContainer}>
            <div className="ico">
              <i className="fa fa-pencil ico" onClick={this.edit} role="button" />
            </div>
            <div className="ico">
              <i className="fa fa-trash ico" onClick={this.toggleModalWarning} role="button" />
            </div>
          </div>
        </div>
        <PopUpWarning
          isOpen={this.state.showWarning}
          toggleModal={this.toggleModalWarning}
          bodyMessage={'popUpWarning.bodyMessage.contentType.delete'}
          popUpWarningType={'danger'}
          handleConfirm={this.delete}
        />
      </li>
    );
  }
}

AttributeRow.propTypes = {
  handleDelete: React.PropTypes.func,
  handleEdit: React.PropTypes.func,
  row: React.PropTypes.object,
}

export default AttributeRow;
