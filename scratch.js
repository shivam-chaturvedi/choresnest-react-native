const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function checkData() {
  // Let's authenticate as a specific member to test their access via RLS
  // For now, we will just use the service role key to inspect raw DB rows.
  const adminClient = createClient(
    process.env.SUPABASE_URL,
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpa2hrbGh4Y2RoeXlreHhxdnNjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczODIxOTIxNSwiZXhwIjoyMDUzNzk1MjE1fQ.Xf9kGzZf1Q5V-F_zT8q4M3p2kG0_fQZ_7J9tZ_jZ_zY'
  );

  console.log("Checking profiles...");
  const { data: profiles } = await adminClient.from('profiles').select('id, email, role, owner_id');
  
  if (!profiles) {
    console.error("Could not fetch profiles.");
    return;
  }
  
  const members = profiles.filter(p => p.role === 'member');
  const owners = profiles.filter(p => p.role === 'admin' || p.owner_id === p.id);
  
  console.log(`Found ${members.length} members and ${owners.length} potential owners.`);

  if (members.length > 0) {
    const testMember = members[0];
    console.log(`Testing member: ${testMember.email} (ID: ${testMember.id}, Owner: ${testMember.owner_id})`);
    
    // Check how many events exist for this owner
    const { data: ownerEvents } = await adminClient
      .from('events')
      .select('id, title, profile_id')
      .eq('profile_id', testMember.owner_id);
      
    console.log(`The owner (${testMember.owner_id}) actually has ${ownerEvents?.length || 0} events in the DB.`);

    // Check how many events exist for the member directly
    const { data: memberEvents } = await adminClient
        .from('events')
        .select('id, title, profile_id')
        .eq('profile_id', testMember.id);
        
    console.log(`The member directly owns ${memberEvents?.length || 0} events.`);
  } else {
    console.log("No members found. Checking general event ownership:");
    const { data: allEvents } = await adminClient.from('events').select('profile_id');
    const counts = {};
    if(allEvents) {
        allEvents.forEach(e => counts[e.profile_id] = (counts[e.profile_id] || 0) + 1);
        console.log("Events per profile_id:", counts);
    }
  }
}

checkData();
