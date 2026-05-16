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

async function getTables() {
    const retVal = {};
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

    for (const row of result.rows) {
        if (!retVal[row.table_name]) {
            retVal[row.table_name] = [];
        }
        retVal[row.table_name].push(row);
    }
    return retVal;
}

async function main() {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    const tables = await getTables();
    for (const [tableName, columns] of Object.entries(tables)) {
        fs.writeFileSync(`${OUTPUT_DIR}/${norm(tableName)}.ts`, route(tableName, columns));
        console.log(`Generated ${OUTPUT_DIR}/${norm(tableName)}.ts`);
    }
    fs.writeFileSync(`${OUTPUT_DIR}/routes.ts`, routes(tables));
    console.log(`Generated ${OUTPUT_DIR}/routes.ts`);
    await client.end();
}
function route(tableName, columns) {
    let normName = norm(tableName);
    let output = `import { Router, Request, Response, NextFunction } from 'express'\n\n`;
    output += `const ${normName}Router = Router()\n\n`;
    output += getMultiple(tableName, columns);
    output += getOne(tableName);
    output += post(tableName);
    output += put(tableName);
    output += deleter(tableName);
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

function getMultiple(tableName, columns) {
    let output = ``;
    output += `${norm(tableName)}Router.get('/', async (req: Request, res: Response, next: NextFunction ) => {\n`;
    output += `    try {\n`;
    output += `        const database = req.app.locals.database;\n`;
    output += `        let query = database.selectFrom('${tableName}').selectAll();\n`;
    output += `        const {\n`;
    for (const column of columns) {
        output += `            ${column.column_name},\n`;
    };
    output += `        } = req.query;\n`;
    for (const column of columns) {
        output += `        if (${column.column_name}) {\n`;
        output += `            query = query.where('${column.column_name}', '=', ${column.column_name});\n`;
        output += `        }\n`;
    };
    output += `        const result = await query.execute();\n`;
    output += `        res.json(result);\n`;
    output += `    } catch (error) {\n`;
    output += `        next(error);\n`;
    output += `    }\n`;
    output += `});\n`
    return output;
}
function getOne(tableName) {
    let output = ``;
    output += `${norm(tableName)}Router.get('/:id', async ( req: Request, res: Response, next: NextFunction ) => {\n`;
    output += `    try {\n`;
    output += `        const database = req.app.locals.database;\n`;
    output += `        const { id } = req.params;\n`;
    output += `        const result = await database.selectFrom('${tableName}').where('id', '=', id).selectAll().executeTakeFirst();\n`;
    output += `        res.json(result);\n`;
    output += `    } catch (error) {\n`;
    output += `        next(error);\n`;
    output += `    }\n`;
    output += `});\n`
    return output;
}
/*
  return await db.insertInto('person')
    .values(person)
    .returningAll()
    .executeTakeFirstOrThrow()

*/
function post(tableName) {
    let output = ``;
    output += `${norm(tableName)}Router.post('/', async ( req: Request, res: Response, next: NextFunction ) => {\n`;
    output += `    try {\n`;
    output += `        const database = req.app.locals.database;\n`;
    output += `        const result = await database.insertInto('${tableName}').values(req.body).returningAll().executeTakeFirstOrThrow();\n`;
    output += `        res.json(result);\n`;
    output += `    } catch (error) {\n`;
    output += `        next(error);\n`;
    output += `    }\n`;
    output += `});\n`
    return output;
}
/*
  await db.updateTable('person').set(updateWith).where('id', '=', id).execute()
*/
function put(tableName) {
    let output = ``;
    output += `${norm(tableName)}Router.put('/', async ( req: Request, res: Response, next: NextFunction ) => {\n`;
    output += `    try {\n`;
    output += `        const database = req.app.locals.database;\n`;
    output += `        const { id } = req.body;\n`;
    output += `        const result = await database.updateTable('${tableName}').set(req.body).where('id', '=', id).execute();\n`;
    output += `        res.json("OK");\n`;
    output += `    } catch (error) {\n`;
    output += `        next(error);\n`;
    output += `    }\n`;
    output += `});\n`
    return output;
}
/*
  return await db.deleteFrom('person').where('id', '=', id)
    .returningAll()
    .executeTakeFirst()
    */
function deleter(tableName) {
    let output = ``;
    output += `${norm(tableName)}Router.delete('/:id', async ( req: Request, res: Response, next: NextFunction ) => {\n`;
    output += `    try {\n`;
    output += `        const database = req.app.locals.database;\n`;
    output += `        const { id } = req.params;\n`;
    output += `        const result = await database.deleteFrom('${tableName}').where('id', '=', id).execute();\n`;
    output += `        res.json(result);\n`;
    output += `    } catch (error) {\n`;
    output += `        next(error);\n`;
    output += `    }\n`;
    output += `})\n;`
    return output;
}
main().catch(console.error)