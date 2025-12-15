#!/usr/bin/env node

/**
 * uDb CLI Wrapper
 *
 * Wraps the uDb CLI to pass through all arguments.
 * Usage: pnpm udb -- -c 10 --verbose
 *        pnpm udb -c 10 --verbose
 */

const { exec } = require("child_process");
const { promisify } = require("util");
const path = require("path");

const execAsync = promisify(exec);

async function main() {
  // Get all arguments after the script name
  let args = process.argv.slice(2);

  // Handle `--` separator - if first arg is `--`, skip it
  if (args[0] === "--") {
    args = args.slice(1);
  }

  // Build the command using locally installed tsx
  const udbBinPath = path.join(
    process.cwd(),
    "node_modules",
    "@rr0",
    "udb",
    "bin",
    "index.ts"
  );

  // Use locally installed tsx from node_modules/.bin
  const tsxPath = path.join(process.cwd(), "node_modules", ".bin", "tsx");

  const cmd = `"${tsxPath}" "${udbBinPath}" ${args
    .map((arg) => {
      // Escape arguments that contain spaces or special characters
      if (arg.includes(" ") || arg.includes("&") || arg.includes("|")) {
        return `"${arg.replace(/"/g, '\\"')}"`;
      }
      return arg;
    })
    .join(" ")}`;

  try {
    const { stdout, stderr } = await execAsync(cmd, {
      cwd: process.cwd(),
      maxBuffer: 50 * 1024 * 1024, // 50MB buffer
      shell: true,
    });

    if (stdout) {
      process.stdout.write(stdout);
    }
    if (stderr) {
      process.stderr.write(stderr);
    }
  } catch (error) {
    // If command fails, exit with the same code
    if (error.stdout) {
      process.stdout.write(error.stdout);
    }
    if (error.stderr) {
      process.stderr.write(error.stderr);
    }
    process.exit(error.code || 1);
  }
}

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});

