import { useState } from "react";
import "./App.css";

const unitModules = import.meta.glob("./data/*.json", { eager: true });
const units = Object.values(unitModules).map((mod) => mod.default);

const NOTES_KEY = "eiken-vocab-notes";

function loadNotes() {
  try {
    return JSON.parse(localStorage.getItem(NOTES_KEY)) || {};
  } catch {
    return {};
  }
}

function saveNotes(notes) {
  localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
}

function speak(text) {
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = "en-US";
  window.speechSynthesis.speak(utter);
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function App() {
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [mode, setMode] = useState("list");
  const [quizType, setQuizType] = useState(null);

  const openUnit = (u) => {
    setSelectedUnit(u);
    setMode("list");
  };

  const backToUnits = () => {
    setSelectedUnit(null);
    setMode("list");
  };

  const startQuiz = (type) => {
    setQuizType(type);
    setMode("quiz");
  };

  return (
    <div className="app">
      <header className="app-header">
        <p className="eyebrow">英検準二級</p>
        <h1>単語アプリ</h1>
      </header>

      {!selectedUnit && (
        <div className="unit-list">
          {units.map((u) => (
            <button key={u.unit} className="unit-card" onClick={() => openUnit(u)}>
              <span className="unit-name">{u.unit}</span>
              <span className="unit-count">{u.words.length}語</span>
            </button>
          ))}
        </div>
      )}

      {selectedUnit && mode === "list" && (
        <WordList
          unit={selectedUnit}
          onBack={backToUnits}
          onStartQuiz={() => setMode("quiz-menu")}
        />
      )}

      {selectedUnit && mode === "quiz-menu" && (
        <QuizMenu
          unit={selectedUnit}
          onBack={() => setMode("list")}
          onSelect={startQuiz}
        />
      )}

      {selectedUnit && mode === "quiz" && (
        <Quiz
          unit={selectedUnit}
          quizType={quizType}
          onBack={() => setMode("quiz-menu")}
          onFinish={() => setMode("list")}
        />
      )}
    </div>
  );
}

function WordList({ unit, onBack, onStartQuiz }) {
  const [notes, setNotes] = useState(loadNotes());
  const [openId, setOpenId] = useState(null);

  const updateNote = (wordId, patch) => {
    const next = { ...notes, [wordId]: { ...notes[wordId], ...patch } };
    setNotes(next);
    saveNotes(next);
  };

  const handleImage = (wordId, file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => updateNote(wordId, { image: reader.result });
    reader.readAsDataURL(file);
  };

  return (
    <div className="word-list">
      <button className="back-btn" onClick={onBack}>← unit一覧へ戻る</button>
      <h2>{unit.unit}</h2>

      <button className="quiz-btn" onClick={onStartQuiz}>小テストを始める</button>

      {unit.words.map((w) => {
        const note = notes[w.id] || {};
        const open = openId === w.id;
        return (
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

            {note.memo && !open && <div className="note-preview">📝 {note.memo}</div>}
            {note.image && !open && (
              <img className="note-thumb" src={note.image} alt="メモ画像" />
            )}

            <button className="note-toggle" onClick={() => setOpenId(open ? null : w.id)}>
              {open ? "閉じる" : "メモ・画像を追加/編集"}
            </button>

            {open && (
              <div className="note-editor">
                <textarea
                  placeholder="覚え方のメモ(例: グランドエスケープを連想)"
                  value={note.memo || ""}
                  onChange={(e) => updateNote(w.id, { memo: e.target.value })}
                />
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImage(w.id, e.target.files[0])}
                />
                {note.image && (
                  <img className="note-thumb" src={note.image} alt="メモ画像" />
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function QuizMenu({ unit, onBack, onSelect }) {
  return (
    <div className="quiz-menu">
      <button className="back-btn" onClick={onBack}>← {unit.unit}へ戻る</button>
      <h2>{unit.unit} 小テスト</h2>
      <button className="quiz-type-btn" onClick={() => onSelect("reading")}>
        読みの4択(英語→意味)
      </button>
      <button className="quiz-type-btn" onClick={() => onSelect("writing")}>
        書きの4択(意味→英語)
      </button>
      <button className="quiz-type-btn" onClick={() => onSelect("free")}>
        自由記述(意味→英語を入力)
      </button>
    </div>
  );
}

function buildQuestions(unit, quizType) {
  const words = unit.words;
  return shuffle(words).map((w) => {
    if (quizType === "reading") {
      const choices = shuffle([w.meaning_ja, ...w.distractors_ja.slice(0, 3)]);
      return { word: w, choices, answer: w.meaning_ja, prompt: w.word };
    }
    if (quizType === "writing") {
      const others = shuffle(words.filter((o) => o.id !== w.id)).slice(0, 3);
      const choices = shuffle([w.word, ...others.map((o) => o.word)]);
      return { word: w, choices, answer: w.word, prompt: w.meaning_ja };
    }
    return { word: w, answer: w.word, prompt: w.meaning_ja };
  });
}

function Quiz({ unit, quizType, onBack, onFinish }) {
  const [questions] = useState(() => buildQuestions(unit, quizType));
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState(null);
  const [textAnswer, setTextAnswer] = useState("");
  const [checked, setChecked] = useState(false);
  const [wrongWords, setWrongWords] = useState([]);

  if (index >= questions.length) {
    return (
      <div className="quiz-result">
        <h2>結果</h2>
        <p className="score-text">{score} / {questions.length} 問正解</p>
        {wrongWords.length > 0 && (
          <div className="wrong-list">
            <p>間違えた単語:</p>
            {wrongWords.map((w) => (
              <div key={w.id} className="wrong-item">
                <span className="word-en">{w.word}</span>
                <span>{w.meaning_ja}</span>
              </div>
            ))}
          </div>
        )}
        <button className="quiz-btn" onClick={onFinish}>単語一覧に戻る</button>
      </div>
    );
  }

  const q = questions[index];
  const isLast = index === questions.length - 1;

  const goNext = (wasCorrect, word) => {
    if (wasCorrect) setScore((s) => s + 1);
    else setWrongWords((w) => [...w, word]);
    setIndex(index + 1);
    setSelected(null);
    setTextAnswer("");
    setChecked(false);
  };

  const handleChoice = (choice) => {
    if (checked) return;
    setSelected(choice);
    setChecked(true);
  };

  const isCorrectChoice = checked && quizType !== "free" && selected === q.answer;
  const isCorrectFree =
    checked && quizType === "free" &&
    textAnswer.trim().toLowerCase() === q.answer.toLowerCase();
  const showResult = checked;
  const wasCorrect = quizType === "free" ? isCorrectFree : isCorrectChoice;

  return (
    <div className="quiz quiz-fullscreen">
      <div className="quiz-top">
        <button className="back-btn" onClick={onBack}>← 小テストメニューへ</button>
        <p className="quiz-progress">{index + 1} / {questions.length}</p>
      </div>

      <div className="quiz-prompt-big">{q.prompt}</div>

      {quizType !== "free" ? (
        <div className="choice-list-big">
          {q.choices.map((c) => {
            let cls = "choice-btn-big";
            if (checked) {
              if (c === q.answer) cls += " correct";
              else if (c === selected) cls += " wrong";
            }
            return (
              <button key={c} className={cls} onClick={() => handleChoice(c)}>
                {c}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="free-answer-big">
          <input
            type="text"
            value={textAnswer}
            disabled={checked}
            onChange={(e) => setTextAnswer(e.target.value)}
            placeholder="英単語を入力"
            autoFocus
          />
          {!checked && (
            <button className="quiz-btn" onClick={() => setChecked(true)}>答え合わせ</button>
          )}
        </div>
      )}

      {showResult && (
        <div className={"result-banner " + (wasCorrect ? "result-banner-ok" : "result-banner-ng")}>
          <span className="result-icon">{wasCorrect ? "◯" : "✕"}</span>
          <span className="result-text">
            {wasCorrect ? "正解!" : `不正解 正解: ${q.answer}`}
          </span>
        </div>
      )}

      {checked && (
        <button
          className="quiz-btn next-btn-big"
          onClick={() => goNext(wasCorrect, q.word)}
        >
          {isLast ? "結果を見る" : "次の問題へ"}
        </button>
      )}
    </div>
  );
}

export default App;