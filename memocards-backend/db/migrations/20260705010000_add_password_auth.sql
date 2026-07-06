-- migrate:up
alter table users
  add column if not exists password_hash text;

create index if not exists users_email_idx on users (email);

-- migrate:down
drop index if exists users_email_idx;

alter table users
  drop column if exists password_hash;
