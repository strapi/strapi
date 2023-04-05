export const TRANSFER_PATH = '/transfer/runner' as const;
export const TRANSFER_METHODS = ['push', 'pull'] as const;

export type TransferPath = typeof TRANSFER_PATH;
export type TransferMethod = (typeof TRANSFER_METHODS)[number];
