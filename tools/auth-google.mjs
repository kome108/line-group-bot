import { createServer } from "http";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { mkdirSync, writeFileSync } from "fs";
import { google } from "googleapis";
import dotenv from "dotenv";

const PROJECT_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: join(PROJECT_ROOT, ".env") });

const TOKENS_PATH = join(PROJECT_ROOT, "credentials", "tokens.json");
const REDIRECT_URI = "http://localhost:3333/callback";
const SCOPES = [
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/drive.file",
];

const auth = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  REDIRECT_URI
);

const url = auth.generateAuthUrl({ access_type: "offline", scope: SCOPES });
console.log("\n以下のURLをブラウザで開いてください:\n");
console.log(url);
console.log("\n認証後、自動的にトークンが保存されます...\n");

const server = createServer(async (req, res) => {
  if (!req.url.startsWith("/callback")) return;
  const code = new URL(req.url, "http://localhost:3333").searchParams.get("code");
  if (!code) { res.end("Error: no code"); return; }

  const { tokens } = await auth.getToken(code);
  mkdirSync(join(PROJECT_ROOT, "credentials"), { recursive: true });
  writeFileSync(TOKENS_PATH, JSON.stringify(tokens, null, 2));
  console.log("トークンを保存しました:", TOKENS_PATH);

  res.end("<html><body><h2>認証完了！ターミナルに戻ってください。</h2></body></html>");
  server.close();
});

server.listen(3333);
