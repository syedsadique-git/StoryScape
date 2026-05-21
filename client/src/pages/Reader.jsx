import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { BookOpen, FolderHeart, Sun, Moon, Volume2, VolumeX, Settings, Maximize, Minimize, Play, Pause, ChevronLeft, ChevronRight, Bookmark, Sparkles, Heart } from 'lucide-react';
import { getStory, bookmarkStory, getTTS, checkUserStoryStatus, likeStory } from '../api/stories.js';
import EmberCanvas from '../components/EmberCanvas.jsx';
import toast from 'react-hot-toast';

// ─────────────────────────────────────────────
// Browser Web Speech API helper
// ─────────────────────────────────────────────
const VOICE_GROUPS = [
  {
    label: 'Female Voices',
    voices: [
      { value: 'af_heart', label: 'Heart' },
      { value: 'af_bella', label: 'Bella' },
      { value: 'af_nicole', label: 'Nicole' },
      { value: 'af_sarah', label: 'Sarah' },
    ],
  },
  {
    label: 'Male Voices',
    voices: [
      { value: 'am_fenrir', label: 'Fenrir' },
      { value: 'am_michael', label: 'Michael' },
      { value: 'am_puck', label: 'Puck' },
      { value: 'bm_fable', label: 'Fable' },
    ],
  },
];

const loadBrowserVoices = () => {
  if (!window.speechSynthesis) return Promise.resolve([]);

  const voices = window.speechSynthesis.getVoices();
  if (voices.length) return Promise.resolve(voices);

  return new Promise((resolve) => {
    const timeout = window.setTimeout(() => resolve(window.speechSynthesis.getVoices()), 1000);
    window.speechSynthesis.onvoiceschanged = () => {
      window.clearTimeout(timeout);
      resolve(window.speechSynthesis.getVoices());
    };
  });
};

const getEnglishVoices = (voices) => voices.filter((v) => v.lang?.startsWith('en'));

const isIgnoredSpeechError = (err) => ['canceled', 'interrupted'].includes(err?.error);

function pickBrowserVoice(voices, voiceModel) {
  const englishVoices = getEnglishVoices(voices);
  const usableVoices = englishVoices.length ? englishVoices : voices;
  if (!usableVoices.length) return null;

  const defaultVoice = usableVoices.find(
    (v) => v.default || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Daniel')
  ) || usableVoices[0];

  const orderedVoices = [defaultVoice, ...usableVoices.filter((v) => v.name !== defaultVoice.name)];
  const fallbackVoiceOrder = VOICE_GROUPS.flatMap((group) => group.voices.map((voice) => voice.value));
  const voiceIndex = Math.max(0, fallbackVoiceOrder.indexOf(voiceModel)) % orderedVoices.length;
  return orderedVoices[voiceIndex] || defaultVoice;
}

