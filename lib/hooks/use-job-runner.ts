"use client"

import { useCallback, useEffect, useRef, useState } from "react"

export interface JobRecord {
  id: string
  job_type: string
  status: "queued" | "running" | "complete" | "failed" | "cancelled"
  progress_percent: number
  error: string | null
}

export interface TaskRecord {
  id: string
  chapter_id: string | null
  task_type: string
  status: "waiting" | "planning" | "writing" | "illustrating" | "reviewing" | "complete" | "failed"
  order_index: number
  error: string | null
}

/**
 * Drives a generation job to completion by repeatedly calling
 * /api/jobs/process (each call claims and executes exactly one task) and
 * refreshing job/task state after every step. See lib/jobs/worker.ts for
 * why this client-driven loop is safe: all state lives in the database, so
 * navigating away and coming back just means nobody is "cranking the
 * handle" until this hook mounts again on the same jobId.
 */
export function useJobRunner(jobId: string | null) {
  const [job, setJob] = useState<JobRecord | null>(null)
  const [tasks, setTasks] = useState<TaskRecord[]>([])
  const [error, setError] = useState<string | null>(null)
  const runningRef = useRef(false)

  const refresh = useCallback(async () => {
    if (!jobId) return
    const res = await fetch(`/api/jobs/${jobId}`)
    if (!res.ok) return
    const data = await res.json()
    setJob(data.job)
    setTasks(data.tasks)
  }, [jobId])

  useEffect(() => {
    if (!jobId) return
    let cancelled = false
    runningRef.current = true

    async function loop() {
      while (!cancelled) {
        try {
          const res = await fetch("/api/jobs/process", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ jobId }),
          })
          const result = await res.json()
          if (!res.ok) {
            setError(result.error ?? "Generation failed.")
            break
          }
          await refresh()
          if (!result.processed || result.jobStatus === "complete" || result.jobStatus === "failed") break
        } catch {
          setError("Lost connection while generating. Reload the page to resume.")
          break
        }
      }
      runningRef.current = false
    }

    refresh()
    loop()

    return () => {
      cancelled = true
    }
  }, [jobId, refresh])

  return { job, tasks, error, isRunning: runningRef.current, refresh }
}
