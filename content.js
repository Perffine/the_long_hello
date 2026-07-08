// THE LONG HELLO — content.js
// All text and tuning lives here. The engine (engine.js) never contains prose.
// Register: all lowercase except the inscription, the ticker, and headers.

"use strict";

// ---------------------------------------------------------------- tuning ---
const TUNING = {
  stillMs: 3000,           // input-free ms before presence accrual (re)starts
  presencePerSec: 0.25,    // 1 presence per 4 seconds of stillness
  parkSitCapSec: 90,       // max accrued stillness per park sit
  wardSitCapSec: 60,       // max accrued stillness per ward sit
  wardSitCountsAt: 3,      // presence accrued before a ward sit "counts"

  humNight: 21,            // hum discoverable from this night
  humPresenceEgg: 45,      // ...and this much cumulative egg presence
  humUnbrokenSec: 40,      // ...during this much unbroken stillness

  msgPresenceEgg: 220,     // second message: cumulative egg presence
  msgVisitsEgg: 8,         // second message: minimum egg visits
  msgCleanVisits: 5,       // second message: last N visits with zero demands
  msgPatientsSat: 4,       // second message: distinct patients sat with
  msgUnbrokenSec: 45,      // second message: unbroken stillness in this sit

  lineDelayBase: 480,      // ms between log lines (plus a little per length)
  lineDelayPerChar: 6,
  lineDelayMax: 950,
  ceremonyDelay: 5000,     // ms between lines in ceremonial scenes
  scriptedSitDelay: 6000,  // ms between lines in the scripted sits

  tickerPeriodMs: 45000,
  titleStillMs: 60000,

  easeStart: 20,
  easeDriftAfterNight: 20, // +1 per night passed, after this night
};

// nights on which it rains (touch-in-rain reward)
const RAIN_NIGHTS = { 7: true, 12: true, 21: true, 43: true, sp3: true };

// ------------------------------------------------------------- structure ---
// One entry per playable loop. `n` is the night number (act III gets rough
// equivalents so night-gated logic keeps working). `gap` prints before the
// loop begins. Act III entries carry seasonal labels.
const LOOPS = [
  { id: 1,  n: 1,  label: "NIGHT 1" },
  { id: 2,  n: 2,  label: "NIGHT 2" },
  { id: 3,  n: 3,  label: "NIGHT 3" },
  { id: 4,  n: 4,  label: "NIGHT 4" },
  { id: 5,  n: 5,  label: "NIGHT 5" },
  { id: 6,  n: 6,  label: "NIGHT 6" },
  { id: 7,  n: 7,  label: "NIGHT 7" },
  { id: 8,  n: 8,  label: "NIGHT 8" },
  { id: 9,  n: 9,  label: "NIGHT 9" },
  { id: 10, n: 10, label: "NIGHT 10" },
  { id: 11, n: 11, label: "NIGHT 11" },
  { id: 12, n: 12, label: "NIGHT 12" },
  { id: 13, n: 13, label: "NIGHT 13" },
  { id: 14, n: 14, label: "NIGHT 14" },
  { id: 17, n: 17, label: "NIGHT 17", gap: "three nights pass." },
  { id: 21, n: 21, label: "NIGHT 21", gap: "four nights pass." },
  { id: 25, n: 25, label: "NIGHT 25", gap: "the nights run together." },
  { id: 30, n: 30, label: "NIGHT 30", gap: "a week passes." },
  { id: 36, n: 36, label: "NIGHT 36", gap: "a week passes. it does that now." },
  { id: 43, n: 43, label: "NIGHT 43", gap: "a week passes." },
  { id: 50, n: 50, label: "NIGHT 50", gap: "a week. another." },
  { id: 60, n: 60, label: "NIGHT 60", gap: "weeks pass." },
  { id: "wi1", n: 75,  label: "WINTER, YEAR 1",  gap: "the weeks pass. winter comes early that year." },
  { id: "sp2", n: 200, label: "SPRING, YEAR 2",  gap: "the season turns." },
  { id: "su2", n: 290, label: "SUMMER, YEAR 2",  gap: "the season turns." },
  { id: "au2", n: 380, label: "AUTUMN, YEAR 2",  gap: "the season turns." },
  { id: "wi2", n: 470, label: "WINTER, YEAR 2",  gap: "the season turns." },
  { id: "sp3", n: 560, label: "SPRING, YEAR 3",  gap: "the season turns." },
  { id: "au3", n: 740, label: "AUTUMN, YEAR 3",  gap: "the seasons turn. you stop counting." },
  { id: "sp4", n: 920, label: "SPRING, YEAR 4",  gap: "winter. then, the way it does, all at once:" },
];

