/**
 * Minimal, dependency-free User-Agent parsing.
 *
 * This is intentionally heuristic and only aims to produce a human-readable label
 * (e.g. "Chrome on macOS") for displaying active sessions/devices. It is not a full
 * UA parser and should not be relied upon for feature detection.
 */

export interface ParsedUserAgent {
  browser?: string;
  os?: string;
  /** Human-readable label combining browser and OS, e.g. "Chrome on macOS". */
  deviceName?: string;
}

const detectBrowser = (ua: string): string | undefined => {
  // Order matters: more specific tokens must be checked first.
  if (/\bEdg(?:e|A|iOS)?\//.test(ua)) return 'Edge';
  if (/\b(?:OPR|Opera)\//.test(ua)) return 'Opera';
  if (/\b(?:SamsungBrowser)\//.test(ua)) return 'Samsung Internet';
  if (/\b(?:Firefox|FxiOS)\//.test(ua)) return 'Firefox';
  if (/\b(?:Chrome|CriOS|Chromium)\//.test(ua)) return 'Chrome';
  // Safari ships "Safari/xxx" but so do Chrome/Edge; only treat as Safari when no Chrome token.
  if (/\bVersion\/[\d.]+ (?:Mobile\/\S+ )?Safari\//.test(ua) || /\bSafari\//.test(ua)) {
    return 'Safari';
  }
  return undefined;
};

const detectOS = (ua: string): string | undefined => {
  if (/\bWindows NT\b/.test(ua)) return 'Windows';
  if (/\b(?:iPhone|iPad|iPod)\b/.test(ua)) return 'iOS';
  if (/\bAndroid\b/.test(ua)) return 'Android';
  // "Mac OS X" appears on iOS too, so this must come after the iOS check.
  if (/\b(?:Macintosh|Mac OS X)\b/.test(ua)) return 'macOS';
  if (/\bCrOS\b/.test(ua)) return 'ChromeOS';
  if (/\bLinux\b/.test(ua)) return 'Linux';
  return undefined;
};

/**
 * Parses a User-Agent string into a best-effort browser/OS and a display label.
 * Returns an empty object when the input is missing or unrecognized.
 */
export const parseUserAgent = (userAgent?: string | null): ParsedUserAgent => {
  if (!userAgent || typeof userAgent !== 'string') {
    return {};
  }

  const browser = detectBrowser(userAgent);
  const os = detectOS(userAgent);

  let deviceName: string | undefined;
  if (browser && os) {
    deviceName = `${browser} on ${os}`;
  } else if (browser) {
    deviceName = browser;
  } else if (os) {
    deviceName = os;
  }

  return { browser, os, deviceName };
};

/**
 * Convenience helper returning only the human-readable device label, or undefined.
 */
export const getDeviceName = (userAgent?: string | null): string | undefined =>
  parseUserAgent(userAgent).deviceName;
