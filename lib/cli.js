'use strict';

var program = require('commander');
var util = require('util');
var fs = require('fs');

function cli(then) {
  var input;
  program.version('0.0.1')
    .option('-l, --lenient', 'Use lenient checking')
    .option('-r, --reporter [name]', 'Specify the reporter')
    .arguments('<input>')
    .action(function(i) {
      input = i;
    });
  program.parse(process.argv);
  if (input === undefined || input === '-') {
    input = process.stdin;
  } else {
    input = fs.createReadStream(input, {encoding:'utf8', autoClose:true});
  }
  input.on('error', function(err) {
    console.error(util.format('Input cannot be read. [%s]'), err.message);
    program.outputHelp();
    process.exit(1);
  }).once('readable', function() {
    var options = {};
    if (program.lenient) options.lenient = true;
    options.reporter = program.reporter; // TODO initialize the reporter
    options.in = input; // initialize the input stream
    process.nextTick(function() {then.call(global,options);});
  });
}

module.exports = cli;
