const pgp = require('pg-promise')();

const cn = {
  host: process.env.HOST,
  port: process.env.PGPORT,
  database: process.env.DB,
  user: process.env.USER,
  password: process.env.PASSWORD,
};

const db = pgp(cn);

module.exports = db;
