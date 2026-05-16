import prompt from 'prompt';
import optimist from 'optimist';

export default async function params() {
  prompt.override = optimist.argv;

  const prompts = [
    {
      name: 'output',
      description: 'Enter output directory',
      default: process.env.OUTPUT_DIR || './src/routes',
      required: true
    },
    {
      name: 'username',
      description: 'Enter database username',
      default: process.env.DATABASE_USERNAME || '',
      required: true
    },
    {
      name: 'password',
      description: 'Enter database password',
      default: process.env.DATABASE_PASSWORD || '',
      replace: "*",
      hidden: true,
      required: true
    },
    {
      name: 'database',
      default: process.env.DATABASE_NAME || '',
      description: 'Enter database name',
      required: true
    },
    {
      name: 'host',
      description: 'Enter database host',
      default: process.env.DATABASE_HOST || 'localhost',
      required: true
    },
    {
      name: 'port',
      description: 'Enter database port',
      default: process.env.DATABASE_PORT || '5432',
      required: true
    }
  ];

  prompt.start();

  return new Promise((resolve, reject) => {
    prompt.get(prompts, (err, result) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(result);
    });
  });
}