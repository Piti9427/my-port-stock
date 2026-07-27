// scripts/agent_sentry_fetch.js
// Script for the AI Agent to fetch unresolved issues from Sentry

const fs = require("fs");
const path = require("path");
const https = require("https");

// Load .env from root
const envPath = path.resolve(__dirname, "../.env");
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, "utf-8");
  envConfig.split("\n").forEach((line) => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      process.env[match[1].trim()] = match[2].trim();
    }
  });
}

const SENTRY_TOKEN = process.env.SENTRY_ORG_AUTH_TOKEN;
const ORG_SLUG = "prem-group-engineering-3u";
const PROJECT_SLUG = process.argv[2] || "frontend"; // Defaults to frontend

if (!SENTRY_TOKEN || SENTRY_TOKEN === "your_token_here_please_replace") {
  console.error("ERROR: SENTRY_ORG_AUTH_TOKEN is not set in root .env file.");
  process.exit(1);
}

const url = `https://sentry.io/api/0/projects/${ORG_SLUG}/${PROJECT_SLUG}/issues/?query=is:unresolved`;

const options = {
  headers: {
    Authorization: `Bearer ${SENTRY_TOKEN}`,
    Accept: "application/json",
  },
};

console.log(
  `Fetching unresolved issues for [${ORG_SLUG} / ${PROJECT_SLUG}]...\\n`,
);

https
  .get(url, options, (res) => {
    let data = "";
    res.on("data", (chunk) => (data += chunk));
    res.on("end", () => {
      if (res.statusCode !== 200) {
        console.error(`Sentry API Error: ${res.statusCode} - ${data}`);
        process.exit(1);
      }

      try {
        const issues = JSON.parse(data);
        if (issues.length === 0) {
          console.log("✅ No unresolved issues found.");
          return;
        }

        console.log(`⚠️ Found ${issues.length} unresolved issue(s):`);
        issues.forEach((issue, idx) => {
          console.log(`\\n--- Issue #${idx + 1} ---`);
          console.log(`ID: ${issue.id}`);
          console.log(`Type: ${issue.type}`);
          console.log(`Title: ${issue.title}`);
          console.log(`Culprit: ${issue.culprit || "N/A"}`);
          console.log(`Count: ${issue.count}`);
          console.log(`Last Seen: ${issue.lastSeen}`);
          console.log(`Permalink: ${issue.permalink}`);
          if (issue.metadata && issue.metadata.value) {
            console.log(`Message: ${issue.metadata.value}`);
          }
        });

        console.log(
          "\\n[Agent Instruction]: Use Sentry API again to fetch specific event traces if needed, or check the file mentioned in the Culprit.",
        );
      } catch (e) {
        console.error("Error parsing JSON response:", e);
      }
    });
  })
  .on("error", (err) => {
    console.error("HTTPS Request failed:", err.message);
  });
