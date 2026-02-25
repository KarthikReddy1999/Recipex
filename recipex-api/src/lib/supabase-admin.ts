interface SupabaseUser {
  id: string;
  email?: string;
}

function getConfig() {
  const supabaseUrl = process.env.SUPABASE_URL || '';
  const serviceKey = process.env.SUPABASE_SERVICE_KEY || '';
  return { supabaseUrl, serviceKey };
}

export function hasSupabaseAdminConfig(): boolean {
  const { supabaseUrl, serviceKey } = getConfig();
  return Boolean(supabaseUrl && serviceKey);
}

export async function getUserFromAccessToken(accessToken: string): Promise<SupabaseUser | null> {
  const { supabaseUrl, serviceKey } = getConfig();
  if (!supabaseUrl || !serviceKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  }

  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    return null;
  }

  const user = (await response.json()) as SupabaseUser;
  return user?.id ? user : null;
}

async function deleteProfileByUserId(userId: string): Promise<void> {
  const { supabaseUrl, serviceKey } = getConfig();
  if (!supabaseUrl || !serviceKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  }

  await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}`, {
    method: 'DELETE',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      Prefer: 'return=minimal'
    }
  });
}

async function deleteAuthUserById(userId: string): Promise<void> {
  const { supabaseUrl, serviceKey } = getConfig();
  if (!supabaseUrl || !serviceKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  }

  const response = await fetch(`${supabaseUrl}/auth/v1/admin/users/${encodeURIComponent(userId)}`, {
    method: 'DELETE',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`
    }
  });

  if (!response.ok) {
    const details = await response.text().catch(() => '');
    throw new Error(`Failed to delete auth user. ${details}`);
  }
}

export async function deleteAccountByUserId(userId: string): Promise<void> {
  await deleteProfileByUserId(userId);
  await deleteAuthUserById(userId);
}
