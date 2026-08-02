import { useState } from 'react'
import { createEvent, uploadEventImage } from '../../api/events'
import { useSoundEffects } from '../../audio/SoundContext'
import type { Event, FacilityType } from '../../types'
import styles from './AdminEventForm.module.css'

const ADMIN_CODE_KEY = 'sanji-admin-code'

interface Props {
  onBack: () => void
}

export function AdminEventForm({ onBack }: Props) {
  const { play } = useSoundEffects()
  const [facilityCode, setFacilityCode] = useState(() => sessionStorage.getItem(ADMIN_CODE_KEY) ?? '')
  const [authenticated, setAuthenticated] = useState(() => Boolean(sessionStorage.getItem(ADMIN_CODE_KEY)))
  const [authError, setAuthError] = useState('')
  const [providerName, setProviderName] = useState('')
  const [eventName, setEventName] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [ageGroup, setAgeGroup] = useState('0〜1歳')
  const [location, setLocation] = useState('')
  const [address, setAddress] = useState('')
  const [facilityType, setFacilityType] = useState<FacilityType>('community-center')
  const [description, setDescription] = useState('')
  const [officialUrl, setOfficialUrl] = useState('')
  const [price, setPrice] = useState<'free' | 'paid'>('free')
  const [reservationRequired, setReservationRequired] = useState(false)
  const [indoor, setIndoor] = useState(true)
  const [nursingRoom, setNursingRoom] = useState(false)
  const [diaperChange, setDiaperChange] = useState(false)
  const [strollerOk, setStrollerOk] = useState(true)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const handleCodeSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    const code = facilityCode.trim()
    if (!code) {
      setAuthError('施設コードを入力してください。')
      play('error')
      return
    }
    sessionStorage.setItem(ADMIN_CODE_KEY, code)
    setFacilityCode(code)
    setAuthenticated(true)
    setAuthError('')
    play('success')
  }

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      setSubmitError('画像は5MB以下にしてください。')
      play('error')
      return
    }
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      setSubmitError('JPEGまたはPNGの画像を選んでください。')
      play('error')
      return
    }

    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
    setSubmitError('')
  }

  const ageValues = () => {
    if (ageGroup === '0〜1歳') return { ageMin: 0, ageMax: 1 }
    if (ageGroup === '2〜3歳') return { ageMin: 2, ageMax: 3 }
    return { ageMin: 4, ageMax: 6 }
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!providerName.trim() || !eventName.trim() || !eventDate || !startTime || !endTime || !location.trim()) {
      setSubmitError('必須項目を入力してください。')
      play('error')
      return
    }

    setSubmitting(true)
    setSubmitError('')
    try {
      const imageUrl = imageFile ? await uploadEventImage(imageFile, facilityCode) : undefined
      const ages = ageValues()
      const eventInput: Omit<Event, 'id'> = {
        title: eventName.trim(),
        date: eventDate,
        time: `${startTime}〜${endTime}`,
        ...ages,
        ageRange: ageGroup,
        location: location.trim(),
        address: address.trim(),
        facilityType,
        price,
        priceLabel: price === 'free' ? '無料' : '有料',
        indoor,
        reservationRequired,
        nursingRoom,
        diaperChange,
        strollerOk,
        source: providerName.trim(),
        officialUrl: officialUrl.trim() || '#',
        lastConfirmed: new Date().toISOString().slice(0, 10),
        description: description.trim(),
        status: 'scheduled',
        imageUrl,
      }
      await createEvent(eventInput, facilityCode)
      setSubmitted(true)
      play('success')
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'イベントを登録できませんでした。')
      play('error')
    } finally {
      setSubmitting(false)
    }
  }

  if (!authenticated) {
    return (
      <div className={styles.page}>
        <header className={styles.header}>
          <button type="button" className="btn-back" data-sfx="back" onClick={onBack} aria-label="前の画面に戻る">
            ← 戻る
          </button>
          <h1 className={styles.headerTitle}>施設担当者ログイン</h1>
          <div style={{ width: '60px' }} />
        </header>
        <form className={styles.authCard} onSubmit={handleCodeSubmit}>
          <p className={styles.authText}>
            施設からイベントを登録する画面です。発行された施設コードを入力してください。
          </p>
          <input
            type="password"
            className={styles.input}
            value={facilityCode}
            onChange={(event) => setFacilityCode(event.target.value)}
            placeholder="施設コード"
            aria-label="施設コード"
            autoComplete="off"
          />
          {authError && <p className={styles.error}>{authError}</p>}
          <button type="submit" className="btn-primary" data-sfx="navigate">イベント登録へ</button>
        </form>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className={styles.page}>
        <header className={styles.header}>
          <button type="button" className="btn-back" data-sfx="back" onClick={onBack} aria-label="前の画面に戻る">
            ← 戻る
          </button>
          <h1 className={styles.headerTitle}>登録完了</h1>
          <div style={{ width: '60px' }} />
        </header>
        <div className={styles.successCard}>
          <p className={styles.successText}>イベントを登録しました。掲示板にも反映されます。</p>
          <button type="button" className="btn-primary" data-sfx="navigate" onClick={() => setSubmitted(false)}>
            続けて登録する
          </button>
          <button type="button" className="btn-secondary" data-sfx="back" onClick={onBack}>トップに戻る</button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button type="button" className="btn-back" data-sfx="back" onClick={onBack} aria-label="前の画面に戻る">
          ← 戻る
        </button>
        <h1 className={styles.headerTitle}>イベント登録</h1>
        <button
          type="button"
          className="btn-back"
          data-sfx="back"
          onClick={() => {
            sessionStorage.removeItem(ADMIN_CODE_KEY)
            setAuthenticated(false)
            setFacilityCode('')
          }}
        >
          退出
        </button>
      </header>

      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="providerName">施設名 *</label>
          <input id="providerName" className={styles.input} value={providerName} onChange={(event) => setProviderName(event.target.value)} required />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="eventName">イベント名 *</label>
          <input id="eventName" className={styles.input} value={eventName} onChange={(event) => setEventName(event.target.value)} required maxLength={100} />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="eventDate">開催日 *</label>
          <input id="eventDate" type="date" className={styles.input} value={eventDate} onChange={(event) => setEventDate(event.target.value)} required />
        </div>
        <div className={styles.row}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="startTime">開始 *</label>
            <input id="startTime" type="time" className={styles.input} value={startTime} onChange={(event) => setStartTime(event.target.value)} required />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="endTime">終了 *</label>
            <input id="endTime" type="time" className={styles.input} value={endTime} onChange={(event) => setEndTime(event.target.value)} required />
          </div>
        </div>
        <div className={styles.row}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="ageGroup">対象年齢</label>
            <select id="ageGroup" className={styles.input} value={ageGroup} onChange={(event) => setAgeGroup(event.target.value)}>
              <option>0〜1歳</option>
              <option>2〜3歳</option>
              <option>4歳〜就学前</option>
            </select>
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="facilityType">施設種別</label>
            <select id="facilityType" className={styles.input} value={facilityType} onChange={(event) => setFacilityType(event.target.value as FacilityType)}>
              <option value="community-center">公民館</option>
              <option value="library">図書館</option>
              <option value="museum">博物館・科学館</option>
              <option value="childcare-center">子育て支援施設</option>
              <option value="other">その他</option>
            </select>
          </div>
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="location">会場名 *</label>
          <input id="location" className={styles.input} value={location} onChange={(event) => setLocation(event.target.value)} required />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="address">住所</label>
          <input id="address" className={styles.input} value={address} onChange={(event) => setAddress(event.target.value)} />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="description">イベント内容</label>
          <textarea id="description" className={styles.textarea} value={description} onChange={(event) => setDescription(event.target.value)} rows={4} />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="officialUrl">公式サイトURL</label>
          <input id="officialUrl" type="url" className={styles.input} value={officialUrl} onChange={(event) => setOfficialUrl(event.target.value)} placeholder="https://..." />
        </div>
        <fieldset className={styles.options}>
          <legend className={styles.label}>参加条件・設備</legend>
          <label><input type="radio" name="price" checked={price === 'free'} onChange={() => setPrice('free')} /> 無料</label>
          <label><input type="radio" name="price" checked={price === 'paid'} onChange={() => setPrice('paid')} /> 有料</label>
          <label><input type="checkbox" checked={indoor} onChange={(event) => setIndoor(event.target.checked)} /> 屋内</label>
          <label><input type="checkbox" checked={reservationRequired} onChange={(event) => setReservationRequired(event.target.checked)} /> 予約が必要</label>
          <label><input type="checkbox" checked={nursingRoom} onChange={(event) => setNursingRoom(event.target.checked)} /> 授乳室</label>
          <label><input type="checkbox" checked={diaperChange} onChange={(event) => setDiaperChange(event.target.checked)} /> おむつ交換</label>
          <label><input type="checkbox" checked={strollerOk} onChange={(event) => setStrollerOk(event.target.checked)} /> ベビーカー対応</label>
        </fieldset>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="imageFile">イベント画像（JPEG/PNG・5MB以下）</label>
          <input id="imageFile" type="file" accept="image/jpeg,image/png" className={styles.fileInput} onChange={handleImageChange} />
          {imagePreview && (
            <div className={styles.preview}>
              <img src={imagePreview} alt="選択したイベント画像" className={styles.previewImg} />
              <button type="button" className={styles.removeBtn} onClick={() => { setImageFile(null); setImagePreview(null) }}>
                削除
              </button>
            </div>
          )}
        </div>
        {submitError && <p className={styles.error}>{submitError}</p>}
        <button type="submit" className="btn-primary" data-sfx="send" disabled={submitting}>
          {submitting ? '登録しています…' : 'イベントを登録する'}
        </button>
      </form>
    </div>
  )
}
