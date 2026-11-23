// Show only anonymized, aggregate community responses from the moderated public JSON file.
// Incoming reader emails never reach browsers or this endpoint.
const box = document.getElementById("porch-community-content");
if (box) {
  const slug = box.dataset.column;
  fetch("/data/porch-community.json", {cache:"no-cache"})
    .then(r => { if(!r.ok) throw new Error("No community summary"); return r.json(); })
    .then(data => {
      const entry = data?.articles?.[slug];
      const paragraphs = Array.isArray(entry?.paragraphs)
        ? entry.paragraphs.filter(p => typeof p === "string" && p.trim()).slice(0, 5)
        : [];
      if (!paragraphs.length) return;
      box.replaceChildren();
      for (const paragraph of paragraphs) {
        const p = document.createElement("p");
        p.textContent = paragraph.slice(0, 900);
        box.append(p);
      }
      box.closest(".porch-community")?.removeAttribute("hidden");
    }).catch(() => {});
}
