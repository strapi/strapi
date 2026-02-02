import { arg, inputObjectType } from 'nexus';

const PaginationInputType = inputObjectType({
  name: 'PaginationArg',

  definition(t) {
    t.int('page');
    t.int('pageSize');
    t.int('start');
    t.int('limit');
  },
});

export default arg({
  type: PaginationInputType,
  default: {},
});
