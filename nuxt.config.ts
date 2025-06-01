// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-05-15',
  devtools: { enabled: true },
  runtimeConfig: {
    google: {
      spreadsheetId: process.env.NUXT_GOOGLE_SPREADSHEET_ID,
      serviceAccountEmail: process.env.NUXT_GOOGLE_SERVICE_ACCOUNT_EMAIL,
      privateKey: process.env.NUXT_GOOGLE_PRIVATE_KEY
    }
  },
  nitro: {
    preset: "cloudflare-pages",
    cloudflare: {
      deployConfig: true,
      nodeCompat: true
    }
  },
  modules: ["nitro-cloudflare-dev"]
})