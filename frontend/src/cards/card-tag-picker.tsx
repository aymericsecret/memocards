import { Plus, Search, X } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { Tag } from "../shared/types";
import {
  useAddCardTagMutation,
  useCreateTagMutation,
  useRemoveCardTagMutation
} from "./card-queries";

interface CardTagPickerProps {
  allTags: Tag[];
  cardId: string;
  cardTags: Tag[];
  deckId: string;
}

export function CardTagPicker({ allTags, cardId, cardTags, deckId }: CardTagPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [newTag, setNewTag] = useState("");
  const id = useId();
  const ref = useRef<HTMLDivElement>(null);
  const createTagMutation = useCreateTagMutation(deckId);
  const addTagMutation = useAddCardTagMutation(deckId);
  const removeTagMutation = useRemoveCardTagMutation(deckId);

  const availableTags = useMemo(
    () => allTags.filter((tag) => !cardTags.some((cardTag) => cardTag.id === tag.id)),
    [allTags, cardTags]
  );
  const filteredTags = newTag.trim()
    ? availableTags.filter((tag) =>
        tag.name.toLowerCase().includes(newTag.trim().toLowerCase())
      )
    : availableTags;

  useEffect(() => {
    if (!isOpen) return undefined;

    const onPointerDown = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const onOtherDropdownOpen = (event: Event) => {
      if ((event as CustomEvent<string>).detail !== id) {
        setIsOpen(false);
      }
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

  const addTag = async (tag: Tag) => {
    await addTagMutation.mutateAsync({ cardId, tagId: tag.id });
    setNewTag("");
    setIsOpen(false);
  };

  const createAndAddTag = async () => {
    const name = newTag.trim().toLowerCase();
    if (!name) return;

    const existing = allTags.find((tag) => tag.name.toLowerCase() === name);
    const tag = existing ?? (await createTagMutation.mutateAsync(name));
    await addTag(tag);
  };

  return (
    <div className="tag-picker" ref={ref}>
      <div className="tag-chip-list">
        {cardTags.map((tag) => (
          <span className="tag-chip" key={tag.id}>
            {tag.name}
            <button
              type="button"
              aria-label={`Retirer ${tag.name}`}
              onClick={() => void removeTagMutation.mutateAsync({ cardId, tagId: tag.id })}
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
                  void createAndAddTag();
                }
                if (event.key === "Escape") {
                  setIsOpen(false);
                }
              }}
              placeholder="Search"
            />
          </label>
          {filteredTags.length > 0 && (
            <div className="tag-picker-options">
              {filteredTags.map((tag) => (
                <button key={tag.id} type="button" onClick={() => void addTag(tag)}>
                  {tag.name}
                </button>
              ))}
            </div>
          )}
          {newTag.trim() &&
            !allTags.some((tag) => tag.name.toLowerCase() === newTag.trim().toLowerCase()) && (
              <button className="tag-create-button" type="button" onClick={() => void createAndAddTag()}>
                <Plus size={12} /> Creer "{newTag.trim()}"
              </button>
            )}
        </div>
      )}
    </div>
  );
}
