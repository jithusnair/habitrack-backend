'use strict'

let postHabitSchema = {
  schema: {
    description: 'New Habit',
    tags : ['Habits'],
    params: {
      type: 'object',
      properties: {
        uid: { type: 'string' },
      }
    },
    body: {
      type: "object",
      required: ['title', 'action', 'time', 'location'],
      properties: {
        title: {type: 'string'},
        action: {type: "string"},
        time: {type: 'string'},
        location: {type: 'string'}
      }
    },
    response: {
      200: {
        type: 'object',
        properties: {
          id: {type: 'string'},
          title: {type: 'string'},
          action: {type: "string"},
          time: {type: 'string'},
          location: {type: 'string'}
        }
      }
    }
  }
}

let putHabitSchema = {
  schema: {
    description: 'Update Habit',
    tags : ['Habits'],
    params: {
      type: 'object',
      properties: {
        uid: { type: 'string' },
        id: { type: 'string' },
      }
    },
    body: {
      type: "object",
      required: ['title', 'action', 'time', 'location'],
      properties: {
        title: {type: 'string'},
        action: {type: "string"},
        time: {type: 'string'},
        location: {type: 'string'}
      }
    },
    response: {
      200: {
        type: 'object',
        properties: {
          id: {type: 'string'},
          title: {type: 'string'},
          action: {type: 'string'},
          time: {type: 'string'},
          location: {type: 'string'}
        }
      }
    }
  }
}

let getHabitsSchema = {
  schema: {
    description: 'List Habits',
    tags : ['Habits'],
    params: {
      type: 'object',
      properties: {
        uid: { type: 'string' },
      }
    },
    response: {
      200: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: {type: 'string'},
            title: {type: 'string'},
            action: {type: "string"},
            time: {type: 'string'},
            location: {type: 'string'},
          }
        }
      }
    }
  }
}

let getHabitSchema = {
  schema: {
    description: 'Get a Habits',
    tags : ['Habits'],
    params: {
      type: 'object',
      properties: {
        uid: { type: 'string' },
        id: { type: 'string' },
      }
    },
    response: {
      200: {
        type: 'object',
        properties: {
          id: {type: 'string'},
          title: {type: 'string'},
          action: {type: "string"},
          time: {type: 'string'},
          location: {type: 'string'},
        }
      }
    }
  }
}

let deleteHabitSchema = {
  schema: {
    description: 'Delete Habit',
    tags : ['Habits'],
    params: {
      type: 'object',
      properties: {
        uid: { type: 'string' },
        id: { type: 'string' },
      }
    },
    response: {
      204: {},
    }
  }
}

module.exports = async function (fastify, opts) {
  fastify.get('/:uid/habits', getHabitsSchema , async function (request, reply) {
    const { uid } = request.params;
    let response = await fastify.pg.query('SELECT id, title, action, time, location FROM habits WHERE uid = $1;', [ uid ])
    .then((dbResponse) =>  dbResponse.rows)
    .catch(error => {
      if(error.message.includes('invalid input syntax for type uuid')) {
        reply.unprocessableEntity('Malformed params')
      }
      console.error(error);
      reply.internalServerError();
    });
    
    return response;
  });

  fastify.get('/:uid/habits/:id', getHabitSchema , async function (request, reply) {
    const { uid, id } = request.params;
    let response = await fastify.pg.query('SELECT id, title, action, time, location FROM habits WHERE id = $1 AND uid = $2;', [ id, uid ])
    .then((dbResponse) =>  dbResponse.rows[0])
    .catch(error => {
      if(error.message.includes('invalid input syntax for type uuid')) {
        reply.unprocessableEntity('Malformed params')
      } 
      console.error(error);
      reply.internalServerError();
    });
    
    return response;
  });

  fastify.post('/:uid/habits', postHabitSchema , async function (request, reply) {
    const { uid } = request.params;
    const { title, action, time, location } = request.body;
     
    return fastify.pg.query('INSERT INTO habits (title, action, time, location, uid) VALUES ($1, $2, $3, $4, $5) RETURNING id, title, action, time, location;', [ title, action, time, location, uid ])
    .then(dbResponse => dbResponse.rows[0])
    .catch(error => {
      if(error.message.includes('invalid input syntax for type uuid')) {
        reply.unprocessableEntity('Malformed params')
      } else if(error.message.includes('duplicate key value violates unique constraint')) {
          reply.unprocessableEntity('Habit already exists');
      }
      console.error(error);
      reply.internalServerError();
    });
  });

  fastify.put('/:uid/habits/:id', putHabitSchema , async function (request, reply) {
    const { id } = request.params;
    const { title, action, time, location } = request.body;
     
    return fastify.pg.query('UPDATE habits SET title = $2, action = $3, time = $4, location = $5 WHERE id = $1 RETURNING id, title, action, time, location;', [ id, title, action, time, location ])
    .then(dbResponse => {
      if(!dbResponse.rows.length) {
        reply.unprocessableEntity('Habit not found')
      }
      return dbResponse.rows[0]
    })
    .catch(error => {
      if(error.message.includes('invalid input syntax for type uuid')) {
        reply.unprocessableEntity('Malformed params')
      } 
      console.error(error);
      reply.internalServerError();
    });
  });

  fastify.delete('/:uid/habits/:id', deleteHabitSchema , async function (request, reply) {
    const { uid, id } = request.params;
     
    let sqlQuery1 = 'DELETE FROM streaks WHERE uid = $1 AND hid = $2;';
    let values1 = [uid, id];
    let sqlQuery2 = 'DELETE FROM habits WHERE uid = $1 AND id = $2;';
    let values2 = [uid, id];

    return fastify.pg.query(sqlQuery1, values1)
    .then(() =>  fastify.pg.query(sqlQuery2, values2))
    .then(dbResponse => {
      reply.code(204);
    })
    .catch(error => {
      if(error.message.includes('invalid input syntax for type uuid')) {
        reply.unprocessableEntity('Malformed params')
      } 
      console.error(error);
      reply.internalServerError();
    });
  });
}
