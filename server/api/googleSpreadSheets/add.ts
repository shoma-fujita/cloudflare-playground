import { google } from 'googleapis'
import { defineEventHandler, readBody } from 'h3'
import { JWT } from 'google-auth-library'

export default defineEventHandler(async (event) => {
  try {
    // リクエストボディから文字列を取得
    const body = await readBody(event)
    const { from, fromMemberId, to, toMemberIds, message } = body

    // Google Sheets API の認証
    const auth = new JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    })

    const sheets = google.sheets({ version: 'v4', auth })

    const spreadsheetId = process.env.SPREADSHEET_ID
    const range = '感謝メッセージ一覧シート!A2'
    const date = new Date()
    const currentDate = date.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })

    const response = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range,
      valueInputOption: 'RAW',
      requestBody: {
        values: [[from, fromMemberId, to, toMemberIds, message, currentDate]],
      },
    })

    return {
      data: response.data,
      error: null,
    }
  }
  catch (error) {
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
