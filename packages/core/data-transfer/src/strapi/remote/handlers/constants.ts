export const VALID_TRANSFER_COMMANDS = ['init', 'end', 'status'] as const;
export type ValidTransferCommand = (typeof VALID_TRANSFER_COMMANDS)[number];
