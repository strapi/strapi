/**
 *
 * ListRow
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { capitalize, get, includes } from 'lodash';

import { IcoContainer, PopUpWarning } from 'strapi-helper-plugin';
import en from '../../translations/en.json';
import { HomePageContext } from '../../contexts/HomePage';
import { Container, Flex, Row, Wrapper } from './Components';

class ListRow extends React.Component {
  // eslint-disable-line react/prefer-stateless-function
  state = { showModalDelete: false };

  static contextType = HomePageContext;

  // Roles that can't be deleted && modified
  // Don't delete this line
  protectedRoleIDs = [];

  // Roles that can't be deleted;
  undeletableIDs = ['public', 'authenticated'];

  generateContent = () => {
    let icons = [
      {
        icoType: 'pencil-alt',
        onClick: this.handleClick,
      },
      {
        icoType: 'trash',
        onClick: () => {
          this.setState({ showModalDelete: true });
        },
      },
    ];

    switch (this.props.settingType) {
      case 'roles':
        if (includes(this.protectedRoleIDs, get(this.props.item, 'type', ''))) {
          icons = [];
        }

        if (includes(this.undeletableIDs, get(this.props.item, 'type', ''))) {
          icons = [{ icoType: 'pencil-alt', onClick: this.handleClick }];
        }

        return (
          <Wrapper className="row" style={{ paddingLeft: '20px' }}>
            <div className="col-md-2">
              <b>{this.props.item.name}</b>
            </div>
            <div className="col-md-7">{this.props.item.description}</div>
            <div className="col-md-1">
              <strong>{this.props.item.nb_users || 0}</strong>&nbsp;
              {this.props.item.nb_users > 1 ? 'users' : 'user'}
            </div>
            <div className="col-md-2">
              <IcoContainer icons={icons} />
            </div>
          </Wrapper>
        );
      case 'providers':
        icons.pop(); // Remove the icon-trash

        return (
          <Wrapper className="row">
            <div className="col-md-4">
              <Flex>
                <div>
                  <i
                    className={`fa${
                      this.props.item.key !== undefined ? 'b' : ''
                    } fa-${this.props.item.icon}`}
                  />
                </div>
                <div>{capitalize(this.props.item.name)}</div>
              </Flex>
            </div>
            <div className="col-md-6" style={{ fontWeight: '500' }}>
              {get(this.props.values, [
                get(this.props.item, 'name'),
                'enabled',
              ]) ? (
                <span style={{ color: '#5A9E06' }}>Enabled</span>
              ) : (
                <span style={{ color: '#F64D0A' }}>Disabled</span>
              )}
            </div>
            <div className="col-md-2">
              <IcoContainer icons={icons} />
            </div>
          </Wrapper>
        );

      case 'email-templates':
        icons.pop();

        return (
          <Wrapper className="row">
            <div className="col-md-4">
              <Flex>
                <div>
                  <i className={`fas fa-${this.props.item.icon}`} />
                </div>
                <div>
                  {this.props.item.display && en[this.props.item.display] ? (
                    <FormattedMessage
                      id={`users-permissions.${this.props.item.display}`}
                    />
                  ) : (
                    this.props.item.name
                  )}
                </div>
              </Flex>
            </div>
            <div className="col-md-8">
              <IcoContainer icons={icons} />
            </div>
          </Wrapper>
        );

      default:
        return '';
    }
  };

  handleClick = () => {
    const { pathname, push } = this.context;

    switch (this.props.settingType) {
      case 'roles': {
        if (
          !includes(this.protectedRoleIDs, get(this.props.item, 'type', ''))
        ) {
          return push(`${pathname}/edit/${this.props.item.id}`);
        }
        return;
      }
      case 'providers':
        this.context.emitEvent('willEditAuthenticationProvider');

        return this.context.setDataToEdit(this.props.item.name);
      case 'email-templates':
        this.context.emitEvent('willEditEmailTemplates');

        return this.context.setDataToEdit(this.props.item.name);
      default:
        return;
    }
  };

  handleDelete = () => {
    this.props.deleteData(this.props.item, this.props.settingType);
    this.setState({ showModalDelete: false });
  };

  render() {
    return (
      <Row onClick={this.handleClick}>
        <Container>{this.generateContent()}</Container>
        <PopUpWarning
          isOpen={this.state.showModalDelete}
          onConfirm={this.handleDelete}
          toggleModal={() => this.setState({ showModalDelete: false })}
        />
      </Row>
    );
  }
}

ListRow.defaultProps = {
  item: {
    name: 'Owner',
    description: "Rule them all. This role can't be deleted",
    nb_users: 1,
    icon: 'envelope',
  },
  settingType: 'roles',
};

ListRow.propTypes = {
  deleteData: PropTypes.func.isRequired,
  item: PropTypes.object,
  settingType: PropTypes.string,
  values: PropTypes.object.isRequired,
};

export default ListRow;
