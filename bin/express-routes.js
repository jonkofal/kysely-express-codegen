import fs from 'fs'
import Handlebars from 'handlebars';

export default function expressRoutes(tables, outputDir) {
    fs.mkdirSync(outputDir, { recursive: true });
    const expressRouteHBS = fs.readFileSync('./templates/express-route.hbs', 'utf8' );
    const expressRouteTemplate = Handlebars.compile(expressRouteHBS);
    for (const table of tables) {
        fs.writeFileSync(`${outputDir}/${table.name}.ts`, expressRouteTemplate(table));
        console.log(`Generated ${outputDir}/${table.name}.ts`);
    }
    const expressRoutesHBS = fs.readFileSync('./templates/express-routes.hbs', 'utf8' );
    const expressRoutesTemplate = Handlebars.compile(expressRoutesHBS);
    fs.writeFileSync(`${outputDir}/routes.ts`, expressRoutesTemplate(tables));
    console.log(`Generated ${outputDir}/routes.ts`);
}
