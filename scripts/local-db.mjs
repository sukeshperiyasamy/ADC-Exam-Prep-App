// Persistent local Postgres for development without Docker.
//   npm run db:local        -> starts it on 127.0.0.1:55434 (Ctrl+C to stop)
// Data lives in .localdb/ (gitignored) and survives restarts.
// Use: DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:55434/adc_local (and DATABASE_URL_UNPOOLED, same value)
import { existsSync } from 'node:fs';
import EmbeddedPostgres from 'embedded-postgres';

const dir = '.localdb/pg';
const fresh = !existsSync(dir);
const pg = new EmbeddedPostgres({
  databaseDir: dir,
  user: 'postgres',
  password: 'postgres',
  port: 55434,
  persistent: true,
  initdbFlags: ['--encoding=UTF8', '--locale=C']
});
if (fresh) await pg.initialise();
await pg.start();
if (fresh) await pg.createDatabase('adc_local');
console.log('READY postgresql://postgres:postgres@127.0.0.1:55434/adc_local');
const stop = async () => {
  await pg.stop();
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
setInterval(() => {}, 1 << 30);
