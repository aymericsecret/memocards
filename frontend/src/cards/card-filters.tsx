import { Search } from "lucide-react";
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
  const sortOptions: Array<{
    dir: "asc" | "desc";
    field: "created_at" | "last_review";
    label: string;
  }> = [
    { field: "created_at", dir: "desc", label: "Creation recente" },
    { field: "created_at", dir: "asc", label: "Creation ancienne" },
    { field: "last_review", dir: "desc", label: "Revision recente" },
    { field: "last_review", dir: "asc", label: "Revision ancienne" }
  ];
  const currentSortLabel =
    sortOptions.find((option) => option.field === sortField && option.dir === sortDir)?.label ??
    "Tri";

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

      <FilterMenu label={currentSortLabel}>
        <div className="filter-panel option-panel">
          {sortOptions.map((option) => {
            const selected = option.field === sortField && option.dir === sortDir;

            return (
              <button
                className={selected ? "option-row selected" : "option-row"}
                data-close-menu
                key={`${option.field}:${option.dir}`}
                onClick={() => onSortChange(option.field, option.dir)}
                type="button"
              >
                <span>{option.label}</span>
                {selected && <span className="material-check">check</span>}
              </button>
            );
          })}
        </div>
      </FilterMenu>

      <FilterMenu label="Tags">
        <div className="filter-panel">
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
                  {value === "filled" && <span className="material-check">check</span>}
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
