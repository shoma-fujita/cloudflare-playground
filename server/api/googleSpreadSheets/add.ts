import { defineEventHandler, readBody } from 'h3'
import { SignJWT, importPKCS8 } from 'jose' // importPKCS8 をインポート

export default defineEventHandler(async (event) => {
  try {
    const config = useRuntimeConfig()
    const body = await readBody(event)
    const { from, fromMemberId, to, toMemberIds, message } = body

    // JWT トークンを生成してアクセストークンを取得
    const accessToken = await getAccessToken(config)

    const spreadsheetId = config.google.spreadsheetId
    const range = '感謝メッセージ一覧シート!A2' // 適切なシート名と範囲を指定してください
    const date = new Date()
    const currentDate = date.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })

    // Google Sheets API の values.append エンドポイントを直接呼び出し
    const apiUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED` // valueInputOptionをUSER_ENTEREDに変更する方が一般的です

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        // valueInputOption: 'RAW', // RAWの代わりにUSER_ENTEREDを使用するか、クエリパラメータで指定
        values: [[from, fromMemberId, to, toMemberIds, message, currentDate]],
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Google Sheets API Error Response:', errorData); // エラーレスポンスを詳細にログ出力
      throw new Error(`Google Sheets API Error: ${response.status} - ${JSON.stringify(errorData)}`)
    }

    const data = await response.json()

    return {
      data,
      error: null,
    }
  }
  catch (error) {
    console.error('Handler Error:', error); // ハンドラ全体のエラーをログ出力
    if (error instanceof Error) {
      return {
        data: null,
        error: error.message,
      }
    }
    else {
      return {
        data: null,
        error: 'Unknown error occurred',
      }
    }
  }
})

// Google OAuth 2.0 のアクセストークンを取得する関数
async function getAccessToken(config: any): Promise<string> {
  try {
    // 秘密鍵をインポート
    // 秘密鍵の文字列からヘッダーとフッター、改行コードを取り除く
    const privateKeyString = config.google.privateKey
        .replace('-----BEGIN PRIVATE KEY-----', '')
        .replace('-----END PRIVATE KEY-----', '')
        .replace(/\\n/g, ''); // 環境変数などから読み込む際に \n が \\n となっている場合を考慮

    // joseのimportPKCS8を使用して秘密鍵をインポート
    // 第2引数にはアルゴリズムを指定します。Googleのサービスアカウントキーは通常'RS256'です。
    const privateKey = await importPKCS8(config.google.privateKey, 'RS256')


    // JWT を作成
    const now = Math.floor(Date.now() / 1000)
    const jwt = await new SignJWT({
      // iss と sub にはサービスアカウントのメールアドレスを指定
      iss: config.google.serviceAccountEmail,
      sub: config.google.serviceAccountEmail,
      // scope には必要な権限を指定
      scope: 'https://www.googleapis.com/auth/spreadsheets',
      // aud にはトークンエンドポイントを指定
      aud: 'https://oauth2.googleapis.com/token',
      iat: now, // 発行時刻
      exp: now + 3600, // 1時間後に期限切れ
    })
      .setProtectedHeader({ alg: 'RS256', typ: 'JWT' }) // typ: 'JWT' を追加することが推奨されます
      .sign(privateKey) // インポートした秘密鍵で署名

    // アクセストークンを取得
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt,
      }),
    })

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json()
      console.error('Token Request Error Response:', errorData); // エラーレスポンスを詳細にログ出力
      throw new Error(`Token request failed: ${tokenResponse.status} - ${JSON.stringify(errorData)}`)
    }

    interface TokenData {
      access_token: string;
    }

    const tokenData = await tokenResponse.json() as TokenData
    return tokenData.access_token
  }
  catch (error) {
    console.error('Get Access Token Error:', error); // アクセストークン取得時のエラーをログ出力
    throw new Error(`Failed to get access token: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}