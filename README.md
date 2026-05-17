# @ampsy/kysely-express-codegen

A NPX executable to query a Postgres database and generate Kysely Typescript definitions and an Express Router to expose the Postgres database tables with a
REST API.

## Usage

Requires an accessible, running Postgres database.

To generate code

`npx @ampsy/kysely-express-codegen`

To feed values to the prompts, set the following Environment variables:


- DATABASE_USERNAME=XXX
- DATABASE_PASSWORD=YYY
- DATABASE_NAME=ZZZ
- DATABASE_HOST=localhost
- DATABASE_PORT=5432
- OUTPUT_DIR=./src

## TODO

EXPRESS
- add pagination to gets

JSON-SCHEMA
- add schema generation

VALIDATION
- add validation (optional, options?)

TEST
- add build target to /dist ts->js
- add typescript stuff for dev
- add express for dev
- add test index generation
