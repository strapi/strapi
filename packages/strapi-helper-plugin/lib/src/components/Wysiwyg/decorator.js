import { CompositeDecorator } from 'draft-js';
import { findLinkEntities, findImageEntities } from './strategies';
import { Link, Image } from './components';

const decorator = new CompositeDecorator([
  {
    strategy: findLinkEntities,
    component: Link,
  },
  {
    strategy: findImageEntities,
    component: Image,
  },
]);

export default decorator;
