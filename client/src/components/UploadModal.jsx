import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FileText, Upload, Sparkles, BookOpen, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { uploadStory } from '../api/stories.js';
import toast from 'react-hot-toast';

export default function UploadModal() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Check URL query parameters to see if upload modal is open
  const params = new URLSearchParams(location.search);
  const isOpen = params.get('upload') === 'true';

  const [title, setTitle] = useState('');
  const [genre, setGenre] = useState('Fantasy');
  const [text, setText] = useState('');
  const [file, setFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Close modal by removing query parameter
  const handleClose = () => {
    const newParams = new URLSearchParams(location.search);
    newParams.delete('upload');
    const searchStr = newParams.toString();
    navigate(location.pathname + (searchStr ? `?${searchStr}` : ''));
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      const ext = selectedFile.name.split('.').pop().toLowerCase();
      if (ext !== 'txt' && ext !== 'pdf') {
        toast.error('Only .txt and .pdf files are supported.');
        return;
      }
      setFile(selectedFile);
      toast.success(`Attached file: ${selectedFile.name}`);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || !genre) {
      return toast.error('Title and genre are required.');
    }
    if (!text && !file) {
      return toast.error('Please enter story text or upload a .txt/.pdf document.');
    }

    setIsSubmitting(true);
    const formData = new FormData();
    formData.append('title', title);
    formData.append('genre', genre);
    
    if (file) {
      formData.append('file', file);
    } else {
      formData.append('text', text);
    }

    try {
      const result = await uploadStory(formData);
      toast.success('Story uploaded! Initiating generation pipeline.');
      
      // Close modal first
      handleClose();

      // Navigate to story page which will handle rendering the ProgressScreen
      navigate(`/story/${result.storyId}`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to upload story.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-xl bg-card border border-white/5 shadow-2xl rounded-3xl overflow-hidden z-50 font-sans"
        >
          {/* Header */}
          <div className="flex justify-between items-center px-6 py-4 border-b border-white/5">
            <h2 className="text-base font-extrabold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-accent animate-pulse" />
              <span>Create Immersive Story</span>
            </h2>
            <button
              onClick={handleClose}
              className="p-1 text-muted hover:text-white hover:bg-white/5 rounded-full transition-all duration-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="text-[10px] text-muted font-bold tracking-wider uppercase mb-1.5 block">Story Title</label>
              <input
                type="text"
                placeholder="Enter an intriguing title..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-background border border-white/5 focus:border-primary/50 outline-none text-xs text-white px-4 py-3 rounded-xl transition-all duration-300 font-medium"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] text-muted font-bold tracking-wider uppercase mb-1.5 block">Author Name</label>
                <input
                  type="text"
                  value={user?.name || ''}
                  disabled
                  className="w-full bg-background/50 border border-white/5 text-muted text-xs px-4 py-3 rounded-xl font-medium cursor-not-allowed"
                />
              </div>

              <div>
                <label className="text-[10px] text-muted font-bold tracking-wider uppercase mb-1.5 block">Genre</label>
                <select
                  value={genre}
                  onChange={(e) => setGenre(e.target.value)}
                  className="w-full bg-background border border-white/5 focus:border-primary/50 outline-none text-xs text-white px-4 py-3 rounded-xl transition-all duration-300 font-bold"
                >
                  <option value="Fantasy">Fantasy</option>
                  <option value="Sci-Fi">Sci-Fi</option>
                  <option value="Mystery">Mystery</option>
                  <option value="Romance">Romance</option>
                  <option value="Horror">Horror</option>
                  <option value="Adventure">Adventure</option>
                  <option value="Drama">Drama</option>
                </select>
              </div>
            </div>

            {/* Input toggle: Text area vs File Upload */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-[10px] text-muted font-bold tracking-wider uppercase block">Story Content</label>
                {file && (
                  <button
                    type="button"
                    onClick={() => setFile(null)}
                    className="text-[9px] text-red-400 hover:underline font-bold"
                  >
                    Clear attached file
                  </button>
                )}
              </div>

              {!file ? (
                <div className="space-y-3">
                  <textarea
                    placeholder="Type or paste your story text here... Write multiple chapters separating them with 'CHAPTER 1: Title', 'CHAPTER 2: Title' for full immersive support!"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    rows={8}
                    className="w-full bg-background border border-white/5 focus:border-primary/50 outline-none text-xs text-white p-4 rounded-xl transition-all duration-300 font-medium resize-none"
                  />
                  <div className="relative flex items-center justify-center">
                    <div className="border-t border-white/5 w-full absolute z-0" />
                    <span className="bg-card px-3 text-[9px] text-muted font-bold tracking-widest uppercase z-10">OR UPLOAD FILE</span>
                  </div>
                  
                  {/* File Upload drag area */}
                  <label className="flex flex-col items-center justify-center border border-dashed border-white/10 hover:border-primary/50 rounded-xl p-4 cursor-pointer hover:bg-white/[0.01] transition-all group">
                    <Upload className="w-5 h-5 text-muted group-hover:text-primary transition-colors mb-2" />
                    <span className="text-[10px] text-white font-bold">Upload story file (.txt or .pdf)</span>
                    <span className="text-[9px] text-muted font-medium mt-0.5">Maximum size: 5MB</span>
                    <input type="file" accept=".txt,.pdf" onChange={handleFileChange} className="hidden" />
                  </label>
                </div>
              ) : (
                <div className="bg-background border border-white/5 rounded-xl p-6 flex flex-col items-center justify-center text-center">
                  <FileText className="w-10 h-10 text-accent mb-2 animate-bounce" />
                  <p className="text-xs text-white font-bold">{file.name}</p>
                  <p className="text-[10px] text-muted font-medium mt-1">{(file.size / 1024).toFixed(1)} KB — Ready for processing</p>
                </div>
              )}
            </div>

            {/* Info notification */}
            <div className="bg-primary/5 border border-primary/20 text-accent px-4 py-3 rounded-2xl flex gap-2 text-[10px] font-semibold leading-normal">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <p>Our AI pipeline will automatically analyze the text, design matching cover graphics, render wide scenic backdrops, and compose background soundscapes.</p>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-primary hover:bg-primary-hover disabled:bg-primary/50 text-white font-bold py-3.5 rounded-xl text-xs transition-all shadow-[0_4px_12px_rgba(124,58,237,0.3)] duration-200 flex items-center justify-center gap-1.5 active:scale-[0.98] mt-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Generating My Story Experience...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Generate My Story Experience</span>
                </>
              )}
            </button>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
