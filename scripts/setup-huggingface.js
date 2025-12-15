const fs = require("fs").promises;
const path = require("path");
const readline = require("readline");

const ENV_FILE = path.join(process.cwd(), ".env.local");
const ENV_TEMPLATE = path.join(process.cwd(), "env.template");

async function setupHuggingFace() {
  console.log("Hugging Face Setup");
  console.log("==================\n");

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  function question(prompt) {
    return new Promise((resolve) => {
      rl.question(prompt, resolve);
    });
  }

  try {
    // Check if .env.local exists
    let envContent = "";
    try {
      envContent = await fs.readFile(ENV_FILE, "utf-8");
    } catch {
      // File doesn't exist, that's okay
    }

    console.log("To use the Hugging Face API, you need a token.");
    console.log("Get one at: https://huggingface.co/settings/tokens\n");

    const hasToken = envContent.includes("HUGGINGFACE_TOKEN");

    if (hasToken) {
      console.log("HUGGINGFACE_TOKEN is already set in .env.local");
      const update = await question("Do you want to update it? (y/n): ");
      if (update.toLowerCase() !== "y") {
        rl.close();
        return;
      }
    }

    const token = await question(
      "Enter your Hugging Face token (or press Enter to skip): "
    );

    if (!token.trim()) {
      console.log("\nSkipping token setup. You can add it later to .env.local");
      rl.close();
      return;
    }

    // Update or create .env.local
    if (envContent.includes("HUGGINGFACE_TOKEN=")) {
      // Update existing token
      envContent = envContent.replace(
        /HUGGINGFACE_TOKEN=.*/,
        `HUGGINGFACE_TOKEN=${token.trim()}`
      );
    } else {
      // Add new token
      if (envContent && !envContent.endsWith("\n")) {
        envContent += "\n";
      }
      envContent += `HUGGINGFACE_TOKEN=${token.trim()}\n`;
    }

    await fs.writeFile(ENV_FILE, envContent);
    console.log("\n✓ Token saved to .env.local");

    // Note: env.template should already exist in the repository
    // If it doesn't, inform the user to copy it manually
    try {
      await fs.access(ENV_TEMPLATE);
    } catch {
      console.log(
        "⚠ Note: env.template file not found. Please ensure it exists in the repository."
      );
    }

    console.log("\nSetup complete!");
    console.log("Note: .env.local is in .gitignore and will not be committed.");
  } catch (error) {
    console.error("Error during setup:", error);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Run if called directly
if (require.main === module) {
  setupHuggingFace();
}

module.exports = { setupHuggingFace };
