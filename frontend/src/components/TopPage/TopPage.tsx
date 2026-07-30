import homeHero from '../../assets/branding/home-hero.png'
import styles from './TopPage.module.css'

interface Props {
  onEnter: () => void
  onOpenBulletinBoard: () => void
  onAdminAccess: () => void
}

export function TopPage({ onEnter, onOpenBulletinBoard, onAdminAccess }: Props) {
  return (
    <main className={styles.main}>
      <section className={styles.screen} aria-labelledby="home-title" aria-describedby="home-description">
        <h1 id="home-title" className={styles.visuallyHidden}>アルパカのあくび</h1>
        <p id="home-description" className={styles.visuallyHidden}>
          子育ての日々の小さな共感から、地域の居場所につながるオンライン広場
        </p>

        <div className={styles.hero}>
          <img
            src={homeHero}
            className={styles.heroImg}
            alt="アルパカとやさしい街並みが描かれたホーム画面"
          />
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            className={`${styles.actionBtn} ${styles.enterBtn}`}
            onClick={onEnter}
          >
            <span className={`${styles.buttonMark} ${styles.enterMark}`} aria-hidden="true" />
            <span className={styles.buttonText}>ひろばに入る</span>
            <span className={styles.buttonArrow} aria-hidden="true">›</span>
          </button>

          <button
            type="button"
            className={`${styles.actionBtn} ${styles.boardBtn}`}
            onClick={onOpenBulletinBoard}
          >
            <span className={`${styles.buttonMark} ${styles.boardMark}`} aria-hidden="true" />
            <span className={styles.buttonText}>まちの掲示板</span>
            <span className={styles.buttonArrow} aria-hidden="true">›</span>
          </button>
        </div>

        <button
          type="button"
          className={styles.adminBtn}
          onClick={onAdminAccess}
          aria-label="施設担当者向けイベント登録画面へ"
        >
          <span className={styles.adminIcon} aria-hidden="true" />
          施設担当者はこちら
        </button>
      </section>
    </main>
  )
}
