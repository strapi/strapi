import crypto from 'crypto';
import { machineIdSync } from 'node-machine-id';

export function machineID(projectId?: string) {
  try {
    const machineId = machineIdSync();
    return projectId
      ? { deviceId: crypto.createHash('sha256').update(`${machineId}-${projectId}`).digest('hex'), isDeviceIdUsingProjectId: true }
      : { deviceId: crypto.randomUUID(), isDeviceIdUsingProjectId: false };
  } catch {
    return { deviceId: crypto.randomUUID(), isDeviceIdUsingProjectId: false };
  }
}
