import { spawn } from "child_process"
import type { EventType, NotifierConfig } from "./config"

function substituteTokens(value: string, event: EventType, message: string, projectName: string | null, title: string): string {
  return value
    .replaceAll("{event}", event)
    .replaceAll("{message}", message)
    .replaceAll("{projectName}", projectName ?? "")
    .replaceAll("{title}", title)
}

export function runCommand(config: NotifierConfig, event: EventType, message: string, projectName: string | null, title: string): void {
  if (!config.command.enabled || !config.command.path) {
    return
  }

  const args = (config.command.args ?? []).map((arg) => substituteTokens(arg, event, message, projectName, title))
  const command = substituteTokens(config.command.path, event, message, projectName, title)

  const proc = spawn(command, args, {
    stdio: "ignore",
    detached: true,
  })

  proc.on("error", () => {})
  proc.unref()
}
