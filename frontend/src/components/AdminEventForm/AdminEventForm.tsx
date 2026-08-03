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
      <div className={`${styles.page} ${styles.authPage}`}>
        <header className={styles.authHeader}>
          <button type="button" className={styles.authBack} data-sfx="back" onClick={onBack} aria-label="前の画面に戻る">
            <span className={styles.authBackArrow} aria-hidden="true">←</span>
            戻る
          </button>
          <span className={styles.authBrand}>アルパカのあくび</span>
        </header>
        <main className={styles.authMain}>
          <section className={styles.authIntro} aria-labelledby="facility-login-title">
            <p className={styles.authEyebrow}>施設担当者向け</p>
            <h1 id="facility-login-title" className={styles.authTitle}>イベント登録</h1>
            <span className={styles.authRule} aria-hidden="true" />
            <p className={styles.authLead}>地域の親子へ、施設のイベント情報を届けます。</p>
          </section>

          <form className={styles.authCard} onSubmit={handleCodeSubmit}>
            <div className={styles.authCardHeader}>
              <h2>施設コードでログイン</h2>
              <p>発行された施設コードを入力してください。</p>
            </div>
            <div className={styles.authField}>
              <label htmlFor="facilityCode">施設コード</label>
              <input
                id="facilityCode"
                type="password"
                className={`${styles.input} ${styles.authInput}`}
                value={facilityCode}
                onChange={(event) => setFacilityCode(event.target.value)}
                placeholder="施設コードを入力"
                autoComplete="off"
              />
            </div>
            {authError && <p className={styles.error} role="alert">{authError}</p>}
            <button type="submit" className={styles.authSubmit} data-sfx="navigate">
              <span>イベント登録画面へ</span>
              <span className={styles.authSubmitArrow} aria-hidden="true">→</span>
            </button>
          </form>
        </main>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className={`${styles.page} ${styles.adminPage}`}>
        <header className={styles.adminHeader}>
          <button type="button" className={styles.adminHeaderButton} data-sfx="back" onClick={onBack} aria-label="前の画面に戻る">
            <span aria-hidden="true">←</span>
            戻る
          </button>
          <span className={styles.adminHeaderTitle}>イベント登録</span>
          <span className={styles.headerSpacer} aria-hidden="true" />
        </header>
        <main className={styles.successMain}>
          <div className={styles.successMark} aria-hidden="true">✓</div>
          <p className={styles.successEyebrow}>登録が完了しました</p>
          <h1 className={styles.successTitle}>イベントを公開しました</h1>
          <p className={styles.successText}>登録した情報は、まちの掲示板にも反映されます。</p>
          <button type="button" className={styles.adminPrimaryButton} data-sfx="navigate" onClick={() => setSubmitted(false)}>
            続けて登録する
          </button>
          <button type="button" className={styles.adminSecondaryButton} data-sfx="back" onClick={onBack}>トップに戻る</button>
        </main>
      </div>
    )
  }

  return (
    <div className={`${styles.page} ${styles.adminPage}`}>
      <header className={styles.adminHeader}>
        <button type="button" className={styles.adminHeaderButton} data-sfx="back" onClick={onBack} aria-label="前の画面に戻る">
          <span aria-hidden="true">←</span>
          戻る
        </button>
        <span className={styles.adminHeaderTitle}>イベント登録</span>
        <button
          type="button"
          className={`${styles.adminHeaderButton} ${styles.logoutButton}`}
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

      <section className={styles.formIntro} aria-labelledby="event-form-title">
        <p className={styles.formEyebrow}>施設担当者向け</p>
        <h1 id="event-form-title">イベント登録</h1>
        <p>掲示板に掲載する情報を入力してください。</p>
      </section>

      <form className={styles.form} onSubmit={handleSubmit}>
        <section className={styles.formSection} aria-labelledby="section-basic">
          <div className={styles.sectionHeading}>
            <h2 id="section-basic">基本情報</h2>
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="providerName">施設名 <span className={styles.required}>必須</span></label>
            <input id="providerName" className={styles.input} value={providerName} onChange={(event) => setProviderName(event.target.value)} placeholder="例：さくら公民館" required />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="eventName">イベント名 <span className={styles.required}>必須</span></label>
            <input id="eventName" className={styles.input} value={eventName} onChange={(event) => setEventName(event.target.value)} placeholder="例：親子でリトミック" required maxLength={100} />
          </div>
        </section>

        <section className={styles.formSection} aria-labelledby="section-schedule">
          <div className={styles.sectionHeading}>
            <h2 id="section-schedule">開催日時</h2>
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="eventDate">開催日 <span className={styles.required}>必須</span></label>
            <input id="eventDate" type="date" className={styles.input} value={eventDate} onChange={(event) => setEventDate(event.target.value)} required />
          </div>
          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="startTime">開始 <span className={styles.required}>必須</span></label>
              <input id="startTime" type="time" className={styles.input} value={startTime} onChange={(event) => setStartTime(event.target.value)} required />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="endTime">終了 <span className={styles.required}>必須</span></label>
              <input id="endTime" type="time" className={styles.input} value={endTime} onChange={(event) => setEndTime(event.target.value)} required />
            </div>
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="ageGroup">対象年齢</label>
            <select id="ageGroup" className={styles.input} value={ageGroup} onChange={(event) => setAgeGroup(event.target.value)}>
              <option>0〜1歳</option>
              <option>2〜3歳</option>
              <option>4歳〜就学前</option>
            </select>
          </div>
        </section>

        <section className={styles.formSection} aria-labelledby="section-place">
          <div className={styles.sectionHeading}>
            <h2 id="section-place">会場情報</h2>
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
          <div className={styles.field}>
            <label className={styles.label} htmlFor="location">会場名 <span className={styles.required}>必須</span></label>
            <input id="location" className={styles.input} value={location} onChange={(event) => setLocation(event.target.value)} placeholder="例：2階 和室" required />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="address">住所</label>
            <input id="address" className={styles.input} value={address} onChange={(event) => setAddress(event.target.value)} placeholder="例：宮崎市○○町1-2-3" />
          </div>
        </section>

        <section className={styles.formSection} aria-labelledby="section-details">
          <div className={styles.sectionHeading}>
            <h2 id="section-details">イベント詳細</h2>
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="description">説明</label>
            <textarea id="description" className={styles.textarea} value={description} onChange={(event) => setDescription(event.target.value)} rows={5} placeholder="持ち物や当日の流れなどを入力してください。" />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="officialUrl">公式サイトURL</label>
            <input id="officialUrl" type="url" className={styles.input} value={officialUrl} onChange={(event) => setOfficialUrl(event.target.value)} placeholder="https://example.jp/event" />
          </div>
        </section>

        <section className={styles.formSection} aria-labelledby="section-options">
          <div className={styles.sectionHeading}>
            <h2 id="section-options">参加費・設備</h2>
          </div>
          <fieldset className={styles.priceOptions}>
            <legend className={styles.label}>参加費</legend>
            <label className={styles.choiceLabel}><input type="radio" name="price" checked={price === 'free'} onChange={() => setPrice('free')} /><span>無料</span></label>
            <label className={styles.choiceLabel}><input type="radio" name="price" checked={price === 'paid'} onChange={() => setPrice('paid')} /><span>有料</span></label>
          </fieldset>
          <fieldset className={styles.equipmentOptions}>
            <legend className={styles.label}>設備・利用条件</legend>
            <label className={styles.checkLabel}><input type="checkbox" checked={indoor} onChange={(event) => setIndoor(event.target.checked)} /><span>屋内</span></label>
            <label className={styles.checkLabel}><input type="checkbox" checked={reservationRequired} onChange={(event) => setReservationRequired(event.target.checked)} /><span>予約が必要</span></label>
            <label className={styles.checkLabel}><input type="checkbox" checked={nursingRoom} onChange={(event) => setNursingRoom(event.target.checked)} /><span>授乳室</span></label>
            <label className={styles.checkLabel}><input type="checkbox" checked={diaperChange} onChange={(event) => setDiaperChange(event.target.checked)} /><span>おむつ交換</span></label>
            <label className={styles.checkLabel}><input type="checkbox" checked={strollerOk} onChange={(event) => setStrollerOk(event.target.checked)} /><span>ベビーカー対応</span></label>
          </fieldset>
        </section>

        <section className={styles.formSection} aria-labelledby="section-image">
          <div className={styles.sectionHeading}>
            <h2 id="section-image">掲載画像</h2>
          </div>
          <div className={styles.field}>
            <label className={styles.fileLabel} htmlFor="imageFile">画像を選択</label>
            <p className={styles.fileHint}>JPEGまたはPNG、5MB以下</p>
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
        </section>

        <div className={styles.submitArea}>
          {submitError && <p className={styles.error} role="alert">{submitError}</p>}
          <button type="submit" className={styles.adminPrimaryButton} data-sfx="send" disabled={submitting}>
            {submitting ? '登録しています…' : 'イベントを登録する'}
          </button>
          <p>入力した内容は、登録後にまちの掲示板へ反映されます。</p>
        </div>
      </form>
    </div>
  )
}
