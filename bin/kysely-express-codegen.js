#!/usr/bin/env node

import fs from 'fs'
import { Client } from 'pg'
import params from './params.js';
import Handlebars from 'handlebars';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pascalCase, camelCase } from 'change-case';

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const SCRIPT_DIR = path.dirname(SCRIPT_PATH);

async function main() {
    const result = await params();
    const OUTPUT_DIR = result.output;
    const connectionString = `postgresql://${result.username}:${result.password}@${result.host}:${result.port}/${result.database}`;
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    const tables = await getTables(connectionString);
    console.log(JSON.stringify(tables));
    kyselyTypes(tables, `${OUTPUT_DIR}/db`);
    kyselyServices(tables, `${OUTPUT_DIR}/services`);
    expressRouters(tables, `${OUTPUT_DIR}/routers`);
    expressIndex(tables, OUTPUT_DIR);
}
Handlebars.registerHelper("pascalCase", value => {
    return pascalCase(value);
});
Handlebars.registerHelper("camelCase", value => {
    return camelCase(value);
});
Handlebars.registerHelper(
    'filterType',
    (type) => {
        if (type === 'number')
            return `z.coerce.number().optional()`;
        if (type === 'Date')
            return `z.coerce.date().optional()`;
        return `z.string().optional()`;
    });
Handlebars.registerHelper(
    'insertType',
    (name, type, nullable) => {
        let retVal = "";
        if (name !== 'id' && name !== 'created_at') {
            retVal = `${name}: `;
            if (type === 'number') {
                retVal = `${retVal}z.coerce.number()`;
            } else if (type === 'Date') {
                retVal = `${retVal}z.coerce.date()`;
            } else {
                retVal = `${retVal}z.string()`;
            }
            if (nullable === 'YES') {
                retVal = `${retVal}.optional()`
            }
            retVal = `${retVal},`
        }
        return retVal;
    });
Handlebars.registerHelper(
    'updateType',
    (name, type) => {
        let retVal = ``;
        if (name !== 'created_at') {
            retVal = `${name}: `;
            if (type === 'number') {
                retVal = `${retVal}z.coerce.number()`;
            } else if (type === 'Date') {
                retVal = `${retVal}z.coerce.date()`;
            } else {
                retVal = `${retVal}z.string()`;
            }
            if (name !== 'id') {
                retVal = `${retVal}.optional()`
            }
            retVal = `${retVal},`
        }
        return retVal;
    });
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
        table.children = [];
    }
    for (const table of tables) {
        const foreignKeys = await getForeignKeys(client, table.name);
        for (const foreignKey of foreignKeys) {
            let foreignTable = tables.find(t => t.name === foreignKey.foreign_table_name);
            foreignTable.children.push(foreignKey.table_name);
        }
        table.foreign_keys = foreignKeys;
    }
    await client.end();
    return tables;
}
async function getForeignKeys(client, tableName) {
    const result = await client.query(`
    SELECT
      tc.constraint_name,
      tc.table_name,
      kcu.column_name,
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name
    FROM
      information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
    WHERE
      tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_name = $1
    ORDER BY
      tc.constraint_name;
  `, [tableName]);
    return result.rows;
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

function expressIndex(tables, outputDir) {
    fs.mkdirSync(outputDir, { recursive: true });
    const hbs = fs.readFileSync(path.join(SCRIPT_DIR, '..', 'templates', 'index.hbs'), 'utf8');
    const template = Handlebars.compile(hbs);
    fs.writeFileSync(`${outputDir}/index.ts`, template(tables));
    console.log(`Generated ${outputDir}/index.ts`);
}
function kyselyServices(tables, outputDir) {
    fs.mkdirSync(outputDir, { recursive: true });
    const hbs = fs.readFileSync(path.join(SCRIPT_DIR, '..', 'templates', 'kysely-service.hbs'), 'utf8');
    const template = Handlebars.compile(hbs);
    for (const table of tables) {
        fs.writeFileSync(`${outputDir}/${pascalCase(table.name)}Service.ts`, template(table));
        console.log(`Generated ${outputDir}/${pascalCase(table.name)}Service.ts`);
    }
}
function kyselyTypes(tables, outputDir) {
    const hbs = fs.readFileSync(path.join(SCRIPT_DIR, '..', 'templates', '/kysely-types.hbs'), 'utf8');
    const template = Handlebars.compile(hbs);
    fs.writeFileSync(`${outputDir}/types.d.ts`, template(tables));
    console.log(`Generated ${outputDir}/types.d.ts`);
}

function expressRouters(tables, outputDir) {
    fs.mkdirSync(outputDir, { recursive: true });
    let hbs = fs.readFileSync(path.join(SCRIPT_DIR, '..', 'templates', 'express-router.hbs'), 'utf8');
    let template = Handlebars.compile(hbs);
    for (const table of tables) {
        fs.writeFileSync(`${outputDir}/${camelCase(table.name)}Router.ts`, template(table));
        console.log(`Generated ${outputDir}/${camelCase(table.name)}Router.ts`);
    }
    hbs = fs.readFileSync(path.join(SCRIPT_DIR, '..', 'templates', 'express-routers.hbs'), 'utf8');
    template = Handlebars.compile(hbs);
    fs.writeFileSync(`${outputDir}/routers.ts`, template(tables));
    console.log(`Generated ${outputDir}/routers.ts`);
}
main().catch(console.error)