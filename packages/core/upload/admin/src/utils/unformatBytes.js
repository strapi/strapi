function unformatBytes(value) {
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const k = 1000;

  const number = value.split(/KB|MB|GB/)[0];
  const unit = value.split(number)[1];

  const i = sizes.findIndex(size => size === unit);

  const multiplicator = k ** i;
  const newValue = number * multiplicator;

  return newValue / 1000;
}

export default unformatBytes;
