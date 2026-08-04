/**
 * seed-posts.ts
 *
 * デモ用のつぶやきとリアクションを DynamoDB に投入する。
 * 既に同じ postId が存在する場合は上書きしない。
 *
 * 使い方:
 *   npm run seed:posts --workspace=backend              (ドライラン)
 *   npm run seed:posts --workspace=backend -- --apply   (実行)
 */
import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLE_POSTS, TABLE_REACTIONS, TABLE_USERS } from '../shared/dynamodb.js';

const apply = process.argv.includes('--apply');

// ─── デモユーザー ─────────────────────────────────────────
interface DemoUser {
  userId: string;
  nickname: string;
  avatarId: string;
  childAgeGroup: string;
}

const DEMO_USERS: DemoUser[] = [
  { userId: 'demo-user-01', nickname: 'ひまわりママ', avatarId: 'mint-bear', childAgeGroup: '0〜1歳' },
  { userId: 'demo-user-02', nickname: 'くまママ', avatarId: 'honey-bear', childAgeGroup: '0〜1歳' },
  { userId: 'demo-user-03', nickname: 'ことりママ', avatarId: 'lavender-bunny', childAgeGroup: '1〜2歳' },
  { userId: 'demo-user-04', nickname: 'りんごママ', avatarId: 'pink-cat', childAgeGroup: '2〜3歳' },
  { userId: 'demo-user-05', nickname: 'そらママ', avatarId: 'sky-bear', childAgeGroup: '1〜2歳' },
  { userId: 'demo-user-06', nickname: 'あおいママ', avatarId: 'cream-sheep', childAgeGroup: '2〜3歳' },
  { userId: 'demo-user-07', nickname: 'もこママ', avatarId: 'mint-dinosaur', childAgeGroup: '3歳以上' },
];

// ─── デモ投稿 ─────────────────────────────────────────────
interface DemoPost {
  id: string;
  userIndex: number;
  text: string;
  hoursAgo: number;
}

const DEMO_POSTS: DemoPost[] = [
  {
    id: 'demo-post-01',
    userIndex: 0,
    text: '今日は子どもがなかなか寝なくて、ちょっと疲れた…でも寝顔を見ると癒されます。',
    hoursAgo: 2,
  },
  {
    id: 'demo-post-02',
    userIndex: 1,
    text: '初めての離乳食、今日は少し食べてくれました。明日も無理せず挑戦します。',
    hoursAgo: 5,
  },
  {
    id: 'demo-post-03',
    userIndex: 2,
    text: '公園で同じくらいの年齢のお子さんと遊べました。親子で楽しかったです。',
    hoursAgo: 8,
  },
  {
    id: 'demo-post-04',
    userIndex: 3,
    text: '雨の日が続いてお出かけできないので、室内遊びのアイデアを探しています。',
    hoursAgo: 25,
  },
  {
    id: 'demo-post-05',
    userIndex: 4,
    text: '子どもが初めて「ママ」と呼んでくれました。嬉しくて何度も思い出しています。',
    hoursAgo: 30,
  },
  {
    id: 'demo-post-06',
    userIndex: 5,
    text: '今週末のリトミック教室に行ってみようかな。同じくらいの月齢の子いるかな。',
    hoursAgo: 51,
  },
  {
    id: 'demo-post-07',
    userIndex: 2,
    text: '夜泣きが続いて少し疲れています。同じ経験のある方、どう過ごしていましたか？',
    hoursAgo: 74,
  },
];

// ─── デモリアクション ─────────────────────────────────────
interface DemoReaction {
  postId: string;
  userIndex: number;
  emoji: string;
}

