INSERT INTO "UserIntegration" (
  "id",
  "userId",
  "provider",
  "authKind",
  "status",
  "enabled",
  "createdAt",
  "updatedAt"
)
SELECT
  concat('int_', md5(u."id" || providers.provider::text)),
  u."id",
  providers.provider,
  providers.auth_kind,
  CASE
    WHEN providers.provider = 'REMOTION'::"IntegrationProvider"
      THEN 'CONNECTED'::"IntegrationConnectionStatus"
    ELSE 'NOT_CONNECTED'::"IntegrationConnectionStatus"
  END,
  providers.provider = 'REMOTION'::"IntegrationProvider",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "User" u
CROSS JOIN (
  VALUES
    ('YOUTUBE'::"IntegrationProvider", 'OAUTH'::"IntegrationAuthKind"),
    ('VIDIQ'::"IntegrationProvider", 'OAUTH'::"IntegrationAuthKind"),
    ('CHATGPT'::"IntegrationProvider", 'API_KEY'::"IntegrationAuthKind"),
    ('GEMINI'::"IntegrationProvider", 'API_KEY'::"IntegrationAuthKind"),
    ('ELEVENLABS'::"IntegrationProvider", 'API_KEY'::"IntegrationAuthKind"),
    ('SEEDANCE'::"IntegrationProvider", 'API_KEY'::"IntegrationAuthKind"),
    ('REMOTION'::"IntegrationProvider", 'NONE'::"IntegrationAuthKind")
) AS providers(provider, auth_kind)
ON CONFLICT ("userId", "provider") DO NOTHING;
