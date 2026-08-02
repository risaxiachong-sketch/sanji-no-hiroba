import homeHero from '../../assets/branding/home-hero.png'
import homeHeroWide from '../../assets/branding/home-hero-wide.png'
import styles from './TopPage.module.css'

interface Props {
  onEnter: () => void
  onOpenBulletinBoard: () => void
  onAdminAccess: () => void
}

interface EntryActionsProps extends Props {
  variant: 'mobile' | 'wide'
}

function EntryActions({
  onEnter,
  onOpenBulletinBoard,
  onAdminAccess,
  variant,
}: EntryActionsProps) {
  return (
    <div className={`${styles.entryArea} ${styles[variant]}`}>
      <div className={styles.actions}>
        <button
          type="button"
          className={`${styles.actionBtn} ${styles.enterBtn}`}
          data-sfx="navigate"
          onClick={onEnter}
        >
          <span className={`${styles.buttonMark} ${styles.enterMark}`} aria-hidden="true" />
          <span className={styles.buttonText}>ひろばに入る</span>
          <span className={styles.buttonArrow} aria-hidden="true">›</span>
        </button>

        <button
          type="button"
          className={`${styles.actionBtn} ${styles.boardBtn}`}
          data-sfx="navigate"
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
        data-sfx="navigate"
        onClick={onAdminAccess}
        aria-label="施設担当者向けイベント登録画面へ"
      >
        <span className={styles.adminIcon} aria-hidden="true" />
        施設担当者はこちら
      </button>
    </div>
  )
}

export function TopPage({ onEnter, onOpenBulletinBoard, onAdminAccess }: Props) {
  return (
    <main className={styles.main}>
      <section className={styles.screen} aria-labelledby="home-title" aria-describedby="home-description">
        <h1 id="home-title" className={styles.visuallyHidden}>アルパカのあくび</h1>
        <p id="home-description" className={styles.visuallyHidden}>
          子育ての日々の小さな共感から、地域の居場所につながるオンライン広場
        </p>

        <div className={styles.mobileLayout}>
          <div className={styles.hero}>
            <img
              src={homeHero}
              className={styles.heroImg}
              alt="アルパカとやさしい街並みが描かれたホーム画面"
            />
          </div>

          <EntryActions
            variant="mobile"
            onEnter={onEnter}
            onOpenBulletinBoard={onOpenBulletinBoard}
            onAdminAccess={onAdminAccess}
          />
        </div>

        <div className={styles.wideLayout}>
          <div className={styles.wideVisual} aria-hidden="true">
            <img src={homeHeroWide} className={styles.wideHeroImg} alt="" />
          </div>

          <div className={styles.widePanel}>
            <div className={styles.brandLogo} aria-hidden="true">
              <span className={styles.logoCoral}>アル</span>
              <span className={styles.logoYellow}>パ</span>
              <span className={styles.logoGreen}>カ</span>
              <span className={styles.logoBrown}>の</span>
              <span className={styles.logoPink}>あ</span>
              <span className={styles.logoOrange}>く</span>
              <span className={styles.logoBlue}>び</span>
            </div>

            <div className={styles.wideMessage} aria-hidden="true">
              <p>子育ての日々の小さな共感から、</p>
              <p>地域の居場所につながるオンライン広場</p>
            </div>

            <EntryActions
              variant="wide"
              onEnter={onEnter}
              onOpenBulletinBoard={onOpenBulletinBoard}
              onAdminAccess={onAdminAccess}
            />
          </div>
        </div>
      </section>
    </main>
  )
}
