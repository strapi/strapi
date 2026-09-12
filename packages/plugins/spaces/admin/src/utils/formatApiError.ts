/**
 * The message a Strapi API error carries, or a last-resort fallback.
 *
 * Server-side validation is where most of the useful wording lives — which
 * slug is taken, why a space cannot be archived — so it is shown as-is rather
 * than replaced with a generic failure notice.
 */
export const formatApiError = (error: unknown): string => {
  const apiMessage = (error as { data?: { error?: { message?: string } } })?.data?.error?.message;

  return apiMessage ?? (error as { message?: string })?.message ?? 'Something went wrong.';
};
