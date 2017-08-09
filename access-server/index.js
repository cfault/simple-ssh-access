'use strict';

// internal modules

const fs = require('fs');

// external modules

const restify = require('restify'),
  sway = require('sway'),
  yaml = require('js-yaml');

const controllers = {};
const server = restify.createServer();
const swagger = fs.readFileSync('./swagger.yml', 'utf8')
sway.create({definition: yaml.safeLoad(swagger)})
  .then((api) => {
  	api
  	  .getPaths()
  	  .forEach((path) => { 
  	  	path
  	  	  .getOperations()
  	  	  .forEach((operation) => {
  	  	  	const resolvedPath = path.path.replace(/\{/g, ':').replace(/\}/g,'');
  	  	  	if (!controllers.hasOwnProperty(operation['x-controller'])) {
  	  	  	  controllers[operation['x-controller']] = require(`./controllers/${operation['x-controller']}.js`)
  	  	  	}
  	  	  	// TODO - input validation etc
  	  	  	server[operation.method](resolvedPath, controllers[operation['x-controller']][operation.operationId]);
  	  	  })
  	  })
  	  server.listen(3001);
  });
