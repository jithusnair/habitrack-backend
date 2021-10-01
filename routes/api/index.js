'use strict'

let apiSchema = {
  schema: {
    description: "API welcome endpoint",
    tags : ['Health Check'],
    response: {
      200: {
        type: 'object',
        properties: {
          hi : {type: 'string'},
          timestamp: {type: 'string', format: 'date-time'},
        }
      }
    }
  },
}

module.exports = async function (fastify, opts) {
  fastify.addHook("onRequest", async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.send(err);
    }
  });

  fastify.register(require('./streaks'));

  fastify.register(require('./habits'));

  fastify.get('/', async function (request, reply) {
    return { hi: "You've reached the api endpoint. Welcome!"}
  });
}
