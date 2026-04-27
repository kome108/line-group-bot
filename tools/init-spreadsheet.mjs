/**
 * スプレッドシートを新規作成して初期化する
 * Usage: node tools/init-spreadsheet.mjs
 */

import { readFileSync, existsSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";
import dotenv from "dotenv";

const require = createRequire(fileURLToPath(import.meta.url));
const { google } = require("googleapis");

const PROJECT_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: join(PROJECT_ROOT, ".env") });

const TOKENS_PATH = process.env.GOOGLE_TOKENS_PATH || join(PROJECT_ROOT, "credentials", "tokens.json");

async function main() {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    console.error("GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET が .env に設定されていません");
    process.exit(1);
  }
  if (!existsSync(TOKENS_PATH)) {
    console.error(`トークンファイルが見つかりません: ${TOKENS_PATH}`);
    console.error("先に node tools/auth-google.mjs を実行してください");
    process.exit(1);
  }

  const tokens = JSON.parse(readFileSync(TOKENS_PATH, "utf-8"));
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  auth.setCredentials(tokens);
  const sheets = google.sheets({ version: "v4", auth });

  console.log("スプレッドシートを新規作成中...");

  const res = await sheets.spreadsheets.create({
    requestBody: {
      properties: { title: "line-group-bot 管理" },
      sheets: [
        { properties: { title: "システムプロンプト" } },
        { properties: { title: "ナレッジ" } },
      ],
    },
  });

  const spreadsheetId = res.data.spreadsheetId;

  // シート初期化
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: {
      valueInputOption: "RAW",
      data: [
        {
          range: "システムプロンプト!A1",
          values: [["あなたはプログラミングスクールのAIアシスタントです。受講生の質問に丁寧かつ分かりやすく回答してください。"]],
        },
        {
          range: "ナレッジ!A1:C1",
          values: [["カテゴリ", "質問", "回答"]],
        },
      ],
    },
  });

  const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  // --id フラグがあれば .env に SPREADSHEET_ID を保存
  if (process.argv.includes("--id")) {
    const envPath = join(PROJECT_ROOT, ".env");
    let envContent = readFileSync(envPath, "utf-8");
    if (envContent.includes("SPREADSHEET_ID=")) {
      envContent = envContent.replace(/SPREADSHEET_ID=.*/, `SPREADSHEET_ID=${spreadsheetId}`);
    } else {
      envContent += `\nSPREADSHEET_ID=${spreadsheetId}\n`;
    }
    writeFileSync(envPath, envContent);
    console.log(`.env に SPREADSHEET_ID を保存しました`);
  }

  console.log(`\n作成完了！`);
  console.log(`URL: ${url}`);
  console.log(`SPREADSHEET_ID=${spreadsheetId}`);
  console.log(`\nこのIDをRender.comの環境変数にも追加してください。`);
}

main().catch((err) => {
  console.error("エラー:", err.message);
  process.exit(1);
});
