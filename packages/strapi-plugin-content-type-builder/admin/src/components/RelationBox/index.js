/**
*
* RelationBox
*
*/

import React from 'react';
import { get, startCase } from 'lodash';
import Input from 'components/Input';
import styles from './styles.scss';

class RelationBox extends React.Component { // eslint-disable-line react/prefer-stateless-function
  render() {
    return (
      <div className={styles.relationBox}>
        <div className={styles.headerContainer}>
          <i className={`fa ${get(this.props.header, 'icon')}`} />
          {startCase(get(this.props.header, 'name'))}
        </div>
        <div className={styles.inputContainer}>
          <div className="container-fluid">
            <div className={`row ${styles.input}`}>
              <Input
                type={this.props.input.type}
                handleChange={this.props.handleChange}
                name={this.props.input.name}
                target={this.props.input.target}
                value={this.props.value}
                placeholder={this.props.input.placeholder}
                customBootstrapClass="col-md-12"
                validations={this.props.input.validations}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }
}

RelationBox.propTypes = {
  handleChange: React.PropTypes.func,
  header: React.PropTypes.object,
  input: React.PropTypes.object,
  value: React.PropTypes.string,
}

export default RelationBox;
