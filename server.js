// ✅ Dynamically serve short report HTML based on ?url=
app.get("/report.html", (req, res) => {
  const targetUrl = req.query.url;

  if (!targetUrl) {
    return res.status(400).send("Missing 'url' query parameter.");
  }

  // TODO: Replace this section with actual analysis logic
  const html = `
    <div class="section-title">✅ What’s Working</div>
    <ul><li>Your site includes structured data for AI to interpret.</li></ul>

    <div class="section-title">🚨 Needs Attention</div>
    <ul><li>No sitemap.xml detected.</li></ul>

    <div class="section-title">📡 AI Engine Insights</div>
    <ul><li>ChatGPT sees some brand identity, but it's unclear.</li></ul>
  `;

  res.send(html);
});
