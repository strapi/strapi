const getFeatureLabel = (data, slug) => {
  const { label } = data.find(item => item.uid === slug);
  return label;
};

export default getFeatureLabel;
