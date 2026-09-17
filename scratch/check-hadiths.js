const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

// Read .env if it exists
let envContent = ''
try {
  envContent = fs.readFileSync(path.join(__dirname, '../.env'), 'utf8')
} catch (e) {
  try {
    envContent = fs.readFileSync(path.join(process.cwd(), '.env'), 'utf8')
  } catch (e2) {}
}

const envVars = {}
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/)
  if (match) {
    let val = match[2] || ''
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1)
    if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1)
    envVars[match[1]] = val
  }
})

const url = envVars.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const key = envVars.SUPABASE_SERVICE_ROLE_KEY || envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

console.log('Supabase URL:', url ? 'Found' : 'Missing')
console.log('Key:', key ? 'Found' : 'Missing')

if (!url || !key) {
  process.exit(1)
}

const supabase = createClient(url, key)

async function test() {
  const { data, count, error } = await supabase.from('hadiths').select('hadith_number', { count: 'exact' })
  console.log('Total hadiths in Supabase:', count, 'Numbers:', data?.map(d => d.hadith_number))
}

test()
