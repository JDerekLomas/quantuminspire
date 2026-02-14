import type { WordBank } from '../lib/helpers'

export const PRESENCE_LINES: WordBank = {
  line1: [
    'your hand finding mine',
    'the warmth of your skin',
    'laughter in the dark',
    'tangled sheets at dawn',
    'the scent of your hair',
    'two cups on the shelf',
    'your breath on my neck',
    'candlelight on skin',
  ],
  line2: [
    'you pull me closer and stay',
    'the room holds nothing but us',
    'your voice fills the quiet house',
    'time slows when your eyes meet mine',
    'the silence between us hums',
    'we breathe in the same warm air',
    'the whole world contracts to here',
    'your laugh echoes through the rooms',
  ],
  line3: [
    'the door stays open',
    'your name on my lips',
    'salt on the pillow',
    'the bed still holds warmth',
    'a shared glass of wine',
    'the key in the lock',
    'fingerprints on glass',
    'our shadows as one',
  ],
}

export const ABSENCE_LINES: WordBank = {
  line1: [
    'the empty pillow',
    'a letter unsent',
    'rain on the window',
    'your chair at the desk',
    'the phone stays silent',
    'cold side of the bed',
    'one cup on the shelf',
    'the scent on your shirt',
  ],
  line2: [
    'I still remember your hands',
    'your absence fills the whole room',
    'the walls remember your voice',
    'I keep the light on for you',
    'the distance hums between us',
    'even the shadows have left',
    'what remains is what was real',
    'nothing moves without your warmth',
  ],
  line3: [
    'the porch light still on',
    'dust on your guitar',
    'the train pulls away',
    'your book left open',
    'the clock keeps counting',
    'fog on the window',
    'a half-read letter',
    'the song half-finished',
  ],
}

export const ENTANGLED_LINES = [
  { first: 'your hand finding mine', last: 'the door stays open' },
  { first: 'the empty pillow', last: 'the porch light still on' },
  { first: 'the warmth of your skin', last: 'salt on the pillow' },
  { first: 'a letter unsent', last: 'dust on your guitar' },
  { first: 'laughter in the dark', last: 'a shared glass of wine' },
  { first: 'the phone stays silent', last: 'the clock keeps counting' },
  { first: 'candlelight on skin', last: 'our shadows as one' },
  { first: 'the scent on your shirt', last: 'the song half-finished' },
]

export const FREE_MIDDLES = [
  'what we built still holds its shape',
  'the years have not erased this',
  'the body remembers first',
  'we learned the same language once',
  'between the said and the meant',
  'love bends where it cannot break',
  'the heart keeps its own counsel',
  'the unsaid speaks the loudest',
]
