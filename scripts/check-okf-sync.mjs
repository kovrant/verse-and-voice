#!/usr/bin/env node

/**
 * Pre-commit hook script:
 * Verifies that when a new module or database migration is introduced,
 * corresponding documentation in the OKF catalog ('okf/') is also staged.
 */

import { execSync } from "node:child_process"

function getStagedFiles() {
  try {
    const output = execSync("git diff --cached --name-status", { encoding: "utf-8" })
    if (!output.trim()) return []

    return output
      .trim()
      .split("\n")
      .map((line) => {
        const parts = line.split("\t")
        const status = parts[0]
        const filePath = parts[1]
        return { status, filePath }
      })
  } catch (err) {
    // If not in a git repo or git fails, fail open
    return []
  }
}

function checkOkfSync() {
  const staged = getStagedFiles()
  if (staged.length === 0) {
    process.exit(0)
  }

  // Check if any OKF file is staged (Added, Modified, or Renamed)
  const hasOkfStaged = staged.some(({ filePath }) => filePath && filePath.startsWith("okf/"))

  // Detect newly introduced modules or database migrations (status 'A')
  const newModules = staged.filter(({ status, filePath }) => {
    if (!filePath || !status.startsWith("A")) return false

    // 1. New route pages in teacher or student portal
    const isNewRoutePage = /^src\/app\/(student\/)?[^/]+\/page\.tsx$/.test(filePath)

    // 2. New database migrations
    const isNewMigration = /^supabase\/migration_.*\.sql$/.test(filePath)

    return isNewRoutePage || isNewMigration
  })

  if (newModules.length > 0 && !hasOkfStaged) {
    console.error("\n" + "━".repeat(72))
    console.error("🛑 COMMIT BLOCKED: New module or database migration detected!")
    console.error("━".repeat(72))
    console.error("\nThe following newly added components were found in this commit:")
    newModules.forEach(({ filePath }) => console.error(`  • ${filePath}`))

    console.error(
      "\n⚠️  However, NO documentation updates in the OKF catalog ('okf/') were staged.",
    )
    console.error("\n👉 ACTION REQUIRED:")
    console.error("   1. Document the new module or schema in the 'okf/' catalog:")
    console.error("      - Add a concept doc under 'okf/domain/' or 'okf/database/'")
    console.error("      - Add the entry to 'okf/index.md' and record it in 'okf/log.md'")
    console.error("   2. Stage your OKF documentation:")
    console.error("      git add okf/")
    console.error("   3. Retry your commit.")
    console.error("\n💡 Emergency bypass (use only for emergency hotfixes):")
    console.error("   git commit --no-verify\n")
    console.error("━".repeat(72) + "\n")

    process.exit(1)
  }

  process.exit(0)
}

checkOkfSync()
