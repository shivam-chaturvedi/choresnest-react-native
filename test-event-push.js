const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://rikhklhxcdhxykxxqvsc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpa2hrbGh4Y2RoeHlreHhxdnNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5NDQ0MTUsImV4cCI6MjA4NTUyMDQxNX0.PvO0r2HEQwgMbv6LbtU2M0oRTEWSao_inyB8EtXjN-8';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  // fetch a valid member id
  const { data: members } = await supabase.from('members').select('id, profile_id').limit(1);
  if (!members || members.length === 0) {
    console.log('No members found');
    return;
  }
  const member = members[0];
  console.log('Using member', member);

  const res = await supabase.from('events').insert({
    id: 'test-event-12345',
    title: 'Test Event 2',
    date: '2024-03-01',
    time: '12:00 PM',
    icon: 'calendar-star',
    member_id: member.id,
    profile_id: member.profile_id,
    visibility: 'default',
    reminder_offset_minutes: 15,
    is_recurring: false
  }).select();

  console.log("Insert result:", JSON.stringify(res, null, 2));
}
test();
