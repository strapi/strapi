/**
 * Admin injection zones:
 * Available zones: Content Manager listView & editView
 * @constant
 * @type {Object}
 */
const injectionZones = {
  admin: {
    // Temporary injection zone, support for the react-tour plugin in foodadvisor
    tutorials: {
      links: [],
    },
    leftMenu: {
      aboveContentManager: [],
      bellowContentManager: []
    },
  },
  contentManager: {
    editView: { informations: [], 'right-links': [] },
    listView: {
      actions: [],
      deleteModalAdditionalInfos: [],
      publishModalAdditionalInfos: [],
      unpublishModalAdditionalInfos: [],
    },
  },
};

export default injectionZones;
