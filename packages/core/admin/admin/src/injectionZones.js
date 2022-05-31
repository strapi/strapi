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
    homepage: { 'content-top': [], 'content-bottom': [] },
  },
  contentManager: {
    editView: {
      informations: [],
      'right-links': [],
      'header-actions': [],
      'before-form': [],
      'after-form': [],
    },
    listView: {
      actions: [],
      deleteModalAdditionalInfos: [],
      'header-actions': [],
      'bulk-actions': [],
      'action-icons': [],
    },
  },
};

export default injectionZones;