// -------------------------------------------------------------- patients ---
const PATIENTS = {
  okafor: { pn: "he" },
  edith:  { pn: "she" },
  marisol:{ pn: "she" },
  dee:    { pn: "she" },
  joan:   { pn: "she" },
  quiet:  { pn: "he" },
};

// ------------------------------------------------------------------ ward ---
// Step types the engine understands:
//   { say: [lines] }
//   { choice: { options: [{ label, say: [lines], ease?: n }] } }
//   { menu: { sitLabel, patient, scripted?: key, pre: [lines], post: [lines] } }
//     — offers: sit / check the charts / finish the rounds
//   { menu: { noSit: true } } — charts / finish only
const WARD = {
  1: [
    { say: [
      "the ward is quiet.",
      "the strip light in the corridor is failing again. it beats like a slow pulse.",
      "mr. okafor is awake.",
    ]},
    { menu: { sitLabel: "sit with him", patient: "okafor", scripted: "night1",
      post: ["he sleeps. you stay a while anyway."], mustSit: true } },
  ],
  2: [
    { say: [
      "mr. okafor is awake. he has his glasses on. there is nothing to read.",
      "\"thirty-one years i taught geography,\" he says. \"capitals. rivers. i can still do every capital.\"",
      "\"do you think we're alone? i always hoped.\"",
    ]},
    { choice: { options: [
      { label: "\"i hope not.\"",
        say: ["he nods, slowly, like a man marking an answer half right."] },
      { label: "say nothing",
        say: ["he looks at you for a long time.", "\"yes,\" he says. \"me too.\""], ease: 1 },
    ]}},
    { menu: { sitLabel: "sit with him", patient: "okafor",
      pre: ["you pull the chair closer. he doesn't open his eyes. he knows the sound of that chair."],
      post: ["his breathing settles into something like rest."] } },
  ],
  3: [
    { say: [
      "mr. okafor is asleep. his breathing has changed.",
      "you know this music.",
    ]},
    { menu: { sitLabel: "sit with him", patient: "okafor",
      pre: ["you sit. his lips are moving. you don't lean in.", "some things aren't yours."],
      post: ["at six, his daughter arrives with coffee she won't drink. you give her the chair."] } },
  ],
  4: [
    { say: [
      "mr. okafor's bed is empty. the window is open. someone has opened it on purpose.",
      "the bed is made by nine. by ten there will be a new name on the door. that is the job.",
      "the ward manager wants everyone to watch a briefing about \"the objects.\" nobody watches it.",
      "mrs. b in room four needs turning. you turn her.",
    ], death: "okafor" },
    { menu: { noSit: true } },
  ],
  5: [
    { say: [
      "the new name on mr. okafor's door is edith.",
      "edith is ninety-one. she looks at you the way a hawk looks at weather.",
      "\"you're the night one,\" she says. \"good. the day ones hover.\"",
    ]},
    { menu: { sitLabel: "sit with her", patient: "edith",
      pre: ["you take the chair. she pretends not to notice. she notices everything."],
      post: ["\"you'll do,\" she says, to the ceiling."] } },
  ],
  6: [
    { say: [
      "edith, on the news: \"in my day the sky minded its own business.\"",
      "she says it like a joke. she watches you to see if it lands like one.",
    ]},
    { choice: { options: [
      { label: "laugh",
        say: ["\"good,\" she says. \"someone here has sense.\""], ease: 1 },
      { label: "say nothing",
        say: ["she snorts. \"tough crowd.\""] },
    ]}},
    { menu: { sitLabel: "sit with her", patient: "edith",
      pre: ["you sit. she deals imaginary cards on the blanket, an old habit with nowhere to go."],
      post: ["\"same time tomorrow,\" she says, like she's doing you the favor."] } },
  ],
  7: [
    { say: [
      "edith's hands work at the hem of the blanket, pleating it, letting it go.",
      "\"i had four sisters,\" she says. \"i'm the last one holding the thread.\"",
    ]},
    { menu: { sitLabel: "sit with her", patient: "edith",
      pre: ["you sit where she can see you without turning her head."],
      post: ["her hands go quiet on the blanket, one on top of the other."] } },
  ],
  8: [
    { say: [
      "edith is tired tonight. the hawk is folded down to something smaller.",
      "\"sit where i can see you,\" she says. \"don't fuss.\"",
    ]},
    { menu: { sitLabel: "sit with her", patient: "edith",
      pre: ["you sit where she can see you. you don't fuss."],
      post: ["\"there,\" she says, as if something has been settled."] } },
  ],
  9: [
    { say: [
      "edith's bed has been stripped. the sheets are very white.",
      "the thread, let go.",
      "the corridor light has been fixed. it is worse, somehow, steady.",
    ], death: "edith" },
    { menu: { noSit: true } },
  ],
  10: [
    { say: [
      "the new name is marisol. she is fifty-four. the room smells of the lilies her sister brings.",
      "she shows you a photograph of a boy on a bicycle.",
      "\"my son. he's camping out at one of them, him and half the city.\"",
      "\"he was going to be an engineer,\" she says, as if the two facts argue.",
    ]},
    { menu: { sitLabel: "sit with her", patient: "marisol",
      pre: ["you sit. she holds the photograph face-down on the blanket, keeping it warm."],
      post: ["she is asleep before the hour turns."] } },
  ],
  11: [
    { say: [
      "marisol can't sleep. she talks about her garden. the slugs. the war on the slugs.",
      "\"you can't win,\" she says, happily.",
    ]},
    { menu: { sitLabel: "sit with her", patient: "marisol",
      pre: ["you sit and hear about the year the foxes got in. a good year, by the sound of it."],
      post: ["\"anyway,\" she says. \"anyway.\" and sleeps."] } },
  ],
  12: [
    { say: [
      "marisol's son came at last. you see the bicycle boy in the face of a grown man asleep in the chair.",
      "she watches him sleep. you check her drip quietly, so as not to wake either of them.",
      "the chair is taken tonight. good.",
    ]},
    { menu: { noSit: true } },
  ],
  13: [
    { say: [
      "marisol asks you to open the window. \"i want to hear the rain.\"",
      "it isn't raining.",
      "you open it. she listens to the rain that isn't there.",
      "\"there it is,\" she says.",
    ]},
    { menu: { sitLabel: "sit with her", patient: "marisol",
      pre: ["you sit by the open window. the not-rain falls and falls."],
      post: ["her son comes at midnight. you leave them the room."] } },
  ],
  14: [
    { say: [
      "marisol's bed is empty. the window is open. you left it that way.",
      "the lilies are still there. someone should take them home.",
      "you take them home.",
    ], death: "marisol" },
    { menu: { noSit: true } },
  ],
  17: [
    { say: [
      "there is a new name: dee. dee is twenty-six.",
      "dee wants a different room. a different window. a different jello. a different body.",
      "the anger is doing a job. you know what job.",
      "\"and get me a proper pillow,\" she says. \"these are bricks.\"",
    ]},
    { choice: { options: [
      { label: "bring her the pillow from the empty bed",
        say: ["\"it's the same,\" she says.", "it is. she keeps it."], ease: 1 },
      { label: "tell her they're all the same",
        say: ["\"then what good are you,\" she says, and turns to the window."] },
    ]}},
    { say: ["dee wants the door closed. you close it."] },
    { menu: { noSit: true } },
  ],
  21: [
    { say: [
      "dee has a list tonight. she reads it out. doctors, foods, gods, weather. everything is on it.",
      "\"and you,\" she adds, not looking up.",
    ]},
    { choice: { options: [
      { label: "\"fair.\"",
        say: ["she almost smiles. it costs her something. she pays it."] },
      { label: "say nothing",
        say: ["she looks up to see if you're wounded. you're not. she goes back to the list."] },
    ]}},
    { menu: { noSit: true } },
  ],
  25: [
    { say: [
      "dee's mother visited. the room still rings with it.",
      "\"she wants me to fight,\" dee says. \"everyone wants me to fight. like i'm losing on purpose.\"",
    ]},
    { menu: { sitLabel: "pull up the chair", patient: "dee",
      pre: ["you don't answer. you pull up the chair."],
      post: ["\"you're still here,\" she says. it is almost an accusation. it is almost thanks."] } },
  ],
  30: [
    { say: [
      "dee is small tonight. the list is gone.",
      "\"can you just sit,\" she says. \"not do anything. don't even talk. just sit.\"",
    ]},
    { menu: { sitLabel: "sit with her", patient: "dee", scripted: "dee30",
      post: ["\"okay,\" she says, finally. \"okay.\""], mustSit: true } },
  ],
  36: [
    { say: [
      "dee's bed is empty.",
      "on the pillow — the one you brought her — a note in biro: \"thanks for nothing.\"",
      "and underneath, smaller: \"i mean it. the nothing. thanks.\"",
    ], death: "dee" },
    { say: [
      "the new name is joan. joan is knitting.",
      "\"i'm doing the staff in order of kindness,\" she says. \"you're next but one.\"",
    ]},
    { menu: { sitLabel: "sit with her", patient: "joan",
      pre: ["you sit. the needles keep time. it is a very good clock."],
      post: ["\"next but one,\" she says again, and counts a row."] } },
  ],
  43: [
    { say: [
      "joan's hands don't stop. wool the color of good tea.",
      "\"my husband never sat still either,\" she says. \"i knit, he paced. forty years we wore out one carpet between us.\"",
    ]},
    { menu: { sitLabel: "sit with her", patient: "joan",
      pre: ["you sit. row by row, something grows out of nothing. it's a trick you never tire of."],
      post: ["she measures it against her arm, frowns, unravels an inch, is happy."] } },
  ],
  50: [
    { say: [
      "joan has finished something small. she holds it up: a hat. sized for nothing human.",
      "\"for the egg,\" she says. \"for winter. don't laugh.\"",
      "you don't laugh.",
    ], give: "hat" },
    { menu: { sitLabel: "sit with her", patient: "joan",
      pre: ["you sit, turning the little hat over in your hands. it is very well made."],
      post: ["\"go on home,\" she says. \"some of us have knitting.\""] } },
  ],
  60: [
    { say: [
      "joan's bed is empty.",
      "on your locker, wrapped in tissue: mittens. a note: \"you were first, really. don't tell.\"",
    ], death: "joan" },
    { menu: { noSit: true } },
  ],
  wi1: [
    { say: [
      "the ward gets its winter cough. extra blankets. the radiators tick like slow clocks.",
      "new names come and go on the doors. you are gentle with all of them.",
    ]},
    { menu: { noSit: true } },
  ],
  sp2: [
    { say: [
      "a woman in room two keeps her curtains open all night.",
      "\"i paid for the sky,\" she says.",
      "fair.",
    ]},
    { menu: { noSit: true } },
  ],
  su2: [
    { say: [
      "the ward in summer: fans, ice chips, the smell of cut grass through the one good window.",
    ]},
    { menu: { noSit: true } },
  ],
  au2: [
    { say: [
      "a man in room six shows you card tricks with hands that shake.",
      "the trick still works. maybe better.",
    ]},
    { menu: { noSit: true } },
  ],
  wi2: [
    { say: [
      "there is a man in room four with no visitors and no name anyone uses. the quiet man.",
      "he watches the door. when you come in, he watches you. that is all the conversation there is.",
    ]},
    { menu: { sitLabel: "sit with him", patient: "quiet",
      pre: ["you sit. he watches you a while. then he watches the window.", "the two of you divide the room's work between you."],
      post: ["when you stand to go, he has already gone back to the door."] } },
  ],
  sp3: [
    { say: [
      "the quiet man is thinner. the window is doing most of the talking tonight: rain, a gull, rain again.",
    ]},
    { menu: { sitLabel: "sit with him", patient: "quiet",
      pre: ["he moves two fingers on the blanket, a small wave, like dealing a card. you sit."],
      post: ["rain, a gull, rain again."] } },
  ],
  au3: [
    { say: [
      "the quiet man's breathing has changed.",
      "you know this music by now.",
    ]},
    { menu: { sitLabel: "sit with him", patient: "quiet",
      pre: ["you sit. the machines tick. he doesn't need you to say anything."],
      post: ["minutes pass.", "at the door you look back. he is watching the window. the window is doing fine."] } },
  ],
  sp4: [
    { say: [
      "the quiet man's bed is empty. you open the window yourself. it's what you do now.",
    ], death: "quiet" },
  ],
};

