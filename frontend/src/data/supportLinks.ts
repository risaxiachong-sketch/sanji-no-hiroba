import type { SupportLink } from '../types';

export const SUPPORT_LINKS: SupportLink[] = [
  {
    id: 'sl-01',
    name: '福岡市子育て情報サイト「はぐはぐ」',
    description: '福岡市の子育て支援に関する総合情報サイト。イベント・施設・相談窓口をまとめて確認できます。',
    url: 'https://huguhugu.jp/',
    category: 'info',
  },
  {
    id: 'sl-02',
    name: '福岡市子ども総合相談センター（えがお館）',
    description: '子育てに関する相談を専門スタッフが受け付けています。電話・来所どちらでも相談できます。',
    phone: '092-833-3000',
    url: 'https://www.city.fukuoka.lg.jp/kodomo/sodan-center/',
    category: 'consultation',
  },
  {
    id: 'sl-03',
    name: 'よりそいホットライン',
    description: '24時間365日、どんな悩みでも聴いてくれる無料の電話相談窓口です。子育ての孤独感なども相談できます。',
    phone: '0120-279-338',
    url: 'https://www.since2011.net/yorisoi/',
    category: 'hotline',
  },
  {
    id: 'sl-04',
    name: '福岡県子育て支援センター',
    description: '福岡県内の子育て支援に関する情報を提供しています。各市町村の支援施設も紹介しています。',
    url: 'https://www.pref.fukuoka.lg.jp/contents/kosodate-shien.html',
    category: 'facility',
  },
  {
    id: 'sl-05',
    name: 'こども家庭庁 子育て支援・相談窓口',
    description: '国の機関が提供する子育て支援・相談窓口の総合案内ページです。全国の相談先を調べられます。',
    url: 'https://www.cfa.go.jp/policies/kosodateshien/',
    category: 'info',
  },
];
