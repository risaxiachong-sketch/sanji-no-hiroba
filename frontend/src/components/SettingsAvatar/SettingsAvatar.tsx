import type { Avatar } from '../../types'
import { AvatarPicker } from '../AvatarPicker/AvatarPicker'

interface Props {
  avatar: Avatar
  onAvatarChange: (avatar: Avatar) => void
  onBack: () => void
}

export function SettingsAvatar({ avatar, onAvatarChange, onBack }: Props) {
  const handleConfirm = (next: Avatar) => {
    if (next.id !== avatar.id) onAvatarChange(next)
    onBack()
  }

  return (
    <AvatarPicker
      initialAvatar={avatar}
      onConfirm={handleConfirm}
      onBack={onBack}
    />
  )
}
