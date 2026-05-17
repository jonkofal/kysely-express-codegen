#!/usr/bin/env node

import { Client } from 'pg'
import fs from 'fs'
import params from './params.js';
import expressRoutes from './express-routes.js';
import kyselyTypes from './kysely-types.js';

async function main() {
    const result = await params();
    const OUTPUT_DIR = result.output;
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    const tables = await getTables(`postgresql://${result.username}:${result.password}@${result.host}:${result.port}/${result.database}`);
    expressRoutes(tables, `${OUTPUT_DIR}/routes`);
    kyselyTypes(tables, `${OUTPUT_DIR}/db`);
}

async function getTables(connectionString) {
    const client = new Client({ connectionString });
    await client.connect();
    const result = await client.query(`
        SELECT
        table_name,
        column_name,
        udt_name,
        is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public'
        ORDER BY table_name, ordinal_position`
    );
    let tables = [];
    let table;
    for (const row of result.rows) {
        if (! tables.find( table => table.name == row.table_name)) {
            table = {};
            table.name = row.table_name;
            table.fields = [];
            tables.push(table);
        }
        const field = {};
        field.name = row.column_name;
        field.type = typeMap[row.udt_name];
        field.nullable = row.is_nullable;
        table.fields.push(field);
    }
    console.log(JSON.stringify(tables));
    await client.end();
    return tables;
}

const typeMap = {
    uuid: 'string',
    text: 'string',
    varchar: 'string',
    bpchar: 'string',
    int2: 'number',
    int4: 'number',
    int8: 'number',
    float4: 'number',
    float8: 'number',
    numeric: 'number',
    bool: 'boolean',
    date: 'Date',
    timestamp: 'Date',
    timestamptz: 'Date',
    json: 'unknown',
    jsonb: 'unknown',
}
main().catch(console.error)