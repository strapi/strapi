import { randomUUID } from 'crypto';
import { machineIdSync } from 'node-machine-id';

export default () => {
  try {
    const deviceId = machineIdSync();
    return deviceId;
  } catch (error) {
    const deviceId = randomUUID();
    return deviceId;
  }
};
