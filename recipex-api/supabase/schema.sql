create table if not exists profiles (
  id uuid references auth.users primary key,
  name text,
  avatar_url text,
  favorite_cuisines text[] default '{}',
  dietary_restrictions text[] default '{}',
  created_at timestamptz default now()
);

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, avatar_url)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      split_part(new.email, '@', 1)
    ),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user_profile();

create table if not exists saved_recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  meal_id text not null,
  meal_name text not null,
  meal_thumb text,
  cuisine text,
  saved_at timestamptz default now(),
  last_cooked_at timestamptz,
  cook_count integer default 0
);

create table if not exists shopping_lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  items jsonb not null,
  recipe_names text[],
  created_at timestamptz default now(),
  completed_at timestamptz
);

create table if not exists scan_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  detected_ingredients jsonb,
  image_url text,
  scanned_at timestamptz default now()
);

alter table profiles enable row level security;
alter table saved_recipes enable row level security;
alter table shopping_lists enable row level security;
alter table scan_history enable row level security;

create policy "own profile" on profiles for all using (auth.uid() = id);
create policy "own saved recipes" on saved_recipes for all using (auth.uid() = user_id);
create policy "own shopping lists" on shopping_lists for all using (auth.uid() = user_id);
create policy "own scan history" on scan_history for all using (auth.uid() = user_id);

insert into public.profiles (id, name, avatar_url)
select
  u.id,
  coalesce(
    u.raw_user_meta_data ->> 'full_name',
    u.raw_user_meta_data ->> 'name',
    split_part(u.email, '@', 1)
  ) as name,
  u.raw_user_meta_data ->> 'avatar_url' as avatar_url
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;