// scripted sits (the game takes the controls away; that is the point)
const SCRIPTED_SITS = {
  night1: [
    "you sit.",
    "the machines tick.",
    "he doesn't need you to say anything.",
    "minutes pass.",
  ],
  dee30: [
    "you sit.",
    "the ward hums its one note.",
    "her hand finds the edge of your sleeve. not holding. just touching.",
    "minutes pass.",
  ],
};

// generic ward flavor, rotated by `check the charts`
const CHART_LINES = [
  "the charts say what the charts said an hour ago. you initial them.",
  "obs done. meds done. the corridor light does its slow morse.",
  "someone has filled in the crossword in the staff room. all of it. in pen.",
  "the vending machine hums its one song.",
  "tea. the mug with the chipped rim. yours by treaty.",
  "you straighten a stack of leaflets nobody has ever taken.",
];

const WARD_END = "the shift is over.";
const WARD_CHARTS = "check the charts";
const WARD_FINISH = "finish the rounds";
const WARD_GET_UP = "slip out";
const WARD_SIT_END = "a bell down the hall. the ward wants you back.";

// keypress deflections while sitting (pronoun-aware first entry)
const WARD_DEFLECTIONS = [
  "{pn} stirs.",
  "the drip clicks.",
  "a trolley passes in the corridor.",
  "someone coughs, two rooms down.",
  "the strip light flickers its old code.",
];
const PARK_DEFLECTIONS = [
  "a jogger passes.",
  "the moment thins.",
  "a dog noses the bench leg, moves on.",
  "wind moves the canal trees.",
  "a bicycle bell, far off.",
];

