# Restaurant menu import

Set `GEMINI_API_KEY` in Supabase → Edge Functions → Secrets. Never use a VITE-prefixed variable for provider credentials. Optional `GEMINI_MODEL` selects a supported multimodal text model; default `gemini-3.1-flash-lite`. Optional `ALLOWED_ORIGINS` is a comma-separated list of frontend origins.

Deploy with JWT verification enabled. The handler also validates the user against Supabase Auth and checks active restaurant ownership using the caller's RLS context. No service role is needed. The function returns extracted data for the owner to review; the existing editor saves selected dishes under RLS.

The in-memory burst guard limits requests within one function isolate; configure provider quotas for a global spending cap. Rotate the old publicly embedded provider key before enabling production imports. Old frontend deployments and Git history may still contain the old key; removing it from the latest bundle does not revoke it.
