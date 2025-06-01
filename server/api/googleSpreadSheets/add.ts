import { google } from 'googleapis';
import { defineEventHandler, readBody } from 'h3';
// JWT の直接インポートは不要になるかもしれません
// import { JWT } from 'google-auth-library';

export default defineEventHandler(async (event) => {
  try {
    const config = useRuntimeConfig(event); // event を渡すことを推奨
    const body = await readBody(event);
    const { from, fromMemberId, to, toMemberIds, message } = body;

    // Google Sheets API の認証 (GoogleAuth を使用)
    const authClient = new google.auth.GoogleAuth({
      credentials: {
        client_email: config.google.serviceAccountEmail,
        private_key: config.google.privateKey.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    // authClient を直接渡すか、必要に応じて getClient() を呼び出す
    // const client = await authClient.getClient(); // 不要な場合もある
    const sheets = google.sheets({ version: 'v4', auth: authClient }); // authClient を直接渡す

    const spreadsheetId = config.google.spreadsheetId;
    // シート名にスペースが含まれる場合はそのまま文字列として扱われますが、
    // エラーの原因になりうる場合はシングルクォートで囲むことも検討できます。
    // ただし、通常は不要です。
    const range = '感謝メッセージ一覧シート!A2'; // ここで指定するA2は、実際にはappendなので無視され、最終行に追加されます。

    const date = new Date();
    // toLocaleString は実行環境によってタイムゾーンの解釈が異なる場合があるため、
    // UTCで日付を管理し、スプレッドシート側で表示形式を調整する方が堅牢な場合があります。
    // もしくは、Cloudflare Workers 環境で Asia/Tokyo が正しく解釈されるか確認が必要です。
    const currentDate = date.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });

    const response = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range, // 追記の場合、シート名だけでも可 '感謝メッセージ一覧シート'
      valueInputOption: 'USER_ENTERED', // 'RAW' よりも 'USER_ENTERED' の方が日付などがスプレッドシート側で解釈されやすい
      insertDataOption: 'INSERT_ROWS', // 明示的に行を挿入するオプション
      requestBody: { // v4 APIでは resource キーが推奨される場合がありますが、requestBodyでも動作します。
        values: [[from, fromMemberId, to, toMemberIds, message, currentDate]],
      },
    });

    return {
      success: true, // 成功したことを示すフラグを追加するとクライアント側で扱いやすい
      data: response.data,
      error: null,
    };
  } catch (error: any) { // エラーの型を any または unknown にする
    console.error('Error in Google Sheets API handler:', error); // サーバー側で詳細なエラーログを出力
    // エラーレスポンスをより詳細にする
    const errorMessage = error.response?.data?.error?.message || error.message || 'Unknown error occurred';
    const statusCode = error.response?.status || 500;

    // createError を使ってエラーレスポンスを返す (Nuxt/Nitro の標準的な方法)
    // この場合、関数の戻り値の型定義も変わる可能性があります。
    // throw createError({ statusCode, statusMessage: errorMessage });
    // または、現状の形式を維持する場合：
    return {
      success: false,
      data: null,
      error: errorMessage,
      statusCode: statusCode // クライアントにステータスコードを伝える
    };
  }
});