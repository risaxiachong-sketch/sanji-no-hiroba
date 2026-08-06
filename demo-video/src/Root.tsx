import { Composition } from 'remotion'
import { SanjiFeatureDemo4x3 } from './SanjiFeatureDemo4x3'
import { VIDEO_DURATION_FRAMES, VIDEO_FPS } from './timeline'

export const RemotionRoot = () => (
  <Composition
    id="SanjiFeatureDemo4x3"
    component={SanjiFeatureDemo4x3}
    durationInFrames={VIDEO_DURATION_FRAMES}
    fps={VIDEO_FPS}
    width={1440}
    height={1080}
  />
)
