#!/usr/bin/env node

import { Client } from 'pg'
import fs from 'fs'
import params from './params.js';

const result = await params();

const OUTPUT_DIR = result.output;

const client = new Client({
    connectionString: `postgresql://${result.username}:${result.password}@${result.host}:${result.port}/${result.database}`
});

function norm(str) {
    return str.replaceAll('_', '');
}

async function main() {
    await client.connect();

    const result = await client.query(`
    SELECT
      table_name,
      column_name,
      udt_name,
      is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public'
    ORDER BY table_name, ordinal_position
  `);

    const tables = {};

    for (const row of result.rows) {
        if (!tables[row.table_name]) {
            tables[row.table_name] = [];
        }
        tables[row.table_name].push(row);
    }

    fs.mkdirSync(OUTPUT_DIR, { recursive: true });

    for (const [tableName, columns] of Object.entries(tables)) {
        fs.writeFileSync(`${OUTPUT_DIR}/${norm(tableName)}.ts`, route(tableName));
        console.log(`Generated ${OUTPUT_DIR}/${norm(tableName)}.ts`);
    }
    fs.writeFileSync(`${OUTPUT_DIR}/routes.ts`, routes(tables));
    console.log(`Generated ${OUTPUT_DIR}/routes.ts`);
    await client.end();
}
function route(tableName) {
    let normName = norm(tableName);
    let output = `import { Router, Request, Response, NextFunction } from 'express'\n\n`;
    output += `const ${normName}Router = Router()\n\n`;
    output += get(tableName);
    // output += post(tableName, columns);
    // output += put(tableName, columns);
    // output += delete(tableName);
    output += `\n\n`;
    output += `export default ${normName}Router;`;
    return output;
}

function routes(tables) {
    let output = `import { Router } from 'express';\n\n`;
    for (const tableName of Object.keys(tables)) {
        output += `import ${norm(tableName)}Router from './${norm(tableName)}.js';\n`;
    }
    output += `\nconst router = Router();\n\n`;
    for (const tableName of Object.keys(tables)) {
        output += `router.use("/${norm(tableName)}", ${norm(tableName)}Router);\n`;
    }
    output += `\nexport default router;`;
    return output;
}

function get(tableName) {
    let output = ``;
    output += `${norm(tableName)}Router.get('/', async ( req: Request, res: Response, next: NextFunction ) => {\n`;
    output += `    try {\n`;
    output += `        const database = req.app.locals.database;\n`;
    output += `        const result = await database.selectFrom('${tableName}').selectAll().execute();\n`;
    output += `        res.json(result);\n`;
    output += `    } catch (error) {\n`;
    output += `        next(error);\n`;
    output += `    }\n`;
    output += `});`
    return output;
}

main().catch(console.error)