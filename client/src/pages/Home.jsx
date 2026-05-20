import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Compass, Upload, Sparkles, BookOpen, ShieldCheck, Zap, ArrowRight } from 'lucide-react';
import { getStories } from '../api/stories.js';
import ParticleCanvas from '../components/ParticleCanvas.jsx';
import StoryCard from '../components/StoryCard.jsx';
import GenreCard from '../components/GenreCard.jsx';
import UploadModal from '../components/UploadModal.jsx';
import toast from 'react-hot-toast';

export default function Home() {
  const navigate = useNavigate();
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch stories on load
  useEffect(() => {
    const fetchStories = async () => {
      try {
        const data = await getStories();
        setStories(data);
      } catch (err) {
        console.error('Failed to load stories:', err);
        toast.error('Failed to connect to the database server.');
      } finally {
        setLoading(false);
      }
    };
    fetchStories();
  }, []);

  // Compute story counts per genre
  const genreCounts = stories.reduce((acc, story) => {
    const genre = story.genre;
    acc[genre] = (acc[genre] || 0) + 1;
    return acc;
  }, {});

  const genresList = [
    { name: 'Fantasy', emoji: '⚔️' },
    { name: 'Sci-Fi', emoji: '🪐' },
    { name: 'Mystery', emoji: '💬' },
    { name: 'Romance', emoji: '❤️' },
    { name: 'Horror', emoji: '💀' },
    { name: 'Adventure', emoji: '🧭' },
    { name: 'Drama', emoji: '🎭' },
  ];

  const handleUploadClick = () => {
    const token = localStorage.getItem('token');
    if (!token) {
      toast.error('Please login to upload a story.');
      navigate('/login?redirect=upload');
    } else {
      navigate('/?upload=true');
    }
  };

  return (
    <div className="flex flex-col min-h-screen relative bg-background overflow-hidden font-sans">
      
      {/* 1. Hero Section */}
      <section className="relative w-full h-[600px] flex items-center px-6 md:px-16 border-b border-white/5 bg-gradient-to-b from-[#180C2C]/30 via-background to-background">
        {/* Star drifting background */}
        <ParticleCanvas />

        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent pointer-events-none z-0" />

        <div className="max-w-3xl z-10 space-y-6 text-left">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-primary/20 bg-primary/10 text-accent text-xs font-bold tracking-wider uppercase animate-pulse">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI-Enhanced Stories</span>
          </div>

          <h1 className="text-4xl md:text-6xl font-extrabold text-white leading-tight font-sans tracking-tight">
            Stories come <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-accent to-white">alive.</span>
          </h1>

          <p className="text-accent italic font-serif text-lg md:text-xl font-medium tracking-wide">
            "You dream, we create."
          </p>

          <p className="text-muted text-sm md:text-base leading-relaxed font-medium">
            StoryScape transforms raw manuscripts into full sensory experiences. Simply provide a story, and our generative model pipeline creates customized cover art, panoramic reading backdrops, ambient soundscapes, and expressive voiceovers in real-time.
          </p>

          <div className="flex flex-wrap gap-4 pt-2">
            <button
              onClick={handleUploadClick}
              className="bg-primary hover:bg-primary-hover text-white font-bold text-xs px-6 py-3.5 rounded-full flex items-center gap-2 shadow-[0_4px_16px_rgba(124,58,237,0.3)] hover:shadow-[0_4px_20px_rgba(124,58,237,0.5)] transition-all duration-300 transform active:scale-95"
            >
              <Upload className="w-4 h-4" />
              <span>Upload Your Story</span>
            </button>
            <Link
              to="/explore"
              className="border border-white/10 hover:border-white/20 text-white hover:bg-white/5 font-bold text-xs px-6 py-3.5 rounded-full flex items-center gap-2 transition-all duration-300 transform active:scale-95"
            >
              <Compass className="w-4 h-4 text-accent" />
              <span>Explore Stories</span>
            </Link>
          </div>

          {/* Under CTAs Callout badges */}
          <div className="flex flex-wrap gap-4 pt-4 border-t border-white/5 text-xs text-muted font-bold">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-accent" />
              AI Story Analysis
            </span>
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-accent" />
              Stunning Covers
            </span>
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-accent" />
              Animated Worlds
            </span>
          </div>
        </div>
      </section>

      {/* 2. Featured Stories Section */}
      <section className="py-16 px-6 md:px-16 space-y-6">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-xl md:text-2xl font-extrabold tracking-wide text-white">Featured Stories</h2>
            <p className="text-muted text-xs font-semibold mt-1">Trending universes generated recently</p>
          </div>
          <Link
            to="/explore"
            className="text-xs font-bold text-accent hover:text-white flex items-center gap-1 group transition-all"
          >
            <span>View all</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-6 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-[380px] bg-card/40 border border-white/5 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="flex gap-6 overflow-x-auto pb-4 no-scrollbar scroll-smooth">
            {stories.slice(0, 6).map((story, index) => (
              <div key={story.id} className="w-[210px] shrink-0">
                <StoryCard
                  id={story.id}
                  title={story.title}
                  author={story.author}
                  genre={story.genre}
                  cover_url={story.cover_url}
                  views={story.views}
                  likes={story.likes}
                  isNew={index === 0}
                />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 3. Browse by Genre Section */}
      <section className="py-12 px-6 md:px-16 space-y-6">
        <div>
          <h2 className="text-xl md:text-2xl font-extrabold tracking-wide text-white">Browse by Genre</h2>
          <p className="text-muted text-xs font-semibold mt-1">Find your next immersive portal</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-4">
          {genresList.map((g) => (
            <GenreCard
              key={g.name}
              genre={g.name}
              count={genreCounts[g.name] || 0}
            />
          ))}
        </div>
      </section>

      {/* 4. Features Strip */}
      <section className="py-12 bg-card/30 border-y border-white/5 px-6 md:px-16 grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
        <div className="flex gap-4">
          <div className="bg-primary/10 border border-primary/20 text-accent p-3 rounded-2xl shrink-0 h-fit">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-extrabold text-white tracking-wide">Fast & Smart</h4>
            <p className="text-muted text-xs font-semibold mt-1 leading-normal">Our AI pipeline analyzes manuscript text in seconds, producing outline schemas and prompt instructions automatically.</p>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="bg-primary/10 border border-primary/20 text-accent p-3 rounded-2xl shrink-0 h-fit">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-extrabold text-white tracking-wide">Beautiful & Unique</h4>
            <p className="text-muted text-xs font-semibold mt-1 leading-normal">Enjoy tailored illustration paintings, wide backdrop scenery, and custom ambient musical tracks built around your story mood.</p>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="bg-primary/10 border border-primary/20 text-accent p-3 rounded-2xl shrink-0 h-fit">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-extrabold text-white tracking-wide">Private & Secure</h4>
            <p className="text-muted text-xs font-semibold mt-1 leading-normal">Your stories remain completely private. Store draft projects in your library and read at your leisure in secure browser vaults.</p>
          </div>
        </div>
      </section>

      {/* 5. Footer */}
      <footer className="py-8 bg-background border-t border-white/5 px-6 md:px-16 flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-semibold text-muted">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-primary" />
          <span className="text-white tracking-wider">StoryScape</span>
        </div>
        <div className="flex items-center gap-6">
          <Link to="/" className="hover:text-white transition-colors">Home</Link>
          <Link to="/explore" className="hover:text-white transition-colors">Explore</Link>
          <Link to="/genres" className="hover:text-white transition-colors">Genres</Link>
        </div>
        <p className="font-normal">&copy; {new Date().getFullYear()} StoryScape. All rights reserved.</p>
      </footer>

      {/* Global Story Upload Modal */}
      <UploadModal />
    </div>
  );
}
