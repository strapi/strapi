import { getPreviewDevices, type Device } from '../devices';

const DEVICES: Device[] = [
  {
    name: 'desktop',
    label: { id: 'device.desktop', defaultMessage: 'Desktop' },
    width: '100%',
    height: '100%',
  },
  {
    name: 'tablet',
    label: { id: 'device.tablet', defaultMessage: 'Tablet' },
    width: '768px',
    height: '1024px',
  },
  {
    name: 'mobile',
    label: { id: 'device.mobile', defaultMessage: 'Mobile' },
    width: '375px',
    height: '667px',
  },
];

describe('getPreviewDevices', () => {
  test('returns the default devices unchanged when no overrides are provided', () => {
    expect(getPreviewDevices(DEVICES)).toEqual(DEVICES);
  });

  test('returns the default devices unchanged when overrides is an empty object', () => {
    expect(getPreviewDevices(DEVICES, {})).toEqual(DEVICES);
  });

  test('only overrides the device with a matching override, leaving others untouched', () => {
    const result = getPreviewDevices(DEVICES, { tablet: { width: 800, height: 1280 } });

    expect(result.find((d) => d.name === 'desktop')).toEqual(DEVICES[0]);
    expect(result.find((d) => d.name === 'mobile')).toEqual(DEVICES[2]);
    expect(result.find((d) => d.name === 'tablet')).toEqual({
      ...DEVICES[1],
      width: '800px',
      height: '1280px',
    });
  });

  test('applies overrides to every device when all are configured', () => {
    const result = getPreviewDevices(DEVICES, {
      desktop: { width: 1440, height: 900 },
      tablet: { width: 768, height: 1024 },
      mobile: { width: 390, height: 844 },
    });

    expect(result).toEqual([
      { ...DEVICES[0], width: '1440px', height: '900px' },
      { ...DEVICES[1], width: '768px', height: '1024px' },
      { ...DEVICES[2], width: '390px', height: '844px' },
    ]);
  });

  test('ignores overrides for unknown device names', () => {
    const result = getPreviewDevices(DEVICES, { watch: { width: 200, height: 200 } });

    expect(result).toEqual(DEVICES);
  });
});
