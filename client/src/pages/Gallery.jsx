import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import api from '../api/axios';
import { format } from 'date-fns';
import { Image as ImageIcon, X } from 'lucide-react';

const CATEGORIES = ['plantation', 'blood_donation', 'cleanliness', 'awareness_camp', 'teaching', 'survey', 'event_duty', 'other'];

const PAGE_SIZE = 24;

// "Pics upload section" — no new upload flow needed: photos are already
// uploaded through the normal task-proof submission process. This page
// just surfaces every approved photo in one browsable, shared gallery
// instead of leaving them buried inside individual task review screens.
export default function Gallery() {
  const [photos, setPhotos] = useState([]);
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lightbox, setLightbox] = useState(null);

  // Category change resets to page 1 and replaces the list entirely.
  useEffect(() => {
    setLoading(true);
    setPage(1);
    api.get('/submissions/gallery', { params: { limit: PAGE_SIZE, ...(category ? { category } : {}) } })
      .then((r) => {
        setPhotos(r.data.photos);
        setHasMore(r.data.photos.length === PAGE_SIZE);
      })
      .finally(() => setLoading(false));
  }, [category]);

  const loadMore = async () => {
    const nextPage = page + 1;
    setLoadingMore(true);
    try {
      const { data } = await api.get('/submissions/gallery', {
        params: { limit: PAGE_SIZE, page: nextPage, ...(category ? { category } : {}) },
      });
      setPhotos((prev) => [...prev, ...data.photos]);
      setHasMore(data.photos.length === PAGE_SIZE);
      setPage(nextPage);
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <Layout title="Gallery">
      <div className="flex flex-wrap gap-2 mb-5">
        <button
          onClick={() => setCategory('')}
          className={`badge !py-1.5 !px-3 ${category === '' ? 'bg-primary-600 text-white' : 'bg-primary-50 text-primary-700'}`}
        >
          All
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`badge !py-1.5 !px-3 capitalize ${category === c ? 'bg-primary-600 text-white' : 'bg-primary-50 text-primary-700'}`}
          >
            {c.replace('_', ' ')}
          </button>
        ))}
      </div>

      {loading && <p className="text-ink/50 text-sm">Loading…</p>}

      {!loading && photos.length === 0 && (
        <div className="card text-center py-12">
          <ImageIcon className="mx-auto text-primary-300 mb-2" size={32} />
          <p className="text-ink/50 text-sm">No approved photos in this category yet.</p>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {photos.map((p) => (
          <button key={p.id} onClick={() => setLightbox(p)} className="group relative aspect-square rounded-xl overflow-hidden bg-primary-50">
            <img src={p.url} alt={p.taskTitle} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2">
              <p className="text-white text-xs font-medium truncate">{p.taskTitle}</p>
              <p className="text-white/70 text-[10px] truncate">{p.studentName}</p>
            </div>
          </button>
        ))}
      </div>

      {hasMore && (
        <div className="flex justify-center mt-6">
          <button onClick={loadMore} disabled={loadingMore} className="btn-secondary">
            {loadingMore ? 'Loading…' : 'Load more'}
          </button>
        </div>
      )}

      {lightbox && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-30 p-4" onClick={() => setLightbox(null)}>
          <div className="max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setLightbox(null)} className="text-white/70 hover:text-white float-right mb-2">
              <X size={22} />
            </button>
            <img src={lightbox.url} alt={lightbox.taskTitle} className="w-full rounded-xl mb-3" />
            <div className="text-white">
              <p className="font-medium">{lightbox.taskTitle}</p>
              <p className="text-sm text-white/70">
                {lightbox.studentName} · {lightbox.branch} Y{lightbox.year} · {format(new Date(lightbox.date), 'MMM d, yyyy')}
              </p>
              {lightbox.caption && <p className="text-sm text-white/80 mt-2">{lightbox.caption}</p>}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}