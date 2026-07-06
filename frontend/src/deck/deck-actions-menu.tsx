import {
  Bot,
  Copy,
  Download,
  FileUp,
  Printer,
  Settings,
  Tags,
  Trash2
} from "lucide-react";
import { ActionMenu, ActionMenuItem } from "../design-system";
import type { CardRow, SideTemplate } from "../shared/types";

interface DeckActionsMenuProps {
  cards: CardRow[];
  deckName: string;
  templates: SideTemplate[];
  onDeleteDeck: () => void;
  onOpenSettings: () => void;
  onOpenShare: () => void;
  onOpenTags: () => void;
}

function csvValue(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

function exportCards(deckName: string, templates: SideTemplate[], cards: CardRow[]) {
  const headers = templates.map((template) => template.label);
  const rows = cards.map((card) =>
    templates.map((template) => {
      const side = card.sides.find((candidate) => candidate.position === template.position);
      return side?.content ?? "";
    })
  );
  const csv = [headers, ...rows]
    .map((row) => row.map((value) => csvValue(value)).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${deckName.toLowerCase().replace(/\s+/g, "-") || "deck"}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function DeckActionsMenu({
  cards,
  deckName,
  onDeleteDeck,
  onOpenSettings,
  onOpenShare,
  onOpenTags,
  templates
}: DeckActionsMenuProps) {
  return (
    <ActionMenu className="push-right" label="Menu du paquet">
      <ActionMenuItem pending>
          <FileUp size={15} /> Importer CSV
      </ActionMenuItem>
      <ActionMenuItem onClick={() => exportCards(deckName, templates, cards)}>
          <Download size={15} /> Exporter CSV
      </ActionMenuItem>
      <ActionMenuItem pending>
          <Copy size={15} /> Dupliquer
      </ActionMenuItem>
      <ActionMenuItem onClick={() => window.print()}>
          <Printer size={15} /> Imprimer
      </ActionMenuItem>
      <ActionMenuItem onClick={onOpenShare}>
          <Bot size={15} /> Partager a l'IA
      </ActionMenuItem>
      <ActionMenuItem onClick={onOpenTags}>
          <Tags size={15} /> Gerer les tags
      </ActionMenuItem>
      <ActionMenuItem onClick={onOpenSettings}>
          <Settings size={15} /> Reglages du paquet
      </ActionMenuItem>
      <ActionMenuItem className="danger-menu-item" onClick={onDeleteDeck}>
          <Trash2 size={15} /> Supprimer
      </ActionMenuItem>
    </ActionMenu>
  );
}
