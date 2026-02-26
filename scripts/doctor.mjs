import net from "node:net";

function parseHostPort(databaseUrl) {
  try {
    const u = new URL(databaseUrl);
    return { host: u.hostname || "localhost", port: Number(u.port || "5432") };
  } catch {
    return { host: "localhost", port: 5432 };
  }
}

function checkTcp(host, port, timeoutMs = 2500) {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    const onError = (err) => {
      socket.destroy();
      reject(err);
    };

    socket.setTimeout(timeoutMs);
    socket.once("error", onError);
    socket.once("timeout", () => onError(new Error("timeout")));
    socket.connect(port, host, () => {
      socket.end();
      resolve(true);
    });
  });
}

async function run() {
  const nodeVersion = process.versions.node;
  const major = Number.parseInt(nodeVersion.split(".")[0] || "0", 10);
  if (major < 20) {
    console.error(`FAIL: Node.js >= 20 required. Current: ${nodeVersion}`);
    process.exit(1);
  }

  const databaseUrl = process.env.DATABASE_URL || "";
  const { host, port } = parseHostPort(databaseUrl);

  try {
    await checkTcp(host, port);
    console.log(`OK: Node ${nodeVersion}`);
    console.log(`OK: PostgreSQL TCP reachable at ${host}:${port}`);
  } catch (error) {
    console.error(`FAIL: PostgreSQL not reachable at ${host}:${port}`);
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

run();
