-- migrate:up
with ranked_shares as (
  select
    id,
    row_number() over (
      partition by
        deck_id,
        mode,
        coalesce(review_type_id, '00000000-0000-0000-0000-000000000000'::uuid),
        side_positions
      order by created_at asc, id asc
    ) as duplicate_rank
  from public_deck_shares
)
delete from public_deck_shares
where id in (
  select id
  from ranked_shares
  where duplicate_rank > 1
);

create unique index if not exists public_deck_shares_unique_config_idx
on public_deck_shares (
  deck_id,
  mode,
  coalesce(review_type_id, '00000000-0000-0000-0000-000000000000'::uuid),
  side_positions
);

-- migrate:down
drop index if exists public_deck_shares_unique_config_idx;
