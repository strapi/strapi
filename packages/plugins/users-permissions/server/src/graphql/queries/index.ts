// @ts-nocheck
import me from './me';

export default ({ nexus }) => {
  return nexus.extendType({
    type: 'Query',

    definition(t) {
      t.field('me', me({ nexus }));
    },
  });
};
