-- migrate:up
alter table review_types
  add column is_favorite boolean not null default false;

update review_types rt
set is_favorite = true
from decks d
where d.default_review_type_id = rt.id;

alter table decks
  drop constraint if exists decks_default_review_type_id_fkey,
  drop column if exists default_review_type_id;

create unique index review_types_one_favorite_per_deck_idx
  on review_types (deck_id) where is_favorite;

-- migrate:down
drop index if exists review_types_one_favorite_per_deck_idx;

alter table decks
  add column default_review_type_id uuid;

update decks d
set default_review_type_id = rt.id
from review_types rt
where rt.deck_id = d.id
  and rt.is_favorite;

alter table decks
  add constraint decks_default_review_type_id_fkey
  foreign key (default_review_type_id) references review_types(id) on delete set null;

alter table review_types
  drop column if exists is_favorite;
