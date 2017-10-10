# PopUp Warning

PopUp warning library based on [reactstrap](https://reactstrap.github.io/components/modals/).

![PopUp warning img](../assets/popup-warning.png)

## Usage

| Property | Type | Required | Description |
| -------- | ---- | -------- | ----------- |
| bodyMessage | string | no | Body message of the pop up (works with i18n). |
| handleConfirm | func | yes | Function executed when the user clicks on the `Confirm button`. |
| isOpen | bool | yes | Show or hide the popup. |
| popUpWarningType | string | yes | Sets the popup body icon. Available types: `danger`, `info`, `notFound`, `success`, `warning` |
| toggleModal | func | yes | Function to toggle the modal. |


## Example

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

**Path —** `./plugins/my-plugin/admin/src/containers/Foo/index.js`.
```js
// ...

import Button from 'components/Button';
import PopUpWarning from 'components/PopUpWarning';

// ...

class Foo extends React.Component {
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

export default Foo;
```
