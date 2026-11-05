import type { GraphQLFactoryContext } from '../context';
import me from './me';

export default ({ nexus }: Pick<GraphQLFactoryContext, 'nexus'>) => {
  return nexus.extendType({
    type: 'Query',

    definition(t) {
      t.field('me', me());
    },
  });
};
