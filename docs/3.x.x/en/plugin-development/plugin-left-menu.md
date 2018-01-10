# Plugin Menu library

```js
// ...

import PluginLeftMenu from 'components/PluginLeftMenu';

// ...

const Foo = (props) => {
  const sections = [
    {
      name: 'section 1',
      items: [
        { icon: 'fa-caret-square-o-right', name: 'link 1'},
        { icon: 'fa-caret-square-o-right', name: 'link 2'},
      ],
    },
  ];

  return (
    <div className={styles.foo}>
      <div className="container-fluid">
        <div className="row">
          <PluginLeftMenu
            sections={sections}
          />
        </div>
      </div>
    </div>
  );
}

export default Foo;

// ...
```

## Usage

| Property | Type |  Required | Description
:---| :---| :---| :---
| `addCustomSection` | function | no | Allows to add another section after the initial one. |
| `basePath` | string | yes | For example the basePath of the route '/plugins/my-plugin/foo/bar' is 'my-plugin/categories' |
| `renderCustomLink` | function | no | Allows to override the design and  the behavior of a link |
| `sections` | array | yes | Sections of the component menu |

## Example

```js
// ...

import PluginLeftMenu from 'components/PluginLeftMenu';

// ...

const addCustomSection = (sectionStyles) => (
  // You have access to the section styles
  <div className={sectionStyles.pluginLeftMenuSection}>
    <p>
      DOCUMENTATION
    </p>
    <ul>
      <li>
        Read more about strapi in our <a href="http://strapi.io/documentation" target="_blank">documentation</a>
      </li>
    </ul>
  </div>
)

const renderAddLink = (props, customLinkStyles) => (
  <li className={customLinkStyles.pluginLeftMenuLink}>
    <div className={`${customLinkStyles.liInnerContainer}`} onClick={this.handleAddLinkClick}>
      <div>
        <i className={`fa ${props.link.icon}`} />
      </div>
      <span>{props.link.name}</span>
    </div>
  </li>
)

const renderCustomLink = (props, linkStyles) => {
  if (props.link.name === 'bar') return this.renderAddLink(props, linkStyles);

  return (
    <li className={linkStyles.pluginLeftMenuLink}>
      <NavLink className={linkStyles.link} to={`/plugins/my-plugin/foo/${props.link.name}`} activeClassName={linkStyles.linkActive}>
        <div>
          <i className={`fa fa-caret-square-o-right`} />
        </div>
        <div className={styles.contentContainer}>
          <span className={spanStyle}>{props.link.name}</span>
        </div>

      </NavLink>
    </li>
  );
}

const Foo = (props) => {
  const sections = [
    {
      name: 'section 1',
      items: [
        { icon: 'fa-caret-square-o-right', name: 'link 1'},
        { icon: 'fa-caret-square-o-right', name: 'link 2'},
      ],
    },
  ];

  return (
    <div className={styles.foo}>
      <div className="container-fluid">
        <div className="row">
          <PluginLeftMenu
            addCustomSection={addCustomSection}
            sections={sections}
            renderCustomLink={renderCustomLink}
            basePath="my-plugins/foo"
          />
        </div>
      </div>
    </div>
  );
}

// ...

export default Foo;
```
