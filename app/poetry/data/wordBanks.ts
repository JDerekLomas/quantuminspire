import type { WordBank } from '../lib/helpers'

export const PRESENCE_LINES: WordBank = {
  line1: [
    'morning light through glass',
    'your laugh, sudden rain',
    'peaches on the sill',
    'fingerprints in flour',
    'the dog knows your step',
    'two shadows, one wall',
    'bread rising all night',
    'plums warm from the tree',
  ],
  line2: [
    'I learn your breathing by heart',
    'the kitchen fills with slow steam',
    'nothing needs to be explained',
    'we hold still and the world turns',
    'sunlight maps your sleeping face',
    'we breathe in the same small room',
    'something in us knows to stay',
    'your hand rests where the light falls',
  ],
  line3: [
    'the kettle exhales',
    'both pillow dents warm',
    'our coats share one hook',
    'the garden gate swings',
    'mint in the teacup',
    'jam jar left open',
    'the cat knows our bed',
    'smoke curls from the roof',
  ],
}

export const ABSENCE_LINES: WordBank = {
  line1: [
    'one plate in the rack',
    'your book, spine still cracked',
    'rain and no one home',
    'the hall at half-light',
    'crumbs on the counter',
    'cold side of the bed',
    'one cup on the shelf',
    'your scarf on the chair',
  ],
  line2: [
    'the fridge hums for no one now',
    'the stairs still creak where you stepped',
    'I still reach across at night',
    'each room holds a draft of you',
    'no one turns the porch light off',
    'even the shadows have left',
    'nothing stirs except the dust',
    'who waters the garden now',
  ],
  line3: [
    'two keys, now just one',
    'your mug, cold and stained',
    'the faucet still drips',
    'the blinds halfway drawn',
    'moths at the window',
    'frost on the inside',
    'a half-read letter',
    'weeds through the front path',
  ],
}

export const ENTANGLED_LINES = [
  { first: 'morning light through glass', last: 'the kettle exhales' },
  { first: 'one plate in the rack', last: 'your mug, cold and stained' },
  { first: 'peaches on the sill', last: 'jam jar left open' },
  { first: 'your book, spine still cracked', last: 'a half-read letter' },
  { first: 'the dog knows your step', last: 'the garden gate swings' },
  { first: 'cold side of the bed', last: 'the faucet still drips' },
  { first: 'two shadows, one wall', last: 'smoke curls from the roof' },
  { first: 'one cup on the shelf', last: 'weeds through the front path' },
]

export const FREE_MIDDLES = [
  'what we built still holds its shape',
  'the body remembers first',
  'we learned the same language once',
  'the heart keeps its own counsel',
  'some things only hands can say',
  'time knows what we have not said',
  'between the said and the meant',
  'this quiet holds more than words',
]
