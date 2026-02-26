const version = (process && process.versions && process.versions.node) || "0.0.0";
const first = version.split(".")[0] || "0";
const major = Number.parseInt(first, 10);

if (major < 20) {
  console.error("");
  console.error("ERROR: Daily Planner requires Node.js >= 20.");
  console.error(`Current Node.js version: ${version}`);
  console.error("Run: nvm use 20");
  console.error("");
  process.exit(1);
}
