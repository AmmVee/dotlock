import { useEffect, useState } from 'react';
import './App.css';

const COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#F7B731', '#9B59B6', '#E74C3C'];
const W = 6, H = 9;
let globalId = 0;

export default function App() {
    const [points, setPoints] = useState([]);
    const [path, setPath] = useState([]);
    const [score, setScore] = useState(0);
    const [combo, setCombo] = useState(1);
    const [timeLeft, setTimeLeft] = useState(60);
    const [gameState, setGameState] = useState('menu');
    const [highScore, setHighScore] = useState(0);
    const [leaderboard, setLeaderboard] = useState([]);
    const [showLb, setShowLb] = useState(false);

    const tg = window.Telegram?.WebApp;
    const sb = window.sb;

    useEffect(() => {
        tg?.ready();
        tg?.expand();

        const saved = localStorage.getItem('dotlock_hs');
        if (saved) setHighScore(parseInt(saved));

        loadPersonalBest();
        loadGlobalTop();
    }, []);

    const loadPersonalBest = async () => {
        if (!tg?.initDataUnsafe?.user) return;

        const { data, error } = await sb
            .from('leaderboard')
            .select('score')
            .eq('user_id', tg.initDataUnsafe.user.id)
            .order('score', { ascending: false })
            .limit(1);

        if (error) return;

        if (data?.[0]?.score > highScore) {
            setHighScore(data[0].score);
            localStorage.setItem('dotlock_hs', data[0].score);
        }
    };

    const loadGlobalTop = async () => {
        const { data, error } = await sb
            .from('leaderboard')
            .select('username, score')  // ←←← Только эти колонки, first_name НЕТ!
            .not('score', 'is', null)
            .order('score', { ascending: false })
            .limit(20);

        if (error) {
            console.log('Leaderboard error:', error);
            setLeaderboard([]);
            return;
        }

        setLeaderboard(data || []);
    };

    const sendRecord = async () => {
        if (!tg?.initDataUnsafe?.user || score <= highScore) return;

        const user = tg.initDataUnsafe.user;

        const { error } = await sb.from('leaderboard').insert({
            user_id: user.id,
            username: user.username || 'Игрок',  // если нет username — будет "Игрок"
            score: score
        });

        if (error) {
            console.log('Send record error:', error);
            return;
        }

        setHighScore(score);
        localStorage.setItem('dotlock_hs', score);
        loadGlobalTop();
        tg?.HapticFeedback.notificationOccurred('success');
    };

    const generatePoints = () => {
        const newPoints = [];
        for (const color of COLORS) {
            for (let num = 1; num <= 7; num++) {
                let x, y, attempts = 0;
                do {
                    x = Math.floor(Math.random() * W);
                    y = Math.floor(Math.random() * H);
                    attempts++;
                } while (newPoints.some(p => p.x === x && p.y === y) && attempts < 100);

                newPoints.push({
                    x,
                    y,
                    color,
                    number: num,
                    id: ++globalId
                });
            }
        }
        setPoints(newPoints);
    };

    const startGame = () => {
        setScore(0);
        setCombo(1);
        setTimeLeft(60);
        setPath([]);
        setGameState('playing');
        generatePoints();

        const timer = setInterval(() => {
            setTimeLeft(t => {
                if (t <= 1) {
                    clearInterval(timer);
                    setGameState('gameover');
                    if (score > highScore) sendRecord();
                    return 0;
                }
                return t - 1;
            });
        }, 1000);
    };

    const handleClick = (point) => {
        if (gameState !== 'playing') return;

        if (path.length > 0) {
            const last = path[path.length - 1];
            if (point.color !== last.color || Math.abs(point.number - last.number) !== 1) {
                setPath([]);
                return;
            }
        }

        if (path.includes(point)) return;

        const newPath = [...path, point];
        setPath(newPath);
        tg?.HapticFeedback.impactOccurred('light');

        if (newPath.length === 7) {
            const numbers = newPath.map(p => p.number).sort((a, b) => a - b);
            const isFullAsc = numbers.every((n, i) => n === i + 1);
            const isFullDesc = numbers.every((n, i) => n === 7 - i);

            if (isFullAsc || isFullDesc) {
                const earned = Math.floor(7 * 7 * combo * 13);
                setScore(s => s + earned);
                setCombo(c => c + 0.4);

                setPoints(prev => prev.filter(p => !newPath.includes(p)));
                setPath([]);
                setTimeout(generatePoints, 350);
            }
        }
    };

    if (showLb) {
        return (
            <div className="menu">
                <h1 style={{ fontSize: '52px', marginBottom: '30px' }}>Глобальный топ</h1>
                <div className="lb">
                    {leaderboard.length === 0 ? (
                        <p style={{ opacity: 0.7, fontSize: '18px' }}>Пока никто не играл :(</p>
                    ) : (
                        leaderboard.map((p, i) => (
                            <div key={i} className="lb-row">
                                <span>
                                    {i < 3 ? ['🥇', '🥈', '🥉'][i] : `${i + 1}.`} {p.username || 'Игрок'}
                                </span>
                                <span style={{ color: '#ffd700', fontWeight: 'bold' }}>{p.score.toLocaleString()}</span>
                            </div>
                        ))
                    )}
                </div>
                <button className="play" onClick={() => setShowLb(false)}>Назад</button>
            </div>
        );
    }

    return (
        <div className="app">
            <div className="header">
                <div>Score: {score.toLocaleString()}</div>
                <div style={{ color: timeLeft <= 10 ? '#ff3b30' : '#ffd700' }}>{timeLeft}s</div>
                <div>x{combo.toFixed(1)}</div>
            </div>

            {gameState === 'menu' && (
                <div className="menu">
                    <h1>DOTLOCK</h1>
                    <p className="record">Рекорд: {highScore.toLocaleString()}</p>
                    <button className="play" onClick={startGame}>ИГРАТЬ</button>
                    <button className="play lb" onClick={() => { loadGlobalTop(); setShowLb(true); }}>ГЛОБАЛЬНЫЙ ТОП</button>
                    <p style={{ marginTop: '40px', fontSize: '14px', opacity: 0.6 }}>
                        Собери полную цепочку 1→2→3→4→5→6→7<br />
                        Можно с любого конца!
                    </p>
                </div>
            )}

            {gameState === 'playing' && (
                <div className="field">
                    {points.map(p => (
                        <div
                            key={p.id}
                            className={`dot ${path.includes(p) ? 'active' : ''}`}
                            style={{ background: p.color, left: p.x * 58 + 10, top: p.y * 58 + 10 }}
                            onPointerDown={() => handleClick(p)}
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
                    <button className="play" onClick={startGame}>ИГРАТЬ СНОВА</button>
                    <button className="play lb" onClick={() => { loadGlobalTop(); setShowLb(true); }}>ГЛОБАЛЬНЫЙ ТОП</button>
                </div>
            )}
        </div>
    );
}
