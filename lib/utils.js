'use strict';

function constant(target, property, value) {
  Object.defineProperty(
    target,
    property,
    {
      configurable: false,
      enumerable: true,
      value: value
    }
  );
}
exports.constant = constant;
