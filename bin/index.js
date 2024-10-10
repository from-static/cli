#!/usr/bin/env node

const { mkdirSync, rmSync, existsSync, readFileSync } = require('node:fs');
const { join } = require('node:path');
const { execSync } = require('node:child_process');

const pm2 = require('pm2');
const chokidar = require('chokidar');


let INITIAL_PREVIEW_STARTED = false;

function preview({ workspace }) {
  pm2.connect(function(err) {
    if (err) {
      console.error(err);
      process.exit(2);
    }
    pm2.start({
      name: 'static-preview',
      script: 'npm',
      args: ['run', 'preview'],
      cwd: workspace,
    }, function (err, apps) {
      if (err) {
        console.error(err);
        return pm2.disconnect();
      }
      console.log('Preview process started.');
      /**
       * Artificially delay the initial process start to prevent the watcher from
       * attempting to restart the process on the initial `add` events and generator
       * startup commands.
       */
      setTimeout(() => {
        INITIAL_PREVIEW_STARTED = true;
      }, 5000);
    });
  });
}

/**
 * Clone the referenced generator repository to a local directory (workspace).
 */
function cloneGenerator({ workspace, STATIC }) {
  const exists = existsSync(workspace);
  if (exists) {
    /**
     * Remove the workspace if it exists.
     */
    rmSync(workspace, {
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
}

require('yargs/yargs')(process.argv.slice(2))
  .command('preview', 'preview a site generated from a static.json file', (yargs) => {
    yargs
    .option('path', {
      type: 'string',
      default: process.cwd(),
      describe: 'path to the application to preview'
    })
    .option('skip-clone', {
      type: 'boolean',
      default: false,
      describe: 'skip cloning the generator repository'
    })
  }, (argv) => {
    const STATIC_FILE_PATH = join(argv.path, 'static.json');

    const staticExists = existsSync(STATIC_FILE_PATH);
    if (!staticExists) {
      throw Error(`Unable to locate ${STATIC_FILE_PATH}`);
    }

    const STATIC = JSON.parse(readFileSync(STATIC_FILE_PATH));

    const workspace = '.static--preview';

    if (!argv.skipClone) {
      cloneGenerator({ workspace, STATIC });
    }

    /**
     * Copy the static.json file to the workspace.
     */
    console.log('Symlinking your static.json file to the workspace...');
    execSync(`ln -sf ${STATIC_FILE_PATH} ${join(workspace, 'static.json')}`);

    const CONTENT = join(argv.path, 'content');
    const hasContentDirectory = existsSync(CONTENT);

    /**
     * If there is no `content` directory we can just run the preview command.
     */
    if (!hasContentDirectory) {
      return preview({ workspace });
    }

    console.log('Copying your content/ directory to the workspace...');
    const CONTENT_CMD = `cp -r ${CONTENT} ${join(workspace)}`;
    execSync(CONTENT_CMD);
    
    chokidar.watch(CONTENT).on('all', (event, path) => {
      if (!INITIAL_PREVIEW_STARTED) {
        return;
      }
      console.log('Changes detected in the content/ directory...');
      execSync(CONTENT_CMD);
      console.log('Restarting the preview process...');

      pm2.restart('static-preview', (err, proc) => {
        if (err) {
          console.error(err);
          return pm2.disconnect();
        }
        console.log('Preview process restarted.');
      });
    });
    preview({ workspace });
  })
  .help()
  .argv

  process.on('SIGINT', function() {
    console.log('Shutting down the preview process...');
    pm2.delete('static-preview', (err, proc) => {
      if (err) {
        console.error(err);
        return pm2.disconnect();
      }
      pm2.disconnect();
      console.log('Preview process stopped.');
      process.exit();
    });
  });









