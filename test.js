'use strict';

var as2lint = require('./');

as2lint.cli(function(err, context) {
  if (err) {
    console.log(err);
  }
});
