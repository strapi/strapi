import { randomUUID } from 'crypto';
import { machineIdSync } from 'node-machine-id';

export function machineID() {
  try {
    const deviceId = machineIdSync();
    return deviceId;
  } catch (error) {
    const deviceId = randomUUID();
    return deviceId;
  }
}
