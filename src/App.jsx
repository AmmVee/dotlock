import { useEffect, useState, useRef } from 'react'
import { sb } from './supabase.js'

const SKINS = {
  classic: { name: "Классика", price: 0, colors: ['#FF6B6B','#4ECDC4','#45B7D1','#F7B731','#9B59B6','#E74C3C'] },
  neon: { name: "Неон", price: 1000, colors: ['#ff00ff','#00ffff','#ffff00','#ff00aa','#00ffaa','#aa00ff'] },
  gold: { name: "Золотой", price: 3000, colors: ['#FFD700','#FFA500','#FF8C00','#FF6347','#B8860B','#DAA520'] },
  cyber: { name: "Киберпанк", price: 5000, colors: ['#00ffea','#ff0066','#00ffea','#ff0066','#00ffea','#ff0066'] },
  galaxy: { name: "Галактика", price: 10000, colors: ['#4a00e0','#8e2de2','#4a00e0','#8e2de2','#4a00e0','#8e2de2'] },
  diamond: { name: "Бриллиант", price: 20000, colors: ['#b9f2ff','#b9f2ff','#b9f2ff','#b9f2ff','#b9f2ff','#b9f2ff'] },
  lava: { name: "Лава", price: 15000, colors: ['#ff0000','#ff6600','#ffff00','#ff0000','#ff6600','#ffff00'] },
  rainbow: { name: "Радуга", price: 30000, colors: ['#ff0000','#ff8800','#ffff00','#00ff00','#0088ff','#0000ff','#ff00ff'] }
}

