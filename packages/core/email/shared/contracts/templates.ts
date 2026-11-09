export interface TemplateContent {
  subject: string;
  html: string;
  text: string;
}

export interface TemplateSummary {
  key: string;
  description: string;
  /** Locales that can be served: `en` (the defaults) plus every locale with a stored override. */
  locales: string[];
  /** True when at least one locale has a stored override. */
  customised: boolean;
}

export interface TemplateDetail extends TemplateContent {
  key: string;
  /** The locale that was asked for. The content may come from `en` or the defaults, see `isDefault`. */
  locale: string;
  variables: string[];
  /** True when the content is the registered default, not a stored row. */
  isDefault: boolean;
}

/**
 * A variable a template declares: its name, or the name with `secret: true` when its value gives access to
 * something, such as a reset link or a one-time code. A secret may only appear in text or in an `<a href>`.
 */
export type TemplateVariable = string | { name: string; secret?: boolean };

export interface TemplateDefinition {
  defaults: TemplateContent;
  variables: TemplateVariable[];
  description?: string;
}
