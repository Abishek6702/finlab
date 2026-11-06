require("dotenv").config();
const { spawnSync } = require("node:child_process");
const { resolve } = require("node:path");

const testUri = process.env.MONGO_TEST_URI;
const productionUri = process.env.MONGO_URI;
if (!testUri) {
  console.error("MONGO_TEST_URI is required. The integration runner never falls back to MONGO_URI.");
  process.exit(2);
}
if (productionUri && testUri === productionUri) {
  console.error("MONGO_TEST_URI must be different from MONGO_URI.");
  process.exit(2);
}

let databaseName;
let parsedTestUri;
try {
  parsedTestUri = new URL(testUri);
  databaseName = parsedTestUri.pathname.replace(/^\//, "").split("/")[0];
} catch {
  console.error("MONGO_TEST_URI is not a valid MongoDB URI.");
  process.exit(2);
}
if (productionUri) {
  try {
    const parsedProductionUri = new URL(productionUri);
    const productionDatabase = parsedProductionUri.pathname.replace(/^\//, "").split("/")[0];
    if (parsedTestUri.host.toLowerCase() === parsedProductionUri.host.toLowerCase() && databaseName === productionDatabase) {
      console.error("MONGO_TEST_URI resolves to the same MongoDB host and database as MONGO_URI.");
      process.exit(2);
    }
  } catch {
    // A malformed MONGO_URI is validated by application startup; it is never used by this runner.
  }
}
if (!databaseName || !/(^|[_-])test($|[_-])/i.test(databaseName)) {
  console.error("MONGO_TEST_URI database name must clearly contain 'test' (for example finlab_integration_test).");
  process.exit(2);
}
console.log(`Using the dedicated test database '${databaseName}'.`);
const result = spawnSync(process.execPath, ["--test", resolve(__dirname, "financial.integration.test.js")], {
  stdio: "inherit",
  env: process.env,
});
if (result.error) {
  console.error("Could not start MongoDB integration tests:", result.error.message);
  process.exit(1);
}
process.exitCode = result.status ?? 1;
