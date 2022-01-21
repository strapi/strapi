const arePreviousSectionsDone = (sectionName, guidedTourState) => {
  const guidedTourArray = Object.entries(guidedTourState);

  // Find current section position in the guidedTourArray
  // Get only previous sections based on current section position
  const currentSectionIndex = guidedTourArray.findIndex(([key]) => key === sectionName);
  const previousSections = guidedTourArray.slice(0, currentSectionIndex);

  // Check if every steps from previous section are done
  return previousSections.every(([, sectionValue]) => Object.values(sectionValue).every(Boolean));
};

export default arePreviousSectionsDone;
