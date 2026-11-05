import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://yhxqrmweuxphspijzybp.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InloeHFybXdldXhwaHNwaWp6eWJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MzU0ODA2NSwiZXhwIjoyMTA5MTI0MDY1fQ.hc0VLd-2CEk6G7Bb9HiqYrM5l-G2ACrQki75H8jGoz8'

class DummyWS {}

const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
  realtime: { transport: DummyWS },
})

async function checkSchemaAndEndpoints() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/`, {
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    },
  })
  const schema = await res.json()
  console.log('Available tables/paths:', Object.keys(schema.paths || {}))
  console.log('Definitions:', Object.keys(schema.definitions || {}))
}

checkSchemaAndEndpoints().catch(console.error)

