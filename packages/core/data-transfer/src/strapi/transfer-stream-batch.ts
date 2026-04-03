/** Max serialized JSON size before flushing non-asset transfer chunks over the WebSocket. */
export const TRANSFER_NON_ASSET_BATCH_MAX_BYTES = 512 * 1024;

/** Max items per WebSocket message for entities / links / configuration (push client + pull server). */
export const TRANSFER_NON_ASSET_BATCH_MAX_ITEMS = 200;
