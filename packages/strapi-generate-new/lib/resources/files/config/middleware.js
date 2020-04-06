module.exports = {
  timeout: 100,
  load: {
    before: ['responseTime', 'logger', 'cors', 'responses', 'gzip'],
    order: [],
    after: ['parser', 'router'],
  },
};
