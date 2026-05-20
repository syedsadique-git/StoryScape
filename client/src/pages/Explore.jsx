import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, Check } from 'lucide-react';
import { getStories } from '../api/stories.js';
import StoryCard from '../components/StoryCard.jsx';
import toast from 'react-hot-toast';

export default function Explore() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter and sort states
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [selectedGenres, setSelectedGenres] = useState([]);
  const [sortBy, setSortBy] = useState('newest'); // 'newest' | 'views' | 'likes'

  const genres = ['Fantasy', 'Sci-Fi', 'Mystery', 'Romance', 'Horror', 'Adventure', 'Drama'];

  useEffect(() => {
    const fetchStories = async () => {
      try {
        const data = await getStories();
        setStories(data);
      } catch (err) {
        console.error('Explore fetch failed:', err);
        toast.error('Failed to load stories catalog.');
      } finally {
        setLoading(false);
      }
    };
    fetchStories();
  }, []);

  // Update search query state when URL parameter changes
  useEffect(() => {
    setSearchQuery(searchParams.get('search') || '');
  }, [searchParams]);

  const toggleGenre = (genre) => {
    if (selectedGenres.includes(genre)) {
      setSelectedGenres(selectedGenres.filter((g) => g !== genre));
    } else {
      setSelectedGenres([...selectedGenres, genre]);
    }
  };

  // Perform client side search filtering and sorting
  const filteredStories = stories
    .filter((story) => {
      const matchesSearch =
        story.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        story.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
        story.genre.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesGenre =
        selectedGenres.length === 0 || selectedGenres.includes(story.genre);

      return matchesSearch && matchesGenre;
    })
    .sort((a, b) => {
      if (sortBy === 'views') return b.views - a.views;
      if (sortBy === 'likes') return b.likes - a.likes;
      // Default: newest
      return b.created_at - a.created_at;
    });

  return (
    <div className="flex-1 bg-background py-10 px-6 md:px-16 font-sans space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-wide text-white">Explore Stories</h1>
        <p className="text-muted text-xs font-semibold mt-1">
          Showing {filteredStories.length} {filteredStories.length === 1 ? 'result' : 'results'} in the archives
        </p>
      </div>

      {/* Filter and Sort control panel */}
      <div className="bg-card border border-white/5 p-6 rounded-3xl space-y-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          
          {/* Inner Search bar */}
          <div className="relative w-full md:max-w-md">
            <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search title, author, key elements..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSearchParams({ search: e.target.value });
              }}
              className="w-full bg-background hover:bg-background border border-white/5 focus:border-primary/50 text-white rounded-xl pl-10 pr-4 py-2.5 text-xs outline-none transition-all duration-300 font-medium"
            />
          </div>

          {/* Sort dropdown */}
          <div className="flex items-center gap-3 w-full md:w-auto shrink-0 justify-end">
            <span className="text-muted text-xs font-bold flex items-center gap-1.5 whitespace-nowrap">
              <SlidersHorizontal className="w-3.5 h-3.5" /> Sort by
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-background border border-white/5 text-white font-bold rounded-xl px-4 py-2.5 text-xs outline-none focus:border-primary/50 cursor-pointer"
            >
              <option value="newest">Newest Releases</option>
              <option value="views">Most Viewed</option>
              <option value="likes">Most Liked</option>
            </select>
          </div>
        </div>

        {/* Multi-select genre chips */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/5">
          <span className="text-muted text-[10px] font-extrabold uppercase tracking-widest mr-2">Filter genres:</span>
          {genres.map((g) => {
            const isSelected = selectedGenres.includes(g);
            return (
              <button
                key={g}
                onClick={() => toggleGenre(g)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border flex items-center gap-1 ${
                  isSelected
                    ? 'bg-primary text-white border-primary-hover shadow-md'
                    : 'bg-background hover:bg-card border-white/5 text-muted hover:text-white'
                }`}
              >
                {isSelected && <Check className="w-3 h-3" />}
                <span>{g}</span>
              </button>
            );
          })}
          {selectedGenres.length > 0 && (
            <button
              onClick={() => setSelectedGenres([])}
              className="text-[10px] font-extrabold text-red-400 hover:text-red-300 hover:underline ml-2"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Grid listing */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-[380px] bg-card/50 border border-white/5 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : filteredStories.length === 0 ? (
        <div className="text-center py-20 bg-card border border-white/5 rounded-3xl space-y-4">
          <p className="text-muted text-sm font-semibold">No stories match your search query or filters.</p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedGenres([]);
              setSearchParams({});
            }}
            className="bg-primary hover:bg-primary-hover font-bold text-xs px-6 py-2.5 rounded-xl transition-all shadow-md active:scale-95"
          >
            Clear Search Filter
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
          {filteredStories.map((story) => (
            <StoryCard
              key={story.id}
              id={story.id}
              title={story.title}
              author={story.author}
              genre={story.genre}
              cover_url={story.cover_url}
              views={story.views}
              likes={story.likes}
              isNew={false}
            />
          ))}
        </div>
      )}
    </div>
  );
}
