import type { Avatar } from '../../types'
import { AvatarPicker } from '../AvatarPicker/AvatarPicker'

interface Props {
  onSelect: (avatar: Avatar) => void
}

export function AvatarSelect({ onSelect }: Props) {
  return <AvatarPicker onConfirm={onSelect} />
}
