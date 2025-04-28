import crypto from 'crypto';
import { machineIdSync } from 'node-machine-id';

export function installID(projectId?: string) {
  try {
    const machineId = machineIdSync();
    return projectId
      ? crypto.createHash('sha256').update(`${machineId}-${projectId}`).digest('hex')
      : crypto.randomUUID();
  } catch {
    return crypto.randomUUID();
  }
}