const DEMO_REACTIONS: DemoReaction[] = [
  // post-01: wakaru 3, otsukare 2, kokoniiruyo 1
  { postId: 'demo-post-01', userIndex: 1, emoji: 'wakaru' },
  { postId: 'demo-post-01', userIndex: 2, emoji: 'wakaru' },
  { postId: 'demo-post-01', userIndex: 3, emoji: 'wakaru' },
  { postId: 'demo-post-01', userIndex: 2, emoji: 'otsukare' },
  { postId: 'demo-post-01', userIndex: 4, emoji: 'otsukare' },
  { postId: 'demo-post-01', userIndex: 3, emoji: 'kokoniiruyo' },
  // post-02: ouen 2, watashimo 3, otsukare 1
  { postId: 'demo-post-02', userIndex: 0, emoji: 'ouen' },
  { postId: 'demo-post-02', userIndex: 3, emoji: 'ouen' },
  { postId: 'demo-post-02', userIndex: 0, emoji: 'watashimo' },
  { postId: 'demo-post-02', userIndex: 2, emoji: 'watashimo' },
  { postId: 'demo-post-02', userIndex: 4, emoji: 'watashimo' },
  { postId: 'demo-post-02', userIndex: 3, emoji: 'otsukare' },
  // post-03: yokattane 4, ouen 1, wakaru 1
  { postId: 'demo-post-03', userIndex: 0, emoji: 'yokattane' },
  { postId: 'demo-post-03', userIndex: 1, emoji: 'yokattane' },
  { postId: 'demo-post-03', userIndex: 3, emoji: 'yokattane' },
  { postId: 'demo-post-03', userIndex: 4, emoji: 'yokattane' },
  { postId: 'demo-post-03', userIndex: 1, emoji: 'ouen' },
  { postId: 'demo-post-03', userIndex: 4, emoji: 'wakaru' },
  // post-04: watashimo 2, hitoiki 3, kokoniiruyo 1
  { postId: 'demo-post-04', userIndex: 1, emoji: 'watashimo' },
  { postId: 'demo-post-04', userIndex: 2, emoji: 'watashimo' },
  { postId: 'demo-post-04', userIndex: 0, emoji: 'hitoiki' },
  { postId: 'demo-post-04', userIndex: 2, emoji: 'hitoiki' },
  { postId: 'demo-post-04', userIndex: 4, emoji: 'hitoiki' },
  { postId: 'demo-post-04', userIndex: 1, emoji: 'kokoniiruyo' },
  // post-05: yokattane 5, ouen 2, kyoumo 1
  { postId: 'demo-post-05', userIndex: 0, emoji: 'yokattane' },
  { postId: 'demo-post-05', userIndex: 1, emoji: 'yokattane' },
  { postId: 'demo-post-05', userIndex: 2, emoji: 'yokattane' },
  { postId: 'demo-post-05', userIndex: 3, emoji: 'yokattane' },
  { postId: 'demo-post-05', userIndex: 5, emoji: 'yokattane' },
  { postId: 'demo-post-05', userIndex: 0, emoji: 'ouen' },
  { postId: 'demo-post-05', userIndex: 3, emoji: 'ouen' },
  { postId: 'demo-post-05', userIndex: 2, emoji: 'kyoumo' },
  // post-06: wakaru 1, ouen 2, watashimo 1
  { postId: 'demo-post-06', userIndex: 4, emoji: 'wakaru' },
  { postId: 'demo-post-06', userIndex: 1, emoji: 'ouen' },
  { postId: 'demo-post-06', userIndex: 2, emoji: 'ouen' },
  { postId: 'demo-post-06', userIndex: 3, emoji: 'watashimo' },
  // post-07: kokoniiruyo 3, watashimo 4, hitoiki 2
  { postId: 'demo-post-07', userIndex: 0, emoji: 'kokoniiruyo' },
  { postId: 'demo-post-07', userIndex: 1, emoji: 'kokoniiruyo' },
  { postId: 'demo-post-07', userIndex: 4, emoji: 'kokoniiruyo' },
  { postId: 'demo-post-07', userIndex: 0, emoji: 'watashimo' },
  { postId: 'demo-post-07', userIndex: 1, emoji: 'watashimo' },
  { postId: 'demo-post-07', userIndex: 3, emoji: 'watashimo' },
  { postId: 'demo-post-07', userIndex: 4, emoji: 'watashimo' },
  { postId: 'demo-post-07', userIndex: 0, emoji: 'hitoiki' },
  { postId: 'demo-post-07', userIndex: 3, emoji: 'hitoiki' },
];

// ─── 実行 ─────────────────────────────────────────────────
if (!apply) {
  console.log('Dry run:');
  console.log(`  ${DEMO_USERS.length} demo users`);
  console.log(`  ${DEMO_POSTS.length} demo posts`);
  console.log(`  ${DEMO_REACTIONS.length} demo reactions`);
  console.log(`\n  Target tables:`);
  console.log(`    Users: ${TABLE_USERS}`);
  console.log(`    Posts: ${TABLE_POSTS}`);
  console.log(`    Reactions: ${TABLE_REACTIONS}`);
  console.log('\nRun with --apply to insert data.');
  process.exit(0);
}

let usersInserted = 0;
let postsInserted = 0;
let reactionsInserted = 0;

// Insert demo users
for (const user of DEMO_USERS) {
  const now = new Date().toISOString();
  try {
    await docClient.send(new PutCommand({
      TableName: TABLE_USERS,
      Item: {
        pk: `USER#${user.userId}`,
        sk: 'PROFILE',
        userId: user.userId,
        nickname: user.nickname,
        avatarId: user.avatarId,
        childAgeGroup: user.childAgeGroup,
        installationId: `demo-install-${user.userId}`,
        deviceToken: `demo-token-${user.userId}`,
        createdAt: now,
        updatedAt: now,
      },
      ConditionExpression: 'attribute_not_exists(pk)',
    }));
    usersInserted += 1;
  } catch (e: unknown) {
    if ((e as { name?: string }).name !== 'ConditionalCheckFailedException') throw e;
  }
}

// Insert demo posts
for (const post of DEMO_POSTS) {
  const user = DEMO_USERS[post.userIndex];
  const createdAt = new Date(Date.now() - post.hoursAgo * 3600_000).toISOString();
  try {
    await docClient.send(new PutCommand({
      TableName: TABLE_POSTS,
      Item: {
        pk: 'POSTS',
        sk: `POST#${post.id}`,
        postId: post.id,
        text: post.text,
        nickname: user.nickname,
        avatarId: user.avatarId,
        userId: user.userId,
        createdAt,
      },
      ConditionExpression: 'attribute_not_exists(pk)',
    }));
    postsInserted += 1;
  } catch (e: unknown) {
    if ((e as { name?: string }).name !== 'ConditionalCheckFailedException') throw e;
  }
}

// Insert demo reactions
for (const reaction of DEMO_REACTIONS) {
  const user = DEMO_USERS[reaction.userIndex];
  const createdAt = new Date().toISOString();
  try {
    await docClient.send(new PutCommand({
      TableName: TABLE_REACTIONS,
      Item: {
        pk: `POST#${reaction.postId}`,
        sk: `REACTION#${user.userId}#${reaction.emoji}`,
        userId: user.userId,
        emoji: reaction.emoji,
        nickname: user.nickname,
        avatarId: user.avatarId,
        createdAt,
      },
      ConditionExpression: 'attribute_not_exists(pk)',
    }));
    reactionsInserted += 1;
  } catch (e: unknown) {
    if ((e as { name?: string }).name !== 'ConditionalCheckFailedException') throw e;
  }
}

console.log(`Seed complete:`);
console.log(`  Users: ${usersInserted} inserted`);
console.log(`  Posts: ${postsInserted} inserted`);
console.log(`  Reactions: ${reactionsInserted} inserted`);
