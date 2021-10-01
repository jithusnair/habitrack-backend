let postStreakSchema = {
  schema: {
    description: 'Habit completion timestamp',
    tags : ['Streak'],
    params: {
      type: 'object',
      properties: {
        uid: { type: 'string' },
      }
    },
    body: {
      type: "object",
      required: ['hid'],
      properties: {
        hid: {type: 'string'},
        completed_on: {type: 'string', format: 'date-time'}
      }
    },
  }
}

let getHabitStreakByDateSchema = {
  schema: {
    description: 'Get habit completion data. This endpoint requires query strings.',
    tags : ['Streak'],
    params: {
      type: 'object',
      properties: {
        uid: { type: 'string' },
      }
    },
    query: {
      type: 'object',
      required: ['startDate', 'endDate'],
      properties: {
        startDate: {type: 'string', format: 'date-time'},
        endDate: {type: 'string', format: 'date-time'},
        hid: { type: 'string' },
      }
    },
    response: {
      200: {
        type: "array",
        items: {
          type: 'object',
          properties: {
            id: {type: 'string'},
            title: { type: 'string' },
            created_on: {type: 'string', format: 'date-time'},
            completed_dates: {
              oneOf: [
                {
                  type: 'array',
                  items: {
                    type: 'string', format: 'date-time'
                  }
                },
                {
                  type: 'array',
                  items: {
                    type: 'null',
                  }
                },
              ]
            },
            total: { type: 'number'}
          }
        }
      }
    }
  }
}


let deleteHabitStreakByDateSchema = {
  schema: {
    description: 'Get habit completion data. This endpoint requires query strings.',
    tags : ['Streak'],
    params: {
      type: 'object',
      properties: {
        uid: { type: 'string' },
        hid: { type: 'string' },
      }
    },
    query: {
      type: 'object',
      required: ['startDate', 'endDate'],
      properties: {
        startDate: {type: 'string', format: 'date-time'},
        endDate: {type: 'string', format: 'date-time'},
      }
    },
  }
}

let getScoreboardSchema = {
  schema: {
    description: 'Get a scoreboard of highest streaks',
    tags : ['Streak'],
    params: {
      type: 'object',
      properties: {
        uid: { type: 'string' },
      }
    },
    response: {
      200: {
        type: "array",
        items: {
          type: 'object',
          properties: {
            id: {type: 'string'},
            habit: { type: 'string' },
            streak: { type: 'number' }
          },
        }
      }
    }
  }
}

module.exports = async function (fastify, opts) {
  fastify.post('/:uid/streaks', postStreakSchema , async function (request, reply) {
    const { uid } = request.params;

    // completed_on is only added for testing purposes
    // remove it and this comment for production
    const { completed_on, hid } = request.body;

    return fastify.pg.query('INSERT INTO streaks ( uid, hid, completed_on ) VALUES ($1, $2, $3) RETURNING id, hid, completed_on', [ uid, hid, completed_on ])
    .then((dbResponse) =>  dbResponse.rows)
    .catch(error => {
      if(error.message.includes('invalid input syntax for type uuid')) {
        reply.unprocessableEntity('Malformed params')
      }
      console.error(error);
      reply.internalServerError();
    });
  });

  fastify.get('/:uid/streaks', getHabitStreakByDateSchema , async function (request, reply) {
    const { uid } = request.params;
    const { startDate, endDate, hid } = request.query;

    let sqlQuery = ``;
    let values = [];
    if(hid) {
      sqlQuery = `SELECT id, title, created_on, json_agg(completed_on) as completed_dates, COUNT(completed_on) as total FROM 
        (SELECT habits.id, habits.title, habits.created_on, tbl.completed_on, habits.uid FROM habits LEFT JOIN 
          (SELECT * FROM streaks WHERE completed_on >= $1 AND completed_on <= $2 AND uid = $3)
        as tbl ON habits.id = tbl.hid)
      as final_table WHERE id = $4 AND uid = $3 GROUP BY id, title, created_on ORDER BY created_on DESC;`;
      values = [startDate, endDate, uid, hid];
    } else {
      sqlQuery = `SELECT id, title, created_on, json_agg(completed_on) as completed_dates, COUNT(completed_on) as total FROM 
        (SELECT habits.id, habits.title, habits.created_on, tbl.completed_on, habits.uid FROM habits LEFT JOIN 
          (SELECT * FROM streaks WHERE completed_on >= $1 AND completed_on <= $2 AND uid = $3)
        as tbl ON habits.id = tbl.hid)
      as final_table WHERE uid = $3 GROUP BY id, title, created_on ORDER BY created_on DESC;`;
      values = [startDate, endDate, uid]
    }

    return fastify.pg.query(sqlQuery, values)
    .then((dbResponse) =>  dbResponse.rows)
    .catch(error => {
      if(error.message.includes('invalid input syntax for type uuid')) {
        reply.unprocessableEntity('Malformed params')
      }
      console.error(error);
      reply.internalServerError();
    });
  });

  fastify.delete('/:uid/streaks/:hid', deleteHabitStreakByDateSchema , async function (request, reply) {
    const { uid, hid } = request.params;
    const { startDate, endDate } = request.query;

    let sqlQuery = 
      `DELETE FROM streaks WHERE uid = $1 AND hid = $2 ANd completed_on >= $3 AND completed_on <= $4;`;

    return fastify.pg.query(sqlQuery, [uid, hid, startDate, endDate ])
    .then((dbResponse) =>  {
      if(dbResponse.rowCount === 0) {
        reply.conflict('No resource to delete');
      }
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

  fastify.get('/:uid/streaks/scoreboard', getScoreboardSchema , async function (request, reply) {
    const { uid } = request.params;

    let sqlQuery = 
      `SELECT habits.id as id, title as habit, biggest_streak as streak FROM 
        (SELECT hid, MAX(streaks) as biggest_streak FROM (SELECT hid, difference, COUNT(difference) as streaks FROM 
          (
            SELECT hid, completed_on, island, 
            ROW_NUMBER() OVER() - SUM(CASE WHEN island THEN 1 ELSE 0 END) OVER (ORDER BY hid, completed_on) as difference FROM 
            (
              SELECT hid, completed_on, 
              ((lag(completed_on) OVER (ORDER BY hid, completed_on))::date >= (completed_on - interval '1 day')::date) AS island
              FROM streaks WHERE uid = $1
            ) 
            as tbl ORDER BY hid, completed_on
          )
          as anotherTbl 
          GROUP BY hid, difference ORDER BY streaks DESC) 
        as groupedTable GROUP BY hid) as finalTable 
      RIGHT JOIN habits ON finalTable.hid = habits.id ORDER BY streak DESC;`;

    return fastify.pg.query(sqlQuery, [ uid ])
    .then((dbResponse) =>  dbResponse.rows)
    .catch(error => {
      if(error.message.includes('invalid input syntax for type uuid')) {
        reply.unprocessableEntity('Malformed params')
      }
      console.error(error);
      reply.internalServerError();
    });
  });
}