/**
 * Hidden field holding the position of an entry in the custom order of its collection type.
 * It is never part of the content type schema sent to the admin, it can only be sorted on.
 */
const CUSTOM_ORDER_FIELD = 'strapi_position';

const CUSTOM_ORDER_SORT = `${CUSTOM_ORDER_FIELD}:ASC`;

const CUSTOM_ORDER_FUTURE_FLAG = 'unstableCustomOrder';

const isCustomOrderFeatureEnabled = () =>
  window.strapi.future.isEnabled(CUSTOM_ORDER_FUTURE_FLAG) === true;

export { CUSTOM_ORDER_FIELD, CUSTOM_ORDER_SORT, isCustomOrderFeatureEnabled };
