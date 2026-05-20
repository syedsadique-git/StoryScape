import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Flame, Play } from 'lucide-react';
import { getLibrary } from '../api/stories.js';
import toast from 'react-hot-toast';

export default function Library() {
  const [library, setLibrary] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLibrary = async () => {
      try {
        const data = await getLibrary();
        setLibrary(data);
      } catch (err) {
        console.error('Failed to load library:', err);
        toast.error('Could not fetch your bookmarked library.');
      } finally {
        setLoading(false);
      }
    };
    fetchLibrary();
  }, []);

  return (
    <div className="flex-1 bg-background py-10 px-6 md:px-16 font-sans space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-wide text-white">My Library</h1>
        <p className="text-muted text-xs font-semibold mt-1">Manage and resume your bookmarked reading adventures</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-[220px] bg-card/40 border border-white/5 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : library.length === 0 ? (
        <div className="text-center py-20 bg-card border border-white/5 rounded-3xl space-y-4 max-w-xl mx-auto">
          <BookOpen className="w-10 h-10 text-muted mx-auto" />
          <div>
            <h3 className="text-white text-sm font-extrabold">Your Library is empty</h3>
            <p className="text-muted text-[11px] font-semibold mt-1">Start exploring stories and tap the bookmark icon to save progress here.</p>
          </div>
          <Link
            to="/explore"
            className="bg-primary hover:bg-primary-hover text-white font-bold text-xs px-6 py-2.5 rounded-xl transition-all shadow-md active:scale-95 inline-block"
          >
            Find a Story
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
          {library.map((story) => (
            <div
              key={story.id}
              className="flex flex-col bg-card border border-white/5 rounded-2xl p-4 hover:scale-[1.02] hover:shadow-[0_0_0_1px_rgba(124,58,237,0.3)] transition-all duration-300 group"
            >
              {/* Row: Cover Art & Text Details */}
              <div className="flex gap-4 items-start">
                <img
                  src={story.cover_url || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" fill="%23151518"/>'}
                  alt={story.title}
                  className="w-16 h-24 object-cover rounded-lg shrink-0 bg-black/40"
                />
                <div className="min-w-0 flex-1 space-y-1">
                  <span className="inline-block bg-primary/10 border border-primary/20 text-accent text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                    {story.genre}
                  </span>
                  <h4 className="text-white text-xs font-bold truncate group-hover:text-accent transition-colors duration-200">
                    {story.title}
                  </h4>
                  <p className="text-muted text-[10px] font-semibold truncate">by {story.author}</p>
                </div>
              </div>

              {/* Progress slider info */}
              <div className="mt-6 space-y-1.5 flex-1">
                <div className="flex justify-between items-center text-[10px] font-bold text-muted">
                  <span>Reading Progress</span>
                  <span className="text-white">{story.progress}%</span>
                </div>
                <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden border border-white/5">
                  <div
                    className="h-full bg-primary"
                    style={{ width: `${story.progress}%` }}
                  />
                </div>
              </div>

              {/* Action bar */}
              <div className="mt-4 pt-3 border-t border-white/5">
                <Link
                  to={`/story/${story.id}`}
                  className="w-full bg-primary hover:bg-primary-hover text-white text-[10px] font-bold py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all duration-200"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  Continue Reading
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
