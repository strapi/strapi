export type NameInput = string | string[];

export type CompressibleNameToken = {
  compressible: true;
  name: string;
  allocatedLength?: number;
};

export type IncompressibleNameToken = {
  compressible: false;
  name: string;
  allocatedLength?: number;
  shortName?: string;
};

export type NameToken = CompressibleNameToken | IncompressibleNameToken;

export type NameFromTokenOptions = {
  maxLength: number;
};

export type IdentifiersOptions = {
  maxLength: number;
};

export type NameOptions = {
  suffix?: string;
  prefix?: string;
};

export type NameTokenWithAllocation = NameToken & { allocatedLength: number };
