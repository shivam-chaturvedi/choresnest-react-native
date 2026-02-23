const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env.development', 'utf8');
const supabaseUrl = envFile.match(/SUPABASE_URL=(.*)/)[1];
const supabaseKey = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1];

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRealtime() {
    const { data, error } = await supabase.rpc('get_realtime_tables', {});
    console.log(data);
    if (error) console.error(error);
}

checkRealtime();
