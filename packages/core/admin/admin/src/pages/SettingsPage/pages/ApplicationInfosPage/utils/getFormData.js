const getFormData = (data) => {
  const formData = new FormData();

  Object.entries(data).forEach(([key, value]) => {
    if (value && value.rawFile instanceof File) {
      formData.append(key, value.rawFile);
    }

    if (value && value.isReset) {
      formData.append(key, null);
    }
  });

  return formData;
};

export default getFormData;
