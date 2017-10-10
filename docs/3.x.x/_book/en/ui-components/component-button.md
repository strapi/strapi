# Component Button

Button library based on bootstrap classes

![Buttons img](../assets/buttons.png)

## Usage

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

## Example

 **Path —** `./plugins/my-plugin/admin/src/translations/en.json`.
```json
{
  "myPlugin.button.label": "Add a new"
}
```

**Path —** `./plugins/my-plugin/admin/src/components/Foo/index.js`.
```js
import Button from 'components/Button';

const Foo = () => {
  // Define your buttons
  const buttons = [
    {
      label: 'myPlugin.button.label',
      labelValues: {
        foo: 'Bar',
      },
      kind: 'primaryAddShape',
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
