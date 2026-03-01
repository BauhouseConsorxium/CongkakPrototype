// 5x7 bitmap font for OLED LCD simulator
// Each character: array of 7 rows, each row is 5 bits (bit4=left, bit0=right)

export const FONT = {
  ' ': [0, 0, 0, 0, 0, 0, 0],

  // Digits
  '0': [14, 17, 19, 21, 25, 17, 14],
  '1': [4, 12, 4, 4, 4, 4, 14],
  '2': [14, 17, 1, 2, 4, 8, 31],
  '3': [14, 17, 1, 6, 1, 17, 14],
  '4': [2, 6, 10, 18, 31, 2, 2],
  '5': [31, 16, 30, 1, 1, 17, 14],
  '6': [6, 8, 16, 30, 17, 17, 14],
  '7': [31, 1, 2, 4, 8, 8, 8],
  '8': [14, 17, 17, 14, 17, 17, 14],
  '9': [14, 17, 17, 15, 1, 2, 12],

  // Uppercase letters
  'A': [4, 10, 17, 17, 31, 17, 17],
  'B': [30, 17, 17, 30, 17, 17, 30],
  'C': [14, 17, 16, 16, 16, 17, 14],
  'D': [28, 18, 17, 17, 17, 18, 28],
  'E': [31, 16, 16, 30, 16, 16, 31],
  'F': [31, 16, 16, 30, 16, 16, 16],
  'G': [14, 17, 16, 23, 17, 17, 14],
  'H': [17, 17, 17, 31, 17, 17, 17],
  'I': [14, 4, 4, 4, 4, 4, 14],
  'J': [7, 2, 2, 2, 2, 18, 12],
  'K': [17, 18, 20, 24, 20, 18, 17],
  'L': [16, 16, 16, 16, 16, 16, 31],
  'M': [17, 27, 21, 21, 17, 17, 17],
  'N': [17, 17, 25, 21, 19, 17, 17],
  'O': [14, 17, 17, 17, 17, 17, 14],
  'P': [30, 17, 17, 30, 16, 16, 16],
  'Q': [14, 17, 17, 17, 21, 18, 13],
  'R': [30, 17, 17, 30, 20, 18, 17],
  'S': [14, 17, 16, 14, 1, 17, 14],
  'T': [31, 4, 4, 4, 4, 4, 4],
  'U': [17, 17, 17, 17, 17, 17, 14],
  'V': [17, 17, 17, 17, 10, 10, 4],
  'W': [17, 17, 17, 21, 21, 27, 17],
  'X': [17, 17, 10, 4, 10, 17, 17],
  'Y': [17, 17, 10, 4, 4, 4, 4],
  'Z': [31, 1, 2, 4, 8, 16, 31],

  // Symbols
  ':': [0, 4, 4, 0, 4, 4, 0],
  '/': [1, 2, 2, 4, 8, 8, 16],
  '.': [0, 0, 0, 0, 0, 4, 0],
  ',': [0, 0, 0, 0, 4, 4, 8],
  '(': [2, 4, 8, 8, 8, 4, 2],
  ')': [8, 4, 2, 2, 2, 4, 8],
  '-': [0, 0, 0, 31, 0, 0, 0],
  '_': [0, 0, 0, 0, 0, 0, 31],
  '>': [16, 8, 4, 2, 4, 8, 16],
  '<': [1, 2, 4, 8, 4, 2, 1],
  '*': [0, 4, 21, 14, 21, 4, 0],
  '#': [10, 10, 31, 10, 31, 10, 10],
  '!': [4, 4, 4, 4, 4, 0, 4],
  '=': [0, 0, 31, 0, 31, 0, 0],
  '+': [0, 4, 4, 31, 4, 4, 0],

  // Play/stop icons
  '\u25B6': [16, 24, 28, 30, 28, 24, 16],  // ▶ play triangle
  '\u25A0': [0, 31, 31, 31, 31, 31, 0],     // ■ stop square

  // Em dash (used as default pattern name)
  '\u2014': [0, 0, 0, 31, 0, 0, 0],         // — same as hyphen
};

// Wayang (shadow puppet) sprites — 7px wide × 11 rows
// Each row is 7 bits (bit6=left, bit0=right)
// 3 dance poses cycle for idle animation, plus raised & ecstatic

export const WAYANG_DANCE_A = [  // Neutral, arms at sides
  8,   // ···#···  crown
  28,  // ··###··  headdress
  8,   // ···#···  neck
  42,  // ·#·#·#·  upper arms at sides
  28,  // ··###··  torso
  42,  // ·#·#·#·  lower arms at sides
  28,  // ··###··  hips
  62,  // ·#####·  sarong
  28,  // ··###··  sarong taper
  20,  // ··#·#··  legs
  0,   // ·······
];

export const WAYANG_DANCE_B = [  // Right arm up gesture
  10,  // ···#·#·  crown + right hand
  28,  // ··###··  head
  8,   // ···#···  neck
  8,   // ···#···  body
  60,  // ·####··  left arm out + torso
  8,   // ···#···  waist
  28,  // ··###··  hips
  62,  // ·#####·  sarong
  28,  // ··###··  sarong taper
  20,  // ··#·#··  legs
  0,   // ·······
];

export const WAYANG_DANCE_C = [  // Left arm up gesture (mirror)
  40,  // ·#·#···  left hand + crown
  28,  // ··###··  head
  8,   // ···#···  neck
  8,   // ···#···  body
  30,  // ··####·  torso + right arm out
  8,   // ···#···  waist
  28,  // ··###··  hips
  62,  // ·#####·  sarong
  28,  // ··###··  sarong taper
  20,  // ··#·#··  legs
  0,   // ·······
];

export const WAYANG_RAISED = [   // Both arms up, chanting "cak"
  65,  // #·····#  hands raised high
  34,  // ·#···#·  upper arms
  28,  // ··###··  head
  8,   // ···#···  neck
  28,  // ··###··  torso
  8,   // ···#···  waist
  28,  // ··###··  hips
  62,  // ·#####·  sarong
  28,  // ··###··  sarong taper
  20,  // ··#·#··  legs
  0,   // ·······
];

export const WAYANG_ECSTATIC = [ // Maximum energy, current beat
  65,  // #·····#  hands high
  99,  // ##···##  arms wide
  62,  // ·#####·  head (big energy)
  8,   // ···#···  neck
  28,  // ··###··  torso
  28,  // ··###··  torso
  62,  // ·#####·  wide hips
  127, // #######  max sarong
  20,  // ··#·#··  legs
  34,  // ·#···#·  feet wide
  0,   // ·······
];
