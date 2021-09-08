const customEllipsis = title => {
  const endSubstring = title.indexOf('registrationToken') + 20;
  return `${title.substring(0, endSubstring)}...${title.substring(title.length - 3, title.length)}`;
};

export default customEllipsis;
