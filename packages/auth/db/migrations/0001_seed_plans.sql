INSERT OR IGNORE INTO plan (id, name, description, limits, marketing_features, is_active, created_at, updated_at)
VALUES
  ('plan_free', 'libra free', 'Free plan', '{"ai_nums":"50","seats":"1","project_nums":"1"}', '[]', 1, unixepoch(), unixepoch()),
  ('plan_pro', 'libra pro', 'Pro plan', '{"ai_nums":"1000","seats":"5","project_nums":"10"}', '[]', 1, unixepoch(), unixepoch()),
  ('plan_max', 'libra max', 'Max plan', '{"ai_nums":"5000","seats":"20","project_nums":"50"}', '[]', 1, unixepoch(), unixepoch());
