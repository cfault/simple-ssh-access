'use strict';
const child_process = require('child_process')
child_process.execSync(`rm -rf /tmp/a/.ssh/authorized_keys`);
child_process.execSync(`rm -rf /tmp/b/.ssh/authorized_keys`);
child_process.execSync(`rm -rf /tmp/c/.ssh/authorized_keys`);

const app = require('./app.js');

app.run().then();