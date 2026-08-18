import crypto from "crypto"

import JSZip from "jszip"

import { markdownToXhtml } from "@/lib/export/markdown"
import type { ExportBook } from "@/lib/export/types"

function escapeXml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}

function extFromMime(mime: string): string {
  if (mime.includes("jpeg") || mime.includes("jpg")) return "jpg"
  if (mime.includes("gif")) return "gif"
  return "png"
}

/**
 * Builds a minimal but valid EPUB3 (with an EPUB2 toc.ncx alongside, for
 * older-reader / KDP compatibility) by hand rather than pulling in a
 * generator library — the format is just a zip of a fixed set of XML/XHTML
 * files, and hand-rolling it keeps full control over what KDP receives.
 */
export async function generateBookEpub(book: ExportBook): Promise<Buffer> {
  const zip = new JSZip()
  const bookId = `urn:uuid:${crypto.randomUUID()}`
  const modified = new Date().toISOString().replace(/\.\d+Z$/, "Z")

  zip.file("mimetype", "application/epub+zip", { compression: "STORE" })

  zip.file(
    "META-INF/container.xml",
    `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`,
  )

  zip.file(
    "OEBPS/css/style.css",
    `body { font-family: Georgia, serif; line-height: 1.5; margin: 1em; }
h1, h2, h3 { font-family: Helvetica, Arial, sans-serif; }
.cover-image { text-align: center; }
.cover-image img { max-width: 100%; height: auto; }`,
  )

  const coverExt = book.cover ? extFromMime(book.cover.mime) : null
  if (book.cover) {
    zip.file(`OEBPS/images/cover.${coverExt}`, book.cover.buffer)
    zip.file(
      "OEBPS/cover.xhtml",
      `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml">
<head><title>Cover</title><link rel="stylesheet" type="text/css" href="css/style.css"/></head>
<body><div class="cover-image"><img src="images/cover.${coverExt}" alt="Cover"/></div></body>
</html>`,
    )
  }

  zip.file(
    "OEBPS/title.xhtml",
    `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml">
<head><title>${escapeXml(book.title)}</title><link rel="stylesheet" type="text/css" href="css/style.css"/></head>
<body>
  <h1>${escapeXml(book.title)}</h1>
  ${book.subtitle ? `<h2>${escapeXml(book.subtitle)}</h2>` : ""}
  ${book.authorName ? `<p>by ${escapeXml(book.authorName)}</p>` : ""}
</body>
</html>`,
  )

  const chapterFiles = book.chapters.map((chapter, i) => {
    const heading = chapter.chapterNumber ? `Chapter ${chapter.chapterNumber}: ${chapter.title}` : chapter.title
    const filename = `chapters/chapter-${i + 1}.xhtml`
    const body = chapter.content ? markdownToXhtml(chapter.content) : "<p></p>"
    zip.file(
      `OEBPS/${filename}`,
      `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml">
<head><title>${escapeXml(heading)}</title><link rel="stylesheet" type="text/css" href="../css/style.css"/></head>
<body>
  <h1>${escapeXml(heading)}</h1>
  ${chapter.subtitle ? `<h2>${escapeXml(chapter.subtitle)}</h2>` : ""}
  ${body}
</body>
</html>`,
    )
    return { filename, title: heading, id: `chapter-${i + 1}` }
  })

  const manifestItems = [
    book.cover ? `<item id="cover-image" href="images/cover.${coverExt}" media-type="image/${coverExt === "jpg" ? "jpeg" : coverExt}" properties="cover-image"/>` : "",
    book.cover ? `<item id="cover" href="cover.xhtml" media-type="application/xhtml+xml"/>` : "",
    `<item id="title" href="title.xhtml" media-type="application/xhtml+xml"/>`,
    `<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>`,
    `<item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>`,
    `<item id="css" href="css/style.css" media-type="text/css"/>`,
    ...chapterFiles.map((c) => `<item id="${c.id}" href="${c.filename}" media-type="application/xhtml+xml"/>`),
  ]
    .filter(Boolean)
    .join("\n    ")

  const spineItems = [
    book.cover ? `<itemref idref="cover"/>` : "",
    `<itemref idref="title"/>`,
    ...chapterFiles.map((c) => `<itemref idref="${c.id}"/>`),
  ]
    .filter(Boolean)
    .join("\n    ")

  zip.file(
    "OEBPS/content.opf",
    `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="BookId">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="BookId">${bookId}</dc:identifier>
    <dc:title>${escapeXml(book.title)}</dc:title>
    ${book.authorName ? `<dc:creator>${escapeXml(book.authorName)}</dc:creator>` : ""}
    <dc:language>en</dc:language>
    <meta property="dcterms:modified">${modified}</meta>
  </metadata>
  <manifest>
    ${manifestItems}
  </manifest>
  <spine toc="ncx">
    ${spineItems}
  </spine>
</package>`,
  )

  zip.file(
    "OEBPS/nav.xhtml",
    `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head><title>Table of Contents</title></head>
<body>
  <nav epub:type="toc" id="toc">
    <h1>Table of Contents</h1>
    <ol>
      ${chapterFiles.map((c) => `<li><a href="${c.filename}">${escapeXml(c.title)}</a></li>`).join("\n      ")}
    </ol>
  </nav>
</body>
</html>`,
  )

  zip.file(
    "OEBPS/toc.ncx",
    `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head><meta name="dtb:uid" content="${bookId}"/></head>
  <docTitle><text>${escapeXml(book.title)}</text></docTitle>
  <navMap>
    ${chapterFiles
      .map(
        (c, i) => `<navPoint id="${c.id}" playOrder="${i + 1}"><navLabel><text>${escapeXml(c.title)}</text></navLabel><content src="${c.filename}"/></navPoint>`,
      )
      .join("\n    ")}
  </navMap>
</ncx>`,
  )

  return zip.generateAsync({ type: "nodebuffer", mimeType: "application/epub+zip" })
}
