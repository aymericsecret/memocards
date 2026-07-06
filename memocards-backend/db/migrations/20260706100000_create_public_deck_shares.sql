-- migrate:up
create table public_deck_shares (
  id uuid primary key default gen_random_uuid(),
  deck_id uuid not null references decks(id) on delete cascade,
  review_type_id uuid references review_types(id) on delete set null,
  token text not null unique,
  mode text not null default 'ai',
  side_positions integer[] not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint public_deck_shares_mode_check check (mode in ('ai', 'people')),
  constraint public_deck_shares_side_positions_not_empty check (array_length(side_positions, 1) > 0)
);

create trigger update_public_deck_shares_updated_at
before update on public_deck_shares
for each row execute function update_updated_at_column();

create index public_deck_shares_deck_idx on public_deck_shares (deck_id);

-- migrate:down
drop table if exists public_deck_shares;
