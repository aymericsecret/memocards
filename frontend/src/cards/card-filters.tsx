import { Check, Search } from "lucide-react";
import { FilterMenu } from "../design-system";
import type { SideTemplate, Tag } from "../shared/types";

interface CardFiltersProps {
  search: string;
  selectedStatuses: string[];
  selectedTagIds: string[];
  sideFilters: Record<number, "filled" | "empty">;
  sortDir: "asc" | "desc";
  sortField: "created_at" | "last_review";
  tags: Tag[];
  templates: SideTemplate[];
  onSearchChange: (value: string) => void;
  onSelectedStatusesChange: (value: string[]) => void;
  onSelectedTagIdsChange: (value: string[]) => void;
  onSideFiltersChange: (value: Record<number, "filled" | "empty">) => void;
  onSortChange: (field: "created_at" | "last_review", dir: "asc" | "desc") => void;
}

export function CardFilters({
  search,
  selectedStatuses,
  selectedTagIds,
  sideFilters,
  sortDir,
  sortField,
  tags,
  templates,
  onSearchChange,
  onSelectedStatusesChange,
  onSelectedTagIdsChange,
  onSideFiltersChange,
  onSortChange
}: CardFiltersProps) {
  return (
    <div className="table-toolbar">
      <label className="search-box">
        <Search size={14} />
        <input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Rechercher dans les cartes..."
        />
      </label>

      <select
        value={`${sortField}:${sortDir}`}
        onChange={(event) => {
          const [field, dir] = event.target.value.split(":") as [
            "created_at" | "last_review",
            "asc" | "desc"
          ];
          onSortChange(field, dir);
        }}
      >
        <option value="created_at:desc">Creation recente</option>
        <option value="created_at:asc">Creation ancienne</option>
        <option value="last_review:desc">Derniere revision recente</option>
        <option value="last_review:asc">Derniere revision ancienne</option>
      </select>

      <FilterMenu label="Tags">
        <div className="filter-panel">
          <p className="filter-title">Tags</p>
          {tags.length === 0 ? (
            <p className="filter-empty">Aucun tag</p>
          ) : (
            tags.map((tag) => (
              <label className="check-row" key={tag.id}>
                <input
                  type="checkbox"
                  checked={selectedTagIds.includes(tag.id)}
                  onChange={(event) =>
                    onSelectedTagIdsChange(
                      event.target.checked
                        ? [...selectedTagIds, tag.id]
                        : selectedTagIds.filter((id) => id !== tag.id)
                    )
                  }
                />
                {tag.name}
              </label>
            ))
          )}
        </div>
      </FilterMenu>

      <FilterMenu label="Statut">
        <div className="filter-panel compact">
          <p className="filter-title">Statut</p>
          {[
            ["new", "Nouvelle"],
            ["learning", "En apprentissage"],
            ["known", "Acquise"]
          ].map(([value, label]) => (
            <label className="check-row" key={value}>
              <input
                type="checkbox"
                checked={selectedStatuses.includes(value)}
                onChange={(event) =>
                  onSelectedStatusesChange(
                    event.target.checked
                      ? [...selectedStatuses, value]
                      : selectedStatuses.filter((status) => status !== value)
                  )
                }
              />
              {label}
            </label>
          ))}
        </div>
      </FilterMenu>

      <FilterMenu label="Faces" wide>
        <div className="filter-panel">
          <p className="filter-title">Faces des cartes</p>
          {templates.map((template) => (
            <div className="side-filter-row" key={template.id}>
              <span>{template.label}</span>
              {(["filled", "empty"] as const).map((value) => (
                <button
                  className={sideFilters[template.position] === value ? "chip active" : "chip"}
                  key={value}
                  onClick={() => {
                    const next = { ...sideFilters };
                    if (next[template.position] === value) {
                      delete next[template.position];
                    } else {
                      next[template.position] = value;
                    }
                    onSideFiltersChange(next);
                  }}
                >
                  {value === "filled" && <Check size={12} />}
                  {value === "filled" ? "Remplie" : "Vide"}
                </button>
              ))}
            </div>
          ))}
        </div>
      </FilterMenu>
    </div>
  );
}
