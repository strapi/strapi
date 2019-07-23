const initMap = groups => {
  const map = new Map();

  Object.keys(groups).forEach(key => {
    const {
      name,
      connection,
      collectionName,
      description,
      attributes,
    } = strapi.groups[key];

    map.set(key, {
      uid: key,
      schema: { name, connection, collectionName, description, attributes },
    });
  });

  return map;
};

const createGrougManager = ({ groups }) => {
  const groupMap = initMap(groups);

  return {
    /**
     * Returns all the groups
     */
    all() {
      return Array.from(groupMap.values());
    },

    /**
     * Returns a group by UID
     */
    get(uid) {
      return groupMap.get(uid);
    },
  };
};

module.exports = createGrougManager;
