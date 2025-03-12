import crypto from 'crypto';
import { machineIdSync } from 'node-machine-id';

export default (projectId: string, deviceId: string) => {
  if (deviceId) return deviceId;
  try {
    const machineId = machineIdSync();
    return projectId
      ? crypto.createHash('sha256').update(`${machineId}-${projectId}`).digest('hex')
      : crypto.randomUUID();
  } catch (error) {
    return crypto.randomUUID();
  }
};
