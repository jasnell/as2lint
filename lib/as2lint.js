
// Validator
// CLI
//  - First, create a validation context
//    - Take input options:
//      - What to validate (read from stream)
//      - Validation options (strict/lenient)
//      - How to report (reporter)
//  - Once we have the validation context established, kick off the process
//
'use strict';
var async = require('async');
var as = require('activitystrea.ms');
var uri = require('uri-js');
var Context = require('./context');
var CLI = require('./cli');
var LanguageTag = require('rfc5646');
var voc = require('linkeddata-vocabs').as;
var xsd = require('linkeddata-vocabs').xsd;

function cli(then) {
  CLI(function(options) {
    exports.validate(options, then);
  });
}

function readStream(next) {
  var dat = '';
  this.in.on('data', function(chunk) {
    dat += chunk;
  }).on('end', function() {
      next(null,dat);
  });
}

function parseStream(data, next) {
  try {
    this.parsed = JSON.parse(data);
    next(null);
  } catch (error) {
    next('Invalid',this);
  }
}

function checkJson(next) {
  var obj = this.parsed;
  if (Array.isArray(obj) || typeof obj !== 'object') {
    console.error('Invalid root.');                 // error must be an object
    next('Invalid', this);
    return;
  }
  if (!obj.hasOwnProperty('@context') ||
      obj['@context'] === undefined ||
      obj['@context'] === null) {
    console.log('No Context');                      // warning no context
  }
  if (!obj.hasOwnProperty('@id') ||
      obj['@id'] === undefined ||
      obj['@id'] === null) {
    console.log('No @id');                           // warning no @id
  }
  if (!obj.hasOwnProperty('@type') ||
       obj['@type'] === undefined ||
       obj['@type'] === null) {
    console.log('No @type');                           // warning no @id
  }
  next(null);
}

function importObject(next) {
  var context = this;
  as.import(this.parsed, function(err,doc) {
    if (err) {
      next('Invalid', context);
    } else {
      context.imported = doc;
      next(null);
    }
  });
}

var blank = /^_:[^\s]+$/;
function isBlankNode(iri) {
  var res = blank.exec(iri);
  return res !== null && res !== undefined;
}

function checkUri(iri, absolute, context) {
  var result = uri.parse(iri);
  if (result.error) {
    return false; // need to report the error
  }
  if (absolute && result.reference == 'relative') {
    return false; // need to report the error
  }
  return true;
}

function checkLanguageValue(key, vals, context) {
  vals.forEach(function(val) {
    if (val === undefined || val === null) {
      console.log('Error!');
      return false;
    }
    if (typeof val['@value'] !== 'string') {
      console.log(key + ' must have a string value!');
      return false;
    }
    if (val['@language'] !== undefined) {
      var lang = new LanguageTag(val['@language']);
      if (lang.invalid) {
        console.log(key + ' must have a valid language tag');
        return false;
      }
    }
    return true;
  });
}

function checkObjects(vals, context) {
  vals.forEach(function(val) {
    as.import(val, function(err, obj) {
      checkObject(obj, context);
    });
  });
}

function functionalCheck(next, name, vals, context) {
  if (vals.length > 1) {
    console.log(name + ' is functional. multiple values are not allowed');
    return false;
  } else {
    return next(vals, context);
  }
}

var field_checkers = {};
field_checkers[voc.displayName] =
  checkLanguageValue.bind(null,'displayName');
field_checkers[voc.title] =
  checkLanguageValue.bind(null,'title');
field_checkers[voc.summary] =
  checkLanguageValue.bind(null,'summary');
field_checkers[voc.content] =
  checkLanguageValue.bind(null,'content');

field_checkers[voc.current] =
  functionalCheck.bind(
    null,
    checkObjects.bind(null),
    'current');
field_checkers[voc.first] =
  functionalCheck.bind(
    null,
    checkObjects.bind(null),
    'first');
field_checkers[voc.last] =
  functionalCheck.bind(
    null,
    checkObjects.bind(null),
    'last');
field_checkers[voc.next] =
  functionalCheck.bind(
    null,
    checkObjects.bind(null),
    'next');
field_checkers[voc.prev] =
  functionalCheck.bind(
    null,
    checkObjects.bind(null),
    'prev');

field_checkers[voc.location] =
  checkObjects.bind(null);
field_checkers[voc.actor] =
  checkObjects.bind(null);
field_checkers[voc.attachment] =
  checkObjects.bind(null);
field_checkers[voc.attributedTo] =
  checkObjects.bind(null);
field_checkers[voc.bcc] =
  checkObjects.bind(null);
field_checkers[voc.bto] =
  checkObjects.bind(null);
field_checkers[voc.cc] =
  checkObjects.bind(null);
field_checkers[voc.context] =
  checkObjects.bind(null);
