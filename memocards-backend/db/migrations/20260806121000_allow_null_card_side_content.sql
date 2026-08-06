-- migrate:up
alter table card_sides
  alter column content drop not null;

-- migrate:down
update card_sides
set content = ''
where content is null;

alter table card_sides
  alter column content set not null;
