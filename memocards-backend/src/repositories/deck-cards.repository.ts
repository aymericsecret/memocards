import { Container, Service } from "typedi";
import { Database } from "../database.js";

export const reviewGroupKeys = [
  "new",
  "now",
  "in1h",
  "in24h",
  "tomorrow",
  "inWeek",
  "later"
] as const;

export type ReviewGroupKey = (typeof reviewGroupKeys)[number];

export interface SearchDeckCardsParams {
  deckId: string;
  search?: string | null;
  tagIds?: string[] | null;
  learningStatuses?: string[] | null;
  reviewTypeId?: string | null;
  reviewGroups?: ReviewGroupKey[] | null;
  sideFilledPositions?: number[] | null;
  sideEmptyPositions?: number[] | null;
  sortField: "created_at" | "last_review";
  sortDir: "asc" | "desc";
  limit: number;
  offset: number;
}

interface DeckCardRow {
  id: string;
  deck_id: string;
  created_at: string;
  updated_at: string;
  last_review_effective: string | null;
  total_count: string;
  sides: unknown;
  tags: unknown;
}

@Service()
export class DeckCardsRepository {
  private readonly database: Database;

  constructor() {
    this.database = Container.get(Database);
  }

  async searchDeckCards(params: SearchDeckCardsParams) {
    const sortExpression =
      params.sortField === "last_review" ? "last_review_effective" : "created_at";
    const sortDirection = params.sortDir === "asc" ? "asc" : "desc";
    const sortNulls = params.sortField === "last_review" ? " nulls last" : "";

    const result = await this.database.query<DeckCardRow>(
      `
      with searched as (
        select
          c.id,
          c.deck_id,
          c.created_at,
          c.updated_at,
          (
            select max(rtc.last_review)
            from review_type_cards rtc
            where rtc.card_id = c.id
          ) as last_review_effective,
          count(*) over() as total_count
        from cards c
        left join review_types filter_rt
          on filter_rt.id = $4::uuid
         and filter_rt.deck_id = c.deck_id
        left join review_type_cards group_rtc
          on group_rtc.card_id = c.id
         and group_rtc.review_type_id = $4::uuid
        where c.deck_id = $1::uuid
          and (
            $4::uuid is null
            or (
              filter_rt.id is not null
              and (
                filter_rt.tag_id is null
                or exists (
                  select 1
                  from card_tags review_type_tag
                  where review_type_tag.card_id = c.id
                    and review_type_tag.tag_id = filter_rt.tag_id
                )
              )
              and exists (
                select 1
                from card_sides front_side
                where front_side.card_id = c.id
                  and front_side.position = filter_rt.front_side_position
                  and btrim(front_side.content) <> ''
              )
              and (
                filter_rt.back_side_position is null
                or exists (
                  select 1
                  from card_sides back_side
                  where back_side.card_id = c.id
                    and back_side.position = filter_rt.back_side_position
                    and btrim(back_side.content) <> ''
                )
              )
            )
          )
          and (
            $2::text is null
            or exists (
              select 1
              from card_sides cs
              where cs.card_id = c.id
                and cs.content ilike '%' || $2::text || '%'
            )
          )
          and (
            $3::uuid[] is null
            or exists (
              select 1
              from card_tags ct
              where ct.card_id = c.id
                and ct.tag_id = any($3::uuid[])
            )
          )
          and (
            $4::uuid is null
            or $5::text[] is null
            or (
              case
                when group_rtc.id is null then 'new'
                when group_rtc.due <= now() then 'now'
                when group_rtc.due <= now() + interval '1 hour' then 'in1h'
                when group_rtc.due <= now() + interval '24 hours' then 'in24h'
                when group_rtc.due <= now() + interval '48 hours' then 'tomorrow'
                when group_rtc.due <= now() + interval '7 days' then 'inWeek'
                else 'later'
              end
            ) = any($5::text[])
          )
          and (
            $10::text[] is null
            or (
              case
                when group_rtc.id is null then 'new'
                else group_rtc.learning_status::text
              end
            ) = any($10::text[])
          )
          and (
            $6::int[] is null
            or not exists (
              select 1
              from unnest($6::int[]) as required_position
              where not exists (
                select 1
                from card_sides filled_side
                where filled_side.card_id = c.id
                  and filled_side.position = required_position
                  and btrim(filled_side.content) <> ''
              )
            )
          )
          and (
            $7::int[] is null
            or not exists (
              select 1
              from unnest($7::int[]) as required_empty_position
              where exists (
                select 1
                from card_sides empty_side
                where empty_side.card_id = c.id
                  and empty_side.position = required_empty_position
                  and btrim(empty_side.content) <> ''
              )
            )
          )
      )
      select
        s.id,
        s.deck_id,
        s.created_at,
        s.updated_at,
        s.last_review_effective,
        s.total_count,
        coalesce(
          (
            select jsonb_agg(
              jsonb_build_object(
                'id', cs.id,
                'label', cs.label,
                'content', cs.content,
                'position', cs.position
              )
              order by cs.position
            )
            from card_sides cs
            where cs.card_id = s.id
          ),
          '[]'::jsonb
        ) as sides,
        coalesce(
          (
            select jsonb_agg(
              jsonb_build_object('id', t.id, 'name', t.name)
              order by t.name
            )
            from card_tags ct
            join tags t on t.id = ct.tag_id
            where ct.card_id = s.id
          ),
          '[]'::jsonb
        ) as tags
      from searched s
      order by ${sortExpression} ${sortDirection}${sortNulls}, id asc
      limit $8::int offset $9::int
      `,
      [
        params.deckId,
        params.search?.trim() ? params.search.trim() : null,
        params.tagIds?.length ? params.tagIds : null,
        params.reviewTypeId ?? null,
        params.reviewGroups?.length ? params.reviewGroups : null,
        params.sideFilledPositions?.length ? params.sideFilledPositions : null,
        params.sideEmptyPositions?.length ? params.sideEmptyPositions : null,
        params.limit,
        params.offset,
        params.learningStatuses?.length ? params.learningStatuses : null
      ]
    );

    return {
      cards: result.rows.map((row) => ({
        id: row.id,
        deckId: row.deck_id,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        lastReviewEffective: row.last_review_effective,
        sides: row.sides,
        tags: row.tags
      })),
      totalCount: Number(result.rows[0]?.total_count ?? 0)
    };
  }
}
