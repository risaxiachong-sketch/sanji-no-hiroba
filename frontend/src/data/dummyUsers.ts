import type { DummyUser } from '../types';
import { AVATARS } from './avatars';

export const DUMMY_USERS: DummyUser[] = [
  {
    id: 'du-01',
    avatar: AVATARS[0], // くまさん
    message: '今日は早起きできたので、朝から少し余裕があります☀️',
    x: 12,
    y: 30,
  },
  {
    id: 'du-02',
    avatar: AVATARS[1], // うさぎさん
    message: '夜泣きのあとに寝落ちしていました。みなさん今日もおつかれさまです',
    x: 72,
    y: 22,
  },
  {
    id: 'du-03',
    avatar: AVATARS[2], // ひよこさん
    message: '離乳食、今日はおにぎりをぱくぱく食べてくれました☺️',
    x: 35,
    y: 55,
  },
  {
    id: 'du-04',
    avatar: AVATARS[3], // ねこさん
    message: '図書館の読み聞かせ、親子で楽しめました。また行きたいな',
    x: 80,
    y: 58,
  },
  {
    id: 'du-05',
    avatar: AVATARS[4], // ぱんださん
    message: '雨の日のおうち遊び、みなさん何をしていますか？',
    x: 20,
    y: 70,
  },
  {
    id: 'du-06',
    avatar: AVATARS[5], // こあらさん
    message: '子どもがお昼寝している間に、やっとひと息つけました🍵',
    x: 58,
    y: 38,
  },
  {
    id: 'du-07',
    avatar: AVATARS[1], // うさぎさん（別ユーザー）
    message: '同じくらいの月齢のお子さんがいる方とお話ししたいです',
    x: 45,
    y: 75,
  },
];
