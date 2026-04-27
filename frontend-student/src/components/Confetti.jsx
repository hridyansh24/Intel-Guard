import confetti from 'canvas-confetti'

const palette = ['#a855f7', '#22d3ee', '#ec4899', '#fbbf24', '#34d399', '#f472b6']

export function burst(opts = {}) {
  confetti({
    particleCount: 120,
    spread: 85,
    startVelocity: 42,
    origin: { y: 0.6 },
    colors: palette,
    scalar: 1.1,
    ...opts,
  })
}

export function cannons() {
  const defaults = { spread: 360, ticks: 60, gravity: 0.8, decay: 0.93, startVelocity: 35, colors: palette }
  for (let i = 0; i < 4; i++) {
    setTimeout(() => {
      confetti({
        ...defaults,
        particleCount: 40,
        scalar: 1 + Math.random() * 0.4,
        origin: { x: Math.random(), y: Math.random() * 0.4 + 0.1 },
      })
    }, i * 180)
  }
}

export function fireworks(duration = 2200) {
  const end = Date.now() + duration
  const frame = () => {
    confetti({ particleCount: 4, angle: 60, spread: 55, origin: { x: 0 }, colors: palette })
    confetti({ particleCount: 4, angle: 120, spread: 55, origin: { x: 1 }, colors: palette })
    if (Date.now() < end) requestAnimationFrame(frame)
  }
  frame()
}

export function shake() {
  // subtle wrong-answer: small red burst from bottom
  confetti({
    particleCount: 20,
    spread: 40,
    startVelocity: 20,
    origin: { y: 0.9 },
    colors: ['#f43f5e', '#fb7185'],
    scalar: 0.7,
    gravity: 1.4,
  })
}