function browserSpeak(text, voiceModel, voices, onEnd, onError) {
  if (!window.speechSynthesis) {
    onError && onError(new Error('Web Speech API not available'));
    return null;
  }
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.rate = 0.92;
  utter.pitch = 1.0;
  utter.volume = 1.0;
  const preferred = pickBrowserVoice(voices, voiceModel);
  if (preferred) utter.voice = preferred;
  utter.onend = onEnd;
  utter.onerror = onError;
  window.speechSynthesis.speak(utter);
  return utter;
}

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
  const [usingBrowserTTS, setUsingBrowserTTS] = useState(false);
  const [browserVoices, setBrowserVoices] = useState([]);

  // Customization settings
  const [fontSize, setFontSize] = useState(18);
  const [showBackground, setShowBackground] = useState(true);
  const [voiceModel, setVoiceModel] = useState('af_heart');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [theme, setTheme] = useState('dark');
  const [isLiked, setIsLiked] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [likeLoading, setLikeLoading] = useState(false);
  const likeRequestRef = useRef(false);

  // Audio refs
  const musicAudioRef = useRef(null);
  const ttsAudioRef = useRef(null);
  const containerRef = useRef(null);
  // Keep a ref to current paragraph index so async callbacks stay fresh
  const currentParaIdxRef = useRef(0);
  const paragraphsRef = useRef([]);
  const ttsCacheRef = useRef({});

  useEffect(() => { currentParaIdxRef.current = currentParaIdx; }, [currentParaIdx]);
  useEffect(() => { paragraphsRef.current = paragraphs; }, [paragraphs]);

  useEffect(() => {
    let mounted = true;
    loadBrowserVoices().then((voices) => {
      if (mounted) setBrowserVoices(voices);
    });

    return () => { mounted = false; };
  }, []);

  // ── Chapter parser ──────────────────────────────────────
  const parseChapters = (text) => {
    if (!text) return [];
    const regex = /(?:^|\n)(?=CHAPTER\s+\d+|Chapter\s+\d+|Chapter\s+[IVXLCDM]+)/i;
    const parts = text.split(regex);
    if (parts.length <= 1) return [{ title: 'Chapter 1', content: text }];
    return parts
      .map((part, idx) => {
        const trimmed = part.trim();
        if (!trimmed) return null;
        const lines = trimmed.split('\n');
        const title = lines[0].replace(/[:#]/g, '').trim();
        const content = lines.slice(1).join('\n').trim();
        return { title: title || `Chapter ${idx + 1}`, content: content || trimmed };
      })
      .filter(Boolean);
  };

  // ── Fetch story ─────────────────────────────────────────
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
        const parsed = parseChapters(data.text);
        setChapters(parsed);

        const token = localStorage.getItem('token');
        if (token) {
          try {
            const status = await checkUserStoryStatus(id);
            setIsBookmarked(status.bookmarked);
            setIsLiked(status.liked);
            if (status.bookmarked && status.progress > 0 && parsed.length > 1) {
              const bookmarkIdx = Math.min(
                parsed.length - 1,
                Math.floor((status.progress / 100) * parsed.length)
              );
              setCurrentChapterIdx(bookmarkIdx);
            }
          } catch (e) { /* non-fatal */ }
        }
      } catch (err) {
        toast.error('Could not load story files.');
        navigate('/');
      } finally {
        setLoading(false);
      }
    };
    fetchStory();
  }, [id, navigate]);

  // ── Bookmark sync ───────────────────────────────────────
  const syncBookmarkProgress = async (chapterIndex, chaps) => {
    const list = chaps || chapters;
    if (!list.length || !localStorage.getItem('token')) return;
    const pct = Math.min(100, Math.round(((chapterIndex + 1) / list.length) * 100));
    try { await bookmarkStory(id, pct); } catch (e) { /* non-fatal */ }
  };

  // ── Like ────────────────────────────────────────────────
  const handleLike = async () => {
    if (likeLoading || likeRequestRef.current) return;
    likeRequestRef.current = true;
    setLikeLoading(true);
    try {
      const res = await likeStory(id);
      setIsLiked(res.liked);
      setStory(prev => ({ ...prev, likes: res.likes }));
      toast.success(res.liked ? 'Liked!' : 'Removed from likes');
    }
    catch (e) {
      const msg = e.response?.data?.error || 'Like failed.';
      toast.error(msg);
    } finally {
      setLikeLoading(false);
      likeRequestRef.current = false;
    }
  };

  // ── Soundscape toggle ───────────────────────────────────
  const toggleSoundscape = () => {
    const audio = musicAudioRef.current;
    if (!audio) { toast.error('No soundtrack available for this story.'); return; }
    if (soundscapePlaying) { audio.pause(); setSoundscapePlaying(false); }
    else {
      audio.play()
        .then(() => setSoundscapePlaying(true))
        .catch(() => {
          setSoundscapePlaying(false);
          toast.error('Soundtrack could not be played.');
        });
    }
  };

  // ── TTS: server → browser fallback ─────────────────────
  const stopTTS = useCallback(() => {
    if (ttsAudioRef.current) { ttsAudioRef.current.pause(); ttsAudioRef.current = null; }
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setTtsPlaying(false);
    setTtsLoading(false);
  }, []);

  const prefetchTTSAtIndex = useCallback(async (index, selectedVoiceModel = voiceModel) => {
    const allParagraphs = paragraphsRef.current;
    const textToSpeak = allParagraphs[index];
    if (!textToSpeak) return;

    const cacheKey = `${selectedVoiceModel}:${textToSpeak}`;
    if (ttsCacheRef.current[cacheKey]) return;

    try {
      const res = await getTTS(textToSpeak, selectedVoiceModel);
      if (res.url && res.url !== '__BROWSER_TTS__') {
        ttsCacheRef.current[cacheKey] = res.url;
        // Pre-load audio to browser cache
        const audio = new Audio(res.url);
        audio.preload = 'auto';
        audio.load();
      }
    } catch (err) {
      console.warn('TTS Prefetch error:', err);
    }
  }, [voiceModel]);

  // ── Chapter → paragraphs ────────────────────────────────
  useEffect(() => {
    if (chapters.length > 0 && chapters[currentChapterIdx]) {
      const parsed = chapters[currentChapterIdx].content
        .split(/\n+/).map((p) => p.trim()).filter(Boolean);
      setParagraphs(parsed);
      setCurrentParaIdx(0);
      stopTTS();
      syncBookmarkProgress(currentChapterIdx, chapters);
      
      // Prefetch first paragraph of the new chapter
      if (parsed.length > 0) {
        prefetchTTSAtIndex(0);
      }
    }
  }, [chapters, currentChapterIdx, prefetchTTSAtIndex]);

  const playTTSAtIndex = useCallback(async (index, selectedVoiceModel = voiceModel) => {
    stopTTS();
    const allParagraphs = paragraphsRef.current;
    const textToSpeak = allParagraphs[index];
    if (!textToSpeak) return;

    const cacheKey = `${selectedVoiceModel}:${textToSpeak}`;
    let audioUrl = ttsCacheRef.current[cacheKey];

    // Only show loading state if we don't have it cached
    setTtsLoading(!audioUrl);

    const onReadEnd = () => {
      setTtsPlaying(false);
      const nextIdx = index + 1;
      if (nextIdx < paragraphsRef.current.length) {
        setCurrentParaIdx(nextIdx);
        playTTSAtIndex(nextIdx);
      } else {
        toast.success('Finished reading chapter.');
      }
    };

    try {
      if (!audioUrl) {
        const res = await getTTS(textToSpeak, selectedVoiceModel);
        audioUrl = res.url;
      }

      // Server returns '__BROWSER_TTS__' when HF models are unavailable
      if (!audioUrl || audioUrl === '__BROWSER_TTS__') {
        setUsingBrowserTTS(true);
        setTtsLoading(false);
        setTtsPlaying(true);
        const voices = browserVoices.length ? browserVoices : await loadBrowserVoices();
        browserSpeak(
          textToSpeak,
          selectedVoiceModel,
          voices,
          onReadEnd,
          (err) => {
            console.error('Web Speech error:', err);
            setTtsPlaying(false);
            if (!isIgnoredSpeechError(err)) {
              toast.error('Browser voice unavailable in this environment.');
            }
          }
        );
        return;
      }

      // Use HTML5 Audio for server-side audio file
      setUsingBrowserTTS(false);
      const audio = new Audio(audioUrl);
      audio.volume = 0.95;
      audio.onplay = () => { 
        setTtsLoading(false); 
        setTtsPlaying(true);
        // Prefetch next paragraph while this one plays
        const nextIdx = index + 1;
        if (nextIdx < allParagraphs.length) {
          prefetchTTSAtIndex(nextIdx, selectedVoiceModel);
        }
      };
      audio.onended = onReadEnd;
      audio.onerror = () => {
        setTtsLoading(false); setTtsPlaying(false);
        toast.error('Audio playback failed — switching to browser voice.');
        setUsingBrowserTTS(true);
        setTtsPlaying(true);
        browserSpeak(textToSpeak, selectedVoiceModel, browserVoices, onReadEnd, () => setTtsPlaying(false));
      };
      ttsAudioRef.current = audio;
      await audio.play();
    } catch (err) {
      console.error('TTS API error:', err);
      // Fall back to browser speech on any API error
      setUsingBrowserTTS(true);
      setTtsLoading(false);
      setTtsPlaying(true);
      const voices = browserVoices.length ? browserVoices : await loadBrowserVoices();
      browserSpeak(
        textToSpeak,
        selectedVoiceModel,
        voices,
        onReadEnd,
        (err) => {
          setTtsPlaying(false);
          if (!isIgnoredSpeechError(err)) toast.error('Voice narration failed.');
        }
      );
    }
  }, [voiceModel, browserVoices, stopTTS, prefetchTTSAtIndex]);

  const handleVoiceModelChange = (nextVoiceModel) => {
    setVoiceModel(nextVoiceModel);
    if (ttsPlaying || ttsLoading) {
      window.setTimeout(() => playTTSAtIndex(currentParaIdxRef.current, nextVoiceModel), 0);
    }
  };

  const toggleTTSPlayback = () => {
    if (ttsPlaying || ttsLoading) { stopTTS(); }
    else { playTTSAtIndex(currentParaIdx); }
  };

  // ── Chapter nav ─────────────────────────────────────────
  const prevChapter = () => { if (currentChapterIdx > 0) setCurrentChapterIdx(currentChapterIdx - 1); };
  const nextChapter = () => { if (currentChapterIdx < chapters.length - 1) setCurrentChapterIdx(currentChapterIdx + 1); };

  // ── Fullscreen ──────────────────────────────────────────
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen()
        .then(() => setIsFullscreen(true))
        .catch((err) => toast.error(`Fullscreen failed: ${err.message}`));
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false));
    }
  };
  useEffect(() => {
    const h = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', h);
    return () => document.removeEventListener('fullscreenchange', h);
  }, []);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
    toast.success(`${theme === 'dark' ? 'Paper' : 'Nocturnal'} theme applied!`);
  };

  // ── Soundtrack ──────────────────────────────────────────
  useEffect(() => {
    if (story?.music_url) {
      const audio = new Audio(story.music_url);
      audio.loop = true;
      audio.volume = 0.4;
      audio.preload = 'auto';
      musicAudioRef.current = audio;
    }
    return () => {
      if (musicAudioRef.current) { musicAudioRef.current.pause(); musicAudioRef.current = null; }
      setSoundscapePlaying(false);
    };
  }, [story]);

  // ── Loading screen ──────────────────────────────────────
  if (loading) {
    return (
      <div className="flex-grow flex flex-col items-center justify-center min-h-screen bg-background">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="mt-4 text-muted text-sm font-medium tracking-wide">Drawing world portals...</p>
      </div>
    );
  }

  const progressPercent = chapters.length > 0
    ? Math.round(((currentChapterIdx + 1) / chapters.length) * 100) : 0;
  const headingClass = theme === 'dark' ? 'text-white' : 'text-gray-950';
  const mutedClass = theme === 'dark' ? 'text-muted' : 'text-gray-600';
  const panelClass = theme === 'dark'
    ? 'bg-[#151518]/70 border-white/5'
    : 'bg-white/90 border-gray-200 shadow-sm';
  const buttonPanelClass = theme === 'dark'
    ? 'bg-card border-white/5 text-muted hover:text-white'
    : 'bg-white border-gray-200 text-gray-600 hover:text-gray-950 shadow-sm';

  return (
    <div
      ref={containerRef}
      className={`min-h-screen flex flex-col relative overflow-hidden transition-colors duration-500 ${
        theme === 'dark' ? 'bg-[#0A0A0C] text-gray-200' : 'bg-[#FDFBF7] text-gray-800'
      }`}
    >
      {/* Ambient Background */}
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
      {theme === 'dark' && <EmberCanvas />}

      {/* Top Header */}
      <header className={`relative w-full z-40 backdrop-blur-sm border-b py-2 px-6 flex items-center justify-between ${
        theme === 'dark' ? 'bg-black/10 border-white/5' : 'bg-white/80 border-gray-200'
      }`}>
        <Link to={`/story/${story.id}/info`} className={`flex items-center gap-1 text-xs font-bold transition-colors ${mutedClass} hover:${theme === 'dark' ? 'text-white' : 'text-gray-950'}`}>
          <ChevronLeft className="w-4 h-4" /> Exit Reader
        </Link>
        <span className={`text-[11px] font-extrabold tracking-widest uppercase truncate max-w-xs sm:max-w-md ${mutedClass}`}>
          {story.title} — {chapters[currentChapterIdx]?.title}
        </span>
        <div className="flex items-center gap-3">
          <button onClick={toggleTheme} className="p-1.5 border border-white/5 bg-black/15 hover:bg-black/30 text-muted hover:text-white rounded-full transition-all duration-200" title="Toggle theme">
            {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>
          <Link to="/library" className="p-1.5 border border-white/5 bg-black/15 hover:bg-black/30 text-muted hover:text-white rounded-full transition-all duration-200" title="My Library">
            <FolderHeart className="w-3.5 h-3.5" />
          </Link>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex-grow flex h-[calc(100vh-85px)] relative overflow-hidden">

        {/* LEFT SIDEBAR */}
        <aside className="w-60 shrink-0 border-r border-white/5 bg-[#151518]/70 backdrop-blur-xl p-5 flex flex-col justify-between hidden md:flex z-20">
          <div className="space-y-6">
            <div className="aspect-[2/3] w-full rounded-xl overflow-hidden border border-white/5 shadow-md bg-black/40">
              <img src={story.cover_url || ''} alt={story.title} className="w-full h-full object-cover" />
            </div>
            <div className="space-y-1.5 text-left">
              <h3 className="text-white text-xs font-extrabold tracking-wide line-clamp-1">{story.title}</h3>
              <p className="text-muted text-[10px] font-semibold truncate">by {story.author}</p>
              <span className="inline-block bg-primary/10 border border-primary/20 text-accent text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">{story.genre}</span>
            </div>
            <div className="space-y-2 text-left">
              <div className="flex justify-between items-center text-[10px] font-bold text-muted">
                <span>Story Progress</span>
                <span className="text-white">{progressPercent}%</span>
              </div>
              <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden border border-white/5">
                <div className="h-full bg-primary" style={{ width: `${progressPercent}%` }} />
              </div>
              <div className="space-y-1 mt-4 max-h-[160px] overflow-y-auto pr-1">
                {chapters.map((chap, idx) => (
                  <button key={idx} onClick={() => { setCurrentChapterIdx(idx); setCurrentParaIdx(0); }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[10px] font-bold truncate transition-all ${
                      idx === currentChapterIdx
                        ? 'bg-primary/20 border border-primary/30 text-accent'
                        : 'hover:bg-white/5 text-muted hover:text-white border border-transparent'
                    }`}>
                    {chap.title}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex gap-2 pt-4 border-t border-white/5">
            <button 
              onClick={handleLike}
              disabled={likeLoading}
              className={`w-1/2 py-2 rounded-xl text-[10px] font-extrabold flex items-center justify-center gap-1 border transition-all ${
                likeLoading ? 'opacity-50 cursor-wait' :
                isLiked ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-black/20 hover:bg-black/40 border-white/5 text-muted hover:text-white'
              }`}>
              <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-current' : ''}`} />
              <span>{isLiked ? 'Liked' : 'Like'}</span>
            </button>
            <button onClick={() => navigate(`/story/${story.id}/info`)}
              className="w-1/2 py-2 bg-black/20 hover:bg-black/40 border border-white/5 text-muted hover:text-white rounded-xl text-[10px] font-extrabold flex items-center justify-center gap-1 transition-all">
              <Bookmark className="w-3.5 h-3.5" /><span>Info</span>
            </button>
          </div>
        </aside>

        {/* CENTER READER */}
        <section className="flex-grow overflow-y-auto px-6 py-10 md:px-16 flex justify-center z-10 no-scrollbar">
          <div className="max-w-2xl w-full space-y-8 pb-32">
            <div className="text-center space-y-4">
              <h2 className={`text-2xl md:text-3xl font-extrabold tracking-wide font-sans ${headingClass}`}>
                {chapters[currentChapterIdx]?.title}
              </h2>
              <div className="flex items-center justify-center gap-3">
                <div className="h-px bg-gradient-to-r from-transparent to-primary/30 w-16" />
                <Sparkles className="w-4 h-4 text-accent animate-pulse" />
                <div className="h-px bg-gradient-to-l from-transparent to-primary/30 w-16" />
              </div>
            </div>
            <article
              className={`font-serif tracking-wide leading-relaxed space-y-6 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-800'}`}
              style={{ fontSize: `${fontSize}px` }}
            >
              {paragraphs.map((pText, pIdx) => {
                const isActive = pIdx === currentParaIdx;
                return (
                  <p key={pIdx}
                    onClick={() => { setCurrentParaIdx(pIdx); if (ttsPlaying) playTTSAtIndex(pIdx); }}
                    className={`transition-all duration-300 cursor-pointer rounded-xl p-2 select-text ${
                      isActive ? `${headingClass} border-l-2 border-primary bg-primary/5 pl-3 font-semibold` : 'opacity-60 hover:opacity-90 hover:pl-2'
                    }`}>
                    {pIdx === 0 ? (
                      <>
                        <span className="float-left text-5xl font-extrabold text-primary font-sans leading-[0.8] mr-2 pt-1 uppercase">
                          {pText.charAt(0)}
                        </span>
                        {pText.slice(1)}
                      </>
                    ) : pText}
                  </p>
                );
              })}
            </article>
          </div>
        </section>

        {/* RIGHT TOOLBAR */}
        <aside className="absolute right-6 top-8 flex flex-col gap-4 z-30">
          <button onClick={toggleSoundscape}
            className={`p-3 border rounded-full transition-all shadow-lg active:scale-95 ${
              soundscapePlaying ? 'bg-primary border-primary-hover text-white shadow-primary/20' : buttonPanelClass
            }`}
            title={soundscapePlaying ? 'Mute Soundtrack' : 'Play Soundtrack'}>
            {soundscapePlaying ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          <div className="relative">
            <button onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              className={`p-3 border rounded-full transition-all shadow-lg active:scale-95 ${
                isSettingsOpen ? 'bg-primary border-primary-hover text-white' : buttonPanelClass
              }`} title="Reader Settings">
              <Settings className="w-4 h-4" />
            </button>
            {isSettingsOpen && (
              <div className={`absolute right-0 mt-3 w-60 border rounded-2xl shadow-xl p-4 space-y-4 z-50 text-xs font-semibold text-left backdrop-blur-xl ${panelClass}`}>
                <div>
                  <h4 className={`${headingClass} font-bold border-b border-white/5 pb-1.5 uppercase text-[9px] tracking-wider mb-2`}>Text Size</h4>
                  <div className="flex justify-between items-center gap-3">
                    <button onClick={() => setFontSize(Math.max(12, fontSize - 2))} className="bg-background hover:bg-white/5 px-2 py-1 rounded border border-white/5 font-extrabold">A-</button>
                    <span className={`${headingClass} text-xs`}>{fontSize}px</span>
                    <button onClick={() => setFontSize(Math.min(26, fontSize + 2))} className="bg-background hover:bg-white/5 px-2 py-1 rounded border border-white/5 font-extrabold">A+</button>
                  </div>
                </div>
                <div>
                  <h4 className={`${headingClass} font-bold border-b border-white/5 pb-1.5 uppercase text-[9px] tracking-wider mb-2`}>Voice Narration</h4>
                  <select value={voiceModel} onChange={(e) => handleVoiceModelChange(e.target.value)}
                    className="w-full bg-background border border-white/5 text-white rounded p-1.5 font-bold outline-none cursor-pointer">
                    {VOICE_GROUPS.map((group) => (
                      <optgroup key={group.label} label={group.label}>
                        {group.voices.map((preset) => (
                          <option key={preset.value} value={preset.value}>
                            {preset.label}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                  {usingBrowserTTS && (
                    <p className="text-[9px] text-yellow-400/80 mt-1.5 font-medium">
                      Neural TTS failed, using browser fallback.
                    </p>
                  )}
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className={mutedClass}>Display Artwork Background</span>
                  <input type="checkbox" checked={showBackground} onChange={(e) => setShowBackground(e.target.checked)} className="accent-primary w-4 h-4 cursor-pointer" />
                </div>
              </div>
            )}
          </div>

          <button onClick={toggleFullscreen}
            className={`p-3 border rounded-full transition-all shadow-lg active:scale-95 ${buttonPanelClass}`}
            title="Toggle Fullscreen">
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>
        </aside>
      </div>

      {/* BOTTOM NARRATION CONSOLE */}
      <footer className={`fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-xl backdrop-blur-xl border py-4 px-6 rounded-2xl flex items-center justify-between shadow-2xl z-40 ${panelClass}`}>
        <button onClick={prevChapter} disabled={currentChapterIdx === 0}
          className="p-2 text-muted hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all" title="Previous Chapter">
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-4">
          <button onClick={toggleTTSPlayback} disabled={ttsLoading}
            className={`p-3 bg-primary hover:bg-primary-hover disabled:bg-primary/50 text-white rounded-full shadow-[0_4px_12px_rgba(124,58,237,0.3)] transition-all flex items-center justify-center ${ttsLoading ? 'animate-pulse' : 'active:scale-95'}`}
            title={ttsPlaying ? 'Pause Narration' : 'Read Out Loud'}>
            {ttsLoading ? (
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : ttsPlaying ? (
              <Pause className="w-5 h-5 fill-current" />
            ) : (
              <Play className="w-5 h-5 fill-current translate-x-0.5" />
            )}
          </button>
          <div className="text-left leading-normal font-sans">
            <p className={`${headingClass} text-[11px] font-extrabold`}>
              {ttsPlaying
                ? (usingBrowserTTS ? '🔊 Browser Voice Active' : 'Narration Active')
                : ttsLoading ? 'Generating Voice...' : 'AI Voice Narration'}
            </p>
            <p className="text-muted text-[9px] font-bold mt-0.5">
              Para {currentParaIdx + 1} / {paragraphs.length} · Ch {currentChapterIdx + 1}/{chapters.length}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <span className="text-[10px] text-muted font-extrabold uppercase mr-1">
            Ch {currentChapterIdx + 1}/{chapters.length}
          </span>
          <button onClick={nextChapter} disabled={currentChapterIdx === chapters.length - 1}
            className="p-2 text-muted hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all" title="Next Chapter">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </footer>
    </div>
  );
}
