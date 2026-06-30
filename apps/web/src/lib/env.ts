export const env = {
  appName: process.env.NEXT_PUBLIC_APP_NAME ?? "TalentOS",
  apiUrl: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1",
} as const;
