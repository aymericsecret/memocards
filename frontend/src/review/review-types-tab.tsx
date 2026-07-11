import {
  Play,
  Plus,
  Settings,
  Star,
  Trash2
} from "lucide-react";
import { useState } from "react";
import { ActionMenu, ActionMenuItem, Button, ConfirmDialog } from "../design-system";
import { navigate } from "../shared/navigation";
import type { ReviewType, SideTemplate, Tag } from "../shared/types";
import { NewReviewTypeModal } from "./new-review-type-modal";
import {
  useCreateReviewTypeMutation,
  useDeleteReviewTypeMutation,
  useResetReviewTypeProgressMutation,
  useSetDefaultReviewTypeMutation,
  useUpdateReviewTypeMutation
} from "./review-type-queries";
import { ReviewTypeSettingsModal } from "./review-type-settings-modal";

interface ReviewTypesTabProps {
  deckId: string;
  reviewTypes: ReviewType[];
  tags: Tag[];
  templates: SideTemplate[];
}

const groupLabels: Array<[keyof ReviewType["groups"], string]> = [
  ["new", "Nouvelles"],
  ["now", "Maintenant"],
  ["in1h", "< 1h"],
  ["in24h", "< 24h"],
  ["tomorrow", "Demain"],
  ["inWeek", "< 1 sem."],
  ["later", "> 1 sem."]
];

const groupColors: Record<keyof ReviewType["groups"], string> = {
  new: "hsl(210 80% 65%)",
  now: "hsl(355 85% 68%)",
  in1h: "hsl(20 90% 65%)",
  in24h: "hsl(40 90% 62%)",
  tomorrow: "hsl(150 70% 55%)",
  inWeek: "hsl(180 60% 55%)",
  later: "hsl(260 55% 70%)"
};

