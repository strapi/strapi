import type { ILocalStrapiDestinationProviderOptions } from '../../../../src/strapi/providers';

export type CommandMessage = { type: 'command' } & (InitCommand | EndCommand | StatusCommand);

export type Command = CommandMessage['command'];

export type GetCommandParams<T extends Command> = {
  [key in Command]: { command: key } & CommandMessage;
}[T] extends { params: infer U }
  ? U
  : never;

export type InitCommand = CreateCommand<
  'init',
  Pick<ILocalStrapiDestinationProviderOptions, 'strategy' | 'restore'>
>;
export type TransferKind = InitCommand['params']['transfer'];

export type EndCommand = CreateCommand<'end', { transferID: string }>;

export type StatusCommand = CreateCommand<'status'>;

type CreateCommand<T extends string, U extends Record<string, unknown> = never> = {
  type: 'command';
  command: T;
} & ([U] extends [never] ? unknown : { params: U });
