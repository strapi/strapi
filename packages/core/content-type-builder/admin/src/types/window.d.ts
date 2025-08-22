declare global {
  interface Window {
    strapi: {
      isEE?: boolean;
      ai?: {
        enabled: boolean;
      };
      aiLicenseKey?: string;
      [key: string]: any; // Allow other properties from core admin
    };
  }
}

export {};
