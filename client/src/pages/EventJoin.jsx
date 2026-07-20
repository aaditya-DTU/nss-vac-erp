import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { format } from 'date-fns';
import { CalendarDays, MapPin, CheckCircle2 } from 'lucide-react';

// Landing page for the admin's "scan to join" QR (see Events.jsx). Deliberately
// outside the app Layout/Sidebar shell so it opens fast and clean straight
// from a phone camera scan — route is /events/:id/join.
export default function EventJoin() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [error, setError] = useState('');
  const [registering, setRegistering] = useState(false);
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    api.get(`/events/${id}`)
      .then((r) => setEvent(r.data.event))
      .catch((err) => setError(err.response?.data?.message || 'Event not found.'));
  }, [id]);

  const handleJoin = async () => {
    setRegistering(true);
    try {
      await api.post(`/events/${id}/register`);
      setJoined(true);
      toast.success('Registered!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not register');
    } finally {
      setRegistering(false);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center p-6">
        <div className="card max-w-sm text-center">
          <p className="text-red-500 font-medium">{error}</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <p className="text-ink/50 text-sm">Loading event…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-6">
      <div className="card w-full max-w-sm text-center">
        <p className="text-xs uppercase tracking-widest text-primary-500 mb-1">NSS VAC · DTU</p>
        <h1 className="font-display text-2xl text-primary-900 mb-3">{event.title}</h1>

        <div className="text-left bg-primary-50 rounded-xl p-4 text-sm space-y-2 mb-5">
          <p className="flex items-center gap-2 text-ink/70">
            <CalendarDays size={16} className="text-primary-600" />
            {format(new Date(event.startTime), 'MMM d, yyyy · p')}
          </p>
          {event.location && (
            <p className="flex items-center gap-2 text-ink/70">
              <MapPin size={16} className="text-primary-600" /> {event.location}
            </p>
          )}
          <p className="text-ink/70">{event.hoursWorth} hrs · {event.pointsWorth} pts</p>
        </div>

        {joined ? (
          <div className="text-green-600 flex flex-col items-center gap-2">
            <CheckCircle2 size={36} />
            <p className="font-medium">You're registered!</p>
            <button className="btn-secondary w-full mt-3" onClick={() => navigate('/events')}>View all events</button>
          </div>
        ) : (
          <button className="btn-primary w-full" disabled={registering} onClick={handleJoin}>
            {registering ? 'Registering…' : 'Join this event'}
          </button>
        )}
      </div>
    </div>
  );
}