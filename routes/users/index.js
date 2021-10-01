'use strict'

/**
 * Registration schema definition
 */
const registerSchema = {
  schema: {
    description: 'User Registration endpoint',
    tags : ['User Auth'],
    body: {
      type: "object",
      required: ['full_name', 'email', 'password'],
      properties: {
        full_name: {type: 'string'},
        email: {type: "string"},
        password: {type: 'string'}
      }
    },
    response: {
      200: {
        type: 'object',
        properties: {
          id: {type: 'string'},
          full_name: {type: 'string'},
          email: {type: 'string', format: "email"},
          password: {type: 'string'}
        }
      }
    }
  }
};

/**
 * Login schema definition
 */
const loginSchema = {
  schema: {
    description: 'Login Endpoint',
    tags : ['User Auth'],
    body: {
      type: 'object',
      required: ['email', 'password'],
      properties: {
        email: {type: 'string'},
        password: {type: 'string'}
      },
    },
    response: {
      200: {
        type: "object",
        properties: {
          uid: {type: 'string'},
          full_name: {type: 'string'},
          email: {type: 'string', format: "email"},
          token: {type: 'string'},
        },
      }
    }
  }
}

module.exports = async function (fastify, opts) {
  fastify.register(require('fastify-bcrypt'), {
    saltWorkFactor: 12
  });

  
  /**
   * User endpoints
   */

  fastify.post('/register', registerSchema, async function (request, reply) {
    const {full_name, email, password} = request.body;
    
    return fastify.bcrypt.hash(password)
    .then(hash => {
      return fastify.pg.query('INSERT INTO users (full_name, email, password) values ($1, $2, $3) RETURNING *', [full_name, email, hash])
    })
    .then(dbResponse => {
      return dbResponse.rows[0];
    })
    .catch(error => {
      if(error.message === 'duplicate key value violates unique constraint "users_email_key"') {
        reply.unprocessableEntity('User already registered');
      } else {
        console.error(error);
        reply.internalServerError();
      }
    })
    ;
  })

  fastify.post('/login', loginSchema, async function (request, reply) {
    const { email, password } = request.body;

    let dbResponse = 
      await fastify.pg.query('SELECT uid, full_name, email, password FROM users WHERE email = $1', [email]);

    if(!dbResponse.rows.length) {
      reply.unauthorized('Email or password is incorrect');
    }

    return fastify.bcrypt.compare(password, dbResponse.rows[0].password)
    .then(match => {
      if(match) {
        const token = fastify.jwt.sign({
          uid: dbResponse.rows[0].uid,
          full_name: dbResponse.rows[0].full_name,
          email: email,
        });
        return {
          uid: dbResponse.rows[0].uid,
          full_name: dbResponse.rows[0].full_name,
          email: email,
          token
        }
      } else {
        reply.unauthorized('Email or password is incorrect');
      }
    })
    .catch(error => {
      console.error(error);
      reply.internalServerError();
    });
  });
}
