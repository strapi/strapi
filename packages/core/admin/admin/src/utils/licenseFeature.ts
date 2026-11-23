interface LicensedLink {
  licenseOnly?: boolean;
  licenseFeature?: string;
}

/**
 * Colour of the ⚡ that marks a paid feature on a navigation link, or `null` for no icon.
 *
 * Grey flags an upsell: the feature isn't licensed, or the link doesn't name it. Purple flags a
 * feature the trial grants. A paid license needs no marker on a feature it already includes.
 * It reads the flags that decide whether a feature's page or its purchase page is registered, so
 * the icon always matches where the link leads.
 */
const getLicenseIconFill = ({ licenseOnly, licenseFeature }: LicensedLink) => {
  if (!licenseOnly) {
    return null;
  }

  if (!licenseFeature || !window.strapi.features.isEnabled(licenseFeature)) {
    return 'neutral300';
  }

  return window.strapi.isTrial ? 'primary600' : null;
};

export { getLicenseIconFill };
