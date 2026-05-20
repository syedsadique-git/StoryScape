import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.resolve(__dirname, 'storyscape.db');
const db = new Database(dbPath);

// Create tables if they do not exist
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT,
    is_verified INTEGER DEFAULT 0,
    google_id TEXT,
    avatar_url TEXT,
    otp TEXT,
    otp_expires_at INTEGER,
    created_at INTEGER
  );

  CREATE TABLE IF NOT EXISTS stories (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    genre TEXT NOT NULL,
    text TEXT NOT NULL,
    status TEXT DEFAULT 'processing',
    analysis TEXT,
    cover_url TEXT,
    background_url TEXT,
    music_url TEXT,
    views INTEGER DEFAULT 0,
    likes INTEGER DEFAULT 0,
    user_id TEXT,
    created_at INTEGER,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS bookmarks (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    story_id TEXT NOT NULL,
    progress INTEGER DEFAULT 0,
    created_at INTEGER,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (story_id) REFERENCES stories(id)
  );
`);

// Function to generate SVG placeholder
function getPlaceholderCover(title, genre) {
  const cleanTitle = title.replace(/"/g, '&quot;');
  const cleanGenre = genre.toUpperCase();
  return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1200" viewBox="0 0 800 1200"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:%231d1030;stop-opacity:1"/><stop offset="100%" style="stop-color:%2305020a;stop-opacity:1"/></linearGradient></defs><rect width="800" height="1200" fill="url(%23g)"/><circle cx="400" cy="400" r="300" fill="%237C3AED" filter="blur(80px)" opacity="0.4"/><text x="50%" y="45%" dominant-baseline="middle" text-anchor="middle" font-family="system-ui, sans-serif" font-size="42" fill="%23F9FAFB" font-weight="bold">${cleanTitle}</text><text x="50%" y="52%" dominant-baseline="middle" text-anchor="middle" font-family="system-ui, sans-serif" font-size="20" fill="%23A78BFA" letter-spacing="4">${cleanGenre}</text></svg>`;
}

