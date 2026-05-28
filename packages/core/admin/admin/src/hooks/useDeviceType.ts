import * as React from 'react';

export type DeviceType = 'mobile' | 'tablet' | 'desktop';

/**
 * Hook to detect the device type used by the user
 * @returns {DeviceType} The device type
 */
export function useDeviceType(): DeviceType {
  const [deviceType, setDeviceType] = React.useState<DeviceType>('desktop');

  React.useEffect(() => {
    const userAgent = navigator.userAgent.toLowerCase();

    if (/mobile|iphone|ipod|android.*mobile|windows phone/.test(userAgent)) {
      setDeviceType('mobile');
    } else if (/ipad|tablet|android(?!.*mobile)/.test(userAgent)) {
      setDeviceType('tablet');
    } else {
      setDeviceType('desktop');
    }
  }, []);

  return deviceType;
}
