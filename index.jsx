import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
// This file is a single-file React component implementing a polished RNG UI.
// Requirements: TailwindCSS in your project. Optional: framer-motion, lucide-react

export default function RNGGame() {
  // Game settings
  const [numOutcomes, setNumOutcomes] = useState(6); // sides / outcomes
  const [betAmount, setBetAmount] = useState(10);
  const [payoutMultiplier, setPayoutMultiplier] = useState(5); // win multiplier
  const [autoplay, setAutoplay] = useState(false);
  const [seed, setSeed] = useState("");
  const [history, setHistory] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("rng_history_v1")) || [];
    } catch { return []; }
  });

  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState(null);
  const autoplayRef = useRef(null);

  // Simple seeded RNG (Mulberry32). If seed empty => use Math.random.
  function mulberry32(a) {
    return function() {
      a |= 0;
      a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
  }

  const rng = useMemo(() => {
    if (!seed) return Math.random;
    // create a numeric seed from string
    let s = 0;
    for (let i = 0; i < seed.length; i++) s = (s * 31 + seed.charCodeAt(i)) | 0;
    return mulberry32(s);
  }, [seed]);

  useEffect(() => {
    localStorage.setItem("rng_history_v1", JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    if (autoplay) {
      autoplayRef.current = setInterval(() => {
        if (!spinning) playOnce();
      }, 1200);
    } else {
      clearInterval(autoplayRef.current);
    }
    return () => clearInterval(autoplayRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoplay, spinning, numOutcomes, payoutMultiplier, betAmount, seed]);

  const wheelSegments = useMemo(() => {
    const arr = [];
    for (let i = 1; i <= numOutcomes; i++) arr.push(i);
    return arr;
  }, [numOutcomes]);

  function playOnce() {
    if (spinning) return;
    setSpinning(true);
    setResult(null);

    // fake spin duration
    const duration = 900 + Math.floor(rng() * 900);

    // determine result immediately but delay showing
    const roll = Math.floor(rng() * numOutcomes) + 1;

    setTimeout(() => {
      setResult(roll);
      const win = roll === numOutcomes; // define win condition: top outcome is the lucky one
      const entry = {
        time: Date.now(),
        roll,
        win,
        bet: betAmount,
        payout: win ? betAmount * payoutMultiplier : 0,
        settings: { numOutcomes, payoutMultiplier, seed },
      };
      setHistory(h => [entry, ...h].slice(0, 200));
      setSpinning(false);
    }, duration);
  }

  function resetHistory() {
    setHistory([]);
    localStorage.removeItem("rng_history_v1");
  }

  // quick stat snapshot
  const stats = useMemo(() => {
    const total = history.length;
    const wins = history.filter(h => h.win).length;
    const spent = history.reduce((s, h) => s + (h.bet || 0), 0);
    const earned = history.reduce((s, h) => s + (h.payout || 0), 0);
    return { total, wins, spent, earned, roi: total ? ((earned - spent) / spent) : 0 };
  }, [history]);

  // wheel animation angle
  const spinAngle = useMemo(() => {
    if (!result) return 0;
    const slice = 360 / numOutcomes;
    // aim so that the chosen slice lands at pointer (top)
    const rndExtra = Math.floor(rng() * 360);
    return 360 * (3 + Math.floor(rng() * 6)) + (result - 1) * slice + slice / 2 + rndExtra;
    // multiple full rotations + offset
    // note: we used rng() here to diversify final angle; acceptable for UI
  }, [result, numOutcomes]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-6">
      <div className="w-full max-w-4xl bg-white/5 backdrop-blur-md rounded-2xl p-6 shadow-2xl border border-white/6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-extrabold text-white">RNG Lab</h1>
            <p className="text-sm text-slate-300">Interactive RNG testing playground — The Giant loadout style vibes.</p>
          </div>
          <div className="text-right text-slate-300">
            <div className="text-xs">Seed (optional)</div>
            <input value={seed} onChange={e => setSeed(e.target.value)} placeholder="leave blank for random" className="mt-1 rounded-md bg-white/5 px-2 py-1 text-white text-sm" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Left: controls */}
          <div className="col-span-1 bg-white/3 rounded-xl p-4">
            <div className="mb-3">
              <label className="text-sm text-slate-200">Number of outcomes</label>
              <input type="range" min={2} max={12} value={numOutcomes} onChange={e => setNumOutcomes(Number(e.target.value))} className="w-full mt-2" />
              <div className="text-xs text-slate-300 mt-1">{numOutcomes} outcomes</div>
            </div>

            <div className="mb-3">
              <label className="text-sm text-slate-200">Bet amount</label>
              <div className="flex items-center gap-2 mt-2">
                <input type="number" value={betAmount} onChange={e => setBetAmount(Math.max(1, Number(e.target.value) || 1))} className="w-full rounded-md bg-white/5 px-2 py-1 text-white text-sm" />
                <button onClick={() => setBetAmount(b => b + 10)} className="px-3 py-1 rounded-md bg-indigo-600 text-white text-sm">+10</button>
              </div>
            </div>

            <div className="mb-3">
              <label className="text-sm text-slate-200">Payout multiplier (win payout = bet * multiplier)</label>
              <input type="range" min={1} max={20} value={payoutMultiplier} onChange={e => setPayoutMultiplier(Number(e.target.value))} className="w-full mt-2" />
              <div className="text-xs text-slate-300 mt-1">x{payoutMultiplier}</div>
            </div>

            <div className="flex gap-2 mt-4">
              <button onClick={playOnce} disabled={spinning} className={`flex-1 py-2 rounded-xl font-semibold ${spinning ? 'bg-slate-600' : 'bg-emerald-500 hover:bg-emerald-600'} text-white`}>SPIN</button>
              <button onClick={() => setAutoplay(a => !a)} className={`px-4 py-2 rounded-xl font-semibold ${autoplay ? 'bg-rose-500' : 'bg-yellow-500'} text-white`}>{autoplay ? 'STOP' : 'AUTO'}</button>
            </div>

            <div className="mt-4 text-sm text-slate-300">
              <div>Win condition: land <span className="font-semibold">{numOutcomes}</span> (rightmost outcome).</div>
              <div className="mt-2">Expected chance: <span className="font-mono">1 / {numOutcomes}</span> ({((1/numOutcomes)*100).toFixed(2)}%)</div>
            </div>

            <div className="mt-4 border-t border-white/5 pt-3">
              <div className="flex items-center justify-between text-slate-300 text-sm">
                <div>History entries</div>
                <div className="flex gap-2">
                  <button onClick={() => setHistory([])} className="text-xs px-2 py-1 rounded bg-white/5">Clear</button>
                  <button onClick={() => { localStorage.setItem('rng_history_export', JSON.stringify(history)); alert('History exported to localStorage key rng_history_export'); }} className="text-xs px-2 py-1 rounded bg-white/5">Export</button>
                </div>
              </div>
              <div className="mt-2 text-xs text-slate-300 max-h-36 overflow-auto">
                {history.length === 0 && <div className="text-slate-500">No runs yet</div>}
                {history.map((h, idx) => (
                  <div key={idx} className="flex items-center justify-between py-1 odd:bg-white/2 px-2 rounded">
                    <div className="font-mono text-[13px]">#{history.length - idx} • {new Date(h.time).toLocaleTimeString()}</div>
                    <div className="text-[13px]">{h.roll} {h.win ? <span className="text-emerald-400">WIN</span> : <span className="text-rose-400">LOSE</span>}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Middle: wheel */}
          <div className="col-span-1 md:col-span-1 flex items-center justify-center">
            <div className="relative">
              <div className="absolute -top-10 left-1/2 -translate-x-1/2 text-center text-slate-200">pointer</div>
              <div className="w-64 h-64 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 p-4 flex items-center justify-center">
                <div className="relative w-full h-full rounded-full bg-white/3 flex items-center justify-center">
                  {/* spinning disc */}
                  <motion.div
                    animate={{ rotate: result ? spinAngle : 0 }}
                    transition={{ duration: spinning ? 1.6 : 0.6, ease: "easeOut" }}
                    className="absolute w-full h-full rounded-full flex items-center justify-center origin-center"
                  >
                    {/* segments */}
                    <svg viewBox="0 0 200 200" className="w-full h-full rounded-full">
                      <g transform="translate(100,100)">
                        {wheelSegments.map((s, i) => {
                          const angle = (360 / wheelSegments.length) * i;
                          const large = wheelSegments.length;
                          return (
                            <g key={i} transform={`rotate(${angle})`}>
                              <path d={`M0 0 L100 0 A100 100 0 0 1 ${Math.cos(Math.PI*2/large)*100} ${Math.sin(Math.PI*2/large)*100} Z`} fill={i % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.06)'} stroke="rgba(255,255,255,0.06)" />
                              <text x="58" y="6" transform="rotate(12)" fontSize="10" fill="#fff" opacity={0.9}>{s}</text>
                            </g>
                          )
                        })}
                      </g>
                    </svg>
                  </motion.div>

                  {/* center label */}
                  <div className="absolute flex-col items-center justify-center text-center">
                    <div className="text-slate-200 font-bold text-lg">{result ? `Result: ${result}` : `Ready`}</div>
                    {result && (
                      <div className={`mt-1 text-sm ${history[0]?.win ? 'text-emerald-400' : 'text-rose-400'}`}>{history[0]?.win ? `Payout: ${history[0].payout}` : 'No payout'}</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: stats */}
          <div className="col-span-1 bg-white/3 rounded-xl p-4">
            <h3 className="text-white font-semibold">Stats</h3>
            <div className="mt-3 text-sm text-slate-300 grid grid-cols-2 gap-2">
              <div className="p-2 bg-white/5 rounded">Runs<div className="text-xl font-bold">{stats.total}</div></div>
              <div className="p-2 bg-white/5 rounded">Wins<div className="text-xl font-bold">{stats.wins}</div></div>
              <div className="p-2 bg-white/5 rounded">Spent<div className="text-xl font-bold">{stats.spent}</div></div>
              <div className="p-2 bg-white/5 rounded">Earned<div className="text-xl font-bold">{stats.earned}</div></div>
              <div className="col-span-2 p-2 bg-white/5 rounded">ROI<div className="text-xl font-bold">{isFinite(stats.roi) ? (stats.roi * 100).toFixed(2) + '%' : '—'}</div></div>
            </div>

            <div className="mt-4">
              <label className="text-sm text-slate-300">Autoplay interval</label>
              <select className="mt-2 w-full rounded-md bg-white/5 px-2 py-1 text-white text-sm" onChange={e => {
                const v = Number(e.target.value);
                clearInterval(autoplayRef.current);
                if (v === 0) setAutoplay(false);
                else {
                  setAutoplay(true);
                  autoplayRef.current = setInterval(() => { if (!spinning) playOnce(); }, v);
                }
              }}>
                <option value={0}>Off</option>
                <option value={1200}>1.2s</option>
                <option value={2000}>2.0s</option>
                <option value={4000}>4.0s</option>
              </select>
            </div>

            <div className="mt-4">
              <button onClick={() => { navigator.clipboard?.writeText(JSON.stringify({history, settings:{numOutcomes}})); alert('Copied snapshot to clipboard') }} className="w-full py-2 rounded-xl bg-indigo-600 text-white font-semibold">Export Snapshot</button>
            </div>

            <div className="mt-4 text-xs text-slate-400">Tip: configure 'win condition' logic in the component if you want different win rules (e.g. specific ranges or parity).</div>

          </div>
        </div>
      </div>
    </div>
  );
}
