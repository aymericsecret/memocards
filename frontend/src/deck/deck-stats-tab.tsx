import { BarChart3, BookOpen, CalendarCheck, Clock, Flame, Info, TrendingUp } from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { useDeckStatsQuery, type DeckReviewHistoryPoint, type DeckReviewStats } from "./deck-stats-queries";

const progressColors = {
  known: "hsl(150 70% 55%)",
  learning: "hsl(40 90% 62%)",
  new: "hsl(210 80% 65%)"
};

const ratingColors = {
  again: "hsl(355 85% 68%)",
  hard: "hsl(40 90% 62%)",
  good: "hsl(150 70% 55%)",
  easy: "hsl(260 55% 70%)"
};

export function DeckStatsTab({ deckId }: { deckId: string }) {
  const statsQuery = useDeckStatsQuery(deckId, true);
  const data = statsQuery.data;
  const [selectedReviewTypeId, setSelectedReviewTypeId] = useState("");
  const [activeTab, setActiveTab] = useState<"per-review" | "history">("per-review");

  useEffect(() => {
    if (!selectedReviewTypeId && data?.reviewTypes.length) {
      setSelectedReviewTypeId(data.reviewTypes[0].id);
    }
  }, [data?.reviewTypes, selectedReviewTypeId]);

  if (statsQuery.isLoading) {
    return <div className="stats-empty">Chargement...</div>;
  }

  if (!data || data.reviewTypes.length === 0) {
    return <div className="stats-empty">Creez un type de revision pour voir les statistiques.</div>;
  }

  const stats = data.statsByReviewType[selectedReviewTypeId] ?? null;
  const history = data.historyByReviewType[selectedReviewTypeId] ?? [];

  return (
    <section className="deck-stats">
      <select
        className="stats-review-select"
        value={selectedReviewTypeId}
        onChange={(event) => setSelectedReviewTypeId(event.target.value)}
      >
        {data.reviewTypes.map((reviewType) => (
          <option key={reviewType.id} value={reviewType.id}>
            {reviewType.name}
          </option>
        ))}
      </select>

      <div className="modal-tabs-list stats-tabs-list">
        <button
          className={activeTab === "per-review" ? "modal-tab active" : "modal-tab"}
          onClick={() => setActiveTab("per-review")}
          type="button"
        >
          <Info size={14} /> Stats
        </button>
        <button
          className={activeTab === "history" ? "modal-tab active" : "modal-tab"}
          onClick={() => setActiveTab("history")}
          type="button"
        >
          <BarChart3 size={14} /> Historique
        </button>
      </div>

      {stats &&
        (activeTab === "per-review" ? (
          <PerReviewStats stats={stats} />
        ) : (
          <ReviewHistory history={history} />
        ))}
    </section>
  );
}

function PerReviewStats({ stats }: { stats: DeckReviewStats }) {
  const total = stats.newCount + stats.learningCount + stats.knownCount;
  const pct = (value: number) => (total > 0 ? (value / total) * 100 : 0);

  return (
    <div className="stats-grid">
      <div className="stats-left">
        <div className="hero-stat-grid">
          <HeroStat icon={<BookOpen size={16} />} label="Cartes" value={stats.totalCards} />
          <HeroStat icon={<TrendingUp size={16} />} label="Revisions totales" value={stats.totalReviews} />
        </div>

        <div className="stats-panel">
          <div className="stat-inline">
            <CalendarCheck size={16} />
            <div>
              <p>Derniere revision</p>
              <strong>
                {stats.lastReviewDate
                  ? new Date(stats.lastReviewDate).toLocaleString("fr-FR", {
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      month: "short",
                      year: "numeric"
                    })
                  : "Aucune"}
              </strong>
            </div>
          </div>
        </div>

        {total > 0 && (
          <div className="stats-panel">
            <div className="stats-panel-heading">
              <p>Progression</p>
              <span>{Math.round((stats.knownCount / total) * 100)}% acquises</span>
            </div>
            <div className="progress-stack">
              {stats.knownCount > 0 && (
                <span style={{ width: `${pct(stats.knownCount)}%`, backgroundColor: progressColors.known }} />
              )}
              {stats.learningCount > 0 && (
                <span style={{ width: `${pct(stats.learningCount)}%`, backgroundColor: progressColors.learning }} />
              )}
              {stats.newCount > 0 && (
                <span style={{ width: `${pct(stats.newCount)}%`, backgroundColor: progressColors.new }} />
              )}
            </div>
            <div className="progress-legend">
              <LegendDot color={progressColors.known} label="Acquises" value={stats.knownCount} />
              <LegendDot color={progressColors.learning} label="En apprentissage" value={stats.learningCount} />
              <LegendDot color={progressColors.new} label="Non vues" value={stats.newCount} />
            </div>
          </div>
        )}
      </div>

      <div className="stats-panel stats-due-panel">
        <p className="detail-section-title">Prochaines revisions</p>
        <DueRow label="Nouvelles" count={stats.groups.new} highlight />
        <DueRow label="Maintenant" count={stats.groups.now} highlight />
        <DueRow label="< 1 heure" count={stats.groups.in1h} />
        <DueRow label="< 24 heures" count={stats.groups.in24h} />
        <DueRow label="Demain" count={stats.groups.tomorrow} />
        <DueRow label="< 1 semaine" count={stats.groups.inWeek} />
        <DueRow label="Plus tard" count={stats.groups.later} />
      </div>
    </div>
  );
}

