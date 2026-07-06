import { Plus, Search, X } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { Tag } from "../shared/types";
import { useCreateTagMutation } from "./card-queries";

interface NewCardTagSelectorProps {
  allTags: Tag[];
  deckId: string;
  selectedTagIds: string[];
  onSelectedTagIdsChange: (tagIds: string[]) => void;
}

export function NewCardTagSelector({
  allTags,
  deckId,
  selectedTagIds,
  onSelectedTagIdsChange
}: NewCardTagSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [newTag, setNewTag] = useState("");
  const id = useId();
  const ref = useRef<HTMLDivElement>(null);
  const createTagMutation = useCreateTagMutation(deckId);
  const selectedTags = allTags.filter((tag) => selectedTagIds.includes(tag.id));
  const availableTags = useMemo(
    () => allTags.filter((tag) => !selectedTagIds.includes(tag.id)),
    [allTags, selectedTagIds]
  );
  const filteredTags = newTag.trim()
    ? availableTags.filter((tag) =>
        tag.name.toLowerCase().includes(newTag.trim().toLowerCase())
      )
    : availableTags;

  useEffect(() => {
    if (!isOpen) return undefined;

    const onPointerDown = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const onOtherDropdownOpen = (event: Event) => {
      if ((event as CustomEvent<string>).detail !== id) setIsOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("memocards:dropdown-open", onOtherDropdownOpen);

    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("memocards:dropdown-open", onOtherDropdownOpen);
    };
  }, [id, isOpen]);

  const toggleOpen = () => {
    const nextOpen = !isOpen;
    setIsOpen(nextOpen);
    if (nextOpen) {
      window.dispatchEvent(new CustomEvent("memocards:dropdown-open", { detail: id }));
    }
  };

  const selectTag = (tag: Tag) => {
    onSelectedTagIdsChange([...selectedTagIds, tag.id]);
    setNewTag("");
  };

  const createAndSelectTag = async () => {
    const name = newTag.trim().toLowerCase();
    if (!name) return;

    const existing = allTags.find((tag) => tag.name.toLowerCase() === name);
    const tag = existing ?? (await createTagMutation.mutateAsync(name));
    if (!selectedTagIds.includes(tag.id)) {
      onSelectedTagIdsChange([...selectedTagIds, tag.id]);
    }
    setNewTag("");
  };

  return (
    <div className="tag-picker" ref={ref}>
      <div className="tag-chip-list">
        {selectedTags.map((tag) => (
          <span className="tag-chip" key={tag.id}>
            {tag.name}
            <button
              type="button"
              aria-label={`Retirer ${tag.name}`}
              onClick={() =>
                onSelectedTagIdsChange(selectedTagIds.filter((tagId) => tagId !== tag.id))
              }
            >
              <X size={10} />
            </button>
          </span>
        ))}
        <button
          className="tag-add-button"
          type="button"
          aria-label="Ajouter un tag"
          onClick={toggleOpen}
        >
          <Plus size={13} />
        </button>
      </div>

      {isOpen && (
        <div className="tag-picker-panel">
          <label className="tag-picker-search">
            <Search size={15} />
            <input
              value={newTag}
              onChange={(event) => setNewTag(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void createAndSelectTag();
                }
                if (event.key === "Escape") setIsOpen(false);
              }}
              placeholder="Search"
            />
          </label>
          {filteredTags.length > 0 && (
            <div className="tag-picker-options">
              {filteredTags.map((tag) => (
                <button key={tag.id} type="button" onClick={() => selectTag(tag)}>
                  {tag.name}
                </button>
              ))}
            </div>
          )}
          {newTag.trim() &&
            !allTags.some((tag) => tag.name.toLowerCase() === newTag.trim().toLowerCase()) && (
              <button
                className="tag-create-button"
                type="button"
                onClick={() => void createAndSelectTag()}
              >
                <Plus size={12} /> Creer "{newTag.trim()}"
              </button>
            )}
        </div>
      )}
    </div>
  );
}
