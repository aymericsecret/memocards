-- migrate:up
drop index if exists public_deck_shares_unique_config_idx;

alter table public_deck_shares
  add column created_after date;

create unique index public_deck_shares_unique_config_idx
on public_deck_shares (
  deck_id,
  mode,
  coalesce(review_type_id, '00000000-0000-0000-0000-000000000000'::uuid),
  side_positions,
  coalesce(created_after, '-infinity'::date)
);

-- migrate:down
drop index if exists public_deck_shares_unique_config_idx;

alter table public_deck_shares
  drop column if exists created_after;

create unique index public_deck_shares_unique_config_idx
on public_deck_shares (
  deck_id,
  mode,
  coalesce(review_type_id, '00000000-0000-0000-0000-000000000000'::uuid),
  side_positions
);
