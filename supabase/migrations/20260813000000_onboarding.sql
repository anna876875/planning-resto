-- ─── Profil restaurateur ───────────────────────────────────────────────────
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null,
  onboarding_step text not null default 'secteur',
  -- 'secteur' | 'equipe' | 'membres' | 'done'
  created_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;
create policy "Profil visible par son propriétaire"
  on public.profiles for all
  using (auth.uid() = id);

-- ─── Restaurant ─────────────────────────────────────────────────────────────
create table if not exists public.restaurants (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null references public.profiles(id) on delete cascade,
  secteur       text not null,
  taille_equipe text,
  created_at    timestamptz not null default now()
);

alter table public.restaurants enable row level security;
create policy "Restaurant visible par son propriétaire"
  on public.restaurants for all
  using (auth.uid() = owner_id);

-- ─── Membres de l'équipe ────────────────────────────────────────────────────
create table if not exists public.team_members (
  id                  uuid primary key default gen_random_uuid(),
  restaurant_id       uuid not null references public.restaurants(id) on delete cascade,
  prenom              text not null,
  nom                 text not null,
  role                text not null,
  statut_contractuel  text not null,
  heures_par_semaine  numeric(4,1) not null,
  created_at          timestamptz not null default now()
);

alter table public.team_members enable row level security;
create policy "Membres visibles par le propriétaire du restaurant"
  on public.team_members for all
  using (
    exists (
      select 1 from public.restaurants r
      where r.id = team_members.restaurant_id
        and r.owner_id = auth.uid()
    )
  );

-- ─── Indisponibilités ───────────────────────────────────────────────────────
create table if not exists public.unavailabilities (
  id              uuid primary key default gen_random_uuid(),
  team_member_id  uuid not null references public.team_members(id) on delete cascade,
  type            text not null check (type in ('recurrent', 'ponctuel')),
  jour_semaine    smallint check (jour_semaine between 0 and 6), -- 0=lun, 6=dim
  date            date,
  heure_debut     time,
  heure_fin       time,
  note            text,
  created_at      timestamptz not null default now()
);

alter table public.unavailabilities enable row level security;
create policy "Indisponibilités visibles par le propriétaire"
  on public.unavailabilities for all
  using (
    exists (
      select 1 from public.team_members tm
      join public.restaurants r on r.id = tm.restaurant_id
      where tm.id = unavailabilities.team_member_id
        and r.owner_id = auth.uid()
    )
  );

-- ─── Trigger : crée le profil automatiquement à l'inscription ───────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', '')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
