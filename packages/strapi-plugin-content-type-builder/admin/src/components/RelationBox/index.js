/**
*
* RelationBox
*
*/

import React from 'react';
import { get, isEmpty, startCase } from 'lodash';
import DropDown from 'components/DropDown';
import Input from 'components/Input';
import styles from './styles.scss';

class RelationBox extends React.Component { // eslint-disable-line react/prefer-stateless-function
  render() {
    const content = isEmpty(this.props.input) ? <div /> :
      <Input
        type={get(this.props.input, 'type')}
        handleChange={this.props.handleChange}
        name={get(this.props.input, 'name')}
        target={get(this.props.input, 'target')}
        value={this.props.value}
        placeholder={get(this.props.input, 'placeholder')}
        customBootstrapClass="col-md-12"
        validations={get(this.props.input, 'validations')}
        errors={this.props.errors}
        didCheckErrors={this.props.didCheckErrors}
      />;
  
    const dropDown = this.props.dropDownItems ? <DropDown /> : <div />;
    return (
      <div className={styles.relationBox}>
        <div className={styles.headerContainer}>
          <i className={`fa ${get(this.props.header, 'icon')}`} />
          {startCase(get(this.props.header, 'name'))}
          {dropDown}
        </div>
        <div className={styles.inputContainer}>
          <div className="container-fluid">
            <div className={`row ${styles.input}`}>
              {content}
            </div>
          </div>
        </div>
      </div>
    );
  }
}

RelationBox.propTypes = {
  didCheckErrors: React.PropTypes.bool,
  dropDownItems: React.PropTypes.array,
  errors: React.PropTypes.array,
  handleChange: React.PropTypes.func,
  header: React.PropTypes.object,
  input: React.PropTypes.object,
  value: React.PropTypes.string,
}

export default RelationBox;
