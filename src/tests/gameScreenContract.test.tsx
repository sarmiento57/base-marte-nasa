import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import App from '../app/App'

describe('Mars Base launch screen', () => {
  it('opens in the game camp with a playable mission start', () => {
    const markup = renderToStaticMarkup(<App />)
    expect(markup).toContain('A new life begins on')
    expect(markup).toContain('Start playing')
    expect(markup).toContain('Explore a huge Martian valley')
  })

  it('offers deterministic mission routes and the game guide', () => {
    const markup = renderToStaticMarkup(<App />)
    expect(markup).toContain('First flight')
    expect(markup).toContain('Extra reserves')
    expect(markup).toContain('Early signals')
    expect(markup).toContain('How to play')
  })

  it('opens with a skippable loading screen over the camp', () => {
    const markup = renderToStaticMarkup(<App />)
    expect(markup).toContain('role="dialog"')
    expect(markup).toContain('Junior Astronaut Mission Trainer')
    expect(markup).toContain('Did you know?')
    expect(markup).toContain('Press any key or click to skip')
  })

  it('keeps NOVA and the science section available from the opening screen', () => {
    const markup = renderToStaticMarkup(<App />)
    expect(markup).toContain('NOVA')
    expect(markup).toContain('Science')
    expect(markup).toContain('offline')
  })
})
