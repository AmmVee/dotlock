import { useEffect, useState } from 'react';
import './App.css';

const COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#F7B731', '#9B59B6', '#E74C3C'];
const GRID_W = 6;
const GRID_H = 9;

export default function App() {
  const [points, setPoints] = useState([]);
  const [path, setPath] = useState([]);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(1);
  const [timeLeft, setTimeLeft] = useState(60);
  const [gameState, setGameState] = useState('ready');
  const [highScore, setHighScore] = useState(0);

  const tg = window.Telegram?.WebApp;
  useEffect(() => { tg?.ready(); tg?.expand(); }, []);

  useEffect(() => {
    const saved = localStorage.getItem('dotlock_hs');
    if (saved) setHighScore(parseInt(saved));
  }, []);

  const generatePoints = () => {
    const newPoints = [];
    const counters = {};

    for (let i = 0; i < 54; i++) {
      const color = COLORS[Math.floor(Math.random() * COLORS.length)];
      counters[color] = (counters[color] || 0) + 1;
      if (counters[color] > 9) continue;

      let x, y, attempts = 0;
      do {
        x = Math.floor(Math.random() * GRID_W);
        y = Math.floor(Math.random() * GRID_H);
        attempts++;
      } while (newPoints.some(p => p.x === x && p.y === y) && attempts < 100);

      newPoints.push({ x, y, color, number: counters[color], id: Date.now() + i });
    }
    setPoints(newPoints.filter(p => p.number <= 9));
  };

  const startGame = () => {
    generatePoints();
    setScore(0);
    setCombo(1);
    setTimeLeft(60);
    setPath([]);
    setGameState('playing');

    const timer = setInterval GameOver => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timer);
          setGameState('gameover');
          if (score > highScore) {
            setHighScore(score);
            localStorage.setItem('dotlock_hs', score);
            tg?.HapticFeedback.notificationOccurred('success');
          }
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  };

  const handlePoint = (point) => {
    if (gameState !== 'playing') return;

    const last = path[path.length - 1];
    if (!last || (point.color === last.color && point.number === last.number + 1)) {
      setPath([...path, point]);
      tg?.HapticFeedback.impactOccurred('light');

      // Завершение цепочки
      if (point.number >= 7) {
        const length = path.length + 1;
        const earned = Math.floor(length * length * combo * 13);
        setScore(s => s + earned);
        setCombo(c => c + 0.4);

        setPoints(prev => prev.filter(p => !path.includes(p) && p !== point));
        setPath([]);
        setTimeout(generatePoints, 350);
      }
    }
  };

  return (
    <div className="app">
      <div className="header">
        <div>Score: {score.toLocaleString()}</div>
        <div style={{color: timeLeft <= 10 ? '#ff3b30' : '#ffd700'}}>{timeLeft}s</div>
        <div>x{combo.toFixed(1)}</div>
      </div>

      {gameState === 'ready' && (
        <div className="menu">
          <h1>DOTLOCK</h1>
          <p className="record">Рекорд: {highScore.toLocaleString()}</p>
          <button onClick={startGame} className="play">ИГРАТЬ</button>
          <p className="rules">Соединяй точки одного цвета по порядку 1→2→3...<br/>Чем длиннее цепь — тем больше очков!</p>
        </div>
      )}

      {gameState === 'playing' && (
        <div className="field">
          {points.map(p => (
            <div
              key={p.id}
              className={`dot ${path.includes(p) ? 'active' : ''}`}
              style={{ background: p.color, left: p.x * 58 + 10, top: p.y * 58 + 10 }}
              onPointerDown={() => handlePoint(p)}
            >
              {p.number}
            </div>
          ))}
        </div>
      )}

      {gameState === 'gameover' && (
        <div className="menu">
          <h2>Время вышло!</h2>
          <h1>{score.toLocaleString()} очков</h1>
          {score > highScore && <div className="newrecord">НОВЫЙ РЕКОРД!</div>}
          <button onClick={startGame} className="play">ИГРАТЬ СНОВА</button>
        </div>
      )}
    </div>
  );
}