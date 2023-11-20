import { arg, list } from 'nexus';

const SortArg = arg({
  type: list('String'),
  default: [],
});

export default SortArg;
