import { machineIdSync } from 'node-machine-id';
import { v4 as uuidv4 } from 'uuid';

export default () => {
  try {
    const deviceId = machineIdSync();
    return deviceId;
  } catch (error) {
    const deviceId = uuidv4();
    return deviceId;
  }
};
