-- migrate:up
create extension if not exists pgcrypto;

-- migrate:down
drop extension if exists pgcrypto;
