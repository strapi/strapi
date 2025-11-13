import crypto from 'crypto';
import { machineIdSync } from 'node-machine-id';

export const generateInstallId = (projectId: string, installId: string) => {
  if (installId) return installId;
  try {
    const machineId = machineIdSync();
    return projectId
      ? crypto.createHash('sha256').update(`${machineId}-${projectId}`).digest('hex')
      : crypto.randomUUID();
  } catch (error) {
    return crypto.randomUUID();
  }
};
