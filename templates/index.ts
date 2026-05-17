import get from '@ampsy/env'
import { DB } from './db/types.js'
import { Pool } from 'pg'
import { Kysely, PostgresDialect } from 'kysely'
import express from 'express'

import router from './routes/routes.js';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const DATABASE_NAME = get('DATABASE_NAME');
const DATABASE_HOST = get('DATABASE_HOST','localhost');
const DATABASE_USER = get('DATABASE_USER');
const DATABASE_PASSWORD = get('DATABASE_PASSWORD');
const DATABASE_PORT = get('DATABASE_PORT', 5434);
const DATABASE_MAX_CONNECTIONS = get('DATABASE_MAX_CONNECTIONS', 10);
const BASE_URL = get('BASE_URL','/api');

const dialect = new PostgresDialect({
  pool: new Pool({
    database: DATABASE_NAME,
    host: DATABASE_HOST,
    user: DATABASE_USER,
    password: DATABASE_PASSWORD,
    port: DATABASE_PORT,
    max: DATABASE_MAX_CONNECTIONS,
  })
});

const database = new Kysely<DB>({dialect});
app.locals.database = database;

app.use(`${BASE_URL}`, [router]);

//setup serving the site root
const HOST = get('HOST', '0.0.0.0');
const PORT = get('PORT', 3000);
// have the server listen for requests
app.listen(PORT, HOST);
