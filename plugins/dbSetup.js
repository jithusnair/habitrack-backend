'use strict'

let createUsersTable = `
  CREATE TABLE IF NOT EXISTS users
  (
      uid uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
      full_name VARCHAR NOT NULL,
      email VARCHAR NOT NULL UNIQUE,
      password VARCHAR NOT NULL
  );
`;

let createHabitsTable = `
  CREATE TABLE IF NOT EXISTS habits
  (
      id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
      title VARCHAR NOT NULL UNIQUE,
      action VARCHAR NOT NULL,
      "time" time without time zone NOT NULL,
      location VARCHAR NOT NULL,
      created_on timestamp with time zone DEFAULT now(),
      uid uuid NOT NULL REFERENCES users (uid)
  );
`;

let createStreaksTable = `
  CREATE TABLE IF NOT EXISTS streaks
  (
      id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
      completed_on timestamp with time zone DEFAULT now(),
      hid uuid NOT NULL REFERENCES habits (id),
      uid uuid NOT NULL REFERENCES users (uid)
  );
`;

module.exports = async function (fastify, opts) {
  await fastify.pg.query(createUsersTable);
  await fastify.pg.query(createHabitsTable);
  await fastify.pg.query(createStreaksTable);
}