field_checkers[voc.generator] =
  checkObjects.bind(null);
field_checkers[voc.icon] =
  checkObjects.bind(null);
field_checkers[voc.image] =
  checkObjects.bind(null);
field_checkers[voc.inReplyTo] =
  checkObjects.bind(null);
field_checkers[voc.instrument] =
  checkObjects.bind(null);
field_checkers[voc.items] =
  checkObjects.bind(null);
field_checkers[voc.oneOf] =
  checkObjects.bind(null);
field_checkers[voc.anyOf] =
  checkObjects.bind(null);
field_checkers[voc.origin] =
  checkObjects.bind(null);
field_checkers[voc.object] =
  checkObjects.bind(null);
field_checkers[voc.preview] =
  checkObjects.bind(null);
field_checkers[voc.result] =
  checkObjects.bind(null);
field_checkers[voc.replies] =   // possibly removing
  checkObjects.bind(null);
field_checkers[voc.scope] =
  checkObjects.bind(null);
field_checkers[voc.self] =
  checkObjects.bind(null);
field_checkers[voc.tag] =
  checkObjects.bind(null);
field_checkers[voc.target] =
  checkObjects.bind(null);
field_checkers[voc.to] =
  checkObjects.bind(null);
field_checkers[voc.url] =
  checkObjects.bind(null);

function checkNumber(name, type, min, max, vals, context) {
  vals.forEach(function(val) {
    var v = val['@value'];
    if (typeof v !== 'number') {
      console.log(name + ' value must be a number!');
      return false;
    }
    if (type && val['@type'] !== type) {
      console.log(name + ' value must be an ' + type);
      return false;
    }
    if (min !== undefined && !isNaN(min)) {
      if (v < min) {
        console.log(name + ' must not be less than ' + min);
        return false;
      }
    }
    if (max !== undefined && !isNaN(max)) {
      if (v > max) {
        console.log(name + ' must not be more than ' + min);
        return false;
      }
    }
  });
}

field_checkers[voc.accuracy] =
  functionalCheck.bind(
    null,
    checkNumber.bind(null, 'accuracy', xsd.float, 0, 100),
    'accuracy');

field_checkers[voc.altitude] =
  functionalCheck.bind(
    null,
    checkNumber.bind(null, 'altitude', xsd.float, undefined, undefined),
    'altitude');

field_checkers[voc.height] =
  functionalCheck.bind(
    null,
    checkNumber.bind(null, 'height', xsd.nonNegativeInteger, 0, undefined),
    'height');

field_checkers[voc.width] =
  functionalCheck.bind(
    null,
    checkNumber.bind(null, 'width', xsd.nonNegativeInteger, 0, undefined),
    'width');

field_checkers[voc.itemsPerPage] =
  functionalCheck.bind(
    null,
    checkNumber.bind(null, 'itemsPerPage', xsd.nonNegativeInteger,
      0, undefined),
    'itemsPerPage');

field_checkers[voc.priority] =
  functionalCheck.bind(
    null,
    checkNumber.bind(null, 'priority', xsd.nonNegativeInteger, 0, 100),
    'priority');

field_checkers[voc.radius] =
  functionalCheck.bind(
    null,
    checkNumber.bind(null, 'radius', xsd.float, 0, undefined),
    'radius');

field_checkers[voc.startIndex] =
  functionalCheck.bind(
    null,
    checkNumber.bind(null, 'startIndex', xsd.nonNegativeInteger, 0, undefined),
    'startIndex');

field_checkers[voc.totalItems] =
  functionalCheck.bind(
    null,
    checkNumber.bind(null, 'totalItems', xsd.nonNegativeInteger, 0, undefined),
    'totalItems');

field_checkers[voc.latitude] =
  functionalCheck.bind(
    null,
    checkNumber.bind(null, 'latitude', xsd.float, -90, 90),
    'latitude');

field_checkers[voc.longitude] =
  functionalCheck.bind(
    null,
    checkNumber.bind(null, 'longitude', xsd.float, -180, 180),
    'longitude');

field_checkers[voc.href] =
  functionalCheck.bind(
    null,
    function(vals, context) {
      vals.forEach(function(val) {
        var v = uri.parse(val);
        if (v.error) {
          console.log('href must be a valid URI');
          return false;
        }
      });
    }
  );

field_checkers[voc.hreflang] =
  functionalCheck.bind(
    null,
    function(vals, context) {
      vals.forEach(function(val) {
        var lang = new LanguageTag(val);
        if (lang.invalid) {
          console.log('hreflang must be a valid language tag');
          return false;
        }
      });
    }
  );

field_checkers[voc.alias] =
  functionalCheck.bind(
    null,
    function(vals, context) {
      vals.forEach(function(val) {
        var i = uri.parse(val['@value']);
        if (i.error) {
          console.log('alias must be a valid URI');
          return false;
        }
        return true;
      });
    },
    'alias'
  );

