import { join } from "path"
import { appendFileSync, existsSync, mkdirSync } from "fs"

const LOG_DIR = join(process.env.HOME || process.env.USERPROFILE || "", ".local", "share", "opencode", "log")
const LOG_FILE = join(LOG_DIR, "notifier.log")

export function initLogDir(): void {
  if (!existsSync(LOG_DIR)) {
    mkdirSync(LOG_DIR, { recursive: true })
  }
}

export function log(message: string): void {
  try {
    initLogDir()
    const timestamp = new Date().toISOString()
    appendFileSync(LOG_FILE, `[${timestamp}] ${message}\n`)
  } catch {
  }
}
