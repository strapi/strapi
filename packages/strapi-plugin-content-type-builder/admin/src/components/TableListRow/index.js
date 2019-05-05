/**
 *
 * TableListRow
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { get, isEmpty, startCase } from 'lodash';
import { FormattedMessage } from 'react-intl';
import { IcoContainer, ListRow, PopUpWarning } from 'strapi-helper-plugin';

import pluginId from '../../pluginId';

import styles from '../TableList/styles.scss';
/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable react/jsx-curly-brace-presence */
/* eslint-disable indent */

class TableListRow extends React.Component {
  // eslint-disable-line react/prefer-stateless-function
  constructor(props) {
    super(props);
    this.state = {
      showWarning: false,
    };
  }

  handleDelete = e => {
    e.preventDefault();
    e.stopPropagation();

    const {
      deleteTemporaryModel,
      onDelete,
      rowItem: { name, isTemporary },
    } = this.props;

    if (isTemporary) {
      deleteTemporaryModel();
    } else {
      onDelete(name, this.context);
    }

    this.setState({ showWarning: false });
  };

  handleEdit = () => {
    const {
      push,
      rowItem: { name, source },
    } = this.props;

    push({
      pathname: `/plugins/${pluginId}/models/${name}${
        source ? `&source=${source}` : ''
      }`,
      search: `modalType=model&settingType=base&actionType=edit&modelName=${name}`,
    });
  };

  handleGoTo = () => {
    const { push } = this.props;

    push(
      `/plugins/${pluginId}/models/${this.props.rowItem.name}${
        this.props.rowItem.source ? `&source=${this.props.rowItem.source}` : ''
      }`,
    );
  };

  toggleModalWarning = () =>
    this.setState(prevState => ({ showWarning: !prevState.showWarning }));

  handleShowModalWarning = () => {
    if (
      this.props.canOpenModalAddContentType ||
      this.props.rowItem.isTemporary === true
    ) {
      this.setState(prevState => ({ showWarning: !prevState.showWarning }));
    } else {
      strapi.notification.info(
        `${pluginId}.notification.info.contentType.creating.notSaved`,
      );
    }
  };

  render() {
    const name = get(this.props.rowItem, 'name', 'default');
    const pluginSource = this.props.rowItem.source ? (
      <FormattedMessage id={`${pluginId}.from`}>
        {message => (
          <span
            style={{ fontStyle: 'italic', color: '#787E8F', fontWeight: '500' }}
          >
            ({message}: {this.props.rowItem.source})
          </span>
        )}
      </FormattedMessage>
    ) : (
      ''
    );
    const temporary = this.props.rowItem.isTemporary ? (
      <FormattedMessage id={`${pluginId}.contentType.temporaryDisplay`} />
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
          {
            icoType: 'trash',
            onClick: this.handleShowModalWarning,
            id: `delete${name}`,
          },
        ];

    return (
      <ListRow onClick={this.handleGoTo} style={{ height: '5.4rem' }}>
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
          content={{
            message:
              'content-type-builder.popUpWarning.bodyMessage.contentType.delete',
          }}
          popUpWarningType={'danger'}
          onConfirm={this.handleDelete}
        />
      </ListRow>
    );
  }
}

TableListRow.contextTypes = {
  plugins: PropTypes.object,
  updatePlugin: PropTypes.func,
};

TableListRow.propTypes = {
  canOpenModalAddContentType: PropTypes.bool.isRequired,
  deleteTemporaryModel: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  push: PropTypes.func.isRequired,
  rowItem: PropTypes.object.isRequired,
};

export default TableListRow;
