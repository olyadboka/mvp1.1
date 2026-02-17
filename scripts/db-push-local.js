// Push schema to the same DB Next.js uses (.env.local overrides .env).
// Prisma CLI reads .env by default, so we hide .env during push so it uses our env.
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const envPath = path.join(root, ".env");
const envLocalPath = path.join(root, ".env.local");

require("dotenv").config({ path: envPath });
require("dotenv").config({ path: envLocalPath, override: true });
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL not set in .env or .env.local");
  process.exit(1);
}

const envHidden = path.join(root, ".env.prisma-push-hide");
let restored = false;
function restore() {
  if (!restored && fs.existsSync(envHidden)) {
    fs.renameSync(envHidden, envPath);
    restored = true;
  }
}

if (fs.existsSync(envPath)) {
  fs.renameSync(envPath, envHidden);
}

try {
  execSync("node node_modules/prisma/build/index.js db push", {
    stdio: "inherit",
    cwd: root,
    env: { ...process.env, DATABASE_URL: databaseUrl },
  });
  console.log("Schema pushed to:", databaseUrl.replace(/:[^:@]+@/, ":****@"));
} finally {
  restore();
}
