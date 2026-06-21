const { execSync } = require("child_process");

const port = process.argv[2] || "3000";

function freePortWindows(targetPort) {
  try {
    const output = execSync(`netstat -ano | findstr :${targetPort}`, {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "ignore"],
    });

    const pids = new Set();

    for (const line of output.split(/\r?\n/)) {
      if (!line.includes("LISTENING")) continue;
      const pid = line.trim().split(/\s+/).at(-1);
      if (pid && pid !== "0") pids.add(pid);
    }

    for (const pid of pids) {
      try {
        execSync(`taskkill /PID ${pid} /F`, { stdio: "ignore" });
        console.log(`تم إيقاف العملية ${pid} على المنفذ ${targetPort}`);
      } catch {
        // already stopped
      }
    }
  } catch {
    // port is free
  }
}

function freePortUnix(targetPort) {
  try {
    execSync(`lsof -ti tcp:${targetPort} | xargs -r kill -9`, {
      stdio: "ignore",
      shell: true,
    });
  } catch {
    // port is free
  }
}

if (process.platform === "win32") {
  freePortWindows(port);
} else {
  freePortUnix(port);
}
