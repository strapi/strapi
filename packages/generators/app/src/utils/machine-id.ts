import { machineIdSync } from 'node-machine-id';
import { randomUUID } from 'crypto';

export default () => {
  try {
    const deviceId = machineIdSync();
    return deviceId;
  } catch (error) {
    const deviceId = randomUUID();
    return deviceId;
  }
};
