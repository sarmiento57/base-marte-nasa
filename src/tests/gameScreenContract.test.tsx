import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import App from '../app/App'

describe('Base Marte launch screen', () => {
  it('opens in the game camp with a playable mission start', () => {
    const markup = renderToStaticMarkup(<App />)
    expect(markup).toContain('Una nueva vida empieza en')
    expect(markup).toContain('Empezar a jugar')
    expect(markup).toContain('Explora un valle marciano enorme')
  })

  it('offers deterministic mission routes and the game guide', () => {
    const markup = renderToStaticMarkup(<App />)
    expect(markup).toContain('Primer vuelo')
    expect(markup).toContain('Reserva reforzada')
    expect(markup).toContain('Señales tempranas')
    expect(markup).toContain('Cómo jugar')
  })

  it('keeps NOVA and the science section available from the opening screen', () => {
    const markup = renderToStaticMarkup(<App />)
    expect(markup).toContain('NOVA')
    expect(markup).toContain('Ciencia')
    expect(markup).toContain('sin conexión')
  })
})