function getPlaceholderBg(title) {
  const cleanTitle = title.replace(/"/g, '&quot;');
  return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:%230D0D0F;stop-opacity:1"/><stop offset="100%" style="stop-color:%231A0F2E;stop-opacity:1"/></linearGradient></defs><rect width="1920" height="1080" fill="url(%23g)"/><circle cx="960" cy="540" r="400" fill="%237C3AED" filter="blur(150px)" opacity="0.25"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="system-ui, sans-serif" font-size="48" fill="%237C3AED" opacity="0.15" font-weight="bold">${cleanTitle}</text></svg>`;
}

// Seed data if empty
const count = db.prepare('SELECT COUNT(*) AS total FROM stories').get();
if (count.total === 0) {
  const insertStory = db.prepare(`
    INSERT INTO stories (id, title, author, genre, text, status, analysis, cover_url, background_url, music_url, views, likes, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const mockStories = [
    {
      id: 'story-1',
      title: 'The Last Moon Heir',
      author: 'Elarion Voss',
      genre: 'Fantasy',
      text: `CHAPTER 1: The Blood Moon

The wind howled through the broken arches of the old observatory, carrying with it the scent of rain and something older—something forgotten.

Kalen tightened his cloak and stepped onto the stone balcony. Below, the city of Veyra slumbered under the watchful glow of the twin moons.

He wasn't supposed to be here. But the letter had been clear.

"When the heavens align in blood and silver, return to where it all began."

He looked up. Both moons hung low. One was pale, silver-white; the other was slowly staining with a deep crimson. The lunar alignment was beginning.

CHAPTER 2: A Legacy Unlocked

Kalen drew the silver amulet from beneath his tunic. The metal felt ice-cold against his chest, but as the red shadow expanded across the moon's surface, the amulet began to pulse with a faint, warm light.

"It's true," he whispered to the empty air. "The bloodline is awake."

Suddenly, a soft rustle sounded behind him. He spun, hand instinctively moving to the hilt of his dagger. Out of the shadows stepped a cloaked figure, her eyes reflecting the crimson light above.

CHAPTER 3: Whispers of the Past

The figure pulled back her hood, revealing the sharp features and glowing silver eyes of an Elder Mage. It was Lysandra, the one they said had perished in the Great Siege.

"You have the mark, Kalen," she said, her voice like rustling dry parchment. "The blood of the Moon Kings flows in your veins. But they are coming for you. The Shadow Order knows the seal is broken."

Kalen stepped back. "I want no part in your ancient wars. I am a scholar, not a king."

"The moons do not care what you want," Lysandra replied, pointing a slender finger toward the sky. "The alignment is complete. Look."

Above, the crimson moon was fully eclipsed, casting a blood-red shroud over the world. The runes along the balcony floor flared to life in brilliant violet. The journey had begun.`,
      analysis: JSON.stringify({
        title: 'The Last Moon Heir',
        genre: 'Fantasy',
        themes: ['Legacy', 'Destiny', 'Magic', 'Eclipse'],
        mood: 'Mysterious',
        setting: 'An ancient, ruined stone observatory overlooking the glowing city of Veyra under twin moons.',
        characters: ['Kalen (a scholar and secret heir)', 'Lysandra (an Elder Mage)'],
        plot_summary: 'Kalen, a young scholar, discovers his royal magical lineage during a rare alignment of twin moons. Guided by the mysterious Lysandra, he must embrace his destiny before the Shadow Order hunts him down.',
        visual_keywords: ['blood moon', 'twin moons', 'ancient observatory', 'silver amulet', 'magic runes', 'misty mountains', 'glowing crystals', 'elder mage']
      }),
      views: 12400,
      likes: 2100
    },
    {
      id: 'story-2',
      title: 'Whispers in the Woods',
      author: 'Jane Thorne',
      genre: 'Mystery',
      text: `CHAPTER 1: The Missing Key

The grandfather clock in the hallway struck midnight, its heavy chimes echoing through the dusty corridors of Blackwood Manor.

Detective Marcus Vance lit his pipe, the dim glow illuminating the leather-bound journals scattered across the study desk. He was looking for a pattern.

Three weeks. Three wealthy patrons. All disappeared from their locked bedrooms.

The only clue left behind was a faint scent of pine needles and damp earth.

CHAPTER 2: Shadows Between the Trees

Marcus walked to the window, peering out into the dense forest that bordered the estate. The locals called it the Whispering Woods, claiming the trees shifted positions when no one was looking.

He had laughed at the folklore. But tonight, watching the fog roll in like a slow-moving tidal wave, he felt a prickle of unease.

Then, he saw it. A single lantern, flickering deep within the woods, moving in a slow, rhythmic circle.

CHAPTER 3: The Forest Sanctuary

Buttoning his heavy wool coat, Marcus ventured out. The air was freezing, and the canopy was so thick it blocked out all starlight.

The whispers began almost immediately. Not words, but a low hum, like a distant choir.

He followed the lantern light to a clearing. In the center stood an ancient oak, its roots wrapping around what looked like a stone altar. Resting on the altar was a tarnished brass key. The key to the manor's forgotten cellar.`,
      analysis: JSON.stringify({
        title: 'Whispers in the Woods',
        genre: 'Mystery',
        themes: ['Investigation', 'Folklore', 'Secrets', 'Supernatural'],
        mood: 'Suspenseful',
        setting: 'A creepy, fog-drenched ancient forest bordering a Victorian-era manor at midnight.',
        characters: ['Marcus Vance (a skeptical detective)'],
        plot_summary: 'Detective Marcus Vance investigates the mysterious disappearances of three manor patrons, leading him into the Whispering Woods where local legends of shifting trees and ancient rituals come alive.',
        visual_keywords: ['foggy woods', 'dark forest', 'old lantern', 'stone altar', 'mossy oak', 'victorian manor', 'shadowy figure', 'dense mist']
      }),
      views: 8700,
      likes: 1300
    },
    {
      id: 'story-3',
      title: 'Echoes of Tomorrow',
      author: 'Kaelen Miller',
      genre: 'Sci-Fi',
      text: `CHAPTER 1: The Core Pulse

The neon signs of Sector 4 cast a greasy blue reflection on the wet pavement.

Nyla adjusted her cybernetic visor, filtering out the ambient chatter of the crowded market. Her target was a rogue memory merchant named Jax.

"Signal's strong," her AI assistant, Echo, chirped directly into her auditory implant. "Two hundred meters. Alleyway behind the noodle stand."

She checked the power cells on her pulse-pistol. It was going to be a long night.

CHAPTER 2: Synthetic Memories

Nyla cornered Jax. He was a scrawny man, his arms covered in neural ports and copper wires.

"I don't have the drive, Nyla!" he stammered, raising his metallic hands in surrender. "The corporate enforcers took it. They know about the core pulse!"

"Where is it, Jax?" she pressed, her voice cold. "If they decrypt the drive, they'll wipe the consciousness of the entire lower city."

"The central archive," Jax whispered, his eyes darting frantically. "They took it to the High Spire."

CHAPTER 3: Scaling the Spire

The High Spire rose like a needle of chromium and glass, piercing the polluted clouds of the metropolis.

Nyla looked up from the shadows of the lower deck. The corporate guards were heavily armed, and security drones patrolled every level.

"Echo, disable the grid," she ordered.

"Disabling. You have forty-five seconds before the backup system triggers, Nyla. Make them count."

She leaped onto the automated cargo lift, her boots clinging to the magnetized rails as she ascended into the neon sky.`,
      analysis: JSON.stringify({
        title: 'Echoes of Tomorrow',
        genre: 'Sci-Fi',
        themes: ['Cybernetics', 'Corporations', 'Rebellion', 'AI'],
        mood: 'Futuristic',
        setting: 'A rain-slicked, neon-lit cyberpunk metropolis dominated by a towering glass and chrome spire.',
        characters: ['Nyla (a cybernetic rebel agent)', 'Echo (her AI assistant)', 'Jax (a nervous memory merchant)'],
        plot_summary: 'Rebel agent Nyla must scale the heavily guarded High Spire to recover a memory drive before a ruthless corporation wipes the minds of the lower-city population.',
        visual_keywords: ['cyberpunk city', 'neon lights', 'rainy streets', 'futuristic spire', 'drones', 'holograms', 'cybernetic implants', 'lasers']
      }),
      views: 15200,
      likes: 2800
    },
    {
      id: 'story-4',
      title: 'Letters We Never Sent',
      author: 'Sophia Vance',
      genre: 'Romance',
      text: `CHAPTER 1: The Attic Trunk

The afternoon sun streamed through the attic window, illuminating dust motes dancing in the quiet air.

Clara wiped away the cobwebs from the old leather trunk in the corner. It belonged to her grandmother, Evelyn.

Inside, wrapped in a faded blue ribbon, lay a stack of letters. The paper was yellowed and brittle, but the elegant handwriting was instantly recognizable.

They were all addressed to a man named Julian. None of them had postmarks.

CHAPTER 2: A Summer in Florence

"Florence, July 1954," Clara read aloud, tracing the ink with her finger.

"My dearest Julian, the Arno reflects the golden light of the setting sun, but it lacks the warmth of your smile..."

Clara sat on the dusty floorboards, completely engrossed. Evelyn had never mentioned Julian. To everyone's knowledge, she had married Clara's grandfather, Arthur, in 1956. Who was this man, and why were these letters hidden away?

CHAPTER 3: Finding Julian

Determined to uncover the mystery, Clara packed a small bag and set out for Italy.

Using the clues in the letters, she traced Evelyn's footsteps through the narrow cobblestone streets of Florence. A small art studio near the Ponte Vecchio, a quiet cafe where they used to drink espresso.

At the studio, she met an elderly painter with kind eyes. When Clara showed him a photo of her grandmother, the man's breath caught.

"Evelyn," he whispered. "You have her eyes. I am Julian."`,
      analysis: JSON.stringify({
        title: 'Letters We Never Sent',
        genre: 'Romance',
        themes: ['Regret', 'Florence', 'Discovery', 'Love'],
        mood: 'Melancholic',
        setting: 'A sunlit, dusty attic filled with antiques, transitioning to the historic cobblestone streets of Florence, Italy.',
        characters: ['Clara (a curious granddaughter)', 'Evelyn (her grandmother, in letters)', 'Julian (an elderly painter)'],
        plot_summary: 'Clara discovers a cache of unsent love letters written by her grandmother Evelyn, prompting her to travel to Florence and seek out the mysterious artist Evelyn left behind.',
        visual_keywords: ['old letters', 'vintage trunk', 'sunlit attic', 'florence streets', 'ponte vecchio', 'oil paintings', 'espresso cafe', 'romantic sunset']
      }),
      views: 9300,
      likes: 1600
    },
    {
      id: 'story-5',
      title: 'Shadows of the Past',
      author: 'Arthur Pendelton',
      genre: 'Horror',
      text: `CHAPTER 1: The Cold Corner

The heating was on full blast, but the temperature in the study continued to plunge.

Sarah watched her breath turn to mist as she huddled under her blanket. It always started in the corner, behind the old oak wardrobe.

First came the cold. Then, the smell of damp ash.

And finally, the scratching. Not from behind the wall, but from within the wood itself.

CHAPTER 2: The Wardrobe Mirror

Sarah stood in front of the wardrobe's full-length mirror. The antique glass was warped and discolored, showing a distorted reflection of her bedroom.

But as she watched, the reflection began to change.

The door behind her in the mirror was open. In reality, it was firmly shut.

From the open doorway in the reflection, a tall, spindly shadow began to creep toward her. She turned around quickly, but the room was empty. When she looked back at the glass, the shadow was standing right behind her.

CHAPTER 3: Locked In

Sarah ran for the bedroom door. She grabbed the brass handle and pulled, but it wouldn't budge. The key wouldn't turn.

Behind her, the wardrobe doors began to creak open on their own.

A thick, black liquid, smelling of ozone and rot, began to seep across the floorboards from the wardrobe's dark interior.

The lights flickered and died. In the pitch black, she heard a voice whisper her name, right next to her ear.`,
      analysis: JSON.stringify({
        title: 'Shadows of the Past',
        genre: 'Horror',
        themes: ['Haunting', 'Isolation', 'Possession', 'Mirror'],
        mood: 'Frightening',
        setting: 'A claustrophobic, dimly lit bedroom in an old house, dominated by an antique wardrobe with a warped mirror.',
        characters: ['Sarah (a terrified homeowner)'],
        plot_summary: 'Sarah is trapped in her bedroom by a malevolent entity that emerges from an antique wardrobe, communicating through a warped mirror before cutting off her escape.',
        visual_keywords: ['antique wardrobe', 'spooky mirror', 'shadow figure', 'dark bedroom', 'glowing eyes', 'creepy reflections', 'oozing liquid', 'foggy windows']
      }),
      views: 5600,
      likes: 980
    },
    {
      id: 'story-6',
      title: 'Beyond the Sky',
      author: 'Elena Rostova',
      genre: 'Adventure',
      text: `CHAPTER 1: The Airship Dock

The wind at ten thousand feet was relentless, tugging at the canvas sails of the Windrunner.

Captain Leo Vance stood on the wooden deck, adjusting his brass flight goggles. The sky was an endless ocean of blue, dotted with floating islands of quartz and moss.

"Engines to full, Mr. Gibbs!" Leo shouted over the roar of the steam turbines. "We need to clear the storm wall before dusk."

They were searching for the Sky Temple, a mythical sanctuary said to float at the edge of the stratosphere.

CHAPTER 2: The Storm Wall

The Windrunner plunged into the dark storm clouds. Lightning flashed in brilliant arcs, illuminating the giant sky-whales that swam through the tempest.

The ship creaked and groaned under the turbulence. Rain lashed the deck, freezing instantly on the rigging.

"Hold her steady!" Leo cried, grabbing the ship's wheel.

A massive bolt of lightning struck the main mast, sending a cascade of sparks over the crew. But they pushed through, emerging into the blinding light of a calm, golden sky.

CHAPTER 3: The Floating Sanctuary

There, resting on a massive cloud that glowed with inner golden light, stood the Sky Temple.

Its ivory pillars rose toward the heavens, and waterfalls cascaded from its floating gardens, disappearing into the mist below.

Leo docked the Windrunner on the temple's outer terrace. Stepping off the gangplank, he felt a strange lightness, as if the gravity of the earth had lost its grip.

In the center of the temple, resting on a pedestal of solid crystal, was the Aether Core. The key to saving his dying world.`,
      analysis: JSON.stringify({
        title: 'Beyond the Sky',
        genre: 'Adventure',
        themes: ['Exploration', 'Airships', 'Sky Islands', 'Discovery'],
        mood: 'Enchanting',
        setting: 'A wooden steampunk airship sailing through floating quartz islands and golden clouds at high altitude.',
        characters: ['Captain Leo Vance (an adventurous captain)', 'Mr. Gibbs (his loyal engineer)'],
        plot_summary: 'Captain Leo Vance steers his steampunk airship through a dangerous storm wall to locate the legendary floating Sky Temple and retrieve the Aether Core.',
        visual_keywords: ['steampunk airship', 'floating islands', 'golden clouds', 'sky temple', 'ivory pillars', 'waterfalls', 'aether core', 'flight goggles']
      }),
      views: 11100,
      likes: 2300
    }
  ];

  mockStories.forEach(s => {
    insertStory.run(
      s.id,
      s.title,
      s.author,
      s.genre,
      s.text,
      'complete',
      s.analysis,
      getPlaceholderCover(s.title, s.genre),
      getPlaceholderBg(s.title),
      null, // music_url starts null
      s.views,
      s.likes,
      Date.now()
    );
  });
}

export default db;