// ------------------------------------------------------------------ walk ---
const WALK = {
  default: ["the canal path. the water holds the streetlights flat."],
  rain: ["rain, thin as breath. the canal wears rings."],
  short: ["the canal path."],
  grief: ["the walk home is longer when someone has died.", "or you walk it slower. one of those."],
  keepWalking: "you keep walking.",
  arrival: {
    open: "the canal path. the water holds the streetlights flat.",
    something: "there is something in the park.",
    egg: [
      "        .------.",
      "      /          \\",
      "     |            |",
      "     |            |",
      "     |            |",
      "      \\          /",
      "        '------'",
    ],
    after: [
      "it stands in the grass like it has stood there always. taller than a door.",
      "the color of wet pewter.",
      "a crowd, at dawn, in coats over pyjamas. nobody talks above a murmur.",
      "police tape, already sagging.",
      "a helicopter circles. even it sounds unsure.",
    ],
    close: [
      "you stand with the crowd until the cold finds you.",
      "home. bed. the ceiling, for a long time.",
    ],
    tickerLine: "OBJECTS REPORTED IN — PARIS. LAGOS. CHENNAI. EVERYWHERE.",
  },
};

// ------------------------------------------------------------------ park ---
const PARK = {
  // ambient description on arrival, by stage
  ambient: {
    crowds: [
      "the tape is down already. nobody voted on this; it happened.",
      "the crowd has made itself a ring, at a distance nobody agreed out loud.",
      "a man is filming it, narrating quietly, as if it might overhear.",
    ],
    thinning: [
      "the crowd is thinner. a man sells coffee from a cart now.",
      "the cart has an egg painted on it already.",
    ],
    regulars: [
      "the regulars now. the dog man. the two nurses from st. anne's — the other shift.",
      "nods all round. the coffee cart man knows your order.",
    ],
    wi1: [
      "winter has the park to itself.",
      "the egg wears the cold like it wears everything: without comment.",
      "the bench is yours.",
    ],
    sp2: [
      "crocuses at the base. someone planted them. or no one did. either way.",
      "the egg. the bench. the canal.",
    ],
    su2: [
      "an old man does tai chi by the water now, mornings. slow as the canal.",
      "the egg. the bench. the canal.",
    ],
    au2: [
      "the egg. the bench. leaves.",
    ],
    wi2: [
      "the egg. the bench. frost.",
    ],
    sp3: [
      "the egg. the bench. the canal.",
    ],
    au3: [
      "the egg. the bench. the canal.",
    ],
  },
  benchArrives: "someone has dragged a bench nearer to it. municipal. possibly stolen. nobody minds.",

  look: "it is the color of wet pewter. there is no seam on it anywhere.",

  circleFirst: [
    "you step over the flattened grass and walk.",
    "the words wrap the whole waist of it. you have to walk to read them.",
  ],
  inscription: [
    "WE WISH YOU TO KNOW",
    "THAT YOU ARE NOT ALONE IN THE UNIVERSE",
    "AND WE MEAN NO HARM.",
  ],
  circleFirstEnd: [
    "then again, in other letters. all the way around. the same.",
    "you come back to where you started.",
  ],
  circleAgain: ["you walk around it. the words keep their place."],
  circleCrocus: [
    "you notice the crocuses at the base — wait.",
    "there are no crocuses yet.",
    "there is nothing at the base but frost.",
  ],

  touch: "you touch it. it is warm.",
  touchWarm: "blood-warm. the temperature of a held hand.",
  touchAttention: "somewhere under your palm: attention.",
  touchRain: "the rain does not bead on it the way it should.",

  ask: [
    ["you ask it what it wants.", "the metal says nothing.", "it is not a refusal. it is patience."],
    ["you ask it why here.", "the warm says nothing back."],
    ["you ask it how long.", "nothing. the same nothing."],
  ],

  sitDown: "you sit on the bench.",
  sitCap: "the cold gets into your coat. time to go.",
  sitCapAgain: "the cold is in your coat now. tomorrow is also a day.",
  getUp: "get up",

  hum: [
    "not a sound. a feeling in the teeth.",
    "the way a cathedral hums after the organ has stopped.",
  ],

  widow: [
    "a woman stands close to it. closer than people stand.",
    "she is talking, low. you catch one word: a name.",
    "she presses something small to the metal, holds it there, and sets it down at the base.",
    "she walks past you. \"forty years,\" she says, as if you'd asked. \"he'd have loved this thing.\"",
    "at the base, catching the streetlight: a ring.",
  ],
  widowChoice: [
    { label: "walk her to the gate",
      say: ["you walk her to the gate. she talks about him. you listen.", "it costs nothing. it isn't nothing."], ease: 2 },
    { label: "let her be",
      say: ["she goes. her footsteps are even. some griefs walk well."] },
  ],

  grief: [
    "you come to it the way you come off a bad shift: emptied.",
    "you put your hand on it without deciding to.",
    "warm. of course. it is always warm.",
    "you stand there a while. nobody asks you anything.",
    "neither does it.",
  ],

  stranger: [
    "a man at the ring of grass turns to you. \"is it warm?\" he asks.",
    "he hasn't touched it. lots of them haven't. as if it needs an appointment.",
  ],
  strangerChoice: [
    { label: "\"yes. like a hand.\"",
      say: ["he looks at it a long moment. then he goes and touches it.", "so does the woman behind him. and her daughter."], ease: 2 },
    { label: "shrug",
      say: ["he nods, embarrassed, and puts his hands in his pockets."] },
  ],

  film: [
    "your phone is in your hand before you notice deciding.",
    "everyone else's is up already, a little congregation of screens.",
  ],
  filmChoice: [
    { label: "film it",
      say: ["you film it. forty seconds. it does what it does, which is nothing.", "you never watch the video."] },
    { label: "put the phone away",
      say: ["you put the phone away.", "the egg looks better at first hand. most things do."], ease: 2 },
  ],

  leaveIntro: "what you have is what you have:",
  leaveOptions: [
    { id: "coffee", label: "the coffee from the cart",
      say: ["you set the cup down at the base, where the ring was.", "steam climbs the pewter and vanishes.", "it looks small. everything does, next to it."] },
    { id: "button", label: "a button from your coat",
      say: ["you set it down at the base, where the ring was.", "it looks small. everything does, next to it."] },
    { id: "hat", label: "the small hat", needsFlag: "hasHat",
      say: ["you fit the little hat to the top of it. it takes some reaching.", "it fits. joan would be furious with pride.", "it looks small. everything does, next to it. it stays."] },
    { id: "write", label: "write something",
      say: ["you crouch and write it on the luggage tag someone left tied to the bench. one line:"],
      after: ["you tie it back. the wind reads it first."] },
  ],
  leaveGone: [
    "the thing you left is gone.",
    "taken by weather, or a thief, or — you like to think — accepted.",
  ],
  hatWindowsill: "joan's hat lives on your windowsill. it fits the kettle, near enough.",

  dusk: [
    "the park at dusk is a different country.",
    "the egg holds the last light longer than the sky does, the way a stone holds noon.",
    "the streetlamps come on. it ignores them beautifully.",
    "you put your hand on it. warm. the same warm. day shift, night shift, no shift.",
    "you go home the long way. bed argues. bed wins.",
  ],

  secondMessage: [
    "a second band of words rises under the first,",
    "the way frost grows on a window from the inside.",
    "it does not pass through language at all.",
    "",
    "THANK YOU FOR NOT FLINCHING.",
    "THERE IS NO HURRY.",
    "WE HAVE ALL THE TIME YOU NEED.",
    "",
    "then it fades.",
    "you will never see it again.",
  ],
  secondMessageFrostFrom: 4, // index where frost styling starts
  secondMessageFrostTo: 6,
  afterMessage: "you walk home without noticing the walk.",
  scum: "it is warm. once is all anyone gets.",

  home: "walk home",
  verbs: {
    look: "look at it",
    circle: "walk around it",
    touch: "touch it",
    ask: "ask it",
    sit: "sit on the bench",
    leave: "leave something",
  },
};

