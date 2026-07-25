import type { DummyUser } from '../types';
import { AVATARS } from './avatars';

export const DUMMY_USERS: DummyUser[] = [
  {
    id: 'du-01',
    avatar: AVATARS[0], // くまさん
    message: '今日もよく頑張った',
    x: 12,
    y: 30,
  },
  {
    id: 'du-02',
    avatar: AVATARS[1], // うさぎさん
    message: '眠れない夜は広場に来てます',
    x: 72,
    y: 22,
  },
  {
    id: 'du-03',
    avatar: AVATARS[2], // ひよこさん
    message: '離乳食、難しいな〜',
    x: 35,
    y: 55,
  },
  {
    id: 'du-04',
    avatar: AVATARS[3], // ねこさん
    message: '図書館の読み聞かせよかった！',
    x: 80,
    y: 58,
  },
  {
    id: 'du-05',
    avatar: AVATARS[4], // ぱんださん
    message: 'ここにいるよ〜',
    x: 20,
    y: 70,
  },
  {
    id: 'du-06',
    avatar: AVATARS[5], // こあらさん
    message: 'おつかれさまです',
    x: 58,
    y: 38,
  },
  {
    id: 'du-07',
    avatar: AVATARS[1], // うさぎさん（別ユーザー）
    message: 'そっと見守っています',
    x: 45,
    y: 75,
  },
];
