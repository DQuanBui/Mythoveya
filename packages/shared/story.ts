// Spoken scenes for the Riftgate chapters: an intro before the first stage
// and an outro after the boss is first calmed. Speakers are village NPC ids
// (see NPCS in town.ts) or "boss" for the chapter's guardian.
export type StoryLine = { speaker: string; text: string };
export type ChapterStory = { intro: StoryLine[]; outro: StoryLine[] };

export const CHAPTER_STORY: Record<string, ChapterStory> = {
  c1: {
    intro: [
      { speaker: "liora", text: "The Riftgate has opened onto the Oldleaf woods. Listen: the trees are groaning." },
      { speaker: "tali", text: "Every creature in that grove is on edge. Something is calling them to fight." },
      { speaker: "boss", text: "Leave my roots, keeper. The song beneath the woods tells me you are the danger." },
      { speaker: "liora", text: "Calm it, don't break it. Show the grove that your six fight to protect, not to take." },
    ],
    outro: [
      { speaker: "boss", text: "The song has gone quiet... You did not strike to wound. Perhaps I listened to the wrong voice." },
      { speaker: "oren", text: "I've written it down: the call came from deeper in the rift. And the ground grew warm as Briarhart fell asleep." },
      { speaker: "liora", text: "Warm? Then the canyon is next. Rest your companions, keeper. You've earned it." },
    ],
  },
  c2: {
    intro: [
      { speaker: "oren", text: "Emberglass is cracking open. My field notes say the rift is widening right under the canyon floor." },
      { speaker: "bram", text: "Fire hits hard and fast. Keep a Tide companion close and watch your team's health." },
      { speaker: "boss", text: "The fissure is mine. Its heat is the first warmth I've felt in an age. Turn back." },
    ],
    outro: [
      { speaker: "boss", text: "Your companions stood in my fire and did not flee. Go on, then. The crack will cool." },
      { speaker: "oren", text: "Look at the steam. It's rising into the sky, not out to sea. The clouds are drinking the canyon." },
      { speaker: "sella", text: "The shrine felt that. Your bonds are growing stronger, keeper. I can see it in their eyes." },
    ],
  },
  c3: {
    intro: [
      { speaker: "tali", text: "It's raining upward around the floating isles. The Tide creatures can't find their way home." },
      { speaker: "pip", text: "My ferry's grounded until this storm clears. Bad for business, worse for the fish!" },
      { speaker: "boss", text: "The sky-sea answers me now. Every wave I raise is a wall between your islands." },
    ],
    outro: [
      { speaker: "boss", text: "The water falls where it should again. I mistook the rift's pull for my own strength." },
      { speaker: "tali", text: "The schools are coming back to the lagoon. Thank you, keeper. Truly." },
      { speaker: "liora", text: "But the waystones in Moonfrost have gone silent. Something up north is singing them to sleep." },
    ],
  },
  c4: {
    intro: [
      { speaker: "wren", text: "Frost on my seedlings, in summer! And there's a tune on the wind I can't stop humming." },
      { speaker: "oren", text: "Each waystone it touches freezes solid. If they all go quiet, the reaches drift apart." },
      { speaker: "boss", text: "Hush now, keeper. Stay and listen. In the cold, nothing ever has to change." },
    ],
    outro: [
      { speaker: "boss", text: "Your companions sang back to me... so many warm voices. I had forgotten how they sounded." },
      { speaker: "oren", text: "The waystones are thawing. And every one of them points the same way: into the heart of the rift." },
      { speaker: "liora", text: "Then that is where this ends. Gather your strongest six, keeper." },
    ],
  },
  c5: {
    intro: [
      { speaker: "liora", text: "Every path led here. The shadow that tore the rift open has been calling all along." },
      { speaker: "kael", text: "I've watched you in the arena. You don't panic. Bring that calm with you." },
      { speaker: "boss", text: "Grove, flame, tide and frost bent to my call. Why do you alone refuse to listen?" },
      { speaker: "sella", text: "Because a keeper listens to their companions first. Go, and come home safe." },
    ],
    outro: [
      { speaker: "boss", text: "Unbound... and alone. I only wanted the reaches to feel as torn as I did." },
      { speaker: "liora", text: "The rift is closing. You did it, keeper. Havenreach will remember this day." },
      { speaker: "oren", text: "Wait. As the rift settled, something rose from the deep sky-water. A library?" },
    ],
  },
  c6: {
    intro: [
      { speaker: "oren", text: "The Sunken Archive! The first Riftkeepers wrote everything down, and it's been underwater for centuries." },
      { speaker: "sella", text: "Be gentle. An old place like that will have an old guardian." },
      { speaker: "boss", text: "These pages are not for visitors. The first keepers sealed them for a reason." },
    ],
    outro: [
      { speaker: "boss", text: "You fight like they did: protecting your companions before yourself. Read, then. Carefully." },
      { speaker: "oren", text: "Maps! These show a forge at the top of the world, where the islands were first shaped." },
      { speaker: "bram", text: "The Skyforge. If the maps are right, that climb will test everything your team has learned." },
    ],
  },
  c7: {
    intro: [
      { speaker: "bram", text: "Storms hammer those peaks day and night. Level up, upgrade your gear, then climb." },
      { speaker: "pip", text: "I sold out of storm cloaks in an hour. Everyone wants to see the Skyforge now!" },
      { speaker: "boss", text: "The anvil shapes the sky. I have kept it ringing since the first island was forged." },
    ],
    outro: [
      { speaker: "boss", text: "Your bond rings truer than my anvil. Climb on. The one you seek is waiting above the clouds." },
      { speaker: "oren", text: "Above the clouds? The archive called it the Starlit Throne. A companion left behind." },
      { speaker: "liora", text: "The first Riftkeeper's companion... still keeping watch, after a thousand years." },
    ],
  },
  c8: {
    intro: [
      { speaker: "liora", text: "This is as high as anyone has ever climbed. Whatever happens, Havenreach is proud of you." },
      { speaker: "sella", text: "A companion that waited a thousand years for its keeper... I hope it isn't too lonely to listen." },
      { speaker: "boss", text: "Another keeper. Every one before you left. Show me your bond, and I will judge if it lasts." },
    ],
    outro: [
      { speaker: "boss", text: "Your companions would follow you anywhere. So did I, once. I can rest now; the reaches are in kind hands." },
      { speaker: "liora", text: "The light over every island is brighter tonight. Welcome home, Riftkeeper." },
      { speaker: "kael", text: "And when you're rested, the arena is waiting. Legends still have to keep their edge!" },
    ],
  },
};
