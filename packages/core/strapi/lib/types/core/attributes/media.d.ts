import type { Attribute } from '@strapi/strapi';

export type MediaKind = 'images' | 'videos' | 'files' | 'audios';

export interface MediaProperties<
  TKind extends MediaKind | undefined = undefined,
  TMultiple extends boolean = false
> {
  allowedTypes?: TKind;
  multiple?: TMultiple;
}

export type Media<
  TKind extends MediaKind | undefined = undefined,
  TMultiple extends boolean = false
> = Attribute.OfType<'media'> &
  // Properties
  MediaProperties<TKind, TMultiple> &
  // Options
  Attribute.ConfigurableOption &
  Attribute.RequiredOption &
  Attribute.PrivateOption;

// TODO: Introduce a real type for the media values
export type MediaValue<TMultiple extends boolean = false> = TMultiple extends true ? any[] : any;

export type GetMediaValue<TAttribute extends Attribute.Attribute> = TAttribute extends Media<
  // Unused as long as the media value is any
  infer _TKind,
  infer TMultiple
>
  ? MediaValue<TMultiple>
  : never;
