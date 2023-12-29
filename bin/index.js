#!/usr/bin/env node

const { mkdirSync, rmdirSync, existsSync, readFileSync, writeFileSync, cpSync } = require('node:fs');
const { join } = require('node:path');
const { execSync } = require('node:child_process');

require('yargs/yargs')(process.argv.slice(2))
  .option('path', {
    type: 'string',
    default: 'static.json',
    describe: 'path to the static.json file to processs'
  })
  .commandDir('commands')
  .help()
  .argv
  









