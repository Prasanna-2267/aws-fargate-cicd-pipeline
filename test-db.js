const { Client } = require("pg");

const client = new Client({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000
});

async function test() {
  try {
    await client.connect();

    const result = await client.query(
      "SELECT NOW() AS database_time"
    );

    console.log("Database connection successful!");
    console.log(result.rows[0]);
  } catch (error) {
    console.error("Database connection failed:", error.message);
  } finally {
    await client.end().catch(() => {});
  }
}

test();
