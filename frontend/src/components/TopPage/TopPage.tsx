import heroImg from '../../assets/hero.png'
import styles from './TopPage.module.css'

interface Props {
  onEnter: () => void
}

export function TopPage({ onEnter }: Props) {
  return (
    <main className={styles.main}>
      <section className={styles.card}>
        <div className={styles.hero}>
          <img
            src={heroImg}
            className={styles.heroImg}
            width="170"
            height="179"
            alt="さんじのひろばのイメージ"
          />
        </div>

        <div className={styles.welcome}>
          <h1 className={styles.title}>さんじのひろば</h1>
          <p className={styles.catchcopy}>
            子育ての途中に、<br />ひとりじゃない時間を。
          </p>
          <p className={styles.description}>
            0〜3歳のお子さんを育てる保護者のための、<br />
            バーチャル子育て広場です。<br />
            ゆるくつながり、地域のイベントも探せます。
          </p>

          <button
            type="button"
            className="btn-primary"
            onClick={onEnter}
          >
            ひろばに入る
          </button>
        </div>
      </section>
    </main>
  )
}
