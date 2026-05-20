import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Palette, Globe, Music, Check, Loader2, AlertCircle } from 'lucide-react';
import { getPipelineStatus } from '../api/stories.js';
import toast from 'react-hot-toast';

export default function ProgressScreen({ storyId, onComplete }) {
  const [pipelineState, setPipelineState] = useState({
    stage: '1',
    progress: 10,
    statusText: 'Initializing pipeline...',
    error: null,
  });

  const [slowWarning, setSlowWarning] = useState(false);

  useEffect(() => {
    // Show warming up warning after 12 seconds of processing
    const warningTimer = setTimeout(() => {
      setSlowWarning(true);
    }, 12000);

    const pollInterval = setInterval(async () => {
      try {
        const status = await getPipelineStatus(storyId);
        setPipelineState(status);

        if (status.stage === 'complete') {
          clearInterval(pollInterval);
          clearTimeout(warningTimer);
          toast.success('Your StoryScape experience is ready!');
          // Delay briefly to let user see 100% completion
          setTimeout(() => {
            onComplete(storyId);
          }, 1500);
        } else if (status.stage === 'failed') {
          clearInterval(pollInterval);
          clearTimeout(warningTimer);
          toast.error(`Generation failed: ${status.error || 'Unknown error'}`);
        }
      } catch (err) {
        console.error('Failed polling pipeline status:', err);
      }
    }, 2000);

    return () => {
      clearInterval(pollInterval);
      clearTimeout(warningTimer);
    };
  }, [storyId, onComplete]);

  const { stage, progress, statusText, error } = pipelineState;

  // Active state matching
  const getStepStatus = (stepId) => {
    if (stage === 'failed') return 'failed';
    if (stage === 'complete') return 'complete';

    const currentStageNum = parseInt(stage);
    const stepNum = parseInt(stepId);

    if (currentStageNum > stepNum) return 'complete';
    if (currentStageNum === stepNum) return 'active';
    return 'pending';
  };

  const steps = [
    { id: '1', name: 'Analysing your story...', icon: BookOpen, desc: 'Gemini extraction of themes, characters, and visual prompts' },
    { id: '2', name: 'Creating your cover art...', icon: Palette, desc: 'Flux/SDXL generating portrait book cover' },
    { id: '3', name: 'Painting your world...', icon: Globe, desc: 'SDXL rendering 16:9 panoramic background scene' },
    { id: '4', name: 'Composing your soundtrack...', icon: Music, desc: 'MusicGen crafting loopable atmospheric audio track' },
  ];

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-background min-h-screen p-6 relative overflow-hidden font-sans">
      {/* Background radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[100px] pointer-events-none z-0" />

      {/* Main Glassmorphism container */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl bg-card/60 border border-white/5 backdrop-blur-xl rounded-3xl p-8 z-10 shadow-[0_24px_50px_rgba(0,0,0,0.5)]"
      >
        <div className="text-center mb-8">
          <h2 className="text-2xl font-extrabold tracking-wide text-white flex items-center justify-center gap-2">
            <span className="animate-pulse text-accent">✦</span> Generating Your StoryScape <span className="animate-pulse text-accent">✦</span>
          </h2>
          <p className="text-muted text-xs mt-2 font-medium">{statusText}</p>
        </div>

        {/* Global Progress Bar */}
        <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden mb-10 border border-white/5 relative">
          <motion.div
            className="h-full bg-gradient-to-r from-primary to-accent"
            initial={{ width: '0%' }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>

        {/* Warming up Warning Banner */}
        <AnimatePresence>
          {slowWarning && stage !== 'complete' && stage !== 'failed' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-300 px-4 py-3 rounded-2xl flex items-start gap-3 mb-8 text-xs font-semibold"
            >
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <div>
                <p className="font-bold">Warming up AI Models...</p>
                <p className="text-yellow-400/80 font-normal mt-0.5">The first request might take 30–45s as Hugging Face starts cold containers. Thank you for your patience!</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Steps display */}
        <div className="space-y-6">
          {steps.map((step) => {
            const stepStatus = getStepStatus(step.id);
            const StepIcon = step.icon;

            return (
              <div
                key={step.id}
                className={`flex gap-4 p-4 rounded-2xl border transition-all duration-300 ${
                  stepStatus === 'active'
                    ? 'bg-primary/5 border-primary/20 shadow-[0_0_15px_rgba(124,58,237,0.05)]'
                    : stepStatus === 'complete'
                    ? 'bg-white/[0.01] border-white/5 opacity-80'
                    : 'border-transparent opacity-40'
                }`}
              >
                {/* Step circle indicator */}
                <div className="flex items-center justify-center shrink-0">
                  {stepStatus === 'complete' ? (
                    <div className="w-9 h-9 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center text-green-400">
                      <Check className="w-5 h-5" />
                    </div>
                  ) : stepStatus === 'active' ? (
                    <div className="w-9 h-9 rounded-full bg-primary/20 border border-primary flex items-center justify-center text-primary relative">
                      <Loader2 className="w-5 h-5 animate-spin" />
                    </div>
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-muted text-xs font-bold">
                      {step.id}
                    </div>
                  )}
                </div>

                {/* Step Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center">
                    <h3
                      className={`text-sm font-bold truncate ${
                        stepStatus === 'active' ? 'text-accent' : 'text-white'
                      }`}
                    >
                      {step.name}
                    </h3>
                    <StepIcon
                      className={`w-4 h-4 ${
                        stepStatus === 'active'
                          ? 'text-primary animate-pulse'
                          : stepStatus === 'complete'
                          ? 'text-green-400'
                          : 'text-muted'
                      }`}
                    />
                  </div>
                  <p className="text-muted text-[11px] mt-1 font-medium truncate">{step.desc}</p>

                  {/* Stage-specific parallel sub-progress bars */}
                  {stepStatus === 'active' && step.id !== '1' && (
                    <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden mt-3 border border-white/5">
                      <motion.div
                        className="h-full bg-primary"
                        initial={{ width: '0%' }}
                        animate={{ width: '70%' }}
                        transition={{ repeat: Infinity, duration: 1.5, repeatType: 'reverse', ease: 'easeInOut' }}
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Failed Pipeline Retry */}
        {stage === 'failed' && (
          <div className="mt-8 text-center bg-red-500/10 border border-red-500/30 text-red-300 p-4 rounded-2xl">
            <p className="text-xs font-bold">Pipeline Error</p>
            <p className="text-[11px] text-red-400/80 mt-1">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 bg-red-500 hover:bg-red-600 text-white font-bold px-6 py-2 rounded-xl text-xs transition-all shadow-[0_4px_12px_rgba(239,68,68,0.2)] active:scale-95"
            >
              Retry Generation
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
