import React, { useEffect, useState } from "react";
import { usePageTitle } from "../context/PageTitleContext";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { Trophy } from "lucide-react";
import clsx from "clsx";

const medalColors = ["text-amber-500", "text-slate-400", "text-amber-700"];
const PAGE_SIZE = 20;

export default function Leaderboard() {
  usePageTitle("Leaderboard");
  const { user } = useAuth();
  const [list, setList] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [myRank, setMyRank] = useState(null);

  const loadPage = (p) =>
    api.get("/dashboard/leaderboard", {
      params: { page: p, limit: PAGE_SIZE },
    });

  useEffect(() => {
    loadPage(1).then((r) => {
      setList(r.data.leaderboard);
      setHasMore(r.data.hasMore);
      setMyRank(r.data.myRank);
      setPage(1);
    });
  }, []);

  const loadMore = () => {
    setLoadingMore(true);
    loadPage(page + 1)
      .then((r) => {
        setList((prev) => [...prev, ...r.data.leaderboard]);
        setHasMore(r.data.hasMore);
        setPage(page + 1);
      })
      .finally(() => setLoadingMore(false));
  };

  // True once the logged-in student's own row is already visible in the
  // loaded list — at that point the "Your rank" callout would just be
  // repeating what's already on screen, so hide it.
  const ownRowVisible = list.some((s) => s._id === user?._id);

  return (
    <>
      {user.role === "student" && myRank && !ownRowVisible && (
        <div className="card max-w-2xl mb-4 flex items-center gap-4 border-2 border-primary-200">
          <div className="w-8 text-center font-semibold text-primary-700">
            #{myRank.rank}
          </div>
          <div className="flex-1">
            <p className="font-medium text-ink">Your rank</p>
            <p className="text-xs text-ink/50">
              Load more below to see your position on the full list
            </p>
          </div>
          <div className="text-right">
            <p className="font-semibold text-primary-700">
              {myRank.totalPoints} pts
            </p>
          </div>
        </div>
      )}

      <div className="card max-w-2xl">
        <ul className="divide-y divide-primary-50">
          {list.map((s) => (
            <li
              key={s._id}
              className={clsx(
                "py-3 flex items-center gap-4",
                s._id === user?._id && "bg-primary-50 -mx-5 px-5 rounded-xl",
              )}
            >
              <div className="w-8 text-center font-semibold text-ink/60">
                {s.rank <= 3 ? (
                  <Trophy size={18} className={medalColors[s.rank - 1]} />
                ) : (
                  s.rank
                )}
              </div>
              <div className="flex-1">
                <p className="font-medium text-ink">{s.name}</p>
                <p className="text-xs text-ink/50">
                  {s.branch} · Y{s.year}
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-primary-700">
                  {s.totalPoints} pts
                </p>
                <p className="text-xs text-ink/50">{s.totalHours} hrs</p>
              </div>
            </li>
          ))}
        </ul>

        {hasMore && (
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="btn-secondary w-full mt-4 text-sm"
          >
            {loadingMore ? "Loading…" : "Load more"}
          </button>
        )}
      </div>
    </>
  );
}
