import type { Step } from '.';

export default [
  {
    kind: 'action',
    action: 'bootstrap',
  },
  {
    kind: 'action',
    action: 'init',
  },
  {
    kind: 'action',
    action: 'beforeTransfer',
  },
  {
    kind: 'transfer',
    stage: 'schemas',
  },
  {
    kind: 'transfer',
    stage: 'entities',
  },
  {
    kind: 'transfer',
    stage: 'assets',
  },
  {
    kind: 'transfer',
    stage: 'links',
  },
  {
    kind: 'transfer',
    stage: 'configuration',
  },
  {
    kind: 'action',
    action: 'close',
  },
] as readonly Step[];
