// public/full-report.js — Loads full analysis from /api/full
async function runFullReport() {
  const params = new URLSearchParams(window.location.search);
  const url = params.get("url");
  const name = params.get("name") || "";
  const email = params.get("email") || "";

  document.getElementById("name").value = decodeURIComponent(name);
  document.getElementById("email").value = decodeURIComponent(email);
  document.getElementById("fullResultUrl").textContent = decodeURIComponent(url);

  try {
    const res = await fetch(`/api/full?url=${encodeURIComponent(url)}`);
    const data = await res.json();

    if (data.error) {
      document.body.innerHTML += "<p class='text-red-500 text-center mt-8'>Analysis failed. Try again.</p>";
      return;
    }

    // Your API returns a score, but let's handle if it doesn't
    document.getElementById("fullScore").textContent = `Score: ${data.score || 'N/A'}`;

    // Match the API response structure (whatsWorking, needsAttention, engineInsights)
    (data.whatsWorking || []).forEach(item => {
      const li = document.createElement("li");
      li.textContent = item;
      document.getElementById("fullStrengths").appendChild(li);
    });

    (data.needsAttention || []).forEach(item => {
      const li = document.createElement("li");
      li.textContent = item;
      document.getElementById("fullOpportunities").appendChild(li);
    });

    (data.engineInsights || []).forEach(item => {
      const li = document.createElement("li");
      li.textContent = item;
      document.getElementById("fullEngineInsights").appendChild(li);
    });
  } catch (err) {
    console.error(err);
    document.body.innerHTML += "<p class='text-red-500 text-center mt-8'>Error loading report.</p>";
  }
}

runFullReport();
