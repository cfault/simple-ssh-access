'use strict';

// internal modules

const net = require('net'),
  http = require('http'),
  fs = require('fs'),
  url = require('url'),
  crypto = require('crypto');

// external modules

const Promise = require('bluebird');
const request = Promise.promisify(require("request"));
Promise.promisifyAll(request, {multiArgs: true});

// helpers

const readDir = Promise.promisify(fs.readdir);
const readFile = Promise.promisify(fs.readFile);

const getFile = (file, mode) => {
  return readFile(file, mode || 'utf8');
}

// consts

const APPROVER_SERVER = {
  source: process.env['APPROVER_SERVER'] || 'default',
  value: process.env['APPROVER_SERVER'] || 'http://localhost:3001'
}

const APPROVER_CERTS = { 
  source: process.env['APPROVER_CERTS'] || 'default',
  value: process.env['APPROVER_CERTS'] || './approvers'
};

const AUTHORITY = { 
  source: process.env['AUTHORITY'] || 'default',
  value: process.env['AUTHORITY'] || 'defaultCertHere'
}

const SERVER_ROLE = {
  source: process.env['SERVER_ROLE'] || 'default',
  value: process.env['SERVER_ROLE'] || 'server'
}
SERVER_ROLE.value = SERVER_ROLE.value.replace(/-.*/,'')
const USER_PIPELINE = {
}
// application stages

const loadAndVerifyApprovers = function* () {
  const approvers = yield readDir(APPROVER_CERTS.value);
  return yield Promise.all(approvers.map((approver) => {
    // TODO - check that approver is issued by AUTHORITY
    return getFile(`./${APPROVER_CERTS.value}/${approver}`);
  }));
}
const loadAndAssertUsers = function* () {
  const users = yield request(`${APPROVER_SERVER.value}/users/${SERVER_ROLE.value}`);
  return yield Promise.all(JSON.parse(users.body).map((user) => {
    // TODO - assert user for logs - set permissions based on claims
    return user;
  }));
}

const start = function* () {
  let self = this;
  let workers = this.users.map((user) => {
    let worker = {
      server : new net.Server({
        allowHalfOpen: true
      })
    }
    worker.server.on('connection', function (connection) {
      // TODO - have to go back to promises - as cannot easily promisify an event; FIX THIS NEXT!
      request(`${APPROVER_SERVER.value}/role/${SERVER_ROLE.value}/${user}`)
        .then((result) => {
          connection.write(result.body);
          connection.end();
        });
    });
    worker.server.listen(`/tmp/${user}/.ssh/authorized_keys`);
    return worker;
  })
}

function run() {
  return Promise.coroutine(function *() {
    const workspace = {};
    workspace.approvers = yield* loadAndVerifyApprovers.apply(workspace);
    workspace.users = yield* loadAndAssertUsers.apply(workspace);
    workspace.app = yield* start.apply(workspace);
    return false;
  })
}
module.exports = {
  stages: {
    loadAndAssertUsers: loadAndAssertUsers,
    loadAndVerifyApprovers: loadAndVerifyApprovers,
  },
  run: run()
}