// Kenya number plate validation
// Formats: KAA 000A  |  KBZ 442K  |  GK A000A  |  T 000 A  |  CD 000 (diplomatic)

const PATTERNS = [
  { regex: /^K[A-Z]{2}\s?\d{3}[A-Z]$/,    type: 'Private',     example: 'KCA 001X' },
  { regex: /^GK\s?[A-Z]\d{3}[A-Z]$/,      type: 'Government',  example: 'GK A001B' },
  { regex: /^T\s?\d{3}\s?[A-Z]$/,         type: 'PSV',         example: 'T 001 A'  },
  { regex: /^CD\s?\d{3}$/,                 type: 'Diplomatic',  example: 'CD 001'   },
  { regex: /^[A-Z]{2}\s?\d{4}$/,          type: 'Foreign',     example: 'UG 0001'  },
]

export function validatePlate(raw) {
  const plate = raw.toUpperCase().trim()

  for (const p of PATTERNS) {
    if (p.regex.test(plate)) {
      return { valid: true, type: p.type, plate: plate.replace(/\s+/g, ' ') }
    }
  }

  return {
    valid: false,
    plate,
    error: 'Plate format not recognised. Expected formats: KCA 001X, GK A001B, T 001 A'
  }
}

export function formatPlate(raw) {
  // Normalise spacing — KCA001X → KCA 001X
  const p = raw.toUpperCase().replace(/\s/g, '')
  if (/^K[A-Z]{2}\d{3}[A-Z]$/.test(p)) return `${p.slice(0,3)} ${p.slice(3,6)}${p.slice(6)}`
  if (/^GK[A-Z]\d{3}[A-Z]$/.test(p))   return `${p.slice(0,2)} ${p.slice(2)}`
  if (/^T\d{3}[A-Z]$/.test(p))         return `T ${p.slice(1,4)} ${p.slice(4)}`
  return raw.toUpperCase()
}

export const PLATE_HINT = 'Kenya formats: KCA 001X · GK A001B · T 001 A · CD 001'
