import _ from 'lodash';

const pascalCase = (string: string) => {
  return _.upperFirst(_.camelCase(string));
};

export default pascalCase;
