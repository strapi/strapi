/**
 *
 * TableListRow
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { get, isEmpty, startCase } from 'lodash';
import { FormattedMessage } from 'react-intl';
import IcoContainer from 'components/IcoContainer';
import ListRow from 'components/ListRow';
import PopUpWarning from 'components/PopUpWarning';
import { router } from 'app';
import styles from '../TableList/styles.scss';
/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable react/jsx-curly-brace-presence */

class TableListRow extends React.Component {
  // eslint-disable-line react/prefer-stateless-function
  constructor(props) {
    super(props);
    this.state = {
      showWarning: false,
    };
  }

  handleEdit = () => {
    router.push(
      `/plugins/content-type-builder/#edit${this.props.rowItem.name}::contentType::baseSettings`,
    );
  };

  handleDelete = e => {
    e.preventDefault();
    e.stopPropagation();
    this.props.onDelete(this.props.rowItem.name);
    this.setState({ showWarning: false });
  };

  handleGoTo = () => {
    router.push(
      `/plugins/content-type-builder/models/${this.props.rowItem.name}${
        this.props.rowItem.source ? `&source=${this.props.rowItem.source}` : ''
      }`,
    );
  };

  toggleModalWarning = () => this.setState({ showWarning: !this.state.showWarning });

  handleShowModalWarning = () => this.setState({ showWarning: !this.state.showWarning });

  render() {
    const name = get(this.props.rowItem, 'name', 'default');
    const pluginSource = this.props.rowItem.source ? (
      <FormattedMessage id="content-type-builder.from">
        {message => (
          <span style={{ fontStyle: 'italic', color: '#787E8F', fontWeight: '500' }}>
            ({message}: {this.props.rowItem.source})
          </span>
        )}
      </FormattedMessage>
    ) : (
      ''
    );
    const temporary = this.props.rowItem.isTemporary ? (
      <FormattedMessage id="content-type-builder.contentType.temporaryDisplay" />
    ) : (
      ''
    );
    const description = isEmpty(this.props.rowItem.description)
      ? '-'
      : this.props.rowItem.description;
    const spanStyle = this.props.rowItem.isTemporary ? '60%' : '100%';
    const icons = this.props.rowItem.source
      ? []
      : [
        { icoType: 'pencil', onClick: this.handleEdit },
        { icoType: 'trash', onClick: this.handleShowModalWarning, id: `delete${name}` },
      ];

    return (
      <ListRow onClick={this.handleGoTo}>
        <div className={`col-md-4 ${styles.italic} ${styles.nameContainer}`}>
          <i className={`fa ${this.props.rowItem.icon}`} />
          <span style={{ width: spanStyle }}>
            {startCase(this.props.rowItem.name)} &nbsp;{pluginSource}
          </span>
          &nbsp;{temporary}
        </div>
        <div className={`col-md-5 text-center ${styles.descriptionContainer}`}>
          <div>{description}</div>
        </div>
        <div className="col-md-2 text-center">{this.props.rowItem.fields}</div>
        <div className="col-md-1">
          <IcoContainer icons={icons} />
        </div>
        <PopUpWarning
          isOpen={this.state.showWarning}
          toggleModal={this.toggleModalWarning}
          content={{ message: 'content-type-builder.popUpWarning.bodyMessage.contentType.delete' }}
          popUpWarningType={'danger'}
          onConfirm={this.handleDelete}
        />
      </ListRow>
    );
  }
}

TableListRow.propTypes = {
  onDelete: PropTypes.func.isRequired,
  rowItem: PropTypes.object.isRequired,
};

export default TableListRow;
