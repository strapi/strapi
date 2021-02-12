import createDefaultCTFormFromLayout from './createDefaultCTFormFromLayout';

const createDefaultForm = ({ conditions, sections: { collectionTypes, singleTypes } }) => {
  return {
    collectionTypes: createDefaultCTFormFromLayout(
      collectionTypes,
      collectionTypes.actions || [],
      conditions
    ),
    singleTypes: createDefaultCTFormFromLayout(singleTypes, singleTypes.actions || [], conditions),
  };
};

export default createDefaultForm;
