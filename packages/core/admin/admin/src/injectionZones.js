/**
 * Admin injection zones:
 * Available zones: Content Manager listView & editView
 * @constant
 * @type {Object}
 */
const injectionZones = {
  contentManager: {
    editView: { informations: [], 'right-links': [] },
    listView: { actions: [], deleteModalAdditionalInfos: [] },
  },
};

export default injectionZones;
