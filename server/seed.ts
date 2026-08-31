import dotenv from 'dotenv';
import { Client } from 'pg';

dotenv.config();

async function seed() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        console.error('DATABASE_URL is required');
        process.exit(1);
    }

    const client = new Client({
        connectionString,
        ssl: connectionString.includes('localhost') ? false : { rejectUnauthorized: false },
    });
    await client.connect();

    await client.query(`
    INSERT INTO clubs (name, email, group_category, organization_type, logo_bg, description)
    VALUES
      ('Google Developer Groups On Campus DAU', 'gdg@dau.ac.in', 'A', 'club', 'white', 'Seed club for local testing'),
      ('AI Club', 'aiclub@dau.ac.in', 'A', 'club', 'dark', 'Seed club for local testing'),
      ('Robotics and Automation Society', 'robotics@dau.ac.in', 'B', 'club', 'white', 'Long-name seed case for modal overlap')
    ON CONFLICT (email) DO NOTHING;
  `);

    await client.end();
    console.log('Seed complete.');
}

seed().catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
});