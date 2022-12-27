import { v4 } from 'uuid';
import { WebSocket } from 'ws';

export async function dispatch<U = unknown, T extends object = object>(
  ws: WebSocket | null,
  message: T
): Promise<U> {
  if (!ws) {
    throw new Error('No websocket connection found');
  }

  return new Promise((resolve, reject) => {
    const uuid = v4();
    const payload = JSON.stringify({ ...message, uuid });

    ws.send(payload, (error) => {
      if (error) {
        reject(error);
      }
    });

    ws.once('message', (raw) => {
      const response: { uuid: string; data: U; error: string | null } = JSON.parse(raw.toString());

      if (response.error) {
        return reject(new Error(response.error));
      }

      if (response.uuid === uuid) {
        return resolve(response.data);
      }
    });
  });
}
