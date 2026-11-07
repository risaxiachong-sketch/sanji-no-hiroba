import { useState } from 'react'
import type { GoogleAccountConflict } from '../../api/firebase'
import { firebaseAuthErrorCode } from '../../api/firebase'
import { useAuth } from '../../auth/AuthContext'
import { useProfile } from '../../hooks/useProfile'
import styles from './GoogleSignIn.module.css'

interface Props {
  onBack: () => void
}

function googleAuthErrorMessage(cause: unknown): string {
  switch (firebaseAuthErrorCode(cause)) {
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return 'Googleログインをキャンセルしました。必要なときに、もう一度お試しください。'
    case 'auth/popup-blocked':
      return 'ポップアップがブロックされました。ブラウザでポップアップを許可して、もう一度お試しください。'
    case 'auth/network-request-failed':
      return '通信できませんでした。インターネット接続を確認して、もう一度お試しください。'
    case 'auth/unauthorized-domain':
      return 'このURLではGoogleログインを利用できません。管理者にお知らせください。'
    case 'auth/operation-not-allowed':
      return 'Googleログインの準備が完了していません。しばらくしてからお試しください。'
    default:
      return 'Googleログインに失敗しました。時間をおいて、もう一度お試しください。'
  }
}

export function GoogleSignIn({ onBack }: Props) {
  const auth = useAuth()
  const { profileStatus, refreshProfile } = useProfile()
  const [conflict, setConflict] = useState<GoogleAccountConflict | null>(null)
  const [isWorking, setIsWorking] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const isRestoring = auth.status === 'loading'
    || (auth.status === 'google' && profileStatus === 'loading')

  const startGoogleAuthentication = async () => {
    if (isWorking) return
    setIsWorking(true)
    setError(null)
    setMessage(null)
    try {
      // This call must remain directly inside the click path so browsers allow
      // Firebase to open the Google account chooser.
      const result = await auth.authenticateWithGoogle()
      if (result.kind === 'existing-account-conflict') {
        setConflict(result)
        return
      }
      setConflict(null)
      setMessage(result.upgradedAnonymous
        ? 'これまでのデータをGoogleアカウントに引き継ぎました。'
        : 'Googleアカウントを確認しました。')
    } catch (cause) {
      setError(googleAuthErrorMessage(cause))
    } finally {
      setIsWorking(false)
    }
  }

  const continueWithExistingAccount = async () => {
    if (!conflict || isWorking) return
    setIsWorking(true)
    setError(null)
    try {
      await conflict.continueWithExistingAccount()
      setConflict(null)
      setMessage('登録済みのGoogleアカウントを開きました。')
    } catch (cause) {
      setError(googleAuthErrorMessage(cause))
    } finally {
      setIsWorking(false)
    }
  }

  const retryProfile = async () => {
    setIsWorking(true)
    setError(null)
    try {
      await refreshProfile()
    } catch {
      setError('プロフィールを読み込めませんでした。通信状況を確認して、もう一度お試しください。')
    } finally {
      setIsWorking(false)
    }
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <button type="button" className={styles.backButton} onClick={onBack} disabled={isWorking}>
          <span aria-hidden="true">‹</span>
          <span>戻る</span>
        </button>
        <div className={styles.titleBlock}>
          <p className={styles.eyebrow}>Welcome</p>
          <h1 className={styles.title}>Googleアカウントで続ける</h1>
          <span className={styles.titleRule} aria-hidden="true" />
          <p className={styles.subtitle}>別の端末でも、同じプロフィールを使えます</p>
        </div>
      </header>

      <section className={styles.card} aria-labelledby="google-sign-in-title">
        <div className={styles.googleMark} aria-hidden="true">G</div>
        <div className={styles.copy}>
          <h2 id="google-sign-in-title">
            {auth.status === 'legacy-anonymous' ? 'いまのデータを引き継ぎます' : 'かんたん・安全に登録できます'}
          </h2>
          <p>
            {auth.status === 'legacy-anonymous'
              ? 'これまでのプロフィールや保存内容を残したまま、Googleアカウントに登録できます。'
              : 'メールアドレスは広場には表示されません。投稿では、設定したニックネームだけを使います。'}
          </p>
        </div>

        {conflict ? (
          <div className={styles.conflict} role="alert">
            <h3>このGoogleアカウントは登録済みです</h3>
            <p>
              {conflict.email ? `${conflict.email} の` : ''}登録済みプロフィールを開きますか？
              今の匿名利用中の内容は、自動では統合されません。
            </p>
            <button
              type="button"
              className={styles.primaryButton}
              onClick={continueWithExistingAccount}
              disabled={isWorking}
            >
              {isWorking ? '確認中…' : '登録済みのプロフィールを開く'}
            </button>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() => { setConflict(null); void startGoogleAuthentication() }}
              disabled={isWorking}
            >
              別のGoogleアカウントを選ぶ
            </button>
          </div>
        ) : profileStatus === 'error' && auth.status === 'google' ? (
          <button type="button" className={styles.primaryButton} onClick={retryProfile} disabled={isWorking}>
            {isWorking ? '読み込み中…' : 'プロフィールをもう一度読み込む'}
          </button>
        ) : (
          <button
            type="button"
            className={styles.primaryButton}
            onClick={startGoogleAuthentication}
            disabled={isWorking || isRestoring}
          >
            <span className={styles.buttonGoogleMark} aria-hidden="true">G</span>
            <span>{isWorking || isRestoring ? '確認中…' : 'Googleで登録・ログイン'}</span>
          </button>
        )}

        <div className={styles.feedback} aria-live="polite">
          {message ? <p className={styles.success}>{message}</p> : null}
          {error ? <p className={styles.error} role="alert">{error}</p> : null}
        </div>

        <p className={styles.note}>Googleのパスワードを、このサイトが受け取ることはありません。</p>
      </section>
    </main>
  )
}
