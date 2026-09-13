import type { MessageDescriptor } from 'react-intl';

interface Device {
  name: string;
  label: MessageDescriptor;
  width: string;
  height: string;
}

interface ViewportOverride {
  width: number;
  height: number;
}

type ViewportOverrides = Partial<Record<string, ViewportOverride>>;

const getPreviewDevices = (devices: Device[], overrides: ViewportOverrides = {}): Device[] => {
  return devices.map((device) => {
    const override = overrides[device.name];

    if (!override) {
      return device;
    }

    return {
      ...device,
      width: `${override.width}px`,
      height: `${override.height}px`,
    };
  });
};

export { getPreviewDevices };
export type { Device, ViewportOverrides };
