import { Client } from 'pg'
import fs from 'fs/promises'

const client = new Client({
  connectionString:
    process.env.DATABASE_URL ||
    'postgres://postgres:password@localhost:5432/mydb',
})

const typeMap: Record<string, string> = {
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

function toPascalCase(str: string): string {
  return str
    .split('_')
    .map((s) => s[0].toUpperCase() + s.slice(1))
    .join('')
}

async function main() {
  await client.connect()

  const result = await client.query(`
    SELECT
      table_name,
      column_name,
      udt_name,
      is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public'
    ORDER BY table_name, ordinal_position
  `)

  const tables: Record<string, any[]> = {}

  for (const row of result.rows) {
    if (!tables[row.table_name]) {
      tables[row.table_name] = []
    }

    tables[row.table_name].push(row)
  }

  let output = `// AUTO-GENERATED FILE\n\n`

  for (const [tableName, columns] of Object.entries(tables)) {
    const interfaceName = toPascalCase(tableName)

    output += `export interface ${interfaceName} {\n`

    for (const col of columns) {
      const tsType = typeMap[col.udt_name] || 'unknown'
      const nullable =
        col.is_nullable === 'YES' ? ' | null' : ''

      output += `  ${col.column_name}: ${tsType}${nullable}\n`
    }

    output += `}\n\n`
  }

  output += `export interface DB {\n`

  for (const tableName of Object.keys(tables)) {
    const interfaceName = toPascalCase(tableName)

    output += `  ${tableName}: ${interfaceName}\n`
  }

  output += `}\n`

  await fs.writeFile('src/db-types.ts', output)

  await client.end()

  console.log('Generated src/db-types.ts')
}

main().catch(console.error)