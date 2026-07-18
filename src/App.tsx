import heroImg from './assets/hero.png'
import './App.css'

function App() {
  return (
    <main>
      <section id="center">
        <div className="hero">
          <img
            src={heroImg}
            className="base"
            width="170"
            height="179"
            alt="さんじのひろばのイメージ"
          />
        </div>

        <div className="welcome">
          <h1>さんじのひろば</h1>

          <p>
            子育ての途中に、ひとりじゃない時間を。
          </p>

          <button type="button" className="enter-button">
            ひろばに入る
          </button>
        </div>
      </section>
    </main>
  )
}

export default App