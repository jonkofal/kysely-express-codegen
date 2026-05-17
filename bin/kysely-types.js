import fs from 'fs';
import Handlebars from 'handlebars';

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
export default function kyselyTypes(tables, outputDir) {
  const kyselyTypesHBS = fs.readFileSync('./templates/kysely-types.hbs', 'utf8' );
  const kyselyTypesTemplate = Handlebars.compile(kyselyTypesHBS);
  fs.writeFileSync(`${outputDir}/types.d.ts`, kyselyTypesTemplate(tables));
}

