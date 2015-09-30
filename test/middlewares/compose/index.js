'use strict';

const co = require('co');

const strapi = require('../../..');

function wait (ms) {
  return function (done) {
    setTimeout(done, ms || 0);
  }
}

describe('compose middlewares', function () {
  it('should work', function (done) {
    let arr = [];
    let stack = [];

    stack.push(function * (next) {
      arr.push(1);
      yield wait(1);
      yield next;
      yield wait(1);
      arr.push(6);
    });

    stack.push(function * (next) {
      arr.push(2);
      yield wait(1);
      yield next;
      yield wait(1);
      arr.push(5);
    });

    stack.push(function * (next) {
      arr.push(3);
      yield wait(1);
      yield next;
      yield wait(1);
      arr.push(4);
    });

    co(strapi.middlewares.compose(stack))(function (err) {
      if (err) {
        throw err;
      }

      arr.should.eql([1, 2, 3, 4, 5, 6]);
      done();
    });
  });

  it('should work with 0 middleware', function (done) {
    co(strapi.middlewares.compose([]))(done);
  });

  it('should work within a generator', function (done) {
    let arr = [];

    co(function * () {
      arr.push(0);

      let stack = [];

      stack.push(function* (next) {
        arr.push(1);
        yield next;
        arr.push(4);
      });

      stack.push(function * (next) {
        arr.push(2);
        yield next;
        arr.push(3);
      });

      yield strapi.middlewares.compose(stack)

      arr.push(5);
    })(function (err) {
      if (err) {
        throw err;
      }

      arr.should.eql([0, 1, 2, 3, 4, 5]);
      done();
    });
  });

  it('should work when yielding at the end of the stack', function (done) {
    let stack = [];

    stack.push(function * (next) {
      yield next;
    });

    co(strapi.middlewares.compose(stack))(done);
  });

  it('should work when yielding at the end of the stack with yield*', function (done) {
    let stack = [];

    stack.push(function * (next) {
      yield* next;
    });

    co(strapi.middlewares.compose(stack))(done);
  });

  it('should keep the context', function (done) {
    let ctx = {};

    let stack = [];

    stack.push(function * (next) {
      yield next
      this.should.equal(ctx);
    });

    stack.push(function * (next) {
      yield next
      this.should.equal(ctx);
    });

    stack.push(function * (next) {
      yield next
      this.should.equal(ctx);
    });

    co(strapi.middlewares.compose(stack)).call(ctx, done);
  });

  it('should catch downstream errors', function (done) {
    let arr = [];
    let stack = [];

    stack.push(function * (next) {
      arr.push(1);
      try {
        arr.push(6);
        yield next;
        arr.push(7);
      } catch (err) {
        arr.push(2);
      }
      arr.push(3);
    });

    stack.push(function * (next) {
      arr.push(4);
      throw new Error();
      arr.push(5);
    });

    co(strapi.middlewares.compose(stack))(function (err) {
      if (err) {
        throw err;
      }

      arr.should.eql([1, 6, 4, 2, 3]);
      done();
    });
  });
});
