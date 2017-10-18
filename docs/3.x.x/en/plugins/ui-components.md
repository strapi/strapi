# UI components

Strapi provides built-in UI Components to make development faster.

## Button

Button library based on bootstrap classes.

{% center %} ![Buttons img](../assets/buttons.png) {% endcenter %}

### Usage

| Property | Type | Required | Description |
| -------- | ---- | -------- | ----------- |
| `children`| node | no | Ex: `<Button primary>Click me</Button>` |
| `className` | any | no | Sets a custom className. Ex: `<Button className={styles.myCustomClass} label="Click me" />` |
| `kind` | string | no | Sets the built-in className to the button. Ex: `<Button kind="primaryAddShape"  label="Click me" />` |
| `label` | string | no | Sets the button label with i18n Ex: `<Button label="myPlugin.button.label" primary />` |
| `labelValue` | string | no | Sets the button label with i18n and a dynamic value Ex: {% raw %} ```<Button label="myPlugin.button.label" labelValue={{ foo: 'bar' }} primary />``` {% endraw %} |
| `loader` | bool | no | Displays a button loader. Ex: `<Button loader />` |
| `primary` | bool | no | [Bootstrap className](https://v4-alpha.getbootstrap.com/components/buttons/) |
| `primaryAddShape` | bool | no | Inserts fontAwesone plus icon inside the button. Ex: `<Button primaryAddShape>Click me</Button>` |
| `secondary`| bool | no | [Bootstrap className](https://v4-alpha.getbootstrap.com/components/buttons/) |
| `secondaryHotline` | bool | no | Sets className |
| `secondaryHotlineAdd` | bool | no | Inserts fontAwesone plus icon inside the button. Ex: `<Button secondaryHotlineAdd>Click me</Button>` |
| `type` | string | no | Sets the button type |

### Example

 **Path —** `./plugins/my-plugin/admin/src/translations/en.json`.
```json
{
  "myPlugin.button.label": "Add a new"
}
```

**Path —** `./plugins/my-plugin/admin/src/components/Foo/index.js`.
```js
// Make sure you don't have any other component called Button otherwise it will
// import the one from your ./components folder instead.
import Button from 'components/Button';

const Foo = () => {
  // Define your buttons
  const buttons = [
    {
      kind: 'primaryAddShape',
      label: 'myPlugin.button.label',
      labelValues: {
        foo: 'Bar',
      },
      onClick: () => console.log('Click'),
    },
  ];

  return (
    <div className={styles.foo}>
      {buttons.map((buttonProps) => <Button {...buttonProps} key={buttonProps.label})} />}
    </div>
  );
}

// Will display a primaryAddShape button with label: 'Add a new Bar'
export default Button;
```

***

## Input

Strapi provides a built-in input library which includes :
  - All kind of inputs
  - Front-End validations
  - Error highlight
  - i18n

### Usage

| Property | Type | Required | Description |
| -------- | ---- | -------- | ----------- |
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
| `label` | string | yes | Displays the input's label with i18n. |
| `linkContent` | object | no | Allows to display a link within the input's description. Ex: {% raw %} ``` <Input {...this.props} linkContent={{ description: 'check out our', link: 'tutorial video' }} />``` {% endraw %} |
| `name` | string | yes | The key to update your reducer. |
| `noErrorsDescription` | bool | no | Prevents from displaying built-in errors. |
| `placeholder` | string | no | Allows to set a placeholder. |
| `pluginId` | string | no | Use to display name, placeholder, etc. with i18n. |
| `selectOptions` | array | no | Options for the select. |
|  `tabIndex` | string | no | Sets the order in which the inputs are focused on tab key press. |
| `title` | string | no | This props can only be used for checkboxes, it allows to add a title on top of the input, the label will be on the right side of the checkbox. |
| `validations` | object | yes | Allows to have the built-in input's validations. If set to {} the validations will be ignored. Ex: {% raw %} ``` <Input {...this.props} validations={{ required: true }} />``` {% endraw %} |
| `value` | string or bool or number | yes | The input's value. |

### Example

```js
import React from 'react';
// Make sure you don't have a component called Input inside your ./components folder
// It will import the one in your components folder instead.
import Input from 'components/Input';

class FooPage extends React.Component {
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
      this.setState({ error: true, errors: [{ id: 'This input is required ' }] });
    } else {
      this.setState({ data[target.name]: value, error: false, errors: [] });
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

export default FooPage;
```

***

## PopUp Warning

PopUp warning library based on [reactstrap](https://reactstrap.github.io/components/modals/).

{% center %} ![PopUp warning img](../assets/popup-warning.png) {% endcenter %}

### Usage

| Property | Type | Required | Description |
| -------- | ---- | -------- | ----------- |
| bodyMessage | string | no | Body message of the pop up (works with i18n). |
| handleConfirm | func | yes | Function executed when the user clicks on the `Confirm button`. |
| isOpen | bool | yes | Show or hide the popup. |
| popUpWarningType | string | yes | Sets the popup body icon. Available types: `danger`, `info`, `notFound`, `success`, `warning` |
| toggleModal | func | yes | Function to toggle the modal. |


### Example

**Path —** `./plugins/my-plugin/admin/src/translations/en.json`.
```json
{
  "button.label": "Click me",
  "popup.danger.message": "Are you sure you want to delete this item?"
}
```

**Path —** `./plugins/my-plugin/admin/src/translations/fr.json`.
```json
{
  "button.label": "Cliquez",
  "popup.danger.message": "Êtes-vous certain de vouloir supprimer ce message?"
}
```

**Path —** `./plugins/my-plugin/admin/src/containers/FooPage/index.js`.
```js
// ...

import Button from 'components/Button';
import PopUpWarning from 'components/PopUpWarning';

// ...

class FooPage extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      isOpen: false,
    };
  }

  handlePopUpConfirm = () => {
    // Some logic Here
    this.setState({ isOpen: false });
  }

  render() {
    return(
      <div>
        <Button primary handleClick={() => this.setState({ isOpen: !this.state.isOpen })} label="my-plugin.button.label" />
        <PopUpWarning
          bodyMessage="my-plugin.popup.danger.message"
          handleConfirm={this.handlePopUpConfirm}
          toggleModal={() => this.setState({ isOpen: !this.state.isOpen })}
          popUpWarningType="danger"
        />
      </div>
    );
  }
}

export default FooPage;
```
