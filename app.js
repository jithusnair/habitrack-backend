'use strict'

const path = require('path');
const AutoLoad = require('fastify-autoload');

module.exports = async function (fastify, opts) {
  // Place here your custom code!

  // Fastify CORS setup
  fastify.register(require('fastify-cors'), { 
    origin: true, //add more valid origins
    credentials: true,
  });

  // load cookie module
  fastify.register(require('fastify-cookie'), {
    // secret: "my-secret", // for cookies signature
    // parseOptions: {}     // options for parsing cookies
  });

  // Load jwt module
  fastify.register(require('fastify-jwt'), {
    secret: process.env.JWT_SECRET,
    cookie: {
      cookieName: 'token',
      signed: false
    }
  });

  // load db
  fastify.register(require('fastify-postgres'), {
    connectionString: `postgres://${process.env.PGUSER}:${process.env.PGPASSWORD}@${process.env.PGHOST}:${process.env.PGPORT}/${process.env.PGDATABASE}`,
  });

  fastify.register(require('./plugins/dbSetup'));

  // Swagger Documentation
  fastify.register(require('fastify-swagger'), {
    routePrefix: '/documentation',
    swagger: {
      info: {
        title: 'Habitrack API',
        description: 'API for Habitrack app',
        version: '0.1.0'
      },
    },
    exposeRoute: true
  });

  // Do not touch the following lines

  // This loads all plugins defined in plugins
  // those should be support plugins that are reused
  // through your application
  fastify.register(AutoLoad, {
    dir: path.join(__dirname, 'plugins'),
    options: Object.assign({}, opts)
  })

  // This loads all plugins defined in routes
  // define your routes in one of these
  fastify.register(AutoLoad, {
    dir: path.join(__dirname, 'routes'),
    options: Object.assign({}, opts)
  })
}
