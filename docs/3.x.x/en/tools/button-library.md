# Button library

Button library based on bootstrap classes

## Usage

| Property | Type |  Required | Description
:---| :---| :---| :---
| `children`| node | no | Ex: `<Button primary>Click me</Button>` |
| `className`| any | no | Sets a custom className. Ex: `<Button className={styles.myCustomClass} label="Click me" />` |
| `kind` | string | no | Sets the built-in className to the button. Ex: `<Button kind="primaryAddShape"  label="Click me" />` |
| `label` | string | no | Sets the button label with i18n Ex: `<Button label="myPlugin.button.label" primary/>` |
| `labelValue` | string | no | Sets the button label with i18n and a dynamic value Ex: `<Button label="myPlugin.button.label" labelValue={{ foo: 'bar' }} primary/>` |
| `loader` | bool | no | Displays a button loader. Ex: `<Button loader />` |
| `primary` | bool | no | [Bootstrap className](https://v4-alpha.getbootstrap.com/components/buttons/) |
| `primaryAddShape` | bool | no | Inserts fontAwesone plus icon inside the button. Ex: `<Button primaryAddShape>Click me</Button>` |
| `secondary`| bool | no | [Bootstrap className](https://v4-alpha.getbootstrap.com/components/buttons/) |
| `secondaryHotline` | bool | no | Sets className |
| `secondaryHotlineAdd` | bool | no | Inserts fontAwesone plus icon inside the button. Ex: `<Button secondaryHotlineAdd>Click me</Button>` |
| `type` | string | no | Sets the button type |
