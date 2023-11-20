#!/usr/bin/env node

const { mkdirSync, rmdirSync, existsSync, readFileSync, writeFileSync, cpSync } = require('node:fs');
const { join } = require('node:path');
const { execSync } = require('node:child_process');

const RENDERERS = {
  RESUME: {
    id: 'RESUME',
    repository: 'git@github.com:from-static/static-resume.git'
  },
  RESEARCH_DATA_PORTAL: {
    id: 'RESEARCH_DATA_PORTAL',
    repository: 'git@github.com:from-static/static-research-data-portal.git'
  }
}

function getRenderer(type) {
  return RENDERERS[type?.toUpperCase()];
}


require('yargs/yargs')(process.argv.slice(2))
  .command('build', 'build from static.json', (yargs) => {
    yargs
    .option('path', {
      type: 'string',
      default: 'static.json',
      describe: 'path to the static.json file to processs'
    })
    .option('out-directory', {
      alias: 'out',
      type: 'string',
      default: './out',
      describe: 'path the "out" directory will be saved to'
    })
  }, (argv) => {
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

    const renderer = getRenderer(STATIC.type);

    execSync(`cd ${workspace} && git clone ${renderer.repository} . && npm ci`);

    writeFileSync(join(workspace, 'static.json'), JSON.stringify(STATIC));

    execSync(`cd ${workspace} && npm run build`);

    cpSync(join(workspace, 'out'), argv.out, {
      recursive: true
    });

    rmdirSync(workspace, {
      recursive: true
    });
  })
  .help()
  .argv









