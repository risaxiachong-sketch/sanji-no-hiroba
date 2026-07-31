import type { Avatar } from '../types';
import mintBear from '../assets/avatars/mint-bear.jpg';
import honeyBear from '../assets/avatars/honey-bear.jpg';
import lavenderBunny from '../assets/avatars/lavender-bunny.jpg';
import skyBear from '../assets/avatars/sky-bear.jpg';
import pinkCat from '../assets/avatars/pink-cat.jpg';
import creamSheep from '../assets/avatars/cream-sheep.jpg';
import mintDinosaur from '../assets/avatars/mint-dinosaur.jpg';
import mintBearSprite from '../assets/avatars/map-sprites/mint-bear.png';
import honeyBearSprite from '../assets/avatars/map-sprites/honey-bear.png';
import lavenderBunnySprite from '../assets/avatars/map-sprites/lavender-bunny.png';
import skyBearSprite from '../assets/avatars/map-sprites/sky-bear.png';
import pinkCatSprite from '../assets/avatars/map-sprites/pink-cat.png';
import creamSheepSprite from '../assets/avatars/map-sprites/cream-sheep.png';
import mintDinosaurSprite from '../assets/avatars/map-sprites/mint-dinosaur.png';

export const AVATARS: Avatar[] = [
  { id: 'mint-bear', emoji: '🐻', label: 'ミントのくまさん', color: '#dfeee0', selectionImageUrl: mintBear, mapSpriteUrl: mintBearSprite },
  { id: 'honey-bear', emoji: '🐻', label: 'はちみつ色のくまさん', color: '#fff0c8', selectionImageUrl: honeyBear, mapSpriteUrl: honeyBearSprite },
  { id: 'lavender-bunny', emoji: '🐰', label: 'ラベンダーのうさぎさん', color: '#eee3f7', selectionImageUrl: lavenderBunny, mapSpriteUrl: lavenderBunnySprite },
  { id: 'sky-bear', emoji: '🐻', label: '空色のくまさん', color: '#ddecf7', selectionImageUrl: skyBear, mapSpriteUrl: skyBearSprite },
  { id: 'pink-cat', emoji: '🐱', label: 'ピンクのねこさん', color: '#f8e1e4', selectionImageUrl: pinkCat, mapSpriteUrl: pinkCatSprite },
  { id: 'cream-sheep', emoji: '🐏', label: 'もこもこのひつじさん', color: '#f5ecdc', selectionImageUrl: creamSheep, mapSpriteUrl: creamSheepSprite },
  { id: 'mint-dinosaur', emoji: '🦖', label: 'ミントのきょうりゅうさん', color: '#dcebdd', selectionImageUrl: mintDinosaur, mapSpriteUrl: mintDinosaurSprite },
];