field_checkers[voc.duration] =
  functionalCheck.bind(
    null,
    function(vals, context) {
      // todo
    },
    'duration'
  );

field_checkers[voc.mediaType] =
  functionalCheck.bind(
    null,
    function(vals, context) {
      // todo
    },
    'mediaType'
  );

function checkDate(name, vals, context) {
  vals.forEach(function(val) {
    var d = new Date(val);
    if (d == 'Invalid Date') {
      console.log(name + ' must be a valid date');
      return false;
    }
    return true;
  });
}

field_checkers[voc.endTime] =
  functionalCheck.bind(
    null,
    checkDate.bind(null, 'endTime'),
    'endTime'
  );

field_checkers[voc.published] =
functionalCheck.bind(
  null,
  checkDate.bind(null, 'published'),
  'published'
);

field_checkers[voc.startTime] =
  functionalCheck.bind(
    null,
    checkDate.bind(null, 'startTime'),
    'startTime'
  );

field_checkers[voc.updated] =
  functionalCheck.bind(
    null,
    checkDate.bind(null, 'updated'),
    'updated'
  );

field_checkers[voc.rel] =
function(vals, context) {
  // todo
};

field_checkers[voc.units] =
  functionalCheck.bind(
    null,
    function(vals, context) {
      vals.forEach(function(val) {
        val = val['@value'];
        if (val === 'cm' ||
            val === 'feet' ||
            val === 'inches' ||
            val === 'km' ||
            val === 'm' ||
            val === 'miles')
              return true;
        else {
          var i = uri.parse(val);
          if (i.error || i.reference === 'relative') {
            console.log(
              'units must be one of "cm", "feet", "inches", "km", "m", ' +
              '"miles" or an absolute URI'
            );
            return false;
          }
          return true;
        }
      });
    },
    'units'
  );

field_checkers[voc.subject] =
  functionalCheck.bind(
    null,
    checkObjects.bind(null),
    'subject');
field_checkers[voc.relationship] =
  checkObjects.bind(null);
field_checkers[voc.describes] =
  functionalCheck.bind(
    null,
    checkObjects.bind(null),
    'describes');

// deprecated properties
field_checkers[voc.author] = checkObjects.bind(null);
field_checkers[voc.id] = function(vals, context) {
  // todo
};
field_checkers[voc.verb] = function(vals, context) {
  // todo
};
field_checkers[voc.objectType] = function(vals, context) {
  // todo
};
field_checkers[voc.downstreamDuplicates] = function(vals, context) {
  // todo
};
field_checkers[voc.provider] = function(vals, context) {
  // todo
};
field_checkers[voc.upstreamDuplicates] = function(vals, context) {
  // todo
};
field_checkers[voc.tags] = function(vals, context) {
  // todo
};
field_checkers[voc.attachments] = function(vals, context) {
  // todo
};
field_checkers[voc.rating] = function(vals, context) {
  // todo
};


function checkObject(object, context) {
  // check the @id
  if (object.id && !checkUri(object.id, true, this)) {
    console.error('@id is not a valid absolute IRI');
    return false;
  }

  // check the @type
  if (object.type) {
    var type = object.type;
    if (!Array.isArray(type)) type = [type];
    for (var n = 0, l = type.length; n < l; n++) {
      if (isBlankNode(type[n])) {
        console.warn('@type is a blank node! interoperability issue!');
      } else if (!checkUri(type[n], true, this)) {
        console.error('@type is not a valid absolute IRI');
        return false;
      }
    }
  }

  var checks = [];
  enumerateKeys(object, function(key, value) {
    var checker = field_checkers[key];
    if (checker) {
      checks.push(checker.bind(null,value,context));
    } else {
      console.log('No checker for ' + key);
    }
  });
  async.parallel(checks);

  return true;
}

function enumerateKeys(object, fn) {
  var symbols = Object.getOwnPropertySymbols(object);
  var symbol = symbols.filter(function(sym) {
    return sym.toString() == 'Symbol(expanded)';})[0];
  var expanded = object[symbol];
  var keys = Object.keys(expanded);
  keys.forEach(function(key) {
    if (key !== '@type' && key !== '@id')
      fn(key, expanded[key]);
  });
}

function checkImported(next) {
  var doc = this.imported;
  if (!checkObject(doc, this)) {
    next('Invalid', this);
    return;
  }
  next(null, doc);
}

function validate(options, then) {
  var context = new Context(options);
  async.waterfall([
    readStream.bind(context),
    parseStream.bind(context),
    checkJson.bind(context),
    importObject.bind(context),
    checkImported.bind(context)
  ], then);
}

exports.cli = cli;
exports.validate = validate;
