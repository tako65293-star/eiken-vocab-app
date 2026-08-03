import { useState } from "react";
import verbUnit1 from "./data/verb_unit1.json";

const units = [verbUnit1]; // 今後unitが増えたらここに追加していく

function App() {
  const [selectedUnit, setSelectedUnit] = useState(null);

  return (
    <div className="app">
      <header className="app-header">
        <p className="eyebrow">英検準二級</p>
        <h1>単語アプリ</h1>
      </header>

      {!selectedUnit ? (
        <div className="unit-list">
          {units.map((u) => (
            <button
              key={u.unit}
              className="unit-card"
              onClick={() => setSelectedUnit(u)}
            >
              <span className="unit-name">{u.unit}</span>
              <span className="unit-count">{u.words.length}語</span>
            </button>
          ))}
        </div>
      ) : (
        <WordList unit={selectedUnit} onBack={() => setSelectedUnit(null)} />
      )}
    </div>
  );
}

function WordList({ unit, onBack }) {
  const speak = (text) => {
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "en-US";
    window.speechSynthesis.speak(utter);
  };

  return (
    <div className="word-list">
      <button className="back-btn" onClick={onBack}>← unit一覧へ戻る</button>
      <h2>{unit.unit}</h2>
      {unit.words.map((w) => (
        <div key={w.id} className="word-item">
          <div className="word-item-top">
            <span className="word-en">{w.word}</span>
            <button className="speak-btn" onClick={() => speak(w.word)}>🔊</button>
          </div>
          <div className="word-meaning">{w.meaning_ja}</div>
          <div className="word-example">
            <div>{w.example_en}</div>
            <div className="word-example-ja">{w.example_ja}</div>
          </div>
          {/* TODO: ここに後でメモ・画像追加ボタン、小テスト導線を追加していく */}
        </div>
      ))}
    </div>
  );
}

export default App;