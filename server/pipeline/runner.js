import db from '../db.js';
import { analyzeStory } from './analyze.js';
import { generateCover } from './cover.js';
import { generateBackground } from './background.js';
import { generateMusic } from './music.js';

// In-memory cache for fine-grained progress tracking of active pipelines
export const activePipelines = {};

export async function runPipeline(storyId, storyText) {
  activePipelines[storyId] = {
    stage: '1',
    progress: 10,
    statusText: 'Analyzing your story...',
    error: null,
  };

  db.prepare("UPDATE stories SET status = 'processing' WHERE id = ?").run(storyId);

  try {
    // === STAGE 1: ANALYSIS ===
    console.log(`[Pipeline] Starting Stage 1 (Analysis) for Story ${storyId}`);
    const analysis = await analyzeStory(storyText);
    
    // Save analysis JSON to DB
    db.prepare('UPDATE stories SET analysis = ? WHERE id = ?').run(
      JSON.stringify(analysis),
      storyId
    );

    activePipelines[storyId] = {
      stage: '2',
      progress: 30,
      statusText: 'Creating your cover art & assets...',
      error: null,
    };

    // === STAGES 2, 3, 4: GENERATION IN PARALLEL ===
    console.log(`[Pipeline] Starting Stages 2, 3, 4 (Assets) in parallel for Story ${storyId}`);
    
    const coverPromise = generateCover(storyId, analysis)
      .then(url => {
        db.prepare('UPDATE stories SET cover_url = ? WHERE id = ?').run(url, storyId);
        return url;
      })
      .catch(err => {
        console.error(`[Pipeline] Stage 2 (Cover) failed for Story ${storyId}:`, err.message);
        // Set placeholder cover if it fails
        const placeholder = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1200" fill="%230D0D0F"/>`;
        db.prepare('UPDATE stories SET cover_url = ? WHERE id = ?').run(placeholder, storyId);
        return placeholder;
      });

    const bgPromise = generateBackground(storyId, analysis)
      .then(url => {
        db.prepare('UPDATE stories SET background_url = ? WHERE id = ?').run(url, storyId);
        return url;
      })
      .catch(err => {
        console.error(`[Pipeline] Stage 3 (Background) failed for Story ${storyId}:`, err.message);
        const placeholder = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" fill="%230D0D0F"/>`;
        db.prepare('UPDATE stories SET background_url = ? WHERE id = ?').run(placeholder, storyId);
        return placeholder;
      });

    const musicPromise = generateMusic(storyId, analysis)
      .then(url => {
        if (url) {
          db.prepare('UPDATE stories SET music_url = ? WHERE id = ?').run(url, storyId);
        }
        return url;
      })
      .catch(err => {
        console.error(`[Pipeline] Stage 4 (Music) failed for Story ${storyId}:`, err.message);
        return null;
      });

    // Wait for cover, background, and music to complete (or fall back)
    await Promise.all([coverPromise, bgPromise, musicPromise]);

    // Mark complete in DB and active tracker
    db.prepare("UPDATE stories SET status = 'complete' WHERE id = ?").run(storyId);
    
    activePipelines[storyId] = {
      stage: 'complete',
      progress: 100,
      statusText: 'Pipeline complete!',
      error: null,
    };
    
    console.log(`[Pipeline] Successfully completed all stages for Story ${storyId}`);
    // Clean up memory after 5 minutes — clients would have polled by then
    setTimeout(() => { delete activePipelines[storyId]; }, 5 * 60 * 1000);
  } catch (error) {
    console.error(`[Pipeline] Critical error in pipeline for Story ${storyId}:`, error.message);
    db.prepare("UPDATE stories SET status = 'failed' WHERE id = ?").run(storyId);
    
    activePipelines[storyId] = {
      stage: 'failed',
      progress: 100,
      statusText: 'Pipeline failed.',
      error: error.message,
    };
    // Clean up memory after 5 minutes
    setTimeout(() => { delete activePipelines[storyId]; }, 5 * 60 * 1000);
  }
}
