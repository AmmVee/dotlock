import { useEffect, useState } from 'react';
import './App.css';

const COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#F7B731', '#9B59B6', '#E74C3C'];
const GRID_W = 6;
const GRID_H = 9;

const tg = window.Telegram?.WebApp;
const sb = window.sb; // Supabase клиент из index.html

export default function App() {
  const [points, setPoints] = useState([]);
  const [path, setPath] = useState([]);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(1);
  const [timeLeft, setTimeLeft] = useState(60);
  const [gameState, setGameState] = useState('ready');
  const [highScore, setHighScore] = useState(0);
  const [leaderboard, setLeaderboard] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Загружаем личный рекорд и топ-10 при старте
  useEffect(() => {
    tg?.ready();
    tg?.expand();

    if (!tg?.initDataUnsafe?.user) return;

    const userId = tg.initDataUnsafe.user.id;

    const loadData = async () => {
      setIsLoading(true);

      // Личный рекорд
      const { data: personal } = await sb
        .from('leaderboard')
        .select('score')
        .eq('user_id', userId)
        .order('score', { ascending: false })
        .limit(1);

      if (personal?.[0]?.score) {
        const best = personal[0].score;
        setHighScore(best);
        localStorage.setItem('dotlock_hs', best);
      } else {
        const saved = localStorage.getItem('dotlock_hs');
        if (saved) setHighScore(parseInt(saved));
      }

      // Глобальный топ-10
      const { data: top } = await sb
        .from('leaderboard')
        .select('score, username, first_name')
        .order('score', { ascending: false })
        .limit(10);

      setLeaderboard(top || []);
      setIsLoading(false);
    };

    loadData();
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

  const sendToLeaderboard = async () => {
    if (!tg?.initDataUnsafe?.user || score <= highScore) return;

    const user = tg.initDataUnsafe.user;

    await sb.from('leaderboard').insert({
      user_id: user.id,
      username: user.username || null,
      first_name: user.first_name || user.username || 'Player',
      score: score
    });

    setHighScore(score);
    localStorage.setItem('dotlock_hs', score);

    // Обновляем топ-10
    const { data } = await sb
      .from('leaderboard')
      .select('score, username, first_name')
      .order('score', { ascending: false })
      .limit(10);

    setLeaderboard(data || []);
  };

  const startGame = () => {
    generatePoints();
    setScore(0);
    setCombo(1);
    setTimeLeft(60);
    setPath([]);
    setGameState('playing');

    const timer = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timer);
          setGameState('gameover');

          // Автоматическая отправка при новом рекорде
          if (score > highScore) {
            sendToLeaderboard();
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
        <div style={{ color: timeLeft <= 10 ? '#ff3b30' : '#ffd700' }}>{timeLeft}s</div>
        <div>x{combo.toFixed(1)}</div>
      </div>

      {gameState === 'ready' && (
        <div className="menu">
          <h1>DOTLOCK</h1>
          <p className="record">Рекорд: {highScore.toLocaleString()}</p>
          
          {leaderboard.length > 0 && (
            <div className="leaderboard-mini">
              <h3>Топ-10 игроков</h3>
              {leaderboard.map((entry, i) => (
                <div key={i} className="lb-row">
                  <span>{i + 1}. {entry.username || entry.first_name || 'Player'}</span>
                  <span>{entry.score.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}

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
          {score > highScore && <div className="sent">Отправлено в таблицу лидеров!</div>}

          {leaderboard.length > 0 && (
            <div className="leaderboard-mini">
              <h3>Текущий топ-10</h3>
              {leaderboard.map((entry, i) => (
                <div key={i} className="lb-row">
                  <span>{i + 1}. {entry.username || entry.first_name || 'Player'}</span>
                  <span>{entry.score.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}

          <button onClick={startGame} className="play">ИГРАТЬ СНОВА</button>
        </div>
      )}
    </div>
  );
}
