import { CreateTransferMessage } from './utils';

export type TransferPullMessage = CreateTransferMessage<
  'step',
  {
    action: 'start' | 'stop';
  }
>;
