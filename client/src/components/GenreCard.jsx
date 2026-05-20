import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Sparkles, Orbit, Speech, Heart, Skull, Compass, Drama } from 'lucide-react';

const GENRE_STYLES = {
  fantasy: {
    icon: Shield,
    color: 'from-purple-500/20 to-purple-900/10 border-purple-500/30 text-purple-300 hover:border-purple-500/60 shadow-[0_4px_20px_rgba(168,85,247,0.05)]',
    emoji: '⚔️'
  },
  'sci-fi': {
    icon: Orbit,
    color: 'from-blue-500/20 to-blue-900/10 border-blue-500/30 text-blue-300 hover:border-blue-500/60 shadow-[0_4px_20px_rgba(59,130,246,0.05)]',
    emoji: '🪐'
  },
  scifi: {
    icon: Orbit,
    color: 'from-blue-500/20 to-blue-900/10 border-blue-500/30 text-blue-300 hover:border-blue-500/60 shadow-[0_4px_20px_rgba(59,130,246,0.05)]',
    emoji: '🪐'
  },
  mystery: {
    icon: Speech,
    color: 'from-green-500/20 to-green-900/10 border-green-500/30 text-green-300 hover:border-green-500/60 shadow-[0_4px_20px_rgba(34,197,94,0.05)]',
    emoji: '💬'
  },
  romance: {
    icon: Heart,
    color: 'from-pink-500/20 to-pink-900/10 border-pink-500/30 text-pink-300 hover:border-pink-500/60 shadow-[0_4px_20px_rgba(236,72,153,0.05)]',
    emoji: '❤️'
  },
  horror: {
    icon: Skull,
    color: 'from-red-500/20 to-red-900/10 border-red-500/30 text-red-300 hover:border-red-500/60 shadow-[0_4px_20px_rgba(239,68,68,0.05)]',
    emoji: '💀'
  },
  adventure: {
    icon: Compass,
    color: 'from-orange-500/20 to-orange-900/10 border-orange-500/30 text-orange-300 hover:border-orange-500/60 shadow-[0_4px_20px_rgba(249,115,22,0.05)]',
    emoji: '🧭'
  },
  drama: {
    icon: Drama,
    color: 'from-yellow-500/20 to-yellow-900/10 border-yellow-500/30 text-yellow-300 hover:border-yellow-500/60 shadow-[0_4px_20px_rgba(234,179,8,0.05)]',
    emoji: '🎭'
  }
};

export default function GenreCard({ genre, count }) {
  const cleanGenre = genre.toLowerCase();
  const styles = GENRE_STYLES[cleanGenre] || GENRE_STYLES.fantasy;
  const Icon = styles.icon;

  return (
    <Link
      to={`/genres/${encodeURIComponent(genre)}`}
      className={`flex flex-col items-center justify-center p-6 rounded-2xl border bg-gradient-to-br hover:scale-[1.03] transition-all duration-300 group ${styles.color}`}
    >
      <div className="text-3xl mb-3 transform group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
        {styles.emoji}
      </div>
      <h3 className="text-white font-extrabold text-sm tracking-wider uppercase mb-1">
        {genre}
      </h3>
      <p className="text-[11px] font-bold text-muted group-hover:text-white/80 transition-colors">
        {count || 0} {count === 1 ? 'story' : 'stories'}
      </p>
    </Link>
  );
}
