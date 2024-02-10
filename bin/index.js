#!/usr/bin/env node

const { mkdirSync, rmdirSync, existsSync, readFileSync, writeFileSync, cpSync } = require('node:fs');
const { join } = require('node:path');
const { execSync } = require('node:child_process');

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
    .option('next-base-path', {
      type: 'string',
      describe: 'Next.js basePath option'
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

    const {
      application,
      version
    } = STATIC['_static']; 
    /**
     * Clone the application into our workspace and install the dependencies.
     */
    execSync(`cd ${workspace} && git clone ${application} . && npm ci`);
    /**
     * Copy the static.json file to the workspace.
     */
    writeFileSync(join(workspace, 'static.json'), JSON.stringify(STATIC));
    /**
     * Create a Next.js configuration that will result in a static export.
     */
    const nextConfiguration = {
      output: 'export'
    }
    /**
     * Allow for specifying the basePath option for Next.js.
     * This is useful (required) for deploying a repository on GitHub Pages (without a CNAME).
     */
    if (argv.nextBasePath) {
      nextConfiguration.basePath = argv.nextBasePath
    }
    /**
     * Write the Next.js configuration to the workspace.
     */
    writeFileSync(
      join(workspace, 'next.config.js'),
      `module.exports = ${JSON.stringify(nextConfiguration)}`
    )
    /**
     * Run the build command (expected to run `next build`)
     */
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









