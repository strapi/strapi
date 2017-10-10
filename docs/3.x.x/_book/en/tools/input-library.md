# Input Library

Strapi provides a built-in input library which includes :
  - All kind of inputs
  - Front-End validations
  - Error highlight
  - i18n
  - ...

## Usage

```js
import React from 'react';
// The library is available under node_modules/strapi-helper-plugin/src/components/Input
import Input from 'components/Input';

class Foo extends React.Component {
  constructor(props) {
    super(props);

    this.state {
      data: {
        foo: 'bar',
      },
      error: false,
      errors: [],
    };
  }

  handleChange = ({ target }) => {
    const value = target.type === 'number' ? Number(target.value) : target.value;

    const error = target.value.length === 0;

    if (error) {
      this.setState({ error: !this.state.error, errors: [{ id: 'This input is required ' }] });
    } else {
      this.setState({ data[target.name]: value });
    }

  }

  render() {
    return (
      <div className={styles.foo}>
        <Input
          type="string"
          value={this.state.data.foo}
          label="This is a string input"
          name="foo"
          handleChange={this.handleChange}
          validations={{ required: true }}
          didCheckErrors={this.state.error}
        />
      </div>
    );
  }
}
```

### Usage

| Property | Type |  Required | Description
:---| :---| :---| :---
| `addon` | string | no | Allows to add a string addon in your input, based on [Bootstrap](https://v4-alpha.getbootstrap.com/components/input-group/#basic-example). Ex: `<Input {...this.props} addon="@" />` |
| `addRequiredInputDesign` | bool | no | Allows to add an asterix on the input. Ex: `<Input {...this.props} addRequiredInputDesign />` |
| `customBootstrapClass` | string | no | Allows to override the input bootstrap col system. Ex: `<Input {...this.props} customBootstrapClass="col-md-6 offset-md-6 pull-md-6" />` |
| `deactivateErrorHighlight` | bool | no | Prevents from displaying error highlight in the input: Ex: `<Input {...this.props} deactivateErrorHighlight />` |
| `didCheckErrors` | bool | no | Use this props to display errors after submitting a form. Ex: `<Input {...this.props} didCheckErrors={this.state.error} />` |
| `disabled` | bool | no | Disable the input. Ex: `<Input {...this.props} disabled />` |
| `errors` | array | no | Allows to display custom error messages. Ex: `<Input {...this.props} errors={[{ id: 'The value is not correct' }]} />` |
| `handleBlur` | func or bool  | no | Overrides the default onBlur behavior. If bool passed to the component it will disabled the input validations checking. |
| `handleChange` | func | yes | Sets your reducer state. |
| `handFocus` | func | no | Adds an onFocus event to the input. |
| `inputDescription` | string | no | Allows to add an input description that is displayed like [bootstrap](https://v4-alpha.getbootstrap.com/components/forms/#defining-states). |
| `label` | string | yes | Displays the input's label with i18n |
| `linkContent` | object | no | Allows to display a link within the input's description. Ex: `<Input {...this.props} linkContent={{ description: 'check out our', link: 'tutorial video' }} />`|
| `name` | string | yes | The key to update your reducer. |
| `noErrorsDescription` | bool | no | Prevents from displaying built-in errors. |
| `placeholder` | string | no | Allows to set a placeholder. |
| `pluginId` | string | no | Use to display name, placeholder... with i18n. |
| `selectOptions` | array | no | Options for the select. |
|  `tabIndex` | string | no | Sets the order in which the inputs are focused on tab key press. |
| `title` | string | no | This props can only be used for checkboxes, it allows to add a title on top of the input, the label will be on the right side of the checkbox. |
| `validations` | object | yes | Allows to have the built-in input's validations. If set to {} the validations will be ignored. Ex: `<Input {...this.props} validations={{ required: true }} />` |
| `value` | string or bool or number | yes | The input's value. |
