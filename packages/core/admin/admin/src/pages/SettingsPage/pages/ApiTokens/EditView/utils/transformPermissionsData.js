const trimId = (id, part) => id.split('.')[part];

const transformPermissionsData = data => {
  const permissions = { collectionTypes: {}, singleTypes: {}, custom: {} };

  Object.keys(data.sections).forEach(section => {
    const currentSection = {};
    data.sections[section].subjects.forEach(subject => {
      const currentActions = {};
      subject.actions.forEach(action => {
        currentActions[trimId(action.actionId, 1)] = action.value || false;
      });
      currentSection[trimId(subject.subjectId, 0)] = currentActions;
    });
    permissions[section] = currentSection;
  });

  return permissions;
};

export default transformPermissionsData;
