import { SUPPORT_LINKS } from '../../data/supportLinks'
import styles from './SupportInfo.module.css'

const CATEGORY_LABEL: Record<string, string> = {
  info:         '総合情報',
  consultation: '相談窓口',
  hotline:      '電話相談',
  facility:     '支援施設',
}

interface Props {
  onBack: () => void
}

export function SupportInfo({ onBack }: Props) {
  return (
    <div className={styles.page}>
      {/* ヘッダー */}
      <header className={styles.header}>
        <button type="button" className="btn-back" onClick={onBack} aria-label="広場に戻る">
          ← 戻る
        </button>
        <h1 className={styles.title}>相談・支援案内所</h1>
        <div style={{ width: '60px' }} />
      </header>

      <div className={styles.body}>
        {/* 注意バナー */}
        <div className={styles.notice} role="note">
          <div className={styles.noticeTitle}>
            <span aria-hidden="true">ℹ️</span>
            <span>このページについて</span>
          </div>
          <p style={{ margin: 0 }}>
            ここに掲載しているのは、公式の相談・支援機関への案内です。
            本サービスは医療・心理・福祉の専門的な判断を行いません。
            気になることがあれば、ぜひ各機関にご相談ください。
          </p>
        </div>

        {/* 機関カード一覧 */}
        {SUPPORT_LINKS.map(link => (
          <article key={link.id} className={styles.card}>
            <div className={styles.cardHeader}>
              <span
                className={`${styles.categoryBadge} ${styles[`badge-${link.category}`]}`}
              >
                {CATEGORY_LABEL[link.category]}
              </span>
            </div>
            <h2 className={styles.cardName}>{link.name}</h2>
            <p className={styles.cardDesc}>{link.description}</p>
            <div className={styles.cardActions}>
              {link.phone && (
                <a
                  href={`tel:${link.phone}`}
                  className={styles.phoneLink}
                  aria-label={`${link.name}に電話する: ${link.phone}`}
                >
                  <span aria-hidden="true">📞</span>
                  {link.phone}
                </a>
              )}
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.webLink}
                aria-label={`${link.name}の公式サイトを開く（外部サイト）`}
              >
                <span aria-hidden="true">🔗</span>
                公式サイト ↗
              </a>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
