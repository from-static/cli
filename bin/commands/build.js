const { mkdirSync, rmdirSync, existsSync, readFileSync, writeFileSync, cpSync } = require('node:fs');
const { join } = require('node:path');
const { execSync } = require('node:child_process');

exports.command = 'build';
exports.desc = 'build from static.json';
exports.builder = function (yargs) {
  yargs
  .option('out-directory', {
    alias: 'out',
    type: 'string',
    default: './out',
    describe: 'path the "out" directory will be saved to'
  })
  .option('next-base-path', {
    type: 'string',
    describe: 'Next.js basePath option'
  })
}
exports.handler = function (argv) {
  const staticExists = existsSync(argv.path);
  if (!staticExists) {
    throw Error(`Unable to locate ${argv.path}`);
  }

  const STATIC = JSON.parse(readFileSync(argv.path));

  const workspace = join(__dirname, '..', 'workspace');

  const exists = existsSync(workspace);
  if (exists) {
    rmdirSync(workspace, {
      recursive: true
    });
  }

  mkdirSync(workspace);

  const {
    application,
    version
  } = STATIC['_static']; 

  execSync(`cd ${workspace} && git clone ${application} . && npm ci`);

  writeFileSync(join(workspace, 'static.json'), JSON.stringify(STATIC));

  const nextConfiguration = {
    output: 'export'
  }

  if (argv.nextBasePath) {
    nextConfiguration.basePath = argv.nextBasePath
  }

  writeFileSync(
    join(workspace, 'next.config.js'),
    `module.exports = ${JSON.stringify(nextConfiguration)}`
  )

  execSync(`cd ${workspace} && npm run build`);

  cpSync(join(workspace, 'out'), argv.out, {
    recursive: true
  });

  rmdirSync(workspace, {
    recursive: true
  });
}
