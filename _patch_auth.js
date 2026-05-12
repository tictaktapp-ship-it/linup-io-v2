const fs = require('fs');
const path = 'E:\\Linup v2\\server\\src\\middleware\\auth.ts';
let content = fs.readFileSync(path, 'utf8');

const oldCheck = `    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle();
    if (profileError || !profile) {
      return reply.status(401).send({ error: 'User not found' });
    }
    const { data: membership } = await supabase`;

const newCheck = `    const { data: membership } = await supabase`;

if (!content.includes(oldCheck)) {
  console.error('ERROR: anchor not found'); process.exit(1);
}

content = content.replace(oldCheck, newCheck);
fs.writeFileSync(path, content, { encoding: 'utf8' });
console.log('OK: user_profiles check removed from auth middleware');