import React from 'react';
import { Link } from 'react-router-dom';
import { Eye, Heart, Flame } from 'lucide-react';

const GENRE_BADGES = {
  fantasy: 'bg-purple-500/10 text-purple-300 border-purple-500/20',
  'sci-fi': 'bg-blue-500/10 text-blue-300 border-blue-500/20',
  scifi: 'bg-blue-500/10 text-blue-300 border-blue-500/20',
  mystery: 'bg-green-500/10 text-green-300 border-green-500/20',
  romance: 'bg-pink-500/10 text-pink-300 border-pink-500/20',
  horror: 'bg-red-500/10 text-red-300 border-red-500/20',
  adventure: 'bg-orange-500/10 text-orange-300 border-orange-500/20',
  drama: 'bg-yellow-500/10 text-yellow-300 border-yellow-500/20',
};

export default function StoryCard({ id, title, author, genre, cover_url, views, likes, isNew }) {
  const cleanGenre = genre?.toLowerCase() || 'fantasy';
  const badgeClass = GENRE_BADGES[cleanGenre] || 'bg-purple-500/10 text-purple-300 border-purple-500/20';

  const formatNumber = (num) => {
    if (!num) return '0';
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  return (
    <Link
      to={`/story/${id}/info`}
      className="flex flex-col h-[380px] w-full bg-card rounded-2xl border border-white/5 hover:scale-[1.02] hover:shadow-[0_0_0_1px_rgba(124,58,237,0.4)] transition-all duration-300 overflow-hidden group shrink-0 relative"
    >
      {/* Top 60%: Image Cover */}
      <div className="h-[60%] w-full overflow-hidden relative bg-black/40">
        <img
          src={cover_url || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1200" fill="%23151518"/>'}
          alt={title}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />

        {/* New Badge */}
        {isNew && (
          <div className="absolute top-3 left-3 bg-primary/95 text-white text-[10px] font-extrabold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-md border border-primary-hover backdrop-blur-sm">
            <Flame className="w-3 h-3 text-yellow-400 fill-yellow-400 animate-pulse" />
            <span>NEW</span>
          </div>
        )}
      </div>

      {/* Bottom 40%: Metadata and Info */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div className="space-y-1.5">
          {/* Genre Badge */}
          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-extrabold tracking-wider uppercase border ${badgeClass}`}>
            {genre}
          </span>

          {/* Title */}
          <h4 className="text-white font-extrabold text-sm tracking-wide line-clamp-1 group-hover:text-accent transition-colors duration-200">
            {title}
          </h4>

          {/* Author */}
          <p className="text-muted text-[11px] font-semibold truncate">by {author}</p>
        </div>

        {/* Stats footer */}
        <div className="flex items-center gap-3 pt-2 border-t border-white/5 text-muted text-[10px] font-bold">
          <div className="flex items-center gap-1">
            <Eye className="w-3.5 h-3.5" />
            <span>{formatNumber(views)}</span>
          </div>
          <div className="flex items-center gap-1">
            <Heart className="w-3.5 h-3.5 hover:text-red-400 transition-colors" />
            <span>{formatNumber(likes)}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
