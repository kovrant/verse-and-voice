import { describe, expect, it } from "vitest"

// student-auth.ts is pure (no browser client import), so no mock is needed.
import {
  isLoginDisabled,
  isTeacherRole,
  studentPostLoginPath,
  teacherPostLoginPath,
} from "./student-auth"

describe("isLoginDisabled", () => {
  it("is true only when the flag is explicitly true", () => {
    expect(isLoginDisabled({ login_disabled: true })).toBe(true)
  })

  it("is false for missing, null, undefined, or explicitly false metadata", () => {
    expect(isLoginDisabled({ login_disabled: false })).toBe(false)
    expect(isLoginDisabled({})).toBe(false)
    expect(isLoginDisabled(null)).toBe(false)
    expect(isLoginDisabled(undefined)).toBe(false)
  })
})

describe("isTeacherRole", () => {
  it("accepts a teacher identified by either signal alone", () => {
    expect(isTeacherRole("teacher", null)).toBe(true)
    expect(isTeacherRole(null, "teacher")).toBe(true)
    expect(isTeacherRole("teacher", "teacher")).toBe(true)
  })

  it("lets the JWT role win, so a student can't be promoted by a stale profile", () => {
    expect(isTeacherRole("student", "teacher")).toBe(false)
  })

  it("rejects students", () => {
    expect(isTeacherRole("student", null)).toBe(false)
    expect(isTeacherRole(null, "student")).toBe(false)
  })

  // The regression this guard exists for: the API routes used to read
  // `profileRole ?? "teacher"`, so an account with no role anywhere was handed
  // teacher powers. Absent must mean denied.
  it("denies an account carrying no role signal at all", () => {
    expect(isTeacherRole(null, null)).toBe(false)
    expect(isTeacherRole(undefined, undefined)).toBe(false)
    expect(isTeacherRole("", "")).toBe(false)
  })
})

describe("studentPostLoginPath", () => {
  it("sends students to /student, ignoring teacher-home and empty redirects", () => {
    expect(studentPostLoginPath(null)).toBe("/student")
    expect(studentPostLoginPath(undefined)).toBe("/student")
    expect(studentPostLoginPath("")).toBe("/student")
    expect(studentPostLoginPath("/")).toBe("/student")
    expect(studentPostLoginPath("/admin")).toBe("/student")
  })

  it("keeps a student-portal deep link", () => {
    expect(studentPostLoginPath("/student")).toBe("/student")
    expect(studentPostLoginPath("/student/quran")).toBe("/student/quran")
  })

  it("rejects lookalike paths that are not the student portal", () => {
    expect(studentPostLoginPath("/studenting")).toBe("/student")
    expect(studentPostLoginPath("//evil.example")).toBe("/student")
  })
})

describe("teacherPostLoginPath", () => {
  it("keeps safe internal teacher routes", () => {
    expect(teacherPostLoginPath("/teacher")).toBe("/teacher")
    expect(teacherPostLoginPath("/teacher/students")).toBe("/teacher/students")
    expect(teacherPostLoginPath("/teacher/quizzes")).toBe("/teacher/quizzes")
  })

  it("rejects external, protocol-relative, and student/auth paths", () => {
    expect(teacherPostLoginPath("https://evil.example/phish")).toBe("/teacher")
    expect(teacherPostLoginPath("//evil.example")).toBe("/teacher")
    expect(teacherPostLoginPath("/student")).toBe("/teacher")
    expect(teacherPostLoginPath("/login")).toBe("/teacher")
    expect(teacherPostLoginPath("/teacher/login")).toBe("/teacher")
    expect(teacherPostLoginPath("/")).toBe("/teacher")
    expect(teacherPostLoginPath("/students")).toBe("/teacher")
    expect(teacherPostLoginPath(null)).toBe("/teacher")
  })
})
