import React, { useState, useEffect } from 'react';
import { Sparkles, Library } from 'lucide-react';
import { getStories } from '../api/stories.js';
import GenreCard from '../components/GenreCard.jsx';
import toast from 'react-hot-toast';

export default function Genres() {
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStories = async () => {
      try {
        const data = await getStories();
        setStories(data);
      } catch (err) {
        console.error('Failed to load stories for genres:', err);
        toast.error('Failed to fetch genres metrics.');
      } finally {
        setLoading(false);
      }
    };
    fetchStories();
  }, []);

  const genres = ['Fantasy', 'Sci-Fi', 'Mystery', 'Romance', 'Horror', 'Adventure', 'Drama'];

  // Calculate story count per genre
  const genreCounts = stories.reduce((acc, story) => {
    const g = story.genre;
    acc[g] = (acc[g] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="flex-1 bg-background py-10 px-6 md:px-16 font-sans space-y-8">
      {/* Header */}
      <div className="text-left">
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-wide text-white">Browse by Genre</h1>
        <p className="text-muted text-xs font-semibold mt-1">Explore different worlds across the StoryScape multiverse</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="h-[180px] bg-card/40 border border-white/5 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
          {genres.map((genreName) => (
            <GenreCard
              key={genreName}
              genre={genreName}
              count={genreCounts[genreName] || 0}
            />
          ))}
        </div>
      )}

      {/* multiversal quote banner */}
      <div className="bg-card border border-white/5 p-8 rounded-3xl text-center space-y-3 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary/10 rounded-full blur-[60px]" />
        <Sparkles className="w-6 h-6 text-accent mx-auto animate-pulse" />
        <h3 className="text-white text-base font-extrabold tracking-wide">"A reader lives a thousand lives before he dies."</h3>
        <p className="text-muted text-xs font-medium max-w-lg mx-auto leading-relaxed">Choose your gateway above. Whether it's casting spells in magical lands, navigating neon cyberpunk cities, or investigating deep family secrets—your next immersive reading experience is just a click away.</p>
      </div>
    </div>
  );
}
