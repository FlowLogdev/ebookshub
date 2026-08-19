import { canvaFetch } from "@/lib/canva/client"
import { resolveImageBytes } from "@/lib/export/images"

const POLL_INTERVAL_MS = 1500
const POLL_TIMEOUT_MS = 45_000

async function pollJob<T extends { status: string }>(fetchJob: () => Promise<T>): Promise<T> {
  const deadline = Date.now() + POLL_TIMEOUT_MS
  while (Date.now() < deadline) {
    const job = await fetchJob()
    if (job.status === "success" || job.status === "failed") return job
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS))
  }
  throw new Error("Canva job timed out.")
}

/** Uploads a cover image (data: URI or hosted URL) to Canva as an asset, returning its asset id. */
export async function uploadCoverAsset(userId: string, imageUrl: string, name: string): Promise<string> {
  const resolved = await resolveImageBytes(imageUrl)
  if (!resolved) throw new Error("Could not read the cover image to upload to Canva.")

  const metadata = Buffer.from(JSON.stringify({ name_base64: Buffer.from(name).toString("base64") })).toString(
    "base64",
  )

  const uploadRes = await canvaFetch(userId, "/asset-uploads", {
    method: "POST",
    headers: { "Content-Type": resolved.mime, "Asset-Upload-Metadata": metadata },
    body: new Uint8Array(resolved.buffer),
  })
  if (!uploadRes.ok) throw new Error(`Canva asset upload failed: ${await uploadRes.text()}`)
  const uploadJob = (await uploadRes.json()) as { job: { id: string } }

  const job = await pollJob(async () => {
    const res = await canvaFetch(userId, `/asset-uploads/${uploadJob.job.id}`)
    if (!res.ok) throw new Error(`Canva asset upload polling failed: ${await res.text()}`)
    const data = (await res.json()) as { job: { status: string; asset?: { id: string }; error?: { message: string } } }
    return data.job
  })
  if (job.status !== "success" || !job.asset) throw new Error(job.error?.message ?? "Canva asset upload failed.")
  return job.asset.id
}

export interface CanvaDesign {
  id: string
  editUrl: string
  viewUrl: string
}

/** Creates a new Canva design pre-loaded with the given asset, sized for a book cover (portrait 2:3). */
export async function createCoverDesign(userId: string, assetId: string, title: string): Promise<CanvaDesign> {
  const res = await canvaFetch(userId, "/designs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      design_type: { type: "custom", width: 1600, height: 2400 },
      asset_id: assetId,
      title,
    }),
  })
  if (!res.ok) throw new Error(`Canva design creation failed: ${await res.text()}`)
  const data = (await res.json()) as { design: { id: string; urls: { edit_url: string; view_url: string } } }
  return { id: data.design.id, editUrl: data.design.urls.edit_url, viewUrl: data.design.urls.view_url }
}

/** Exports a Canva design as a PNG and returns the raw image bytes. */
export async function exportDesignAsPng(userId: string, designId: string): Promise<{ buffer: Buffer; mime: string }> {
  const res = await canvaFetch(userId, "/exports", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ design_id: designId, format: { type: "png" } }),
  })
  if (!res.ok) throw new Error(`Canva export failed: ${await res.text()}`)
  const exportJob = (await res.json()) as { job: { id: string } }

  const job = await pollJob(async () => {
    const jobRes = await canvaFetch(userId, `/exports/${exportJob.job.id}`)
    if (!jobRes.ok) throw new Error(`Canva export polling failed: ${await jobRes.text()}`)
    const data = (await jobRes.json()) as { job: { status: string; urls?: string[]; error?: { message: string } } }
    return data.job
  })
  if (job.status !== "success" || !job.urls?.[0]) throw new Error(job.error?.message ?? "Canva export failed.")

  const downloadRes = await fetch(job.urls[0])
  if (!downloadRes.ok) throw new Error("Failed to download exported design from Canva.")
  return { buffer: Buffer.from(await downloadRes.arrayBuffer()), mime: "image/png" }
}
