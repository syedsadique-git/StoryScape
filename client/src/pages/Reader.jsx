import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { BookOpen, FolderHeart, Sun, Moon, Volume2, VolumeX, Settings, Maximize, Minimize, Play, Pause, ChevronLeft, ChevronRight, Bookmark, Sparkles, Heart } from 'lucide-react';
import { getStory, bookmarkStory, getTTS, checkBookmark, likeStory } from '../api/stories.js';
import EmberCanvas from '../components/EmberCanvas.jsx';
import toast from 'react-hot-toast';

export default function Reader() {
  const { id } = useParams();
  const navigate = useNavigate();

  // Story states
  const [story, setStory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [chapters, setChapters] = useState([]);
  const [currentChapterIdx, setCurrentChapterIdx] = useState(0);
  const [paragraphs, setParagraphs] = useState([]);
  const [currentParaIdx, setCurrentParaIdx] = useState(0);

  // Audio players
  const [soundscapePlaying, setSoundscapePlaying] = useState(false);
  const [ttsPlaying, setTtsPlaying] = useState(false);
  const [ttsLoading, setTtsLoading] = useState(false);
  
  // Customization settings
  const [fontSize, setFontSize] = useState(18); // px
  const [showBackground, setShowBackground] = useState(true);
  const [voiceModel, setVoiceModel] = useState('aria'); // matches backend VOICE_MODELS keys
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [theme, setTheme] = useState('dark');
  const [isLiked, setIsLiked] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);

  // Audio refs
  const musicAudioRef = useRef(null);
  const ttsAudioRef = useRef(null);
  const containerRef = useRef(null);

  // Parse text into chapters
  const parseChapters = (text) => {
    if (!text) return [];
    
    // Split by markers like "CHAPTER 1", "Chapter 2"
    const regex = /(?:^|\n)(?=CHAPTER\s+\d+|Chapter\s+\d+|Chapter\s+[IVXLCDM]+)/i;
    const parts = text.split(regex);
    
    if (parts.length <= 1) {
      return [{ title: 'Chapter 1', content: text }];
    }
    
    return parts
      .map((part, idx) => {
        const trimmed = part.trim();
        if (!trimmed) return null;
        
        const lines = trimmed.split('\n');
        const title = lines[0].replace(/[:#]/g, '').trim();
        const content = lines.slice(1).join('\n').trim();
        
        return {
          title: title || `Chapter ${idx + 1}`,
          content: content || trimmed
        };
      })
      .filter(Boolean);
  };

  // Fetch story details
  useEffect(() => {
    const fetchStory = async () => {
      try {
        const data = await getStory(id);
        if (data.status !== 'complete') {
          toast.error('This story is still generating.');
          navigate(`/story/${id}/info`);
          return;
        }
        setStory(data);

        // Load chapters
        const parsed = parseChapters(data.text);
        setChapters(parsed);
        
        // Restore bookmark progress if available
        const token = localStorage.getItem('token');
        if (token) {
          try {
            const bStatus = await checkBookmark(id);
            setIsBookmarked(bStatus.bookmarked);
            if (bStatus.bookmarked && bStatus.progress > 0 && parsed.length > 1) {
              // Convert progress percentage back to chapter index
              const bookmarkIdx = Math.min(
                parsed.length - 1,
                Math.floor((bStatus.progress / 100) * parsed.length)
              );
              setCurrentChapterIdx(bookmarkIdx);
            }
          } catch (e) {
            console.error('Bookmark restore error:', e);
          }
        }
      } catch (err) {
        console.error('Reader story error:', err);
        toast.error('Could not load story files.');
        navigate('/');
      } finally {
        setLoading(false);
      }
    };
    fetchStory();
  }, [id, navigate]);

  // Update paragraphs when chapter changes
  useEffect(() => {
    if (chapters.length > 0 && chapters[currentChapterIdx]) {
      const chapterContent = chapters[currentChapterIdx].content;
      const parsedParagraphs = chapterContent
        .split(/\n+/)
        .map((p) => p.trim())
        .filter(Boolean);
      
      setParagraphs(parsedParagraphs);
      setCurrentParaIdx(0);
      
      // Stop ongoing TTS when changing chapters
      stopTTS();
      
      // Update bookmark progress on backend
      syncBookmarkProgress(currentChapterIdx);
    }
  }, [chapters, currentChapterIdx]);

  // Handle loop soundtrack initialization
  useEffect(() => {
    if (story && story.music_url) {
      const audio = new Audio(story.music_url);
      audio.loop = true;
      audio.volume = 0.4;
      musicAudioRef.current = audio;
      
      // Autoplay attempt (browsers might block until user interaction)
      const playMusic = async () => {
        try {
          await audio.play();
          setSoundscapePlaying(true);
        } catch (e) {
          console.log('Autoplay soundscape blocked. Waiting for click.');
        }
      };
      
      playMusic();
    }

    return () => {
      if (musicAudioRef.current) {
        musicAudioRef.current.pause();
        musicAudioRef.current = null;
      }
    };
  }, [story]);

  // Sync bookmark progress percentage
  const syncBookmarkProgress = async (chapterIndex) => {
    if (chapters.length === 0) return;
    const token = localStorage.getItem('token');
    if (!token) return;

    // Calculate percentage read based on chapters
    const progressPercent = Math.min(
      100,
      Math.round(((chapterIndex + 1) / chapters.length) * 100)
    );

    try {
      await bookmarkStory(id, progressPercent);
    } catch (e) {
      console.error('Failed to sync reading bookmark progress:', e);
    }
  };

  const handleLike = async () => {
    if (isLiked) return;
    try {
      await likeStory(id);
      setIsLiked(true);
      toast.success('Liked!');
    } catch (e) {
      toast.error('Like failed.');
    }
  };

  // Toggle background loop soundtrack
  const toggleSoundscape = () => {
    const audio = musicAudioRef.current;
    if (!audio) return;
    
    if (soundscapePlaying) {
      audio.pause();
      setSoundscapePlaying(false);
    } else {
      audio.play().catch((e) => toast.error('Soundscape file missing or blocked.'));
      setSoundscapePlaying(true);
    }
  };

  // TTS playback controls
  const playTTS = async (index) => {
    stopTTS();
    
    const textToSpeak = paragraphs[index];
    if (!textToSpeak) return;

    setTtsLoading(true);
    try {
      const res = await getTTS(textToSpeak, voiceModel);
      
      // Create new HTML5 Audio
      const audio = new Audio(res.url);
      audio.volume = 0.95;
      
      audio.onplay = () => {
        setTtsLoading(false);
        setTtsPlaying(true);
      };

      audio.onended = () => {
        setTtsPlaying(false);
        // Auto-advance to next paragraph!
        if (index < paragraphs.length - 1) {
          const nextIdx = index + 1;
          setCurrentParaIdx(nextIdx);
          playTTS(nextIdx);
        } else {
          // End of chapter
          toast.success('Finished reading chapter.');
        }
      };

      audio.onerror = (e) => {
        console.error('Audio playback error:', e);
        setTtsLoading(false);
        setTtsPlaying(false);
        toast.error('TTS speech engine failed to stream audio.');
      };

      ttsAudioRef.current = audio;
      await audio.play();
    } catch (err) {
      console.error('TTS API error:', err);
      setTtsLoading(false);
      setTtsPlaying(false);
      toast.error('Voice generation server overloaded. Please retry.');
    }
  };

  const stopTTS = () => {
    if (ttsAudioRef.current) {
      ttsAudioRef.current.pause();
      ttsAudioRef.current = null;
    }
    setTtsPlaying(false);
    setTtsLoading(false);
  };

  const toggleTTSPlayback = () => {
    if (ttsPlaying || ttsLoading) {
      stopTTS();
    } else {
      playTTS(currentParaIdx);
    }
  };

  // Chapter Navigation
  const prevChapter = () => {
    if (currentChapterIdx > 0) {
      setCurrentChapterIdx(currentChapterIdx - 1);
    }
  };

  const nextChapter = () => {
    if (currentChapterIdx < chapters.length - 1) {
      setCurrentChapterIdx(currentChapterIdx + 1);
    }
  };

  // Fullscreen Management
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch((err) => {
        toast.error(`Fullscreen request failed: ${err.message}`);
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      });
    }
  };

  // Follow screen changes to update state
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
    toast.success(`${theme === 'dark' ? 'Paper' : 'Nocturnal'} theme applied!`);
  };

  if (loading) {
    return (
      <div className="flex-grow flex flex-col items-center justify-center min-h-screen bg-background">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-muted text-sm font-medium tracking-wide">Drawing world portals...</p>
      </div>
    );
  }

  // Active page progress
  const progressPercent = chapters.length > 0 
    ? Math.round(((currentChapterIdx + 1) / chapters.length) * 100) 
    : 0;

  return (
    <div
      ref={containerRef}
      className={`min-h-screen flex flex-col relative overflow-hidden transition-colors duration-500 ${
        theme === 'dark' ? 'bg-[#0A0A0C] text-gray-200' : 'bg-[#FDFBF7] text-gray-800'
      }`}
    >
      
      {/* 1. Ambient Background Layer */}
      {showBackground && story.background_url && (
        <div
          className="absolute inset-0 bg-cover bg-center transition-all duration-700 pointer-events-none"
          style={{
            backgroundImage: `url(${story.background_url})`,
            opacity: theme === 'dark' ? 0.18 : 0.04,
            filter: 'blur(2px) brightness(60%)',
          }}
        />
      )}

      {/* Glowing Rising Embers */}
      {theme === 'dark' && <EmberCanvas />}

      {/* 2. Top Slim Transparent Menu */}
      <header className="relative w-full z-40 bg-black/10 backdrop-blur-sm border-b border-white/5 py-2 px-6 flex items-center justify-between">
        {/* Left branding */}
        <Link to={`/story/${story.id}/info`} className="flex items-center gap-1 text-xs font-bold text-muted hover:text-white transition-colors">
          <ChevronLeft className="w-4 h-4" /> Exit Reader
        </Link>
        {/* Center reading book context */}
        <span className="text-[11px] font-extrabold tracking-widest uppercase text-muted truncate max-w-xs sm:max-w-md">
          {story.title} — {chapters[currentChapterIdx]?.title}
        </span>
        {/* Right navigation shortcut icons */}
        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            className="p-1.5 border border-white/5 bg-black/15 hover:bg-black/30 text-muted hover:text-white rounded-full transition-all duration-200"
            title="Toggle theme mode"
          >
            {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>
          <Link
            to="/library"
            className="p-1.5 border border-white/5 bg-black/15 hover:bg-black/30 text-muted hover:text-white rounded-full transition-all duration-200"
            title="My Library"
          >
            <FolderHeart className="w-3.5 h-3.5" />
          </Link>
        </div>
      </header>

      {/* 3. Main Workspace split layout */}
      <div className="flex-grow flex h-[calc(100vh-85px)] relative overflow-hidden">
        
        {/* LEFT SIDEBAR: Cover Art & Progress */}
        <aside className="w-60 shrink-0 border-r border-white/5 bg-[#151518]/70 backdrop-blur-xl p-5 flex flex-col justify-between hidden md:flex z-20">
          <div className="space-y-6">
            {/* Book Cover */}
            <div className="aspect-[2/3] w-full rounded-xl overflow-hidden border border-white/5 shadow-md bg-black/40">
              <img
                src={story.cover_url || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" fill="%23151518"/>'}
                alt={story.title}
                className="w-full h-full object-cover"
              />
            </div>
            
            {/* Title Metadata */}
            <div className="space-y-1.5 text-left">
              <h3 className="text-white text-xs font-extrabold tracking-wide line-clamp-1">{story.title}</h3>
              <p className="text-muted text-[10px] font-semibold truncate">by {story.author}</p>
              <span className="inline-block bg-primary/10 border border-primary/20 text-accent text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                {story.genre}
              </span>
            </div>

            {/* Reading Chapter List Progress */}
            <div className="space-y-2 text-left">
              <div className="flex justify-between items-center text-[10px] font-bold text-muted">
                <span>Story Progress</span>
                <span className="text-white">{progressPercent}%</span>
              </div>
              <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden border border-white/5">
                <div className="h-full bg-primary" style={{ width: `${progressPercent}%` }} />
              </div>
              
              {/* Mini vertical list of chapters */}
              <div className="space-y-1 mt-4 max-h-[160px] overflow-y-auto pr-1">
                {chapters.map((chap, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setCurrentChapterIdx(idx);
                      setCurrentParaIdx(0);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[10px] font-bold truncate transition-all ${
                      idx === currentChapterIdx
                        ? 'bg-primary/20 border border-primary/30 text-accent'
                        : 'hover:bg-white/5 text-muted hover:text-white border border-transparent'
                    }`}
                  >
                    {chap.title}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom engagement actions */}
          <div className="flex gap-2 pt-4 border-t border-white/5">
            <button
              onClick={handleLike}
              className={`w-1/2 py-2 rounded-xl text-[10px] font-extrabold flex items-center justify-center gap-1 border transition-all ${
                isLiked
                  ? 'bg-red-500/10 text-red-400 border-red-500/20 cursor-not-allowed'
                  : 'bg-black/20 hover:bg-black/40 border-white/5 text-muted hover:text-white'
              }`}
            >
              <Heart className="w-3.5 h-3.5" />
              <span>{isLiked ? 'Liked' : 'Like'}</span>
            </button>
            <button
              onClick={() => navigate(`/story/${story.id}/info`)}
              className="w-1/2 py-2 bg-black/20 hover:bg-black/40 border border-white/5 text-muted hover:text-white rounded-xl text-[10px] font-extrabold flex items-center justify-center gap-1 transition-all"
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span>Info</span>
            </button>
          </div>
        </aside>

        {/* CENTER READER PANEL */}
        <section className="flex-grow overflow-y-auto px-6 py-10 md:px-16 flex justify-center z-10 no-scrollbar">
          <div className="max-w-2xl w-full space-y-8 pb-32">
            
            {/* Chapter Header Title */}
            <div className="text-center space-y-4">
              <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-wide font-sans">
                {chapters[currentChapterIdx]?.title}
              </h2>
              {/* Divider lines */}
              <div className="flex items-center justify-center gap-3">
                <div className="h-px bg-gradient-to-r from-transparent to-primary/30 w-16" />
                <Sparkles className="w-4 h-4 text-accent animate-pulse" />
                <div className="h-px bg-gradient-to-l from-transparent to-primary/30 w-16" />
              </div>
            </div>

            {/* Book Serif Narrative content */}
            <article
              className={`font-serif tracking-wide leading-relaxed space-y-6 ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-800'
              }`}
              style={{ fontSize: `${fontSize}px` }}
            >
              {paragraphs.map((pText, pIdx) => {
                const isActive = pIdx === currentParaIdx;
                
                return (
                  <p
                    key={pIdx}
                    onClick={() => {
                      setCurrentParaIdx(pIdx);
                      if (ttsPlaying) playTTS(pIdx); // If already reading, switch to this paragraph
                    }}
                    className={`transition-all duration-300 cursor-pointer rounded-xl p-2 select-text ${
                      isActive 
                        ? 'text-white border-l-2 border-primary bg-primary/5 pl-3 font-semibold' 
                        : 'opacity-50 hover:opacity-85 hover:pl-2'
                    }`}
                  >
                    {/* Add drop cap to first paragraph of chapter */}
                    {pIdx === 0 ? (
                      <>
                        <span className="float-left text-5xl font-extrabold text-primary font-sans leading-[0.8] mr-2 pt-1 uppercase">
                          {pText.charAt(0)}
                        </span>
                        {pText.slice(1)}
                      </>
                    ) : (
                      pText
                    )}
                  </p>
                );
              })}
            </article>
          </div>
        </section>

        {/* RIGHT FLOATING TOOLBAR */}
        <aside className="absolute right-6 top-8 flex flex-col gap-4 z-30">
          
          {/* Loop Music soundscape controls */}
          <button
            onClick={toggleSoundscape}
            className={`p-3 border rounded-full transition-all shadow-lg active:scale-95 ${
              soundscapePlaying
                ? 'bg-primary border-primary-hover text-white shadow-primary/20'
                : 'bg-card border-white/5 text-muted hover:text-white'
            }`}
            title={soundscapePlaying ? 'Mute Soundtrack' : 'Play Soundtrack'}
          >
            {soundscapePlaying ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Reader custom parameters popover */}
          <div className="relative">
            <button
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              className={`p-3 border rounded-full transition-all shadow-lg active:scale-95 ${
                isSettingsOpen
                  ? 'bg-primary border-primary-hover text-white'
                  : 'bg-card border-white/5 text-muted hover:text-white'
              }`}
              title="Reader Settings"
            >
              <Settings className="w-4 h-4" />
            </button>

            {isSettingsOpen && (
              <div className="absolute right-0 mt-3 w-56 bg-card border border-white/10 rounded-2xl shadow-xl p-4 space-y-4 z-50 text-xs font-semibold text-left backdrop-blur-xl">
                <div>
                  <h4 className="text-white font-bold border-b border-white/5 pb-1.5 uppercase text-[9px] tracking-wider mb-2">Text Size</h4>
                  <div className="flex justify-between items-center gap-3">
                    <button
                      onClick={() => setFontSize(Math.max(12, fontSize - 2))}
                      className="bg-background hover:bg-white/5 px-2 py-1 rounded border border-white/5 font-extrabold"
                    >
                      A-
                    </button>
                    <span className="text-white text-xs">{fontSize}px</span>
                    <button
                      onClick={() => setFontSize(Math.min(26, fontSize + 2))}
                      className="bg-background hover:bg-white/5 px-2 py-1 rounded border border-white/5 font-extrabold"
                    >
                      A+
                    </button>
                  </div>
                </div>

                <div>
                  <h4 className="text-white font-bold border-b border-white/5 pb-1.5 uppercase text-[9px] tracking-wider mb-2">Sound Model</h4>
                  <select
                    value={voiceModel}
                    onChange={(e) => setVoiceModel(e.target.value)}
                    className="w-full bg-background border border-white/5 text-white rounded p-1.5 font-bold outline-none cursor-pointer"
                  >
                    <option value="aria">LJSpeech VITS (Default)</option>
                    <option value="nova">Facebook MMS-TTS</option>
                    <option value="echo">LJSpeech Tacotron2</option>
                    <option value="sage">Coqui XTTS-v2</option>
                    <option value="spark">Suno Bark (Multi-Voice)</option>
                  </select>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-muted">Display Artwork Background</span>
                  <input
                    type="checkbox"
                    checked={showBackground}
                    onChange={(e) => setShowBackground(e.target.checked)}
                    className="accent-primary w-4 h-4 cursor-pointer"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Fullscreen request trigger */}
          <button
            onClick={toggleFullscreen}
            className="p-3 bg-card border border-white/5 text-muted hover:text-white rounded-full transition-all shadow-lg active:scale-95"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>
        </aside>

      </div>

      {/* 4. Bottom Floating Glassmorphic Narration Console */}
      <footer className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-xl bg-[#151518]/75 backdrop-blur-xl border border-white/5 py-4 px-6 rounded-2xl flex items-center justify-between shadow-2xl z-40">
        
        {/* Prev chapter link */}
        <button
          onClick={prevChapter}
          disabled={currentChapterIdx === 0}
          className="p-2 text-muted hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          title="Previous Chapter"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* TTS Play controls */}
        <div className="flex items-center gap-4">
          <button
            onClick={toggleTTSPlayback}
            disabled={ttsLoading}
            className={`p-3 bg-primary hover:bg-primary-hover disabled:bg-primary/50 text-white rounded-full shadow-[0_4px_12px_rgba(124,58,237,0.3)] transition-all flex items-center justify-center ${
              ttsLoading ? 'animate-pulse' : 'active:scale-95'
            }`}
            title={ttsPlaying ? 'Pause Narration' : 'Read Out Loud'}
          >
            {ttsLoading ? (
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : ttsPlaying ? (
              <Pause className="w-5 h-5 fill-current" />
            ) : (
              <Play className="w-5 h-5 fill-current translate-x-0.5" />
            )}
          </button>

          {/* Audio scrubber/details indicator */}
          <div className="text-left leading-normal font-sans">
            <p className="text-white text-[11px] font-extrabold">
              {ttsPlaying ? 'Narration Active' : ttsLoading ? 'Generating Voice...' : 'AI Voice Narration'}
            </p>
            <p className="text-muted text-[9px] font-bold mt-0.5">
              Paragraph {currentParaIdx + 1} of {paragraphs.length} (Chap {currentChapterIdx + 1}/{chapters.length})
            </p>
          </div>
        </div>

        {/* Chapter select progress metrics */}
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-muted font-extrabold uppercase mr-1">
            Chap {currentChapterIdx + 1} of {chapters.length}
          </span>
          <button
            onClick={nextChapter}
            disabled={currentChapterIdx === chapters.length - 1}
            className="p-2 text-muted hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            title="Next Chapter"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </footer>

    </div>
  );
}
