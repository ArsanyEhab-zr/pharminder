const SUPABASE_URL = 'https://yhxqrmweuxphspijzybp.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InloeHFybXdldXhwaHNwaWp6eWJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MzU0ODA2NSwiZXhwIjoyMTA5MTI0MDY1fQ.hc0VLd-2CEk6G7Bb9HiqYrM5l-G2ACrQki75H8jGoz8'

async function checkRpc() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/`, {
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    },
  })
  const schema = await res.json()
  console.log('/rpc/is_pharmacist info:', JSON.stringify(schema.paths?.['/rpc/is_pharmacist'], null, 2))
}

checkRpc().catch(console.error)

