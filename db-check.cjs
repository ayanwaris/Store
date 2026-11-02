const { Client } = require("pg");

async function main() {
  const client = new Client({
    connectionString: "postgresql://postgres:postgres@127.0.0.1:5432/app_db"
  });

  try {
    await client.connect();

    const result = await client.query(`
      SELECT
        current_database() AS database,
        current_schema() AS schema,
        current_user AS username,
        has_schema_privilege(current_user, 'public', 'CREATE') AS can_create
    `);

    console.table(result.rows);
    console.log("PostgreSQL connection test passed.");
  } catch (error) {
    console.error("DATABASE ERROR:", error);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main();
