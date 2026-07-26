import { useState } from 'react'
import type { Event } from '../../types'
import { EVENTS } from '../../data/events'
import styles from './AdminEventForm.module.css'

const DEMO_PASSWORD = 'demo2025'

interface Props {
  onBack: () => void
}

export function AdminEventForm({ onBack }: Props) {
  const [authenticated, setAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')

  // フォーム入力
  const [providerName, setProviderName] = useState('')
  const [eventName, setEventName] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [ageGroup, setAgeGroup] = useState('0〜1歳')
  const [location, setLocation] = useState('')
  const [description, setDescription] = useState('')
  const [tags, setTags] = useState('')
  const [officialUrl, setOfficialUrl] = useState('')
  const [_imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (password === DEMO_PASSWORD) {
      setAuthenticated(true)
      setPasswordError('')
    } else {
      setPasswordError('パスワードが正しくありません')
    }
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('ファイルサイズは5MB以下にしてください')
        return
      }
      if (!['image/jpeg', 'image/png'].includes(file.type)) {
        alert('JPEG または PNG のみアップロード可能です')
        return
      }
      setImageFile(file)
      const reader = new FileReader()
      reader.onload = (ev) => {
        setImagePreview(ev.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!providerName.trim() || !eventName.trim() || !eventDate || !startTime || !endTime || !location.trim()) {
      alert('必須項目を入力してください')
      return
    }

    const newEvent: Event = {
      id: `ev-admin-${Date.now()}`,
      title: eventName.trim(),
      date: eventDate,
      time: `${startTime}〜${endTime}`,
      ageMin: ageGroup === '0〜1歳' ? 0 : ageGroup === '2〜3歳' ? 2 : 4,
      ageMax: ageGroup === '0〜1歳' ? 1 : ageGroup === '2〜3歳' ? 3 : 6,
      ageRange: ageGroup,
      location: location.trim(),
      address: '',
      facilityType: 'other',
      price: 'free',
      priceLabel: '無料',
      indoor: true,
      reservationRequired: false,
      nursingRoom: false,
      diaperChange: false,
      strollerOk: true,
      source: providerName.trim(),
      officialUrl: officialUrl.trim() || '#',
      lastConfirmed: new Date().toISOString().slice(0, 10),
      description: description.trim(),
      status: 'scheduled',
      imageUrl: imagePreview ?? undefined,
    }

    // ダミーで先頭に追加（本来はAPI呼び出し）
    EVENTS.unshift(newEvent)
    setSubmitted(true)
  }

  // パスワード入力画面
  if (!authenticated) {
    return (
      <div className={styles.page}>
        <header className={styles.header}>
          <button type="button" className="btn-back" onClick={onBack} aria-label="前の画面に戻る">
            ← 戻る
          </button>
          <h1 className={styles.headerTitle}>施設担当者ログイン</h1>
          <div style={{ width: '60px' }} />
        </header>
        <form className={styles.authCard} onSubmit={handlePasswordSubmit}>
          <p className={styles.authText}>施設側イベント登録画面です。<br />パスワードを入力してください。</p>
          <input
            type="password"
            className={styles.input}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="パスワード"
            aria-label="パスワード"
            autoComplete="current-password"
          />
          {passwordError && <p className={styles.error}>{passwordError}</p>}
          <button type="submit" className="btn-primary">
            ログイン
          </button>
        </form>
      </div>
    )
  }

  // 送信完了画面
  if (submitted) {
    return (
      <div className={styles.page}>
        <header className={styles.header}>
          <button type="button" className="btn-back" onClick={onBack} aria-label="前の画面に戻る">
            ← 戻る
          </button>
          <h1 className={styles.headerTitle}>登録完了</h1>
          <div style={{ width: '60px' }} />
        </header>
        <div className={styles.successCard}>
          <span className={styles.successIcon} aria-hidden="true">✅</span>
          <p className={styles.successText}>イベントが正常に登録されました</p>
          <button type="button" className="btn-primary" onClick={() => setSubmitted(false)}>
            続けて登録する
          </button>
          <button type="button" className="btn-secondary" onClick={onBack} style={{ marginTop: '8px' }}>
            トップに戻る
          </button>
        </div>
      </div>
    )
  }

  // イベント入力フォーム
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button type="button" className="btn-back" onClick={onBack} aria-label="前の画面に戻る">
          ← 戻る
        </button>
        <h1 className={styles.headerTitle}>イベント登録</h1>
        <div style={{ width: '60px' }} />
      </header>

      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="providerName">情報提供元・施設名 *</label>
          <input
            id="providerName"
            type="text"
            className={styles.input}
            value={providerName}
            onChange={(e) => setProviderName(e.target.value)}
            placeholder="例: 博多区東公民館"
            required
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="eventName">イベント名 *</label>
          <input
            id="eventName"
            type="text"
            className={styles.input}
            value={eventName}
            onChange={(e) => setEventName(e.target.value)}
            placeholder="例: 親子でリトミック♪"
            required
            maxLength={100}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="eventDate">開催日 *</label>
          <input
            id="eventDate"
            type="date"
            className={styles.input}
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
            required
          />
        </div>

        <div className={styles.row}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="startTime">開始時間 *</label>
            <input
              id="startTime"
              type="time"
              className={styles.input}
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="endTime">終了時間 *</label>
            <input
              id="endTime"
              type="time"
              className={styles.input}
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              required
            />
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="ageGroup">対象年齢区分 *</label>
          <select
            id="ageGroup"
            className={styles.input}
            value={ageGroup}
            onChange={(e) => setAgeGroup(e.target.value)}
          >
            <option value="0〜1歳">0〜1歳</option>
            <option value="2〜3歳">2〜3歳</option>
            <option value="4歳〜就学前">4歳〜就学前</option>
          </select>
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="location">開催場所 *</label>
          <input
            id="location"
            type="text"
            className={styles.input}
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="例: 博多区東公民館 2F多目的室"
            required
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="description">イベントの説明</label>
          <textarea
            id="description"
            className={styles.textarea}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="イベントの内容を入力"
            rows={4}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="tags">タグ（カンマ区切り）</label>
          <input
            id="tags"
            type="text"
            className={styles.input}
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="例: リトミック, 無料, 予約不要"
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="officialUrl">公式サイトURL</label>
          <input
            id="officialUrl"
            type="url"
            className={styles.input}
            value={officialUrl}
            onChange={(e) => setOfficialUrl(e.target.value)}
            placeholder="https://..."
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="imageFile">イベント画像（任意・5MB以下・JPEG/PNG）</label>
          <input
            id="imageFile"
            type="file"
            accept="image/jpeg,image/png"
            className={styles.fileInput}
            onChange={handleImageChange}
          />
          {imagePreview && (
            <div className={styles.preview}>
              <img src={imagePreview} alt="プレビュー" className={styles.previewImg} />
              <button
                type="button"
                className={styles.removeBtn}
                onClick={() => { setImageFile(null); setImagePreview(null) }}
                aria-label="画像を削除"
              >
                ✕ 削除
              </button>
            </div>
          )}
        </div>

        <button type="submit" className="btn-primary">
          イベントを登録する
        </button>
      </form>
    </div>
  )
}
