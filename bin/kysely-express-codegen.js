#!/usr/bin/env node

import fs from 'fs'
import { Client } from 'pg'
import params from './params.js';
import Handlebars from 'handlebars';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const SCRIPT_PATH = fileURLToPath(import.meta.url);
const SCRIPT_DIR = path.dirname(SCRIPT_PATH);

async function main() {
    const result = await params();
    const OUTPUT_DIR = result.output;
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    const tables = await getTables(`postgresql://${result.username}:${result.password}@${result.host}:${result.port}/${result.database}`);
    expressRoutes(tables, `${OUTPUT_DIR}/routes`);
    kyselyTypes(tables, `${OUTPUT_DIR}/db`);
    expressIndex(OUTPUT_DIR);
}

Handlebars.registerHelper(
    'tsType',
    (type, nullable, name) => {
        // generated primary key
        if (name === 'id') {
            return `Generated<${type}>`;
        }
        // nullable column
        if (nullable === 'YES') {
            return `${type} | null`;
        }
        // normal column
        return type;
    }
);

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
        if (!tables.find(table => table.name == row.table_name)) {
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
    // console.log(JSON.stringify(tables));
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

function expressIndex(outputDir) {
    fs.copyFileSync(
        path.join(SCRIPT_DIR, '..', 'templates', '/index.ts'),
            path.join(outputDir, '/index.ts')
        );
}
function kyselyTypes(tables, outputDir) {
    const kyselyTypesHBS = fs.readFileSync(path.join(SCRIPT_DIR, '..', 'templates', '/kysely-types.hbs'), 'utf8');
    const kyselyTypesTemplate = Handlebars.compile(kyselyTypesHBS);
    fs.writeFileSync(`${outputDir}/types.d.ts`, kyselyTypesTemplate(tables));
}

function expressRoutes(tables, outputDir) {
    fs.mkdirSync(outputDir, { recursive: true });
    const expressRouteHBS = fs.readFileSync(path.join(SCRIPT_DIR, '..', 'templates', 'express-route.hbs'), 'utf8');
    const expressRouteTemplate = Handlebars.compile(expressRouteHBS);
    for (const table of tables) {
        fs.writeFileSync(`${outputDir}/${table.name}.ts`, expressRouteTemplate(table));
        console.log(`Generated ${outputDir}/${table.name}.ts`);
    }
    const expressRoutesHBS = fs.readFileSync(path.join(SCRIPT_DIR, '..', 'templates', 'express-routes.hbs'), 'utf8');
    const expressRoutesTemplate = Handlebars.compile(expressRoutesHBS);
    fs.writeFileSync(`${outputDir}/routes.ts`, expressRoutesTemplate(tables));
    console.log(`Generated ${outputDir}/routes.ts`);
}
main().catch(console.error)