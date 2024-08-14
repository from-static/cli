#!/usr/bin/env node

const { mkdirSync, rmdirSync, existsSync, readFileSync, writeFileSync, symlinkSync } = require('node:fs');
const { join } = require('node:path');
const { execSync } = require('node:child_process');

require('yargs/yargs')(process.argv.slice(2))
  .command('preview', 'preview a site generated from a static.json file', (yargs) => {
    yargs
    .option('path', {
      type: 'string',
      default: process.cwd(),
      describe: 'path to the application to preview'
    })
  }, (argv) => {
    const STATIC_FILE_PATH = join(argv.path, 'static.json');

    const staticExists = existsSync(STATIC_FILE_PATH);
    if (!staticExists) {
      throw Error(`Unable to locate ${STATIC_FILE_PATH}`);
    }

    const STATIC = JSON.parse(readFileSync(STATIC_FILE_PATH));

    const workspace = '.static--preview';
    const exists = existsSync(workspace);
    if (exists) {
      /**
       * Remove the workspace if it exists.
       */
      rmdirSync(workspace, {
        recursive: true
      });
    }
    /**
     * Create a new workspace.
     */
    mkdirSync(workspace);

    const generator = JSON.parse(execSync(`npm show ${STATIC._static.generator.name} --json`));

    const repository = generator.repository.url.replace('git+', '');

    /**
     * Clone the application into our workspace and install the dependencies.
     */
    console.log('Cloning the generator repository and installing dependencies...');
    execSync(`cd ${workspace} && git clone ${repository} . && npm ci`);
    /**
     * Copy the static.json file to the workspace.
     */
    console.log('Symlinking your files to the workspace...');
    execSync(`ln -sf ${STATIC_FILE_PATH} ${join(workspace, 'static.json')}`);
    execSync(`ln -sf ${join(argv.path, 'content')} ${join(workspace, 'content')}`);
    /**
     * Run the ecosystem's preview command.
     */
    console.log('Starting the preview server...');
    execSync(`cd ${workspace} && npm run dev`);
  })
  .help()
  .argv









