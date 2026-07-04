import { Eye, Plus, Trash2 } from "lucide-react";
import type { RefObject } from "react";
import { Button } from "../design-system";
import type { CardRow, SideTemplate, Tag } from "../shared/types";
import { CardTagPicker } from "./card-tag-picker";
import { NewCardTagSelector } from "./new-card-tag-selector";

interface CardTableProps {
  allTags: Tag[];
  cards: CardRow[];
  deckId: string;
  newRow: Record<number, string>;
  newTagIds: string[];
  tableRef: RefObject<HTMLDivElement | null>;
  templates: SideTemplate[];
  totalCount: number;
  onAddCard: () => void;
  onDeleteCard: (card: CardRow) => void;
  onFocusCell: (row: string, col: number) => void;
  onNewRowChange: (value: Record<number, string>) => void;
  onNewTagIdsChange: (tagIds: string[]) => void;
  onOpenCard: (cardId: string) => void;
  onUpdateCardSide: (card: CardRow, template: SideTemplate, content: string) => void;
}

export function CardTable({
  allTags,
  cards,
  deckId,
  newRow,
  newTagIds,
  tableRef,
  templates,
  totalCount,
  onAddCard,
  onDeleteCard,
  onFocusCell,
  onNewRowChange,
  onNewTagIdsChange,
  onOpenCard,
  onUpdateCardSide
}: CardTableProps) {
  return (
    <>
      <div className="table-frame" ref={tableRef}>
        <table>
          <thead>
            <tr>
              {templates.map((template) => (
                <th key={template.id}>{template.label}</th>
              ))}
              <th className="desktop-only">Tags</th>
              <th className="desktop-only">Derniere revision</th>
              <th className="action-col" />
            </tr>
          </thead>
          <tbody>
            <tr className="new-row">
              {templates.map((template, index) => (
                <td key={template.id}>
                  <input
                    data-row="__new__"
                    data-col={index}
                    value={newRow[template.position] ?? ""}
                    onChange={(event) =>
                      onNewRowChange({
                        ...newRow,
                        [template.position]: event.target.value
                      })
                    }
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        onAddCard();
                      }
                      if (event.key === "Tab") {
                        event.preventDefault();
                        const nextCol = event.shiftKey ? index - 1 : index + 1;
                        if (nextCol >= 0 && nextCol < templates.length) {
                          onFocusCell("__new__", nextCol);
                        }
                      }
                    }}
                    placeholder={`${template.label}...`}
                  />
                </td>
              ))}
              <td className="desktop-only">
                <NewCardTagSelector
                  allTags={allTags}
                  deckId={deckId}
                  selectedTagIds={newTagIds}
                  onSelectedTagIdsChange={onNewTagIdsChange}
                />
              </td>
              <td className="desktop-only" />
              <td>
                <Button
                  size="icon"
                  disabled={Object.values(newRow).filter((value) => value.trim()).length < 2}
                  onClick={onAddCard}
                  aria-label="Ajouter"
                >
                  <Plus size={16} />
                </Button>
              </td>
            </tr>

            {cards.map((card) => (
              <tr key={card.id}>
                {templates.map((template, index) => {
                  const side = card.sides.find(
                    (candidate) => candidate.position === template.position
                  );

                  return (
                    <td key={template.id}>
                      <input
                        data-row={card.id}
                        data-col={index}
                        defaultValue={side?.content ?? ""}
                        onBlur={(event) =>
                          onUpdateCardSide(card, template, event.target.value)
                        }
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            event.currentTarget.blur();
                          }
                          if (event.key === "Tab") {
                            event.preventDefault();
                            const nextCol = event.shiftKey ? index - 1 : index + 1;
                            if (nextCol >= 0 && nextCol < templates.length) {
                              onFocusCell(card.id, nextCol);
                            }
                          }
                        }}
                      />
                    </td>
                  );
                })}
                <td className="desktop-only muted-cell">
                  <CardTagPicker
                    allTags={allTags}
                    cardId={card.id}
                    cardTags={card.tags}
                    deckId={deckId}
                  />
                </td>
                <td className="desktop-only muted-cell">
                  {card.lastReviewEffective
                    ? new Date(card.lastReviewEffective).toLocaleString("fr-FR", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit"
                      })
                    : "-"}
                </td>
                <td>
                  <div className="row-actions">
                    <Button size="icon" onClick={() => onOpenCard(card.id)} aria-label="Ouvrir">
                      <Eye size={15} />
                    </Button>
                    <Button
                      className="danger"
                      size="icon"
                      onClick={() => onDeleteCard(card)}
                      aria-label="Supprimer"
                    >
                      <Trash2 size={15} />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalCount === 0 && (
        <p className="empty-table-note">
          Commencez a ajouter des cartes dans le tableau ci-dessus
        </p>
      )}
    </>
  );
}
