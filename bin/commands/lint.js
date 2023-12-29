const { existsSync, readFileSync } = require('node:fs');

const Ajv = require("ajv");
const ajv = new Ajv();

exports.command = 'lint';
exports.desc = 'lint a static.json file';
exports.handler = function (argv) {
  const staticExists = existsSync(argv.path);
  if (!staticExists) {
    throw Error(`Unable to locate ${argv.path}`);
  }
  let STATIC;
  try {
    STATIC = JSON.parse(readFileSync(argv.path));
  } catch (e) {
    throw Error(`Unable to parse ${argv.path} as JSON`);
  }

  const schema = {
    type: "object", 
    properties: {
      _static: {
        type: "object",
        properties: {
          application: { type: "string"},
          version: { type: "string" }
        },
        required: ["application"],
        additionalProperties: false
      },
      metadata: {
        type: "object",
        properties: {
          title: { type: "string" }, 
          description: { type: "string" }
        }
      },
      contents: {
        type: "object"
      }
    },
    required: ["_static"],
    additionalProperties: false
  }


  const validate = ajv.compile(schema);

  const valid = validate(STATIC);
  if (!valid) {
    console.error(validate.errors);
  }
}
