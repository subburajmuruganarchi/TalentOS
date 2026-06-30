export const envConfig = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3001', 10),
  mongodbUri: process.env.MONGODB_URI ?? 'mongodb://localhost:27017/talentos',
  jwtSecret: process.env.JWT_SECRET ?? 'change-me',
  jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
  aiServiceUrl: process.env.AI_SERVICE_URL ?? 'http://localhost:8000',
  supabaseUrl: process.env.SUPABASE_URL ?? '',
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  supabaseStorageBucket:
    process.env.SUPABASE_STORAGE_BUCKET ?? 'talentos-files',
  corsOrigins: process.env.CORS_ORIGINS ?? 'http://localhost:3000',
};
