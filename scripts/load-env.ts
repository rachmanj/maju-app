import dotenv from 'dotenv';
import { resolve } from 'path';

const cwd = process.cwd();
dotenv.config({ path: resolve(cwd, '.env') });
dotenv.config({ path: resolve(cwd, '.env.local') });
