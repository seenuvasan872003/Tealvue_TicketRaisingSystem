import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const StarRating = ({ value, onChange, hovered, onHover }) => (
  <div className="flex gap-1.5">
    {[1,2,3,4,5].map(star => (
      <button
        key={star}
        type="button"
        onClick={() => onChange(star)}
        onMouseEnter={() => onHover(star)}
        onMouseLeave={() => onHover(0)}
        className="text-2xl transition-all duration-150 hover:scale-110"
        style={{ color: star <= (hovered || value) ? '#eac253' : '#3a3a3a' }}
      >
        {star <= (hovered || value) ? '★' : '☆'}
      </button>
    ))}
  </div>
);

export default function FeedbackCard({ ticket, onDone }) {
  const { token, user } = useAuth();
  const BASE = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/user`;
  const headers = { Authorization: `Bearer ${token}` };

  const [rating,    setRating]    = useState(0);
  const [hovered,   setHovered]   = useState(0);
  const [comment,   setComment]   = useState('');
  const [loading,   setLoading]   = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!rating) return;
    setLoading(true);
    try {
      await axios.post(`${BASE}/tickets/my/feedback`, { ticketId: ticket._id, rating, comment }, { headers });
      setSubmitted(true);
      setTimeout(() => onDone?.(), 2000);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleSkip = async () => {
    try {
      await axios.put(`${BASE}/tickets/my/feedback/${ticket._id}/dismiss`, {}, { headers });
    } catch (_) {}
    onDone?.();
  };

  if (submitted) {
    return (
      <div className="p-6 rounded-2xl border border-yellow-500/30 bg-yellow-500/5 backdrop-blur-sm text-center animate-pulse">
        <p className="text-lg font-semibold text-yellow-400">🎉 Thank you for your feedback!</p>
        <p className="text-sm text-white/40 mt-1">Your response helps us improve our service.</p>
      </div>
    );
  }

  return (
    <div className="p-6 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm shadow-[0_4px_30px_rgba(0,0,0,0.3)] space-y-5">
      <div className="flex items-start gap-3">
        <span className="text-2xl">⭐</span>
        <div>
          <h3 className="text-base font-semibold text-white">How was your experience?</h3>
          <p className="text-sm text-white/40 mt-0.5 truncate" title={ticket.title}>
            {ticket.title}
          </p>
        </div>
      </div>

      <StarRating value={rating} onChange={setRating} hovered={hovered} onHover={setHovered} />

      <div className="relative">
        <textarea
          rows={3}
          maxLength={300}
          value={comment}
          onChange={e => setComment(e.target.value)}
          placeholder="Share any additional feedback... (optional)"
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 resize-none focus:outline-none focus:border-teal-500/50 transition-colors"
        />
        <span className="absolute bottom-3 right-4 text-[10px] text-white/30">{comment.length}/300</span>
      </div>

      <div className="flex gap-3">
        <button
          onClick={handleSubmit}
          disabled={!rating || loading}
          className="flex-1 py-2.5 rounded-xl font-semibold text-sm text-black bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-300 hover:to-yellow-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-[0_0_15px_rgba(234,194,83,0.3)]"
        >
          {loading ? 'Submitting...' : 'Submit Feedback'}
        </button>
        <button
          onClick={handleSkip}
          className="px-4 py-2.5 rounded-xl font-semibold text-sm text-white/50 border border-white/10 hover:border-white/30 hover:text-white/80 transition-all"
        >
          Skip
        </button>
      </div>
    </div>
  );
}
