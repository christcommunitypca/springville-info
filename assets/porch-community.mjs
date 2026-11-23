// Show only anonymized, aggregate community responses from the moderated public JSON file.
// Incoming reader emails never reach browsers or this endpoint.
const box = document.getElementById("porch-community-content");
if (box) {
  const slug = box.dataset.column;
  fetch("/data/porch-community.json", {cache:"no-cache"})
    .then(r => { if(!r.ok) throw new Error("No community summary"); return r.json(); })
    .then(data => {
      const entry = data?.articles?.[slug];
      if (!entry || !Array.isArray(entry.paragraphs) || !entry.paragraphs.length) return;
      box.replaceChildren();
      for (const paragraph of entry.paragraphs.slice(0, 5)) {
        if (typeof paragraph !== "string" || !paragraph.trim()) continue;
        const p = document.createElement("p");
        p.textContent = paragraph.slice(0, 900);
        box.append(p);
      }
      const updated = document.getElementById("porch-community-updated");
      if (updated && /^\d{4}-\d{2}-\d{2}$/.test(entry.updatedAt || "")) {
        const date = new Date(entry.updatedAt + "T12:00:00Z");
        if (!isNaN(date.valueOf())) {
          updated.textContent = "Community conversation updated " + date.toLocaleDateString("en-US", {month:"short",day:"numeric",year:"numeric",timeZone:"UTC"});
          updated.hidden = false;
        }
      }
    }).catch(() => {});
}