export function ReviewTypesTab({ deckId, reviewTypes, tags, templates }: ReviewTypesTabProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [settingsReviewType, setSettingsReviewType] = useState<ReviewType | null>(null);
  const [deleteReviewType, setDeleteReviewType] = useState<ReviewType | null>(null);
  const [selectionMap, setSelectionMap] = useState<
    Record<string, Array<keyof ReviewType["groups"]>>
  >({});
  const createReviewTypeMutation = useCreateReviewTypeMutation(deckId);
  const updateReviewTypeMutation = useUpdateReviewTypeMutation(deckId);
  const deleteReviewTypeMutation = useDeleteReviewTypeMutation(deckId);
  const setDefaultMutation = useSetDefaultReviewTypeMutation(deckId);
  const resetProgressMutation = useResetReviewTypeProgressMutation(deckId);

  const frontLabel = (position: number) =>
    templates.find((template) => template.position === position)?.label ??
    `Position ${position}`;

  const selectedCount = (reviewType: ReviewType) =>
    (selectionMap[reviewType.id] ?? []).reduce(
      (sum, key) => sum + reviewType.groups[key],
      0
    );

  const startReview = (reviewType: ReviewType) => {
    const selected = selectionMap[reviewType.id] ?? [];
    const query = new URLSearchParams();
    if (selected.length > 0) query.set("groups", selected.join(","));
    navigate(`/review-type/${reviewType.id}${query.toString() ? `?${query.toString()}` : ""}`);
  };

  const deleteSelectedReviewType = async () => {
    if (!deleteReviewType) return;
    await deleteReviewTypeMutation.mutateAsync(deleteReviewType.id);
    setDeleteReviewType(null);
  };

  return (
    <section className="review-tab">
      <div className="review-tab-header">
        <div>
          <h2>Types de revision</h2>
          <p>Choisissez la face affichee et le groupe de cartes a reviser.</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus size={16} /> Nouveau type
        </Button>
      </div>

      {reviewTypes.length === 0 ? (
        <p className="review-empty">
          Creez un type de revision pour etudier une face specifique de vos cartes.
        </p>
      ) : (
        <div className="review-type-list">
          {reviewTypes.map((reviewType) => {
            const tag = tags.find((candidate) => candidate.id === reviewType.tagId);
            const selected = selectionMap[reviewType.id] ?? [];
            const count =
              selected.length > 0 ? selectedCount(reviewType) : reviewType.dueCount;

            return (
              <article
                className={
                  reviewType.isDefault
                    ? "review-type-card review-type-card-default"
                    : "review-type-card"
                }
                key={reviewType.id}
              >
                <div className="review-type-main">
                  <div className="review-type-copy">
                    <div className="review-type-title-row">
                      <p>{reviewType.name}</p>
                      {reviewType.isDefault && (
                        <Star className="default-star" size={14} fill="currentColor" />
                      )}
                    </div>
                    <p className="review-type-meta">
                      Question : {frontLabel(reviewType.frontSidePosition)} ·{" "}
                      {reviewType.totalCards} carte
                      {reviewType.totalCards !== 1 ? "s" : ""}
                      {tag ? ` · ${tag.name}` : ""}
                    </p>
                  </div>

                  <div className="review-type-actions">
                    <Button
                      size="sm"
                      variant={count > 0 ? "primary" : "outline"}
                      disabled={count === 0}
                      onClick={() => startReview(reviewType)}
                    >
                      <Play size={14} /> {count}
                    </Button>
                    <ActionMenu label="Actions du type de revision">
                      <ActionMenuItem onClick={() => setSettingsReviewType(reviewType)}>
                        <Settings size={15} /> Reglages
                      </ActionMenuItem>
                      {!reviewType.isDefault && (
                        <ActionMenuItem
                          onClick={() => void setDefaultMutation.mutateAsync(reviewType.id)}
                        >
                          <Star size={15} /> Definir par defaut
                        </ActionMenuItem>
                      )}
                      <ActionMenuItem
                        className="danger-menu-item"
                        onClick={() => setDeleteReviewType(reviewType)}
                      >
                        <Trash2 size={15} /> Supprimer
                      </ActionMenuItem>
                    </ActionMenu>
                  </div>
                </div>

                <ReviewGroupsBar
                  groups={reviewType.groups}
                  selected={new Set(selected)}
                  onSelectionChange={(next) =>
                    setSelectionMap((previous) => ({
                      ...previous,
                      [reviewType.id]: Array.from(next)
                    }))
                  }
                />
              </article>
            );
          })}
        </div>
      )}

      <NewReviewTypeModal
        isOpen={isCreateOpen}
        tags={tags}
        templates={templates}
        onClose={() => setIsCreateOpen(false)}
        onCreateReviewType={async (input) => {
          await createReviewTypeMutation.mutateAsync(input);
        }}
      />
      <ReviewTypeSettingsModal
        isOpen={Boolean(settingsReviewType)}
        reviewType={settingsReviewType}
        templates={templates}
        onClose={() => setSettingsReviewType(null)}
        onResetProgress={async (reviewTypeId) => {
          await resetProgressMutation.mutateAsync(reviewTypeId);
        }}
        onUpdateReviewType={async (reviewTypeId, values) => {
          await updateReviewTypeMutation.mutateAsync({ reviewTypeId, values });
        }}
      />
      {deleteReviewType && (
        <ConfirmDialog
          description={`Le type "${deleteReviewType.name}" et toute sa progression seront definitivement supprimes. Cette action est irreversible.`}
          isPending={deleteReviewTypeMutation.isPending}
          labelledBy="delete-review-type-title"
          title="Supprimer le type de revision ?"
          onCancel={() => setDeleteReviewType(null)}
          onConfirm={() => void deleteSelectedReviewType()}
        />
      )}
    </section>
  );
}

function ReviewGroupsBar({
  groups,
  selected,
  onSelectionChange
}: {
  groups: ReviewType["groups"];
  selected: Set<keyof ReviewType["groups"]>;
  onSelectionChange: (selected: Set<keyof ReviewType["groups"]>) => void;
}) {
  const total = Object.values(groups).reduce((sum, value) => sum + value, 0);

  if (total === 0) return null;

  const toggleGroup = (key: keyof ReviewType["groups"]) => {
    const next = new Set(selected);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onSelectionChange(next);
  };

  return (
    <div className="review-groups">
      <div className="review-groups-stacked" aria-label="Repartition des revisions">
        {groupLabels.map(([key, label]) => {
          const count = groups[key];
          if (count === 0) return null;
          const isSelected = selected.has(key);

          return (
            <button
              key={key}
              onClick={() => toggleGroup(key)}
              title={`${label}: ${count}`}
              style={{
                backgroundColor: groupColors[key],
                opacity: selected.size === 0 || isSelected ? 1 : 0.25,
                width: `${(count / total) * 100}%`
              }}
              type="button"
            />
          );
        })}
      </div>
      <div className="review-groups-legend">
        {groupLabels.map(([key, label]) => {
          const count = groups[key];
          if (count === 0) return null;

          return (
            <button
              className={selected.has(key) ? "selected" : ""}
              key={key}
              onClick={() => toggleGroup(key)}
              style={{ opacity: selected.size === 0 || selected.has(key) ? 1 : 0.4 }}
              type="button"
            >
              <span style={{ backgroundColor: groupColors[key] }} />
              {label} ({count})
            </button>
          );
        })}
      </div>
    </div>
  );
}
