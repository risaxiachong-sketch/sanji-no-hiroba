/**
 * How the town grows as posts come in.
 *
 * Every level from 1 to 200 has a defined world. Levels that reveal geometry are
 * mirrored by `with growth(<level>)` blocks in
 * `scripts/blender/create_plaza_immersive.py`, which tags each batch
 * `Growth<level>_<Material>`; `PlazaGrowth.tsx` then shows the batches at or below
 * the town's level. The two lists have to be kept in step — a level named here
 * with `unlocks` but no matching block in Blender simply shows nothing.
 *
 * Levels 1-100 grow the village into a town; 101-200 grow that town into a city,
 * spreading out from the plaza while the northern vista deepens. Levels with an
 * empty `unlocks` are deliberate quiet steps between the visible changes.
 */

export type TownLevel = {
  level: number
  /** Total posts needed to reach this level. */
  postsRequired: number
  title: string
  summary: string
  /** What appears at this level, for the level-up notice. */
  unlocks: string[]
}

export const MAX_TOWN_LEVEL = 200

/** Posts needed for the last level. The curve is gentle at the start, steeper late. */
export const POSTS_FOR_MAX_LEVEL = 1500

export const TOWN_LEVELS: TownLevel[] = [
  { level: 1, postsRequired: 0, title: 'はじまりの原っぱ', summary: '円い石畳と噴水だけ。まだ誰の暮らしの跡もない、ひらけた場所。', unlocks: [] },
  { level: 2, postsRequired: 1, title: 'レベル2', summary: '静かな日。人の行き来だけが少し増える。', unlocks: [] },
  { level: 3, postsRequired: 3, title: 'ふたつのベンチ', summary: '誰かが座れるように、広場のふちにベンチが置かれた。', unlocks: ['ベンチ×2'] },
  { level: 4, postsRequired: 4, title: 'レベル4', summary: '変わったところはないけれど、まちにいる人が増えている。', unlocks: [] },
  { level: 5, postsRequired: 7, title: 'さいしょの木', summary: '入口の両脇に木が根づく。実をつける木が一本。', unlocks: ['木×2'] },
  { level: 6, postsRequired: 9, title: 'レベル6', summary: '誰かの言葉がひとつ、また置かれていく。', unlocks: [] },
  { level: 7, postsRequired: 11, title: 'まちの掲示板', summary: '小さな知らせを貼る板が立つ。ここから情報が回りはじめる。', unlocks: ['掲示板'] },
  { level: 8, postsRequired: 14, title: 'レベル8', summary: '見た目は同じまま、まちに馴染んでいく時間。', unlocks: [] },
  { level: 9, postsRequired: 17, title: '最初の芝の島', summary: '広場の中に緑の島ができ、木陰がうまれる。', unlocks: ['芝の島×1'] },
  { level: 10, postsRequired: 20, title: 'レベル10', summary: '次に何かが建つまでの、あいだの日。', unlocks: [] },
  { level: 11, postsRequired: 23, title: '子育て支援センター', summary: '広場の正面に、はじめての公共の建物が建つ。', unlocks: ['支援センター'] },
  { level: 12, postsRequired: 26, title: 'レベル12', summary: '静かな日。人の行き来だけが少し増える。', unlocks: [] },
  { level: 13, postsRequired: 29, title: 'レベル13', summary: '変わったところはないけれど、まちにいる人が増えている。', unlocks: [] },
  { level: 14, postsRequired: 32, title: '木かげが増える', summary: '木が二本ふえ、広場のふちが柔らかくなる。', unlocks: ['木×2'] },
  { level: 15, postsRequired: 36, title: 'レベル15', summary: '誰かの言葉がひとつ、また置かれていく。', unlocks: [] },
  { level: 16, postsRequired: 39, title: '入口の花壇', summary: '門をくぐった先に、花のプランターが並ぶ。', unlocks: ['花壇×2'] },
  { level: 17, postsRequired: 43, title: 'レベル17', summary: '見た目は同じまま、まちに馴染んでいく時間。', unlocks: [] },
  { level: 18, postsRequired: 46, title: 'ふたつめの芝の島', summary: '向かい側にも緑の島。広場に対称が生まれる。', unlocks: ['芝の島×1'] },
  { level: 19, postsRequired: 50, title: 'レベル19', summary: '次に何かが建つまでの、あいだの日。', unlocks: [] },
  { level: 20, postsRequired: 54, title: 'コミュニティハウス', summary: '集まって話せる家が建つ。夜も灯りがつくようになる。', unlocks: ['コミュニティハウス'] },
  { level: 21, postsRequired: 58, title: 'レベル21', summary: '静かな日。人の行き来だけが少し増える。', unlocks: [] },
  { level: 22, postsRequired: 62, title: 'レベル22', summary: '変わったところはないけれど、まちにいる人が増えている。', unlocks: [] },
  { level: 23, postsRequired: 66, title: '島のベンチ', summary: '芝の島のそばにベンチ。小さな輪ができる場所。', unlocks: ['ベンチ×2'] },
  { level: 24, postsRequired: 70, title: 'レベル24', summary: '誰かの言葉がひとつ、また置かれていく。', unlocks: [] },
  { level: 25, postsRequired: 74, title: '並木になる', summary: '木が六本になり、広場を囲みはじめる。', unlocks: ['木×2'] },
  { level: 26, postsRequired: 78, title: 'レベル26', summary: '見た目は同じまま、まちに馴染んでいく時間。', unlocks: [] },
  { level: 27, postsRequired: 82, title: 'カフェ', summary: 'ひさしのある店が開く。まちに寄り道ができた。', unlocks: ['カフェ'] },
  { level: 28, postsRequired: 87, title: 'レベル28', summary: '次に何かが建つまでの、あいだの日。', unlocks: [] },
  { level: 29, postsRequired: 91, title: 'レベル29', summary: '静かな日。人の行き来だけが少し増える。', unlocks: [] },
  { level: 30, postsRequired: 95, title: 'みっつめの芝の島', summary: '緑がさらに増え、広場に奥行きが出る。', unlocks: ['芝の島×1'] },
  { level: 31, postsRequired: 100, title: 'レベル31', summary: '変わったところはないけれど、まちにいる人が増えている。', unlocks: [] },
  { level: 32, postsRequired: 104, title: 'さいしょの街灯', summary: '四基の街灯がともる。日が落ちても広場が見えるように。', unlocks: ['街灯×4'] },
  { level: 33, postsRequired: 109, title: 'レベル33', summary: '誰かの言葉がひとつ、また置かれていく。', unlocks: [] },
  { level: 34, postsRequired: 113, title: 'レベル34', summary: '見た目は同じまま、まちに馴染んでいく時間。', unlocks: [] },
  { level: 35, postsRequired: 118, title: 'はじめての家', summary: '誰かがここに住みはじめる。まちに生活が入る。', unlocks: ['住宅'] },
  { level: 36, postsRequired: 123, title: 'レベル36', summary: '次に何かが建つまでの、あいだの日。', unlocks: [] },
  { level: 37, postsRequired: 128, title: 'レベル37', summary: '静かな日。人の行き来だけが少し増える。', unlocks: [] },
  { level: 38, postsRequired: 132, title: '木が八本に', summary: '並木がぐるりとつながりはじめる。', unlocks: ['木×2'] },
  { level: 39, postsRequired: 137, title: 'レベル39', summary: '変わったところはないけれど、まちにいる人が増えている。', unlocks: [] },
  { level: 40, postsRequired: 142, title: 'よっつめの芝の島', summary: '四つの島がそろい、広場の骨格が完成する。', unlocks: ['芝の島×1'] },
  { level: 41, postsRequired: 147, title: 'レベル41', summary: '誰かの言葉がひとつ、また置かれていく。', unlocks: [] },
  { level: 42, postsRequired: 152, title: '奥のベンチ', summary: '広場の奥にもベンチ。人の流れが変わる。', unlocks: ['ベンチ×2'] },
  { level: 43, postsRequired: 157, title: 'レベル43', summary: '見た目は同じまま、まちに馴染んでいく時間。', unlocks: [] },
  { level: 44, postsRequired: 162, title: '庭のある家', summary: '二軒目の家。庭木と花が持ち込まれる。', unlocks: ['住宅'] },
  { level: 45, postsRequired: 167, title: 'レベル45', summary: '次に何かが建つまでの、あいだの日。', unlocks: [] },
  { level: 46, postsRequired: 172, title: '街灯がひとまわり', summary: '八基そろい、夜の広場が端まで明るくなる。', unlocks: ['街灯×4'] },
  { level: 47, postsRequired: 178, title: 'レベル47', summary: '静かな日。人の行き来だけが少し増える。', unlocks: [] },
  { level: 48, postsRequired: 183, title: '木が十本に', summary: '並木が広場をほぼ囲む。', unlocks: ['木×2'] },
  { level: 49, postsRequired: 188, title: 'レベル49', summary: '変わったところはないけれど、まちにいる人が増えている。', unlocks: [] },
  { level: 50, postsRequired: 193, title: '診療所', summary: '熱が出ても駆け込める場所ができる。まちの折り返し点。', unlocks: ['診療所'] },
  { level: 51, postsRequired: 199, title: 'レベル51', summary: '誰かの言葉がひとつ、また置かれていく。', unlocks: [] },
  { level: 52, postsRequired: 204, title: 'レベル52', summary: '見た目は同じまま、まちに馴染んでいく時間。', unlocks: [] },
  { level: 53, postsRequired: 210, title: '店先の花', summary: 'カフェとコミュニティハウスの前に花が置かれる。', unlocks: ['花壇×2'] },
  { level: 54, postsRequired: 215, title: 'レベル54', summary: '次に何かが建つまでの、あいだの日。', unlocks: [] },
  { level: 55, postsRequired: 221, title: '保育園', summary: '子どもを預けられる場所。まちの一日が回りはじめる。', unlocks: ['保育園'] },
  { level: 56, postsRequired: 226, title: 'レベル56', summary: '静かな日。人の行き来だけが少し増える。', unlocks: [] },
  { level: 57, postsRequired: 232, title: 'レベル57', summary: '変わったところはないけれど、まちにいる人が増えている。', unlocks: [] },
  { level: 58, postsRequired: 237, title: '木が十二本に', summary: '外周の並木がほぼ閉じる。', unlocks: ['木×2'] },
  { level: 59, postsRequired: 243, title: 'レベル59', summary: '誰かの言葉がひとつ、また置かれていく。', unlocks: [] },
  { level: 60, postsRequired: 249, title: '図書館', summary: '絵本と、静かに座れる椅子。雨の日の行き先ができた。', unlocks: ['図書館'] },
  { level: 61, postsRequired: 254, title: 'レベル61', summary: '見た目は同じまま、まちに馴染んでいく時間。', unlocks: [] },
  { level: 62, postsRequired: 260, title: '野の花が咲く', summary: '芝地に花の群れが自然に広がりはじめる。', unlocks: ['花畑×3'] },
  { level: 63, postsRequired: 266, title: 'レベル63', summary: '次に何かが建つまでの、あいだの日。', unlocks: [] },
  { level: 64, postsRequired: 272, title: 'パン屋', summary: '朝のにおいがまちに加わる。', unlocks: ['パン屋'] },
  { level: 65, postsRequired: 277, title: 'レベル65', summary: '静かな日。人の行き来だけが少し増える。', unlocks: [] },
  { level: 66, postsRequired: 283, title: '並木が完成', summary: '十四本の木が広場をぐるりと囲む。', unlocks: ['木×2'] },
  { level: 67, postsRequired: 289, title: 'レベル67', summary: '変わったところはないけれど、まちにいる人が増えている。', unlocks: [] },
  { level: 68, postsRequired: 295, title: 'あそび場', summary: '雨でも遊べる屋内の部屋ができる。', unlocks: ['あそび場'] },
  { level: 69, postsRequired: 301, title: 'レベル69', summary: '誰かの言葉がひとつ、また置かれていく。', unlocks: [] },
  { level: 70, postsRequired: 307, title: '外周の柵', summary: 'まちの境界が引かれ、内と外が分かれる。', unlocks: ['柵×3'] },
  { level: 71, postsRequired: 313, title: 'レベル71', summary: '見た目は同じまま、まちに馴染んでいく時間。', unlocks: [] },
  { level: 72, postsRequired: 319, title: 'みんなの台所', summary: '一緒にごはんを作れる場所。最後の建物が建つ。', unlocks: ['台所'] },
  { level: 73, postsRequired: 325, title: 'レベル73', summary: '次に何かが建つまでの、あいだの日。', unlocks: [] },
  { level: 74, postsRequired: 331, title: '柵がつながる', summary: '五区画の柵がそろい、まちの輪郭が閉じる。', unlocks: ['柵×2'] },
  { level: 75, postsRequired: 338, title: 'レベル75', summary: '静かな日。人の行き来だけが少し増える。', unlocks: [] },
  { level: 76, postsRequired: 344, title: '池ができる', summary: '西の芝地に水がたまり、睡蓮が浮かぶ。', unlocks: ['池'] },
  { level: 77, postsRequired: 350, title: 'レベル77', summary: '変わったところはないけれど、まちにいる人が増えている。', unlocks: [] },
  { level: 78, postsRequired: 356, title: '郵便ポストと切り株', summary: '外とつながる手段と、腰かけられる切り株。', unlocks: ['ポスト', '切り株'] },
  { level: 79, postsRequired: 362, title: 'レベル79', summary: '誰かの言葉がひとつ、また置かれていく。', unlocks: [] },
  { level: 80, postsRequired: 369, title: 'きのこが生える', summary: '湿った木かげに、小さなきのこが顔を出す。', unlocks: ['きのこ×4'] },
  { level: 81, postsRequired: 375, title: 'レベル81', summary: '見た目は同じまま、まちに馴染んでいく時間。', unlocks: [] },
  { level: 82, postsRequired: 381, title: '花がひろがる', summary: '残りの芝地にも花畑。まちの中が咲きそろう。', unlocks: ['花畑×3'] },
  { level: 83, postsRequired: 388, title: 'レベル83', summary: '次に何かが建つまでの、あいだの日。', unlocks: [] },
  { level: 84, postsRequired: 394, title: 'レベル84', summary: '静かな日。人の行き来だけが少し増える。', unlocks: [] },
  { level: 85, postsRequired: 401, title: 'レベル85', summary: '変わったところはないけれど、まちにいる人が増えている。', unlocks: [] },
  { level: 86, postsRequired: 407, title: '田んぼがひらく', summary: '川のこちら側に水田と農家。まちの外に暮らしが出る。', unlocks: ['水田×12', '農家×2', '防風林'] },
  { level: 87, postsRequired: 413, title: 'レベル87', summary: '誰かの言葉がひとつ、また置かれていく。', unlocks: [] },
  { level: 88, postsRequired: 420, title: '川向こうの田', summary: '対岸にも田が広がる。作れる量が増える。', unlocks: ['水田×18'] },
  { level: 89, postsRequired: 426, title: 'レベル89', summary: '見た目は同じまま、まちに馴染んでいく時間。', unlocks: [] },
  { level: 90, postsRequired: 433, title: 'まわりの集落', summary: 'まちの東西と背後にも田と農家。ひとつの里になる。', unlocks: ['水田×9', '農家×5'] },
  { level: 91, postsRequired: 440, title: 'レベル91', summary: '次に何かが建つまでの、あいだの日。', unlocks: [] },
  { level: 92, postsRequired: 446, title: '橋がかかる', summary: '川に橋が渡り、北への道がつながる。', unlocks: ['橋'] },
  { level: 93, postsRequired: 453, title: 'レベル93', summary: '静かな日。人の行き来だけが少し増える。', unlocks: [] },
  { level: 94, postsRequired: 460, title: '遠くの街が見える', summary: '地平に最初のビル群が立ち上がる。', unlocks: ['ビル×7'] },
  { level: 95, postsRequired: 466, title: 'レベル95', summary: '変わったところはないけれど、まちにいる人が増えている。', unlocks: [] },
  { level: 96, postsRequired: 473, title: '街が育つ', summary: 'スカイラインが厚みを増す。', unlocks: ['ビル×6'] },
  { level: 97, postsRequired: 480, title: 'レベル97', summary: '誰かの言葉がひとつ、また置かれていく。', unlocks: [] },
  { level: 98, postsRequired: 486, title: '街とつながる', summary: '遠くの街が完成し、夜は窓の灯りが並ぶ。', unlocks: ['ビル×6'] },
  { level: 99, postsRequired: 493, title: 'レベル99', summary: '見た目は同じまま、まちに馴染んでいく時間。', unlocks: [] },
  { level: 100, postsRequired: 500, title: 'まちの門', summary: '入口へ花のアーチが立つ。村は、ちゃんとしたまちになった。', unlocks: ['花のアーチ×2'] },
  { level: 101, postsRequired: 504, title: 'レベル101', summary: '次に何かが建つまでの、あいだの日。', unlocks: [] },
  { level: 102, postsRequired: 509, title: 'レベル102', summary: '静かな日。人の行き来だけが少し増える。', unlocks: [] },
  { level: 103, postsRequired: 515, title: '町家が並ぶ', summary: '広場の外に、小さな家々が輪になって建ちはじめる。', unlocks: ['町家の並び'] },
  { level: 104, postsRequired: 521, title: 'レベル104', summary: '変わったところはないけれど、まちにいる人が増えている。', unlocks: [] },
  { level: 105, postsRequired: 527, title: 'レベル105', summary: '誰かの言葉がひとつ、また置かれていく。', unlocks: [] },
  { level: 106, postsRequired: 534, title: 'レベル106', summary: '見た目は同じまま、まちに馴染んでいく時間。', unlocks: [] },
  { level: 107, postsRequired: 541, title: 'レベル107', summary: '次に何かが建つまでの、あいだの日。', unlocks: [] },
  { level: 108, postsRequired: 548, title: '商店が開く', summary: '家並みにひさし付きの店がまじり、通りに賑わいが出る。', unlocks: ['商店の並び'] },
  { level: 109, postsRequired: 556, title: 'レベル109', summary: '静かな日。人の行き来だけが少し増える。', unlocks: [] },
  { level: 110, postsRequired: 563, title: 'レベル110', summary: '変わったところはないけれど、まちにいる人が増えている。', unlocks: [] },
  { level: 111, postsRequired: 571, title: 'レベル111', summary: '誰かの言葉がひとつ、また置かれていく。', unlocks: [] },
  { level: 112, postsRequired: 579, title: 'レベル112', summary: '見た目は同じまま、まちに馴染んでいく時間。', unlocks: [] },
  { level: 113, postsRequired: 586, title: '広場前の通り', summary: '二列目の家並みができ、通りらしくなってくる。', unlocks: ['町家の並び'] },
  { level: 114, postsRequired: 594, title: 'レベル114', summary: '次に何かが建つまでの、あいだの日。', unlocks: [] },
  { level: 115, postsRequired: 603, title: 'レベル115', summary: '静かな日。人の行き来だけが少し増える。', unlocks: [] },
  { level: 116, postsRequired: 611, title: 'レベル116', summary: '変わったところはないけれど、まちにいる人が増えている。', unlocks: [] },
  { level: 117, postsRequired: 619, title: 'レベル117', summary: '誰かの言葉がひとつ、また置かれていく。', unlocks: [] },
  { level: 118, postsRequired: 628, title: '三階建てがふえる', summary: '家が背を伸ばし、まちに高さが出はじめる。', unlocks: ['三階建ての家'] },
  { level: 119, postsRequired: 636, title: 'レベル119', summary: '見た目は同じまま、まちに馴染んでいく時間。', unlocks: [] },
  { level: 120, postsRequired: 645, title: 'レベル120', summary: '次に何かが建つまでの、あいだの日。', unlocks: [] },
  { level: 121, postsRequired: 654, title: 'レベル121', summary: '静かな日。人の行き来だけが少し増える。', unlocks: [] },
  { level: 122, postsRequired: 663, title: 'レベル122', summary: '変わったところはないけれど、まちにいる人が増えている。', unlocks: [] },
  { level: 123, postsRequired: 671, title: '街灯の並木道', summary: '新しい通りに沿って、街灯がずらりとともる。', unlocks: ['街灯の並び'] },
  { level: 124, postsRequired: 680, title: 'レベル124', summary: '誰かの言葉がひとつ、また置かれていく。', unlocks: [] },
  { level: 125, postsRequired: 689, title: 'レベル125', summary: '見た目は同じまま、まちに馴染んでいく時間。', unlocks: [] },
  { level: 126, postsRequired: 699, title: 'レベル126', summary: '次に何かが建つまでの、あいだの日。', unlocks: [] },
  { level: 127, postsRequired: 708, title: 'レベル127', summary: '静かな日。人の行き来だけが少し増える。', unlocks: [] },
  { level: 128, postsRequired: 717, title: 'ふたつめの広場', summary: '少し離れた場所に、もうひとつの小さな緑地ができる。', unlocks: ['小さな広場'] },
  { level: 129, postsRequired: 726, title: 'レベル129', summary: '変わったところはないけれど、まちにいる人が増えている。', unlocks: [] },
  { level: 130, postsRequired: 736, title: 'レベル130', summary: '誰かの言葉がひとつ、また置かれていく。', unlocks: [] },
  { level: 131, postsRequired: 745, title: 'レベル131', summary: '見た目は同じまま、まちに馴染んでいく時間。', unlocks: [] },
  { level: 132, postsRequired: 755, title: 'レベル132', summary: '次に何かが建つまでの、あいだの日。', unlocks: [] },
  { level: 133, postsRequired: 764, title: 'レベル133', summary: '静かな日。人の行き来だけが少し増える。', unlocks: [] },
  { level: 134, postsRequired: 774, title: '中層の街区', summary: '石づくりの街区ビルが建ちならぶ。まちが都市の顔になる。', unlocks: ['街区ビル'] },
  { level: 135, postsRequired: 784, title: 'レベル135', summary: '変わったところはないけれど、まちにいる人が増えている。', unlocks: [] },
  { level: 136, postsRequired: 793, title: 'レベル136', summary: '誰かの言葉がひとつ、また置かれていく。', unlocks: [] },
  { level: 137, postsRequired: 803, title: 'レベル137', summary: '見た目は同じまま、まちに馴染んでいく時間。', unlocks: [] },
  { level: 138, postsRequired: 813, title: 'レベル138', summary: '次に何かが建つまでの、あいだの日。', unlocks: [] },
  { level: 139, postsRequired: 823, title: 'レベル139', summary: '静かな日。人の行き来だけが少し増える。', unlocks: [] },
  { level: 140, postsRequired: 833, title: '駅ができる', summary: '大きな屋根の駅。まちが外の世界とつながる。', unlocks: ['駅'] },
  { level: 141, postsRequired: 843, title: 'レベル141', summary: '変わったところはないけれど、まちにいる人が増えている。', unlocks: [] },
  { level: 142, postsRequired: 853, title: 'レベル142', summary: '誰かの言葉がひとつ、また置かれていく。', unlocks: [] },
  { level: 143, postsRequired: 863, title: 'レベル143', summary: '見た目は同じまま、まちに馴染んでいく時間。', unlocks: [] },
  { level: 144, postsRequired: 873, title: 'レベル144', summary: '次に何かが建つまでの、あいだの日。', unlocks: [] },
  { level: 145, postsRequired: 884, title: 'レベル145', summary: '静かな日。人の行き来だけが少し増える。', unlocks: [] },
  { level: 146, postsRequired: 894, title: '時計塔', summary: 'まちのどこからでも見える時計塔が立つ。', unlocks: ['時計塔'] },
  { level: 147, postsRequired: 904, title: 'レベル147', summary: '変わったところはないけれど、まちにいる人が増えている。', unlocks: [] },
  { level: 148, postsRequired: 914, title: 'レベル148', summary: '誰かの言葉がひとつ、また置かれていく。', unlocks: [] },
  { level: 149, postsRequired: 925, title: 'レベル149', summary: '見た目は同じまま、まちに馴染んでいく時間。', unlocks: [] },
  { level: 150, postsRequired: 935, title: 'レベル150', summary: '次に何かが建つまでの、あいだの日。', unlocks: [] },
  { level: 151, postsRequired: 946, title: 'レベル151', summary: '静かな日。人の行き来だけが少し増える。', unlocks: [] },
  { level: 152, postsRequired: 956, title: '商店街', summary: '街区がのびて、ひとつづきの商店街になる。', unlocks: ['街区ビル'] },
  { level: 153, postsRequired: 967, title: 'レベル153', summary: '変わったところはないけれど、まちにいる人が増えている。', unlocks: [] },
  { level: 154, postsRequired: 977, title: 'レベル154', summary: '誰かの言葉がひとつ、また置かれていく。', unlocks: [] },
  { level: 155, postsRequired: 988, title: 'レベル155', summary: '見た目は同じまま、まちに馴染んでいく時間。', unlocks: [] },
  { level: 156, postsRequired: 999, title: 'レベル156', summary: '次に何かが建つまでの、あいだの日。', unlocks: [] },
  { level: 157, postsRequired: 1009, title: 'レベル157', summary: '静かな日。人の行き来だけが少し増える。', unlocks: [] },
  { level: 158, postsRequired: 1020, title: '川沿いの遊歩道', summary: '川のほとりに、灯りの並ぶ遊歩道ができる。', unlocks: ['遊歩道'] },
  { level: 159, postsRequired: 1031, title: 'レベル159', summary: '変わったところはないけれど、まちにいる人が増えている。', unlocks: [] },
  { level: 160, postsRequired: 1042, title: 'レベル160', summary: '誰かの言葉がひとつ、また置かれていく。', unlocks: [] },
  { level: 161, postsRequired: 1053, title: 'レベル161', summary: '見た目は同じまま、まちに馴染んでいく時間。', unlocks: [] },
  { level: 162, postsRequired: 1063, title: 'レベル162', summary: '次に何かが建つまでの、あいだの日。', unlocks: [] },
  { level: 163, postsRequired: 1074, title: 'レベル163', summary: '静かな日。人の行き来だけが少し増える。', unlocks: [] },
  { level: 164, postsRequired: 1085, title: '郊外の住宅地', summary: 'まちのさらに外側にも、家々が広がっていく。', unlocks: ['郊外の住宅'] },
  { level: 165, postsRequired: 1096, title: 'レベル165', summary: '変わったところはないけれど、まちにいる人が増えている。', unlocks: [] },
  { level: 166, postsRequired: 1107, title: 'レベル166', summary: '誰かの言葉がひとつ、また置かれていく。', unlocks: [] },
  { level: 167, postsRequired: 1118, title: 'レベル167', summary: '見た目は同じまま、まちに馴染んでいく時間。', unlocks: [] },
  { level: 168, postsRequired: 1130, title: 'レベル168', summary: '次に何かが建つまでの、あいだの日。', unlocks: [] },
  { level: 169, postsRequired: 1141, title: 'レベル169', summary: '静かな日。人の行き来だけが少し増える。', unlocks: [] },
  { level: 170, postsRequired: 1152, title: '街区がひろがる', summary: '中層のビルがもう一列、外へと連なる。', unlocks: ['街区ビル'] },
  { level: 171, postsRequired: 1163, title: 'レベル171', summary: '変わったところはないけれど、まちにいる人が増えている。', unlocks: [] },
  { level: 172, postsRequired: 1174, title: 'レベル172', summary: '誰かの言葉がひとつ、また置かれていく。', unlocks: [] },
  { level: 173, postsRequired: 1185, title: 'レベル173', summary: '見た目は同じまま、まちに馴染んでいく時間。', unlocks: [] },
  { level: 174, postsRequired: 1197, title: 'レベル174', summary: '次に何かが建つまでの、あいだの日。', unlocks: [] },
  { level: 175, postsRequired: 1208, title: 'レベル175', summary: '静かな日。人の行き来だけが少し増える。', unlocks: [] },
  { level: 176, postsRequired: 1219, title: '高台の街', summary: 'いちばん外の通りに、少し背の高いビルが建つ。', unlocks: ['高層の街区'] },
  { level: 177, postsRequired: 1231, title: 'レベル177', summary: '変わったところはないけれど、まちにいる人が増えている。', unlocks: [] },
  { level: 178, postsRequired: 1242, title: 'レベル178', summary: '誰かの言葉がひとつ、また置かれていく。', unlocks: [] },
  { level: 179, postsRequired: 1254, title: 'レベル179', summary: '見た目は同じまま、まちに馴染んでいく時間。', unlocks: [] },
  { level: 180, postsRequired: 1265, title: 'レベル180', summary: '次に何かが建つまでの、あいだの日。', unlocks: [] },
  { level: 181, postsRequired: 1277, title: 'レベル181', summary: '静かな日。人の行き来だけが少し増える。', unlocks: [] },
  { level: 182, postsRequired: 1288, title: '副都心', summary: '遠景の手前に、高層ビル群が立ち上がる。', unlocks: ['高層ビル群'] },
  { level: 183, postsRequired: 1300, title: 'レベル183', summary: '変わったところはないけれど、まちにいる人が増えている。', unlocks: [] },
  { level: 184, postsRequired: 1311, title: 'レベル184', summary: '誰かの言葉がひとつ、また置かれていく。', unlocks: [] },
  { level: 185, postsRequired: 1323, title: 'レベル185', summary: '見た目は同じまま、まちに馴染んでいく時間。', unlocks: [] },
  { level: 186, postsRequired: 1334, title: 'レベル186', summary: '次に何かが建つまでの、あいだの日。', unlocks: [] },
  { level: 187, postsRequired: 1346, title: 'レベル187', summary: '静かな日。人の行き来だけが少し増える。', unlocks: [] },
  { level: 188, postsRequired: 1358, title: '都会が育つ', summary: '遠くの街が、厚みと高さを増していく。', unlocks: ['ビル群'] },
  { level: 189, postsRequired: 1369, title: 'レベル189', summary: '変わったところはないけれど、まちにいる人が増えている。', unlocks: [] },
  { level: 190, postsRequired: 1381, title: 'レベル190', summary: '誰かの言葉がひとつ、また置かれていく。', unlocks: [] },
  { level: 191, postsRequired: 1393, title: 'レベル191', summary: '見た目は同じまま、まちに馴染んでいく時間。', unlocks: [] },
  { level: 192, postsRequired: 1405, title: 'レベル192', summary: '次に何かが建つまでの、あいだの日。', unlocks: [] },
  { level: 193, postsRequired: 1417, title: '摩天楼', summary: '二十階建ての摩天楼が、空へ届く。', unlocks: ['摩天楼'] },
  { level: 194, postsRequired: 1428, title: 'レベル194', summary: '静かな日。人の行き来だけが少し増える。', unlocks: [] },
  { level: 195, postsRequired: 1440, title: 'レベル195', summary: '変わったところはないけれど、まちにいる人が増えている。', unlocks: [] },
  { level: 196, postsRequired: 1452, title: 'レベル196', summary: '誰かの言葉がひとつ、また置かれていく。', unlocks: [] },
  { level: 197, postsRequired: 1464, title: '光の街', summary: '夜になると、窓の灯りが一面に広がるようになった。', unlocks: [] },
  { level: 198, postsRequired: 1476, title: 'レベル198', summary: '見た目は同じまま、まちに馴染んでいく時間。', unlocks: [] },
  { level: 199, postsRequired: 1488, title: 'レベル199', summary: '次に何かが建つまでの、あいだの日。', unlocks: [] },
  { level: 200, postsRequired: 1500, title: '大都市', summary: '三つのランドマークタワーが完成。村は、はるかな大都市になった。', unlocks: ['ランドマークタワー'] },
]

/** The level a town with this many posts has reached. */
export function levelForPosts(posts: number): number {
  const total = Math.max(0, Math.floor(posts))
  let level = 1
  for (const entry of TOWN_LEVELS) {
    if (entry.postsRequired > total) break
    level = entry.level
  }
  return level
}

export function townLevel(level: number): TownLevel {
  const clamped = Math.min(MAX_TOWN_LEVEL, Math.max(1, Math.floor(level)))
  return TOWN_LEVELS[clamped - 1]
}

/** Posts still needed for the next level, or null once the town is finished. */
export function postsToNextLevel(posts: number): number | null {
  const next = TOWN_LEVELS[levelForPosts(posts)]
  return next ? Math.max(0, next.postsRequired - Math.max(0, Math.floor(posts))) : null
}

/** Every level from `from` (exclusive) to `to` (inclusive) that revealed something. */
export function unlocksBetween(from: number, to: number): TownLevel[] {
  return TOWN_LEVELS.filter(
    (entry) => entry.level > from && entry.level <= to && entry.unlocks.length > 0,
  )
}