export default function App() {
  const [points, setPoints] = useState([])
  const [path, setPath] = useState([])
  const [score, setScore] = useState(0)
  const [combo, setCombo] = useState(1)
  const [timeLeft, setTimeLeft] = useState(60)
  const [gameState, setGameState] = useState('menu')
  const [highScore, setHighScore] = useState(0)
  const [coins, setCoins] = useState(0)
  const [currentSkin, setCurrentSkin] = useState('classic')
  const [ownedSkins, setOwnedSkins] = useState(['classic'])
  const [top, setTop] = useState([])

  const tg = window.Telegram?.WebApp
  const user = tg?.initDataUnsafe?.user
  const timerRef = useRef(null)

  useEffect(() => {
    tg?.ready(); tg?.expand()
    if (user) loadAllData()
  }, [user])

  const loadAllData = async () => {
    if (!user || !sb) return

    const { data } = await sb
      .from('leaderboard')
      .select('score, coins, skin, owned_skins')
      .eq('user_id', user.id)
      .maybeSingle()

    if (data) {
      setHighScore(data.score || 0)
      setCoins(data.coins || 0)
      setCurrentSkin(data.skin || 'classic')
      if (data.owned_skins) {
        try { setOwnedSkins(JSON.parse(data.owned_skins)) } catch { setOwnedSkins(['classic']) }
      }
    }
  }

  const saveData = async (updates) => {
    if (!user || !sb) return

    const { error } = await sb
      .from('leaderboard')
      .upsert(
        {
          user_id: user.id,
          username: user.username || 'Player',
          owned_skins: JSON.stringify(ownedSkins),
          ...updates
        },
        { onConflict: 'user_id' } // ← ЭТО ГЛАВНОЕ ИСПРАВЛЕНИЕ
      )

    if (error) console.error('Ошибка сохранения:', error)
  }

  const buySkin = async (skinKey) => {
    const skin = SKINS[skinKey]
    if (ownedSkins.includes(skinKey)) {
      setCurrentSkin(skinKey)
      await saveData({ skin: skinKey })
      return
    }
    if (coins < skin.price) return

    const newCoins = coins - skin.price
    const newOwned = [...ownedSkins, skinKey]
    setCoins(newCoins)
    setOwnedSkins(newOwned)
    setCurrentSkin(skinKey)
    await saveData({ coins: newCoins, skin: skinKey, owned_skins: JSON.stringify(newOwned) })
  }

  const generatePoints = () => {
    const colors = SKINS[currentSkin]?.colors || SKINS.classic.colors
    const newPoints = []
    for (let c of colors) {
      for (let n = 1; n <= 7; n++) {
        let x, y
        do { x = Math.floor(Math.random()*6); y = Math.floor(Math.random()*9) }
        while (newPoints.some(p => p.x === x && p.y === y))
        newPoints.push({x, y, color: c, number: n, id: Math.random()})
      }
    }
    setPoints(newPoints)
  }

  const startGame = () => {
    setScore(0); setCombo(1); setTimeLeft(60); setPath([]); setGameState('playing')
    generatePoints()

    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current)
          setGameState('gameover')
          if (score > highScore) {
            setHighScore(score)
            saveData({ score })
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  const handleClick = (p) => {
    if (gameState !== 'playing') return
    
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

    if (newPath.length === 7) {
      const nums = newPath.map(x => x.number).sort((a,b) => a-b)
      if (nums.every((n,i) => n === i+1) || nums.every((n,i) => n === 7-i)) {
        const earnedScore = Math.floor(49 * combo * 13)
        const earnedCoins = Math.floor(7 * combo * 10)
        
        setScore(s => s + earnedScore)
        setCoins(c => {
          const newC = c + earnedCoins
          saveData({ coins: newC })
          return newC
        })
        setCombo(c => c + 0.4)

        setPoints(prev => prev.filter(x => !newPath.includes(x)))
        setPath([])
        setTimeout(generatePoints, 350)
      }
    }
  }

  const openShop = () => setGameState('shop')

  const openTop = async () => {
    const { data } = await sb
      .from('leaderboard')
      .select('username, score')
      .order('score', { ascending: false })
      .limit(20)
    setTop(data || [])
    setGameState('top')
  }

  return (
    <div className="app">
      <div className="header">
        <div>Score: {score.toLocaleString()}</div>
        <div style={{color: timeLeft<=10?'#ff3b30':'#00ffff'}}>{timeLeft}s</div>
        <div>🪙 {coins.toLocaleString()}</div>
      </div>

      {gameState === 'menu' && (
        <div className="menu">
          <h1>DOTLOCK</h1>
          <p style={{fontSize:'28px', color:'#ffd700', margin:'20px 0'}}>Рекорд: {highScore.toLocaleString()}</p>
          <button className="play" onClick={startGame}>ИГРАТЬ</button>
          <button className="play" onClick={openShop}>МАГАЗИН</button>
          <button className="play" onClick={openTop}>ТОП-20</button>
        </div>
      )}

      {gameState === 'playing' && (
        <div className="field">
          {points.map(p => (
            <div
              key={p.id}
              className={`dot ${path.includes(p) ? 'active' : ''}`}
              style={{background: p.color, left: p.x*64+12, top: p.y*64+12}}
              onPointerDown={() => handleClick(p)}
            >{p.number}</div>
          ))}
        </div>
      )}

      {gameState === 'gameover' && (
        <div className="menu">
          <h2>Время вышло!</h2>
          <h1 style={{fontSize:'48px', margin:'30px 0'}}>{score.toLocaleString()} очков</h1>
          {score > highScore && <div style={{color:'#ffd700', fontSize:'42px'}}>НОВЫЙ РЕКОРД!</div>}
          <button className="play" onClick={() => setGameState('menu')}>В МЕНЮ</button>
          <button className="play" onClick={openTop}>ТОП-20</button>
        </div>
      )}

      {gameState === 'shop' && (
        <div className="menu">
          <h1 style={{fontSize:'56px'}}>МАГАЗИН</h1>
          <p style={{fontSize:'32px', color:'#ffd700', margin:'20px 0'}}>🪙 {coins.toLocaleString()}</p>
          
          <div className="shop-container">
            {Object.entries(SKINS).map(([key, skin]) => (
              <div key={key} className={`shop-item ${currentSkin === key ? 'active' : ''}`}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                  <div>
                    <h3 style={{fontSize:'26px'}}>{skin.name}</h3>
                    <p>{skin.price.toLocaleString()} 🪙</p>
                  </div>
                  <button 
                    className={`buy-btn ${ownedSkins.includes(key) || coins >= skin.price ? 'active' : 'disabled'}`}
                    onClick={() => buySkin(key)}
                  >
                    {currentSkin === key ? 'ЭКИПИРОВАН' : ownedSkins.includes(key) ? 'ЭКИПИРОВАТЬ' : 'КУПИТЬ'}
                  </button>
                </div>
              </div>
            ))}
          </div>
          
          <button className="play" style={{position:'fixed', bottom:'30px', left:'50%', transform:'translateX(-50%)', zIndex:999}} onClick={() => setGameState('menu')}>
            НАЗАД
          </button>
        </div>
      )}

      {gameState === 'top' && (
        <div className="menu">
          <h1 style={{fontSize:'56px'}}>ТОП-20</h1>
          <div className="top-container">
            {top.length === 0 ? (
              <p style={{opacity:0.7, fontSize:'20px'}}>Пока пусто :( Будь первым!</p>
            ) : top.map((p,i) => (
              <div key={i} className="lb-row">
                <span>{i < 3 ? ['🥇','🥈','🥉'][i] : i+1}. {p.username || 'Игрок'}</span>
                <span>{p.score.toLocaleString()}</span>
              </div>
            ))}
          </div>
          <button className="play" style={{position:'fixed', bottom:'30px', left:'50%', transform:'translateX(-50%)', zIndex:999}} onClick={() => setGameState('menu')}>
            НАЗАД
          </button>
        </div>
      )}
    </div>
  )
}
