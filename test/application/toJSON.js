'use strict';

const Koa = require('../..').server;

describe('app.toJSON()', function () {
  it('should work', function () {
    const app = new Koa();
    const obj = app.toJSON();

    obj.should.eql({
      subdomainOffset: 2,
      proxy: false,
      env: 'test'
    });
  });
});
