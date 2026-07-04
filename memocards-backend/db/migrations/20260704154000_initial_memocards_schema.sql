-- migrate:up
create extension if not exists pgcrypto;
create extension if not exists pg_trgm;
create extension if not exists citext;

do $$ begin
  create type learning_status as enum ('new', 'learning', 'known');
exception when duplicate_object then null;
end $$;

create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create table users (
  id uuid primary key default gen_random_uuid(),
  email citext unique,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger update_users_updated_at
before update on users
for each row execute function update_updated_at_column();

create table decks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  name text not null,
  description text,
  request_retention double precision not null default 0.9,
  default_review_type_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint decks_name_not_blank check (btrim(name) <> ''),
  constraint decks_request_retention_range check (
    request_retention >= 0.7 and request_retention <= 0.97
  )
);

create trigger update_decks_updated_at
before update on decks
for each row execute function update_updated_at_column();

create table deck_side_templates (
  id uuid primary key default gen_random_uuid(),
  deck_id uuid not null references decks(id) on delete cascade,
  label text not null,
  position integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint deck_side_templates_label_not_blank check (btrim(label) <> ''),
  constraint deck_side_templates_position_non_negative check (position >= 0),
  constraint deck_side_templates_deck_position_key unique (deck_id, position)
);

create trigger update_deck_side_templates_updated_at
before update on deck_side_templates
for each row execute function update_updated_at_column();

