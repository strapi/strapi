const { Converter } = require('../converter');

test('1', () => {
  const c = new Converter({}, { start: 0, where: { 'user.id': 1 } });

  console.log(c.convert());
});
