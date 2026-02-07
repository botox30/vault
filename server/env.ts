import fs from "fs";
import path from "path";

const ENV_PATH = path.resolve(process.cwd(), ".env");

const stripQuotes = (value: string) => {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
};

if (fs.existsSync(ENV_PATH)) {
  const contents = fs.readFileSync(ENV_PATH, "utf8");
  contents
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .forEach((line) => {
      const [rawKey, ...rest] = line.split("=");
      const key = rawKey?.trim();
      if (!key) return;
      if (process.env[key]) return;
      const value = stripQuotes(rest.join("="));
      process.env[key] = value;
    });
}