// ------------------------------------------------------------------ flat ---
const FLAT = {
  act1: ["the flat: the kettle. the window. the bed."],
  act2: ["the kettle. the window. the bed."],
  act3: ["the kettle. the bed."],
  heavy: [
    "you don't remember the stairs.",
    "the kettle boils. you forget the tea. you boil it again.",
  ],
  window: {
    act1: ["the city from four floors up.", "you can't see the park from here. you know exactly where it is anyway."],
    act2: ["rooftops. aerials. somewhere under all of it, a warmth in a park."],
    act3: ["the city gets on with it. so does the sky."],
  },
  sleep: "sleep",
  lookOut: "look out the window",
  stayUp: "stay up",
  stayUpLines: ["you don't sleep. you shouldn't do this.", "you do it anyway."],
  sleepLines: {
    act1: "sleep comes like a tide: eventually, then all at once.",
    act2: "sleep.",
    act3: "sleep.",
  },
};

// nights on which `stay up` is offered (once ever, after night 6)
const STAY_UP_NIGHTS = { 8: true, 12: true, 17: true, 25: true };

// ---------------------------------------------------------------- ticker ---
// gated by minimum night `n`; delivered in order, then rotated.
const TICKER = [
  { n: 4,  t: "OBJECTS NOW CONFIRMED ON SIX CONTINENTS. COUNT UNKNOWN." },
  { n: 4,  t: "NO TWO ACCOUNTS OF THE ARRIVAL AGREE. MOST WITNESSES REPORT: \"IT WAS JUST THERE.\"" },
  { n: 5,  t: "ESTIMATE REVISED: 400,000. NOT ONE IN A ROADWAY." },
  { n: 5,  t: "EVERY OBJECT CARRIES THE SAME INSCRIPTION, IN THE LANGUAGE OF WHERE IT STANDS." },
  { n: 6,  t: "\"IMPOSSIBLE TO FAKE\" — MATERIALS PANEL. HOAX THEORIES COLLAPSE." },
  { n: 6,  t: "SEISMOGRAPHS RECORDED NOTHING. THEY WERE NOT DROPPED. THEY WERE SET DOWN." },
  { n: 7,  t: "UN EMERGENCY SESSION ENTERS THIRD DAY. STATEMENT PROMISED. STATEMENT DELAYED." },
  { n: 7,  t: "TELESCOPE SALES UP FOUR THOUSAND PERCENT. SKY REPORTED UNCHANGED." },
  { n: 8,  t: "CROWDS DEMAND RESPONSE. OBJECTS SILENT." },
  { n: 8,  t: "CONTACT PROTOCOLS ATTEMPTED IN 21 COUNTRIES: MATHEMATICS. MUSIC. LIGHTS. NOTHING." },
  { n: 9,  t: "LEAKED FOOTAGE: SOLDIER FIRES ON OBJECT. ROUND VANISHES. NO RESPONSE." },
  { n: 10, t: "NO RETALIATION REPORTED ANYWHERE. ANALYSTS: \"THERE IS NO FLOOR.\"" },
  { n: 11, t: "DESERT FOOTAGE AUTHENTICATED: ORDNANCE TEST. OBJECT UNMOVED. SAND FUSED TO GLASS." },
  { n: 12, t: "MARKETS STEADY. \"AN EVENT WITH NO DEADLINE IS HARD TO PRICE.\"" },
  { n: 12, t: "PLACES OF WORSHIP REPORT RECORD ATTENDANCE. NO CONSENSUS REPORTED ON CONTENTS OF PRAYERS." },
  { n: 13, t: "\"EGG TOURS\" LAUNCH IN FOUR CITIES. CRITICS NOTE PROXIMITY IS FREE." },
  { n: 14, t: "OFFERINGS REPORTED AT OBJECT SITES: FLOWERS. LETTERS. A RING." },
  { n: 17, t: "GLOBAL SLEEP QUALITY IMPROVING, SAY RESEARCHERS. CAUSE UNCLEAR." },
  { n: 17, t: "THE QUESTION \"WHY HERE?\" ASKED IN EVERY LANGUAGE. ANSWERED IN NONE." },
  { n: 21, t: "FIRST WEDDING HELD \"BY THE EGG.\" THE WORD HAS STUCK." },
  { n: 21, t: "OFFICIALS PREFER \"THE OBJECTS.\" OFFICIALS ARE LOSING." },
  { n: 25, t: "TEENAGERS USING OBJECTS AS MEETING POINTS. PARENTS APPROVE OF THE LIGHTING." },
  { n: 25, t: "EGG MERCHANDISE MARKET COOLS. VENDOR: \"YOU CAN'T IMPROVE ON TOUCHING IT.\"" },
  { n: 30, t: "VIGIL CROWDS THIN. ORGANIZER: \"IT'S NOT OVER. IT'S JUST NOT NEWS.\"" },
  { n: 30, t: "STUDY: SURFACE TEMPERATURE CONSTANT IN ALL CLIMATES. \"HELD-HAND WARM,\" SAYS AUTHOR, THEN APOLOGIZES." },
  { n: 36, t: "ONE IN THREE CITY DWELLERS NOW PASSES AN OBJECT DAILY. MOST NO LONGER PHOTOGRAPH IT." },
  { n: 43, t: "LAGOS VIDEO PASSES ONE BILLION VIEWS: \"THEY'RE NOT WAITING FOR US TO FIGURE OUT THE MESSAGE. WE ARE THE MESSAGE.\"" },
  { n: 50, t: "LAGOS TEENAGER DECLINES ALL INTERVIEWS: \"I SAID IT ALREADY.\"" },
  { n: 60, t: "FIRST SNOW ON THE NORTHERN OBJECTS. THE PHOTOGRAPHS ARE THE WHOLE STORY." },
  { n: 75, t: "ONE YEAR ON: SCHOOLS REPORT CHILDREN \"SIMPLY USED TO THEM.\"" },
  { n: 200, t: "BIRDS NEST ON THE WARM ONES, ORNITHOLOGISTS CONFIRM. EARLIER BROODS. LOUDER SPRINGS." },
  { n: 290, t: "EGG COVERAGE MOVES TO WEATHER SEGMENT." },
];
// after this night the ticker is blank, and stays blank.
const TICKER_SILENT_AFTER = 290;

// ----------------------------------------------------------------- title ---
const TITLE = {
  name: "T H E   L O N G   H E L L O",
  begin: "begin",
  resume: "continue",
  again: "begin again",
  noHurry: "there is no hurry.",
  cabinet: "this cabinet forgets. finish your visit.",
};

// ---------------------------------------------------------------- ending ---
const ENDING = {
  walk: [
    "spring. the canal path. you have walked this walk two thousand times.",
    "the water still holds the light flat. some things hold.",
  ],
  park: [
    "the tai chi man is there, early, moving like weather.",
    "crocuses at the base, thick this year. someone must add bulbs every autumn.",
    "or no one does.",
  ],
  sit: [
    "you sit on the bench.",
    "the bench knows your shape.",
    "the canal. a gull.",
    "the hum you know is there whether you can feel it or not.",
  ],
  intimate: "you know what it would say.",
  distant: "you never did touch it for long. it stands there anyway. patient as weather.",
  epilogue: "somewhere out past everything, the long hello continues.",
  titleCallback: "there was never any hurry.",
};
