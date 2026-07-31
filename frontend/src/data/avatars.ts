import type { Avatar } from '../types';
import mintBear from '../assets/avatars/mint-bear.jpg';
import honeyBear from '../assets/avatars/honey-bear.jpg';
import lavenderBunny from '../assets/avatars/lavender-bunny.jpg';
import skyBear from '../assets/avatars/sky-bear.jpg';
import pinkCat from '../assets/avatars/pink-cat.jpg';
import creamSheep from '../assets/avatars/cream-sheep.jpg';
import mintDinosaur from '../assets/avatars/mint-dinosaur.jpg';

export const AVATARS: Avatar[] = [
  { id: 'mint-bear', emoji: '🐻', label: 'ミントのくまさん', color: '#dfeee0', selectionImageUrl: mintBear },
  { id: 'honey-bear', emoji: '🐻', label: 'はちみつ色のくまさん', color: '#fff0c8', selectionImageUrl: honeyBear },
  { id: 'lavender-bunny', emoji: '🐰', label: 'ラベンダーのうさぎさん', color: '#eee3f7', selectionImageUrl: lavenderBunny },
  { id: 'sky-bear', emoji: '🐻', label: '空色のくまさん', color: '#ddecf7', selectionImageUrl: skyBear },
  { id: 'pink-cat', emoji: '🐱', label: 'ピンクのねこさん', color: '#f8e1e4', selectionImageUrl: pinkCat },
  { id: 'cream-sheep', emoji: '🐏', label: 'もこもこのひつじさん', color: '#f5ecdc', selectionImageUrl: creamSheep },
  { id: 'mint-dinosaur', emoji: '🦖', label: 'ミントのきょうりゅうさん', color: '#dcebdd', selectionImageUrl: mintDinosaur },
];
