/**
*
* RelationBox
*
*/

import React from 'react';
import { get, isEmpty, map, startCase } from 'lodash';
import pluralize from 'pluralize';
import { ButtonDropdown, DropdownToggle, DropdownMenu, DropdownItem } from 'reactstrap';
import Input from 'components/Input';
import styles from './styles.scss';

/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable react/jsx-wrap-multilines */
class RelationBox extends React.Component { // eslint-disable-line react/prefer-stateless-function
  constructor(props) {
    super(props);

    this.state = {
      showMenu: false,
    };
  }

  handleClick = (e) => {
    const target = {
      type: 'string',
      value: e.target.id,
      name: 'params.target',
    };

    this.props.handleChange({ target });
  }

  toggle = () => this.setState({ showMenu: !this.state.showMenu });

  renderDropdownMenu = () => (
    <div className={styles.dropDown}>
      <ButtonDropdown isOpen={this.state.showMenu} toggle={this.toggle} style={{ backgroundColor: 'transparent' }}>
        <DropdownToggle caret>
        </DropdownToggle>
        <DropdownMenu className={styles.dropDownContent}>
          {map(this.props.dropDownItems, (value, key) => {
            const divStyle = get(this.props.header, 'name') === value.name ? { color: '#323740', fontWeight: 'bold'} : { color: 'rgba(50,55,64, 0.75)'};
            return (
              <div style={{ height: '3.8rem'}} key={key}>
                <DropdownItem onClick={this.handleClick} id={value.name}>
                  <div style={divStyle} id={value.name}>
                    <i className={`fa ${value.icon}`} style={divStyle} />
                    {value.name}
                  </div>
                </DropdownItem>

              </div>

            )
          })}
        </DropdownMenu>
      </ButtonDropdown>
    </div>
  )

  render() {
    let placeholder;

    switch (true) {
      case this.props.relationType === 'oneToMany' && this.props.isFirstContentType:
        placeholder = pluralize(this.props.contentTypeTargetPlaceholder);
        break;
      case this.props.relationType === 'manyToOne' && !this.props.isFirstContentType:
        placeholder = pluralize(this.props.contentTypeTargetPlaceholder);
        break;
      case this.props.relationType === 'manyToMany':
        placeholder = pluralize(this.props.contentTypeTargetPlaceholder);
        break;
      default:
        placeholder = this.props.contentTypeTargetPlaceholder;
    }

    const content = isEmpty(this.props.input) ?
      <div /> :
      <Input
        type={get(this.props.input, 'type')}
        handleChange={this.props.handleChange}
        label={get(this.props.input, 'label')}
        name={get(this.props.input, 'name')}
        value={this.props.value}
        placeholder={placeholder}
        customBootstrapClass="col-md-12"
        validations={get(this.props.input, 'validations')}
        errors={this.props.errors}
        didCheckErrors={this.props.didCheckErrors}
        pluginId="content-type-builder"
      />;

    const dropDown = this.props.dropDownItems ? this.renderDropdownMenu() : '';

    return (
      <div className={styles.relationBox}>
        <div className={styles.headerContainer}>
          <i className={`fa ${get(this.props.header, 'icon')}`} />
          {startCase(get(this.props.header, 'name'))}
          {dropDown}
        </div>
        <div className={styles.inputContainer}>
          <form onSubmit={this.props.handleSubmit}>
            <div className="container-fluid">
              <div className={`row ${styles.input}`}>
                {content}
              </div>
            </div>
          </form>
        </div>
      </div>
    );
  }
}

RelationBox.propTypes = {
  contentTypeTargetPlaceholder: React.PropTypes.string,
  didCheckErrors: React.PropTypes.bool,
  dropDownItems: React.PropTypes.array,
  errors: React.PropTypes.array,
  handleChange: React.PropTypes.func,
  handleSubmit: React.PropTypes.func,
  header: React.PropTypes.object,
  input: React.PropTypes.object,
  isFirstContentType: React.PropTypes.bool,
  relationType: React.PropTypes.string,
  value: React.PropTypes.string,
}

export default RelationBox;
