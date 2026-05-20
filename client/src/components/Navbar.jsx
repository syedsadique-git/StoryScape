import React, { useState, useEffect, useRef } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { BookOpen, Search, Upload, Sun, Moon, LogOut, Compass, FolderHeart, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import toast from 'react-hot-toast';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [theme, setTheme] = useState('dark');
  const dropdownRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/explore?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleUploadClick = () => {
    if (!user) {
      toast.error('Please log in to upload a story.');
      navigate('/login?redirect=upload');
    } else {
      navigate(`${location.pathname}?upload=true`);
    }
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
    toast.success(`${theme === 'dark' ? 'Light' : 'Dark'} mode toggled!`, { id: 'theme-toast' });
  };

  const handleLogout = () => {
    logout();
    setIsDropdownOpen(false);
    toast.success('Logged out successfully.');
    navigate('/');
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <nav className="sticky top-0 left-0 w-full z-50 bg-[#0D0D0F]/85 backdrop-blur-md border-b border-white/5 py-3 px-6 flex items-center justify-between transition-all duration-300">
      {/* Left: Branding */}
      <Link to="/" className="flex items-center gap-2 group">
        <div className="bg-primary/20 p-2 rounded-xl border border-primary/30 group-hover:bg-primary/30 group-hover:border-primary/50 transition-all duration-300">
          <BookOpen className="w-5 h-5 text-accent" />
        </div>
        <span className="text-white font-extrabold text-xl tracking-wider font-sans group-hover:text-accent transition-all">
          StoryScape
        </span>
      </Link>

      {/* Center: Nav links */}
      <div className="hidden md:flex items-center gap-6 text-sm font-semibold tracking-wide">
        <NavLink
          to="/"
          className={({ isActive }) =>
            `transition-colors duration-200 py-1 ${
              isActive ? 'text-primary border-b-2 border-primary underline decoration-transparent' : 'text-muted hover:text-white'
            }`
          }
        >
          Home
        </NavLink>
        <NavLink
          to="/explore"
          className={({ isActive }) =>
            `transition-colors duration-200 py-1 ${
              isActive ? 'text-primary border-b-2 border-primary underline decoration-transparent' : 'text-muted hover:text-white'
            }`
          }
        >
          Explore
        </NavLink>
        <NavLink
          to="/genres"
          className={({ isActive }) =>
            `transition-colors duration-200 py-1 ${
              isActive ? 'text-primary border-b-2 border-primary underline decoration-transparent' : 'text-muted hover:text-white'
            }`
          }
        >
          Genres
        </NavLink>
        <NavLink
          to="/library"
          className={({ isActive }) =>
            `transition-colors duration-200 py-1 ${
              isActive ? 'text-primary border-b-2 border-primary underline decoration-transparent' : 'text-muted hover:text-white'
            }`
          }
        >
          Library
        </NavLink>
        <button
          onClick={handleUploadClick}
          className="text-muted hover:text-white transition-colors duration-200 font-semibold py-1"
        >
          Create
        </button>
      </div>

      {/* Center-Right: Search Input */}
      <form onSubmit={handleSearchSubmit} className="relative max-w-xs w-full hidden sm:block">
        <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search stories, authors, genres…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-card hover:bg-elevated focus:bg-elevated border border-white/5 focus:border-primary/50 text-white rounded-full pl-9 pr-10 py-1.5 text-xs outline-none transition-all duration-300 font-medium"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-0.5 pointer-events-none">
          <kbd className="bg-background text-[10px] text-muted border border-white/10 px-1 py-0.5 rounded leading-none">Ctrl</kbd>
          <kbd className="bg-background text-[10px] text-muted border border-white/10 px-1 py-0.5 rounded leading-none">K</kbd>
        </div>
      </form>

      {/* Right: Actions */}
      <div className="flex items-center gap-4">
        {/* Upload Button */}
        <button
          onClick={handleUploadClick}
          className="bg-primary hover:bg-primary-hover text-white px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-[0_4px_12px_rgba(124,58,237,0.3)] hover:shadow-[0_4px_16px_rgba(124,58,237,0.5)] transition-all duration-300 transform active:scale-95"
        >
          <Upload className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Upload Story</span>
        </button>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 border border-white/5 hover:bg-card text-muted hover:text-white rounded-full transition-all duration-200"
          title="Toggle Theme"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Auth Avatar / Login Link */}
        {user ? (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="w-8 h-8 rounded-full bg-primary/30 border border-primary/50 flex items-center justify-center font-bold text-xs text-accent overflow-hidden hover:ring-2 hover:ring-primary transition-all duration-200"
            >
              {user.avatar_url ? (
                <img src={user.avatar_url} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                getInitials(user.name)
              )}
            </button>
            
            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-card border border-white/10 rounded-2xl shadow-xl py-2 z-50 backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-4 py-2 border-b border-white/5">
                  <p className="text-white text-xs font-bold truncate">{user.name}</p>
                  <p className="text-muted text-[10px] truncate">{user.email}</p>
                </div>
                <Link
                  to="/library"
                  onClick={() => setIsDropdownOpen(false)}
                  className="flex items-center gap-2 px-4 py-2 text-xs text-muted hover:text-white hover:bg-white/5 transition-all"
                >
                  <FolderHeart className="w-3.5 h-3.5" />
                  My Library
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-4 py-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all text-left"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        ) : (
          <Link
            to="/login"
            className="text-muted hover:text-white text-xs font-bold border border-white/10 hover:border-white/30 rounded-full px-4 py-1.5 bg-card/45 hover:bg-card transition-all duration-300"
          >
            Login
          </Link>
        )}
      </div>
    </nav>
  );
}
