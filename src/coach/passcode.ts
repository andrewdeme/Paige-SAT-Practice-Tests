// A deterrent, not security: the data is already on this laptop. It keeps
// the coach view from being stumbled into. Hashed so the code isn't
// readable in devtools; unlocked for the browser session only.
const UNLOCK_KEY = 'sat-rehearsal.coach-unlocked'

export async function hashCode(code: string): Promise<string> {
  const bytes = new TextEncoder().encode(`sat-rehearsal:${code}`)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export function isUnlocked(): boolean {
  try {
    return sessionStorage.getItem(UNLOCK_KEY) === '1'
  } catch {
    return false
  }
}

export function setUnlocked(on: boolean): void {
  try {
    if (on) sessionStorage.setItem(UNLOCK_KEY, '1')
    else sessionStorage.removeItem(UNLOCK_KEY)
  } catch {
    /* ignore */
  }
}
