'use strict';

var constant = require('./utils').constant;

var parsed = Symbol('parsed');
var imported = Symbol('imported');

function Context(options) {
  if (!(this instanceof Context))
    return new Context(options);
  options = options || {};
  constant(this,'lenient',options.lenient);
  constant(this,'in',options.in);
  constant(this,'reporter',options.reporter);
}
Context.prototype = {
  set parsed(val) {
    if (!this[parsed]) this[parsed] = val;
  },
  get parsed() {
    return this[parsed];
  },
  set imported(val) {
    if (!this[imported]) this[imported] = val;
  },
  get imported() {
    return this[imported];
  }
};

module.exports = Context;
