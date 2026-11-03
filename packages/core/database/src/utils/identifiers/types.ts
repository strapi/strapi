import type { Modules } from '@strapi/types';

export type NameInput = Modules.Database.NameInput;

export type CompressibleNameToken = Modules.Database.CompressibleNameToken;

export type IncompressibleNameToken = Modules.Database.IncompressibleNameToken;

export type NameToken = Modules.Database.NameToken;

export type NameFromTokenOptions = {
  maxLength: number;
};

export type IdentifiersOptions = Modules.Database.IdentifiersOptions;

export type NameOptions = Modules.Database.NameOptions;

export type NameTokenWithAllocation = NameToken & { allocatedLength: number };
