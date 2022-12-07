import { builder } from '../../builders/pothosBuilder';

const PaginationInputType = builder.inputType('PaginationArg', {
  fields(t) {
    return {
      page: t.int(),
      pageSize: t.int(),
      start: t.int(),
      limit: t.int(),
    };
  },
});

export default (t: any) =>
  t.arg({
    type: PaginationInputType,
    default: {},
  });
