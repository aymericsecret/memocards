-- migrate:up
alter table review_types
  add column back_side_position integer,
  add constraint review_types_back_side_position_non_negative check (
    back_side_position is null or back_side_position >= 0
  );

-- migrate:down
alter table review_types
  drop constraint if exists review_types_back_side_position_non_negative,
  drop column if exists back_side_position;
