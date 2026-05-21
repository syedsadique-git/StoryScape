import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Play, Heart, Bookmark, Eye, Sparkles, MapPin, Users, Info, ArrowRight } from 'lucide-react';
import { getStory, likeStory, bookmarkStory, removeBookmark, checkUserStoryStatus } from '../api/stories.js';
import ProgressScreen from '../components/ProgressScreen.jsx';
import toast from 'react-hot-toast';

export default function StoryInfo() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [story, setStory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [likeLoading, setLikeLoading] = useState(false);
  const likeRequestRef = useRef(false);

  const fetchStoryDetails = async () => {
    try {
      const data = await getStory(id);
      setStory(data);
      
      // If complete, check if user has bookmarked/liked it
      if (data.status === 'complete') {
        const token = localStorage.getItem('token');
        if (token) {
          try {
            const status = await checkUserStoryStatus(id);
            setIsBookmarked(status.bookmarked);
            setIsLiked(status.liked);
          } catch (e) {
            console.error('Failed to check story status:', e);
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch story details:', err);
      toast.error('Failed to load story details.');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStoryDetails();
  }, [id]);

  const handleLike = async () => {
    if (likeLoading || likeRequestRef.current) return;
    likeRequestRef.current = true;
    setLikeLoading(true);
    try {
      const result = await likeStory(id);
      setStory((prev) => ({ ...prev, likes: result.likes }));
      setIsLiked(result.liked);
      toast.success(result.liked ? 'Added to your likes!' : 'Removed from likes');
    } catch (err) {
      const msg = err.response?.data?.error || 'Could not update like status.';
      toast.error(msg);
    } finally {
      setLikeLoading(false);
      likeRequestRef.current = false;
    }
  };

  const handleBookmark = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      toast.error('Please log in to bookmark stories.');
      navigate('/login');
      return;
    }

    try {
      if (isBookmarked) {
        await removeBookmark(id);
        setIsBookmarked(false);
        toast.success('Removed from Library');
      } else {
        await bookmarkStory(id, 0);
        setIsBookmarked(true);
        toast.success('Added to Library!');
      }
    } catch (err) {
      toast.error('Bookmark update failed.');
    }
  };

  if (loading) {
    return (
      <div className="flex-grow flex flex-col items-center justify-center min-h-[60vh] bg-background">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-muted text-sm font-medium tracking-wide">Loading portal...</p>
      </div>
    );
  }

  // If the story pipeline is still generating, render the ProgressScreen instead!
  if (story.status === 'processing') {
    return (
      <ProgressScreen
        storyId={id}
        onComplete={() => {
          setLoading(true);
          fetchStoryDetails();
        }}
      />
    );
  }

  // Parse analysis details
  let analysis = {};
  try {
    analysis = typeof story.analysis === 'string' 
      ? JSON.parse(story.analysis) 
      : story.analysis || {};
  } catch (err) {
    console.error('JSON Parse error for analysis:', err);
  }

  const normalizedSetting = typeof analysis.setting === 'string'
    ? { location: analysis.setting, time: 'Story timeline' }
    : analysis.setting || {};
  const normalizedCharacters = (analysis.characters || []).map((char) => (
    typeof char === 'string'
      ? { name: char, description: 'Featured character' }
      : char
  ));

  const {
    genre = story.genre,
    mood = 'Ethereal',
    plot_summary,
    summary,
    themes = [],
  } = analysis;
  const synopsis = plot_summary || summary || 'No summary generated.';

  return (
    <div className="flex-grow bg-background py-10 px-6 md:px-16 font-sans relative overflow-hidden">
      {/* Background visual orb decoration */}
      <div className="absolute top-1/3 right-10 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] pointer-events-none z-0" />

      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-10 z-10 relative">
        
        {/* Left Column (Covers & Actions) — 4 cols */}
        <div className="md:col-span-4 flex flex-col items-center md:items-stretch space-y-6">
          
          {/* Glass Card Cover Container */}
          <div className="bg-[#151518]/70 border border-white/5 backdrop-blur-md rounded-3xl p-4 shadow-xl">
            <div className="aspect-[2/3] w-full max-w-[280px] mx-auto md:max-w-none rounded-2xl overflow-hidden shadow-lg border border-white/5 relative bg-black/35">
              <img
                src={story.cover_url || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" fill="%23151518"/>'}
                alt={story.title}
                className="w-full h-full object-cover"
              />
            </div>
            
            {/* Quick stats grid */}
            <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t border-white/5 text-center text-xs font-bold text-muted">
              <div className="flex flex-col items-center gap-1">
                <Eye className="w-4 h-4 text-accent" />
                <span className="text-white text-sm font-extrabold">{story.views}</span>
                <span className="text-[10px] uppercase tracking-wider text-muted font-bold">Views</span>
              </div>
              <div className="flex flex-col items-center gap-1 border-l border-white/5">
                <Heart className="w-4 h-4 text-accent" />
                <span className="text-white text-sm font-extrabold">{story.likes}</span>
                <span className="text-[10px] uppercase tracking-wider text-muted font-bold">Likes</span>
              </div>
            </div>
          </div>

          {/* Action triggers */}
          <div className="w-full space-y-3">
            <Link
              to={`/story/${story.id}`}
              className="w-full bg-primary hover:bg-primary-hover text-white font-bold py-3.5 rounded-full flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(124,58,237,0.3)] hover:shadow-[0_4px_20px_rgba(124,58,237,0.5)] transition-all duration-300 transform active:scale-95 text-sm"
            >
              <Play className="w-4.5 h-4.5 fill-current" />
              <span>Enter Immersive Reader</span>
            </Link>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleLike}
                disabled={likeLoading}
                className={`py-3 rounded-full text-xs font-bold flex items-center justify-center gap-1.5 border transition-all ${
                  likeLoading ? 'opacity-50 cursor-wait' :
                  isLiked
                    ? 'bg-red-500/10 text-red-400 border-red-500/20'
                    : 'bg-card hover:bg-elevated border-white/5 text-muted hover:text-white'
                }`}
              >
                <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
                <span>{isLiked ? 'Liked' : 'Like'}</span>
              </button>

              <button
                onClick={handleBookmark}
                className={`py-3 rounded-full text-xs font-bold flex items-center justify-center gap-1.5 border transition-all ${
                  isBookmarked
                    ? 'bg-primary/20 text-accent border-primary/30'
                    : 'bg-card hover:bg-elevated border-white/5 text-muted hover:text-white'
                }`}
              >
                <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-current' : ''}`} />
                <span>{isBookmarked ? 'Saved' : 'Save'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column (Analysis / Metadata Details) — 8 cols */}
        <div className="md:col-span-8 space-y-8 text-left">
          
          {/* Main Titles */}
          <div className="space-y-2">
            <span className="bg-primary/10 border border-primary/20 text-accent px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest">
              {genre}
            </span>
            <h1 className="text-2xl md:text-4xl font-extrabold text-white tracking-wide font-sans">{story.title}</h1>
            <p className="text-muted text-xs font-semibold">Created by <span className="text-white">{story.author}</span></p>
          </div>

          {/* AI Synopsis */}
          <div className="bg-card/50 border border-white/5 rounded-3xl p-6 md:p-8 space-y-4">
            <h3 className="text-sm font-extrabold text-white tracking-wider flex items-center gap-2 border-b border-white/5 pb-3">
              <Sparkles className="w-4 h-4 text-accent" />
              <span>AI Story Synopsis</span>
            </h3>
            <p className="text-accent italic font-serif text-sm md:text-base leading-relaxed">
              "{synopsis}"
            </p>
          </div>

          {/* Character Profiles */}
          <div className="space-y-4">
            <h3 className="text-sm font-extrabold text-white tracking-wider flex items-center gap-2">
              <Users className="w-4.5 h-4.5 text-accent" />
              <span>Character Cast</span>
            </h3>
            {normalizedCharacters.length === 0 ? (
              <p className="text-muted text-xs font-semibold">No characters analyzed.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {normalizedCharacters.map((char, index) => (
                  <div key={index} className="bg-card border border-white/5 p-5 rounded-2xl space-y-2">
                    <div className="flex justify-between items-start">
                      <h4 className="text-white text-xs font-extrabold">{char.name}</h4>
                      <span className="text-[9px] uppercase font-extrabold text-primary tracking-wider">{char.role || char.type || 'Cast'}</span>
                    </div>
                    <p className="text-muted text-[11px] font-medium leading-relaxed">{char.description || char.desc}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Setting and Mood Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            
            {/* Setting Details */}
            <div className="bg-card border border-white/5 p-6 rounded-3xl space-y-3">
              <h4 className="text-white text-xs font-extrabold tracking-wide flex items-center gap-2">
                <MapPin className="w-4 h-4 text-accent" />
                <span>Story Settings</span>
              </h4>
              <div className="text-xs space-y-2 font-medium">
                <div>
                  <span className="text-muted block text-[10px] uppercase font-bold tracking-wider">Geography</span>
                  <span className="text-white font-semibold mt-0.5 block">{normalizedSetting.location || normalizedSetting.description || 'Spiritual Realm'}</span>
                </div>
                <div className="pt-2 border-t border-white/5">
                  <span className="text-muted block text-[10px] uppercase font-bold tracking-wider">Timeline / Period</span>
                  <span className="text-white font-semibold mt-0.5 block">{normalizedSetting.time || 'Forgotten Era'}</span>
                </div>
              </div>
            </div>

            {/* Aesthetics details */}
            <div className="bg-card border border-white/5 p-6 rounded-3xl space-y-3">
              <h4 className="text-white text-xs font-extrabold tracking-wide flex items-center gap-2">
                <Info className="w-4 h-4 text-accent" />
                <span>Atmospheric Score</span>
              </h4>
              <div className="text-xs space-y-3 font-medium">
                <div>
                  <span className="text-muted block text-[10px] uppercase font-bold tracking-wider">Mood Indicator</span>
                  <span className="text-white font-semibold mt-0.5 block capitalize">{mood}</span>
                </div>
                <div>
                  <span className="text-muted block text-[10px] uppercase font-bold tracking-wider">Themes Explored</span>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {themes.map((t, idx) => (
                      <span key={idx} className="bg-white/5 border border-white/5 text-white px-2 py-0.5 rounded-md text-[9px] font-bold">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
