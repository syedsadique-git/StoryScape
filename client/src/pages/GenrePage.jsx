import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronLeft, Shield, Orbit, Speech, Heart, Skull, Compass, Drama } from 'lucide-react';
import { getStories } from '../api/stories.js';
import StoryCard from '../components/StoryCard.jsx';
import toast from 'react-hot-toast';

const GENRE_DECORATIONS = {
  fantasy: {
    gradient: 'from-purple-900/60 to-[#0D0D0F] border-purple-500/20 text-purple-300',
    emoji: '⚔️',
    description: 'Enter realms of sorcery, epic battles, legendary kingdoms, and age-old prophecies.'
  },
  'sci-fi': {
    gradient: 'from-blue-900/60 to-[#0D0D0F] border-blue-500/20 text-blue-300',
    emoji: '🪐',
    description: 'Explore distant galaxies, cybernetic futures, artificial lifeforms, and space flight.'
  },
  scifi: {
    gradient: 'from-blue-900/60 to-[#0D0D0F] border-blue-500/20 text-blue-300',
    emoji: '🪐',
    description: 'Explore distant galaxies, cybernetic futures, artificial lifeforms, and space flight.'
  },
  mystery: {
    gradient: 'from-green-900/60 to-[#0D0D0F] border-green-500/20 text-green-300',
    emoji: '💬',
    description: 'Uncover secrets, track down clues, solve locked-room cases, and trace dark motives.'
  },
  romance: {
    gradient: 'from-pink-900/60 to-[#0D0D0F] border-pink-500/20 text-pink-300',
    emoji: '❤️',
    description: 'Follow emotional ties, star-crossed connections, second chances, and deep relationships.'
  },
  horror: {
    gradient: 'from-red-900/60 to-[#0D0D0F] border-red-500/20 text-red-300',
    emoji: '💀',
    description: 'Huddle in the dark against supernatural spirits, haunted wardrobes, and absolute terror.'
  },
  adventure: {
    gradient: 'from-orange-900/60 to-[#0D0D0F] border-orange-500/20 text-orange-300',
    emoji: '🧭',
    description: 'Set sail through floating islands, ancient temples, storm walls, and unknown frontiers.'
  },
  drama: {
    gradient: 'from-yellow-900/60 to-[#0D0D0F] border-yellow-500/20 text-yellow-300',
    emoji: '🎭',
    description: 'Delve into emotional histories, personal conflicts, societal dynamics, and human tragedy.'
  }
};

export default function GenrePage() {
  const { genre } = useParams();
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStories = async () => {
      try {
        const data = await getStories();
        setStories(data);
      } catch (err) {
        console.error('Failed to load genre stories:', err);
        toast.error('Failed to load genre stories.');
      } finally {
        setLoading(false);
      }
    };
    fetchStories();
  }, []);

  const cleanGenre = genre?.toLowerCase() || 'fantasy';
  const decoration = GENRE_DECORATIONS[cleanGenre] || GENRE_DECORATIONS.fantasy;

  const genreStories = stories.filter(
    (story) => story.genre.toLowerCase() === cleanGenre
  );

  return (
    <div className="flex-1 bg-background font-sans">
      
      {/* Themed Genre Header Banner */}
      <div className={`w-full bg-gradient-to-b ${decoration.gradient} border-b border-white/5 py-12 px-6 md:px-16 text-left space-y-4`}>
        <Link
          to="/genres"
          className="inline-flex items-center gap-1 text-xs font-bold text-muted hover:text-white transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Back to Genres
        </Link>

        <div className="flex items-center gap-4">
          <span className="text-4xl">{decoration.emoji}</span>
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-wide">{genre}</h1>
            <p className="text-muted text-xs font-semibold mt-1">
              {genreStories.length} {genreStories.length === 1 ? 'Story' : 'Stories'} in archives
            </p>
          </div>
        </div>

        <p className="text-muted text-sm max-w-xl font-medium leading-relaxed">
          {decoration.description}
        </p>
      </div>

      {/* Grid section */}
      <div className="py-10 px-6 md:px-16 space-y-6">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-[380px] bg-card/40 border border-white/5 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : genreStories.length === 0 ? (
          <div className="text-center py-20 bg-card border border-white/5 rounded-3xl space-y-4">
            <p className="text-muted text-sm font-semibold">No stories have been written in the {genre} genre yet.</p>
            <Link
              to="/?upload=true"
              className="bg-primary hover:bg-primary-hover text-white font-bold text-xs px-6 py-2.5 rounded-xl transition-all shadow-md active:scale-95 inline-block"
            >
              Write the first one!
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            {genreStories.map((story) => (
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
    </div>
  );
}