create table cards (
  id uuid primary key default gen_random_uuid(),
  deck_id uuid not null references decks(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger update_cards_updated_at
before update on cards
for each row execute function update_updated_at_column();

create table card_sides (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references cards(id) on delete cascade,
  label text not null,
  content text not null default '',
  position integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint card_sides_label_not_blank check (btrim(label) <> ''),
  constraint card_sides_position_non_negative check (position >= 0),
  constraint card_sides_card_position_key unique (card_id, position)
);

create trigger update_card_sides_updated_at
before update on card_sides
for each row execute function update_updated_at_column();

create table tags (
  id uuid primary key default gen_random_uuid(),
  deck_id uuid not null references decks(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tags_name_not_blank check (btrim(name) <> '')
);

create trigger update_tags_updated_at
before update on tags
for each row execute function update_updated_at_column();

create unique index tags_deck_lower_name_key on tags (deck_id, lower(name));

create table card_tags (
  card_id uuid not null references cards(id) on delete cascade,
  tag_id uuid not null references tags(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (card_id, tag_id)
);

create table review_types (
  id uuid primary key default gen_random_uuid(),
  deck_id uuid not null references decks(id) on delete cascade,
  name text not null,
  front_side_position integer not null default 0,
  request_retention double precision not null default 0.9,
  tag_id uuid references tags(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint review_types_name_not_blank check (btrim(name) <> ''),
  constraint review_types_front_side_position_non_negative check (front_side_position >= 0),
  constraint review_types_request_retention_range check (
    request_retention >= 0.7 and request_retention <= 0.97
  )
);

alter table decks
  add constraint decks_default_review_type_id_fkey
  foreign key (default_review_type_id) references review_types(id) on delete set null;

create trigger update_review_types_updated_at
before update on review_types
for each row execute function update_updated_at_column();

create table review_type_cards (
  id uuid primary key default gen_random_uuid(),
  review_type_id uuid not null references review_types(id) on delete cascade,
  card_id uuid not null references cards(id) on delete cascade,
  stability double precision not null default 0,
  difficulty double precision not null default 0,
  elapsed_days integer not null default 0,
  scheduled_days integer not null default 0,
  reps integer not null default 0,
  lapses integer not null default 0,
  state smallint not null default 0,
  due timestamptz not null default now(),
  last_review timestamptz,
  learning_status learning_status not null default 'new',
  recent_ratings smallint[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint review_type_cards_review_type_card_key unique (review_type_id, card_id),
  constraint review_type_cards_state_range check (state >= 0 and state <= 3),
  constraint review_type_cards_ratings_range check (
    recent_ratings <@ array[1, 2, 3, 4]::smallint[]
  )
);

create trigger update_review_type_cards_updated_at
before update on review_type_cards
for each row execute function update_updated_at_column();

create table review_logs (
  id uuid primary key default gen_random_uuid(),
  review_type_id uuid not null references review_types(id) on delete cascade,
  review_type_card_id uuid references review_type_cards(id) on delete set null,
  card_id uuid not null references cards(id) on delete cascade,
  rating smallint not null,
  previous_state smallint not null,
  previous_due timestamptz not null,
  next_state smallint not null,
  next_due timestamptz not null,
  stability double precision not null,
  difficulty double precision not null,
  elapsed_days integer not null,
  scheduled_days integer not null,
  reviewed_at timestamptz not null default now(),
  constraint review_logs_rating_range check (rating >= 1 and rating <= 4),
  constraint review_logs_previous_state_range check (previous_state >= 0 and previous_state <= 3),
  constraint review_logs_next_state_range check (next_state >= 0 and next_state <= 3)
);

create or replace function assert_card_tag_deck_matches()
returns trigger as $$
declare
  v_card_deck_id uuid;
  v_tag_deck_id uuid;
begin
  select deck_id into v_card_deck_id from cards where id = new.card_id;
  select deck_id into v_tag_deck_id from tags where id = new.tag_id;

  if v_card_deck_id is distinct from v_tag_deck_id then
    raise exception 'card_tags card and tag must belong to the same deck';
  end if;

  return new;
end;
$$ language plpgsql;

create trigger assert_card_tag_deck_matches
before insert or update on card_tags
for each row execute function assert_card_tag_deck_matches();

create or replace function assert_review_type_tag_deck_matches()
returns trigger as $$
declare
  v_tag_deck_id uuid;
begin
  if new.tag_id is null then
    return new;
  end if;

  select deck_id into v_tag_deck_id from tags where id = new.tag_id;

  if new.deck_id is distinct from v_tag_deck_id then
    raise exception 'review type tag must belong to the same deck';
  end if;

  return new;
end;
$$ language plpgsql;

create trigger assert_review_type_tag_deck_matches
before insert or update on review_types
for each row execute function assert_review_type_tag_deck_matches();

create index decks_user_updated_idx on decks (user_id, updated_at desc);
create index cards_deck_created_idx on cards (deck_id, created_at desc);
create index card_sides_card_position_idx on card_sides (card_id, position);
create index card_sides_content_trgm_idx on card_sides using gin (content gin_trgm_ops);
create index tags_deck_idx on tags (deck_id);
create index card_tags_tag_card_idx on card_tags (tag_id, card_id);
create index review_types_deck_created_idx on review_types (deck_id, created_at);
create index review_types_tag_idx on review_types (tag_id) where tag_id is not null;
create index review_type_cards_card_idx on review_type_cards (card_id);
create index review_type_cards_due_idx on review_type_cards (review_type_id, due);
create index review_type_cards_status_idx on review_type_cards (review_type_id, learning_status);
create index review_type_cards_last_review_idx on review_type_cards (review_type_id, last_review desc);
create index review_logs_card_reviewed_idx on review_logs (card_id, reviewed_at desc);
create index review_logs_review_type_reviewed_idx on review_logs (review_type_id, reviewed_at desc);

-- migrate:down
drop index if exists review_logs_review_type_reviewed_idx;
drop index if exists review_logs_card_reviewed_idx;
drop index if exists review_type_cards_last_review_idx;
drop index if exists review_type_cards_status_idx;
drop index if exists review_type_cards_due_idx;
drop index if exists review_type_cards_card_idx;
drop index if exists review_types_tag_idx;
drop index if exists review_types_deck_created_idx;
drop index if exists card_tags_tag_card_idx;
drop index if exists tags_deck_idx;
drop index if exists card_sides_content_trgm_idx;
drop index if exists card_sides_card_position_idx;
drop index if exists cards_deck_created_idx;
drop index if exists decks_user_updated_idx;

drop trigger if exists assert_review_type_tag_deck_matches on review_types;
drop function if exists assert_review_type_tag_deck_matches();
drop trigger if exists assert_card_tag_deck_matches on card_tags;
drop function if exists assert_card_tag_deck_matches();

drop table if exists review_logs;
drop table if exists review_type_cards;
alter table if exists decks drop constraint if exists decks_default_review_type_id_fkey;
drop table if exists review_types;
drop table if exists card_tags;
drop table if exists tags;
drop table if exists card_sides;
drop table if exists cards;
drop table if exists deck_side_templates;
drop table if exists decks;
drop table if exists users;
drop function if exists update_updated_at_column();
drop type if exists learning_status;
