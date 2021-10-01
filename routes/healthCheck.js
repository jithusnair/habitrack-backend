'use strict'

module.exports = async function (fastify, opts) {
  fastify.route({
    method: 'GET',
    url: '/',
    schema: {
      description: 'Health check endpoint',
      tags : ['Health Check'],
      response: {
        200: {
          type: 'object',
          properties: {
            status: {type: 'string'},
            timestamp: {type: 'string', format: 'date-time'},
            hugs : {type: 'string'}
          }
        }
      }
    },
    handler:  async function (request, reply) {
      return { status: 'ok', timestamp:  new Date().toISOString(), hugs: fastify.someSupport() };
    }
  });
}
