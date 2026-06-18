import type { ILocalStrapiDestinationProviderOptions } from '../../../../strapi/providers';
import type { TransferMethod } from '../../../../strapi/remote/constants';

export type CommandMessage = { type: 'command' } & (InitCommand | EndCommand | StatusCommand);

export type Command = CommandMessage['command'];

export type GetCommandParams<T extends Command> = {
  [key in Command]: { command: key } & CommandMessage;
}[T] extends { params: infer U }
  ? U
  : never;

export type InitCommand = CreateCommand<
  'init',
  {
    options?: Pick<ILocalStrapiDestinationProviderOptions, 'strategy' | 'restore'>;
    transfer: TransferMethod;
    checksums?: boolean;
    /**
     * Opt-in request for the compact base64 asset-chunk wire format. Remotes that understand it
     * echo it back in {@link InitMessage}; older remotes ignore it and the client falls back to
     * the legacy `{ type: 'Buffer', data: number[] }` shape they can still decode.
     */
    assetEncoding?: 'base64';
  }
>;
export type TransferKind = InitCommand['params']['transfer'];

export type EndCommand = CreateCommand<'end', { transferID: string }>;

export type StatusCommand = CreateCommand<'status'>;

type CreateCommand<T extends string, U extends Record<string, unknown> = never> = {
  type: 'command';
  command: T;
} & ([U] extends [never] ? unknown : { params: U });
