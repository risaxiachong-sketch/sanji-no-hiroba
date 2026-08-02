import type { Avatar } from '../../types'
import { useSoundEffects } from '../../audio/SoundContext'
import { AvatarPicker } from '../AvatarPicker/AvatarPicker'

interface Props {
  avatar: Avatar
  onAvatarChange: (avatar: Avatar) => Promise<void> | void
  onBack: () => void
}

export function SettingsAvatar({ avatar, onAvatarChange, onBack }: Props) {
  const { play } = useSoundEffects()
  const handleConfirm = async (next: Avatar) => {
    try {
      if (next.id !== avatar.id) await onAvatarChange(next)
      onBack()
    } catch {
      play('error')
      alert('アバターを保存できませんでした。通信状況を確認して、もう一度お試しください。')
    }
  }

  return (
    <AvatarPicker
      initialAvatar={avatar}
      onConfirm={(next) => void handleConfirm(next)}
      onBack={onBack}
    />
  )
}
