import { useEffect, useState } from 'react'

const COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#F7B731', '#9B59B6', '#E74C3C']
const W = 6, H = 9

export default function App() {
    const [points, setPoints] = useState([])
    const [path, setPath] = useState([])
    const [score, setScore] = useState(0)
    const [combo, setCombo] = useState(1)
    const [timeLeft, setTimeLeft] = useState(60)
    const [gameState, setGameState] = useState('menu')
    const [highScore, setHighScore] = useState(0)
    const [top, setTop] = useState([])
    const [showTop, setShowTop] = useState(false)

    const tg = window.Telegram?.WebApp
    const sb = window.supabaseClient // будем создавать в index.html

    useEffect(() => {
        tg?.ready()
        tg?.expand()

        const saved = localStorage.getItem('dotlock_hs')
        if (saved) setHighScore(+saved)

        loadTop()
        loadMyBest()
    }, [])

    const loadMyBest = async () => {
        if (!tg?.initDataUnsafe?.user || !sb) return
        const { data } = await sb
            .from('leaderboard')
            .select('score')
            .eq('user_id', tg.initDataUnsafe.user.id)
            .order('score', { ascending: false })
            .limit(1)

        if (data?.[0]?.score > highScore) {
            setHighScore(data[0].score)
            localStorage.setItem('dotlock_hs', data[0].score)
        }
    }

    const loadTop = async () => {
        if (!sb) return
        const { data } = await sb
            .from('leaderboard')
            .select('username, score')
            .order('score', { ascending: false })
            .limit(20)
        setTop(data || [])
    }

    const sendScore = async () => {
        if (!tg?.initDataUnsafe?.user || score <= highScore || !sb) return

        await sb.from('leaderboard').insert({
            user_id: tg.initDataUnsafe.user.id,
            username: tg.initDataUnsafe.user.username || 'Игрок',
            score
        })

        setHighScore(score)
        localStorage.setItem('dotlock_hs', score)
        loadTop()
        tg?.HapticFeedback?.notificationOccurred('success')
    }

    const generate = () => {
        const pts = []
        for (const col of COLORS) {
            for (let n = 1; n <= 7; n++) {
                let x, y
                do {
                    x = Math.floor(Math.random() * W)
                    y = Math.floor(Math.random() * H)
                } while (pts.some(p => p.x === x && p.y === y))
                pts.push({ x, y, color: col, number: n, id: Math.random() })
            }
        }
        setPoints(pts)
    }

    const start = () => {
        setScore(0)
        setCombo(1)
        setTimeLeft(60)
        setPath([])
        setGameState('play')
        generate()

        const timer = setInterval(() => {
            setTimeLeft(t => {
                if (t <= 1) {
                    clearInterval(timer)
                    setGameState('over')
                    if (score > highScore) sendScore()
                    return 0
                }
                return t - 1
            })
        }, 1000)
    }

    const click = (p) => {
        if (gameState !== 'play') return
        if (path.length > 0) {
            const last = path.at(-1)
            if (p.color !== last.color || Math.abs(p.number - last.number) !== 1) {
                setPath([])
                return
            }
        }
        if (path.includes(p)) return

        const newPath = [...path, p]
        setPath(newPath)
        tg?.HapticFeedback?.impactOccurred('light')

        if (newPath.length === 7) {
            const nums = newPath.map(x => x.number).sort((a, b) => a - b)
            if (nums.every((n, i) => n === i + 1) || nums.every((n, i) => n === 7 - i)) {
                setScore(s => s + Math.floor(49 * combo * 13))
                setCombo(c => c + 0.4)
                setPoints(prev => prev.filter(x => !newPath.includes(x)))
                setPath([])
                setTimeout(generate, 350)
            }
        }
    }

    if (showTop) {
        return (
            <div style={{ textAlign: 'center', paddingTop: '80px' }}>
                <h1 style={{ fontSize: '48px', marginBottom: '30px' }}>Топ-20</h1>
                {top.length === 0 ? <p>Пока пусто</p> : top.map((p, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', margin: '8px auto', width: '300px', background: 'rgba(255,255,255,0.1)', padding: '12px', borderRadius: '12px' }}>
                        <span>{i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1}. {p.username || 'Игрок'}</span>
                        <span style={{ color: '#ffd700' }}>{p.score.toLocaleString()}</span>
                    </div>
                ))}
                <button onClick={() => setShowTop(false)} style={{ marginTop: '30px', padding: '16px 50px', fontSize: '24px', border: 'none', borderRadius: '50px', background: '#45b7d1', color: 'white' }}>Назад</button>
            </div>
        )
    }

    return (
        <div style={{ minHeight: '100vh', background: '#0f0f1e', color: 'white' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '15px 20px', fontWeight: 'bold', background: 'rgba(0,0,0,0.5)', borderRadius: '16px', margin: '8px' }}>
                <div>Score: {score.toLocaleString()}</div>
                <div style={{ color: timeLeft <= 10 ? '#ff3b30' : '#ffd700' }}>{timeLeft}s</div>
                <div>x{combo.toFixed(1)}</div>
            </div>

            {gameState === 'menu' && (
                <div style={{ textAlign: 'center', paddingTop: '100px' }}>
                    <h1 style={{ fontSize: '68px', background: 'linear-gradient(45deg,#ff6b6b,#4ecdc4)', WebkitBackgroundClip: 'text', color: 'transparent' }}>DOTLOCK</h1>
                    <p style={{ fontSize: '24px', margin: '20px' }}>Рекорд: {highScore.toLocaleString()}</p>
                    <button onClick={start} style={{ background: '#45b7d1', padding: '18px 60px', fontSize: '28px', border: 'none', borderRadius: '50px', margin: '20px' }}>ИГРАТЬ</button>
                    <button onClick={() => { loadTop(); setShowTop(true) }} style={{ background: '#f7b731', padding: '18px 60px', fontSize: '28px', border: 'none', borderRadius: '50px' }}>ТОП</button>
                </div>
            )}

            {gameState === 'play' && (
                <div style={{ position: 'relative', width: '360px', height: '540px', margin: '30px auto', background: 'rgba(255,255,255,0.05)', borderRadius: '20px', overflow: 'hidden' }}>
                    {points.map(p => (
                        <div
                            key={p.id}
                            onPointerDown={() => click(p)}
                            style={{
                                position: 'absolute',
                                width: '52px',
                                height: '52px',
                                background: p.color,
                                borderRadius: '50%',
                                left: p.x * 58 + 10,
                                top: p.y * 58 + 10,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 'bold',
                                fontSize: '20px',
                                transform: path.includes(p) ? 'scale(1.6)' : 'scale(1)',
                                transition: 'all 0.25s',
                                boxShadow: path.includes(p) ? '0 0 50px currentColor' : '0 4px 20px rgba(0,0,0,0.6)'
                            }}
                        >{p.number}</div>
                    ))}
                </div>
            )}

            {gameState === 'over' && (
                <div style={{ textAlign: 'center', paddingTop: '100px' }}>
                    <h2>Время вышло!</h2>
                    <h1 style={{ fontSize: '48px', margin: '30px' }}>{score.toLocaleString()} очков</h1>
                    {score > highScore && <div style={{ color: '#ffd700', fontSize: '36px', animation: 'pulse 1s infinite' }}>НОВЫЙ РЕКОРД!</div>}
                    <button onClick={start} style={{ background: '#45b7d1', padding: '18px 60px', fontSize: '28px', border: 'none', borderRadius: '50px', margin: '20px' }}>ИГРАТЬ СНОВА</button>
                    <button onClick={() => { loadTop(); setShowTop(true) }} style={{ background: '#f7b731', padding: '18px 60px', fontSize: '28px', border: 'none', borderRadius: '50px' }}>ТОП</button>
                </div>
            )}
        </div>
    )
}