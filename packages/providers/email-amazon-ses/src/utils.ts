import { ProviderOptions, LegacyProviderOptions } from './models/provider-options';

// Helper to check if using legacy options
function isLegacyOptions(options: ProviderOptions): options is LegacyProviderOptions {
  return 'key' in options && 'secret' in options;
}

// Extract region from legacy amazon URL
function extractRegionFromUrl(amazonUrl: string): string | undefined {
  const match = amazonUrl.match(/email\.([a-z0-9-]+)\.amazonaws\.com/);
  return match?.[1];
}

// Convert to array for SES API
function toAddressList(value: string | string[] | undefined): string[] | undefined {
  if (!value) return undefined;
  return Array.isArray(value) ? value : [value];
}

export { isLegacyOptions, extractRegionFromUrl, toAddressList };