function ReviewHistory({ history }: { history: DeckReviewHistoryPoint[] }) {
  if (history.length === 0) {
    return <div className="stats-empty history-empty">Aucune revision enregistree.</div>;
  }

  const totalReviews = history.reduce((total, point) => total + totalForDay(point), 0);
  const activeDays = history.length;
  const lastDate = history[history.length - 1]?.date ?? null;
  const streak = computeCurrentStreak(history.map((point) => point.date));

  return (
    <div className="history-timeline">
      <div className="history-summary">
        <HeroStat icon={<TrendingUp size={16} />} label="Revisions" value={totalReviews} />
        <HeroStat icon={<CalendarCheck size={16} />} label="Jours actifs" value={activeDays} />
        <div className="hero-stat streak-stat">
          <div>
            <Flame size={16} />
            <p>Streak</p>
          </div>
          <strong>{streak}j</strong>
        </div>
        <div className="hero-stat">
          <div>
            <Clock size={16} />
            <p>Derniere</p>
          </div>
          <strong className="history-last-date">
            {lastDate ? formatReadableDate(lastDate) : "-"}
          </strong>
        </div>
      </div>

      <div className="history-day-list">
        {history.map((point) => {
          const total = totalForDay(point);

          return (
            <article className="history-day-row" key={point.date}>
              <div className="history-day-meta">
                <strong>{formatReadableDate(point.date)}</strong>
                <span>
                  {total} revision{total !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="history-day-content">
                <div className="history-day-stack">
                  {point.again > 0 && (
                    <span
                      style={{
                        width: `${(point.again / total) * 100}%`,
                        backgroundColor: ratingColors.again
                      }}
                    />
                  )}
                  {point.hard > 0 && (
                    <span
                      style={{
                        width: `${(point.hard / total) * 100}%`,
                        backgroundColor: ratingColors.hard
                      }}
                    />
                  )}
                  {point.good > 0 && (
                    <span
                      style={{
                        width: `${(point.good / total) * 100}%`,
                        backgroundColor: ratingColors.good
                      }}
                    />
                  )}
                  {point.easy > 0 && (
                    <span
                      style={{
                        width: `${(point.easy / total) * 100}%`,
                        backgroundColor: ratingColors.easy
                      }}
                    />
                  )}
                </div>
                <div className="history-day-breakdown">
                  <HistoryCount color={ratingColors.again} label="A revoir" value={point.again} />
                  <HistoryCount color={ratingColors.hard} label="Difficile" value={point.hard} />
                  <HistoryCount color={ratingColors.good} label="Bien" value={point.good} />
                  <HistoryCount color={ratingColors.easy} label="Facile" value={point.easy} />
                </div>
              </div>
            </article>
          );
        })}
      </div>
      <div className="progress-legend">
        <LegendDot color={ratingColors.again} label="A revoir" value={sum(history, "again")} />
        <LegendDot color={ratingColors.hard} label="Difficile" value={sum(history, "hard")} />
        <LegendDot color={ratingColors.good} label="Bien" value={sum(history, "good")} />
        <LegendDot color={ratingColors.easy} label="Facile" value={sum(history, "easy")} />
      </div>
    </div>
  );
}

function HistoryCount({ color, label, value }: { color: string; label: string; value: number }) {
  if (value === 0) return null;

  return (
    <span>
      <span style={{ backgroundColor: color }} />
      {label} {value}
    </span>
  );
}

function HeroStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="hero-stat">
      <div>
        {icon}
        <p>{label}</p>
      </div>
      <strong>{value}</strong>
    </div>
  );
}

function LegendDot({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <span className="legend-dot">
      <span style={{ backgroundColor: color }} />
      {label} <strong>{value}</strong>
    </span>
  );
}

function DueRow({ count, highlight = false, label }: { count: number; highlight?: boolean; label: string }) {
  return (
    <div className="due-row">
      <span className={highlight ? "highlight" : ""}>
        <Clock size={14} /> {label}
      </span>
      <strong className={highlight && count > 0 ? "accent-count" : ""}>{count}</strong>
    </div>
  );
}

function formatReadableDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short"
  });
}

function totalForDay(point: DeckReviewHistoryPoint) {
  return point.again + point.hard + point.good + point.easy;
}

function computeCurrentStreak(dates: string[]) {
  const activeDates = new Set(dates);
  let cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  const today = formatIsoDate(cursor);
  if (!activeDates.has(today)) {
    cursor.setDate(cursor.getDate() - 1);
    if (!activeDates.has(formatIsoDate(cursor))) return 0;
  }

  let streak = 0;
  while (activeDates.has(formatIsoDate(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

function formatIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function sum(history: DeckReviewHistoryPoint[], key: "again" | "hard" | "good" | "easy") {
  return history.reduce((total, point) => total + point[key], 0);
}
