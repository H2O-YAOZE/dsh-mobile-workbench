import {extname} from 'node:path'
export const FORMAT_BY_EXTENSION = {
  '.pdf': 'pdf',
  '.docx': 'docx',
  '.xlsx': 'xlsx',
  '.xlsm': 'xlsx'
}

export const SUPPORTED_FORMATS = new Set(['text', 'pdf', 'docx', 'xlsx'])

/** Default and maximum characters kept per output line. */
export const MAX_LINE_LENGTH = 2000

/**
 * Detect the document format from a path's file extension.
 * @param {string} filePath
 * @returns {'pdf'|'docx'|'xlsx'|'text'}
 */
export function detectFormat(filePath) {
  const ext = extname(filePath).toLowerCase()
  return FORMAT_BY_EXTENSION[ext] ?? 'text'
}

/**
 * Apply the built-in read tool's windowing semantics to extracted text:
 * 1-based line numbering, strip a single trailing empty line, cap line length.
 * @param {string} text
 * @param {number} offset - 1-based first line
 * @param {number} limit - maximum lines returned
 * @param {number} maxLineLength
 * @returns {{ lines: Array<{number: number, text: string}>, totalLines: number }}
 */
export function windowLines(text, offset, limit, maxLineLength = MAX_LINE_LENGTH) {
  let lines = text.split('\n')
  if (lines.length > 0 && lines[lines.length - 1] === '') lines.pop()
  lines = lines.map(line => line.endsWith('\r') ? line.slice(0, -1) : line)
  const totalLines = lines.length
  if (offset > totalLines && !(totalLines === 0 && offset === 1)) {
    throw new Error(`offset ${offset} is out of range (file has ${totalLines} lines)`)
  }
  const window = lines.slice(offset - 1, offset - 1 + limit).map((text, i) => ({
    number: offset + i,
    text: text.length > maxLineLength
      ? `${text.substring(0, maxLineLength)}... (line truncated to ${maxLineLength} chars)`
      : text
  }))
  return { lines: window, totalLines }
}

/**
 * Render a windowed document outcome as the OpenCode-style model envelope.
 * @param {string} path
 * @param {string} type
 * @param {{ offset: number, lines: Array<{number: number, text: string}>, totalLines: number }} outcome
 * @returns {string}
 */
export function renderEnvelope(path, type, outcome) {
  const endLine = outcome.lines.length > 0
    ? outcome.lines[outcome.lines.length - 1].number
    : Math.max(0, outcome.offset - 1)
  let footer
  if (endLine < outcome.totalLines) {
    footer = `(Showing lines ${outcome.offset}-${endLine} of ${outcome.totalLines}. Use offset=${endLine + 1} to continue.)`
  } else {
    footer = `(End of file - total ${outcome.totalLines} lines)`
  }
  const body = outcome.lines.length > 0
    ? `${outcome.lines.map(line => `${line.number}: ${line.text}`).join('\n')}\n\n${footer}`
    : footer
  return `<path>${path}</path>\n<type>${type}</type>\n<content>\n${body}\n</content>`
}
