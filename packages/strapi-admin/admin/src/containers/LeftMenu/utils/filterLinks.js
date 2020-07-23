import { isNil } from 'lodash';

const filterLinks = links =>
  links.filter(link => {
    const isManaged = isNil(link.isManaged) ? true : link.isManaged;

    return link.isDisplayed && isManaged;
  });

export default filterLinks;
