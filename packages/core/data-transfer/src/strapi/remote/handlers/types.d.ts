import { TRANSFER_METHODS } from '../constants';

type TransferMethod = (typeof TRANSFER_METHODS)[number];

export interface ITransferState {
  transfer?: {
    id: string;
    kind: client.TransferKind;
    startedAt: number;
    flow: TransferFlow;
  };
  controller?: IPushController | IPullController;
}

export interface IHandlerOptions {
  verify: (ctx: Context, scope?: TransferMethod) => Promise<void>;
  server?: ServerOptions;
}
