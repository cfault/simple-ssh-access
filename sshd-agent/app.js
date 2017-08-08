'use strict';

// internal modules

const net = require('net'),
  os = require('os'),
  http = require('http'),
  fs = require('fs'),
  url = require('url'),
  crypto = require('crypto');

// external modules

const Promise = require('bluebird');

// helpers

const readDir = Promise.promisify(fs.readdir);
const readFile = Promise.promisify(fs.readFile);
const getHttp = Promise.promisify(http.get); 
const getHTTP = (opts) => {
  return new Promise((resolve, reject) => { resolve(['a','b','c']); })
}
const getFile = (file, mode) => {
  return readFile(file, mode || 'utf8');
}

// consts

const APPROVER_SERVER = {
  source: process.env['APPROVER_SERVER'] || 'default',
  value: process.env['APPROVER_SERVER'] || 'localhost:3001'
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
  value: process.env['SERVER_ROLE'] || 'server-aabbcc',
}
const USER_PIPELINE = {
}
// application stages

const loadAndVerifyApprovers = function* () {
  const approvers = yield readDir(APPROVER_CERTS.value);
  return yield Promise.all(approvers.map((approver) => {
    // todo - check that approver is issued by AUTHORITY
    return getFile(`./${APPROVER_CERTS.value}/${approver}`);
  }));
}
const loadAndAssertUsers = function* () {
  const users = yield getHTTP({
    url: `${APPROVER_SERVER.value}/users/${SERVER_ROLE}.replace(/-.*/,'')}`
  });
  return yield Promise.all(users.map((user) => {
    // todo - assert user for logs - set permissions based on claims
    return user;
  }));
}

const start = function* () {
  let self = this;
  let workers = this.users.map((user) => {
    return new Promise((resolve, reject) => {
      const server = new net.Server();
      server.listen(`/tmp/${user}/.ssh/authorized_keys`);
      server.on('connection', function (connection) {
        getHTTP({
          url: `${APPROVER_SERVER.value}/${SERVER_ROLE}.replace(/-.*/,'')}/${user}`
        }).then((result) => {
          // todo connection.write (/ authorized keys / 
          connection.write(result[self.users.indexOf(user)])
          resolve(result);
        })
      })
    })

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