import Link from './InjectedComponents/ContentManager/EditViewLink';

export default [
  {
    plugin: 'content-manager.editPage',
    area: 'right.links',
    component: Link,
    key: 'content-type-builder.link',
    props: {
      message: {
        id: 'content-manager.containers.Edit.Link.Fields',
      },
      icon: 'fa-cog',
    },
  },
];
