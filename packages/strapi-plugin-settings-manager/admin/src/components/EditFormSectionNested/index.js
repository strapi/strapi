/**
*
* EditFormSectionNested
*
*/

import React from 'react';
import { has, map, forEach } from 'lodash';

// HOC
import EditFormSectionSubNested from 'components/EditFormSectionSubNested';
import WithFormSection from 'components/WithFormSection';

class EditFormSectionNested extends React.Component { // eslint-disable-line react/prefer-stateless-function
  constructor(props) {
    super(props);
    this.state = {
      hasNestedInput: false,
      showNestedForm: false,
      inputWithNestedForm: '',
    };
  }
  componentDidMount() {
    // check if there is inside a section an input that requires nested input to display it on the entire line
    // TODO add logic in withform section HOC
    if (this.props.section) {
      this.checkForNestedForm(this.props);
    }
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.value !== this.props.values) {
      this.checkForNestedForm(nextProps);
    }
  }

  checkForNestedForm(props) {
    forEach(props.section, (input) => {
      if (input.type === 'enum') {
        forEach(input.items, (item) => {
          if (has(item, 'items')) {
            this.setState({ hasNestedInput: true, inputWithNestedForm: input.target, section: item.items });

            if (props.values[input.target] === item.value) {
              this.setState({ showNestedForm: true });
            } else {
              this.setState({ showNestedForm: false });
            }
          }
        })
      }
    });
  }

  render() {
    // console.log(this.state);

    return (
      <div className={this.props.styles.padded}>
        <div className="row">
          {map(this.props.section, (item, key) => {
            if (this.state.showNestedForm) {

              return (
                <div key={key} style={{width: '100%'}}>
                  {this.props.renderInput(item, key)}
                  <EditFormSectionSubNested
                    section={this.state.section}
                    values={this.props.values}
                    handleChange={this.props.handleChange}

                  />
                </div>
              )
            }

            return this.props.renderInput(item, key)
          })}
        </div>
      </div>
    );
  }
}

EditFormSectionNested.propTypes = {
  handleChange: React.PropTypes.func,
  renderInput: React.PropTypes.func,
  section: React.PropTypes.oneOfType([
    React.PropTypes.array,
    React.PropTypes.object,
  ]),
  styles: React.PropTypes.object,
  values: React.PropTypes.object,
};

export default WithFormSection(EditFormSectionNested); // eslint-disable-line new-cap
