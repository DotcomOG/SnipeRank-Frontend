// 📅 Updated: June 30, 2025 at 2:44 PM ET

// scripts/analyze.js

document.addEventListener("DOMContentLoaded", async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const url = urlParams.get("url");

  if (!url) {
    document.getElementById("summary-results").innerHTML = "<p>No URL provided. Please return to the homepage and enter a site to analyze.</p>";
    return;
  }

  try {
    const res = await fetch(`/api/friendly?url=${encodeURIComponent(url)}`);
    const data = await res.json();

    const workingList = document.getElementById("whats-working");
    const attentionList = document.getElementById("needs-attention");
    const engineList = document.getElementById("engine-insights");

    data.whatsWorking.forEach(item => {
      const li = document.createElement("li");
      li.textContent = `✅ ${item}`;
      workingList.appendChild(li);
    });

    data.needsAttention.forEach(item => {
      const li = document.createElement("li");
      li.textContent = `🚨 ${item}`;
      attentionList.appendChild(li);
    });

    data.engineInsights.forEach(item => {
      const li = document.createElement("li");
      li.textContent = `📡 ${item}`;
      engineList.appendChild(li);
    });
  } catch (err) {
    document.getElementById("summary-results").innerHTML = "<p>Error loading analysis. Please try again later.</p>";
    console.error(err);
  }

  // Contact form logic
  const form = document.getElementById("contact-form");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const phone = document.getElementById("phone").value.trim();
    const notes = document.getElementById("notes").value.trim();

    if (!name || !email || !phone) {
      alert("Please complete all required fields.");
      return;
    }

    console.log("Form submitted:", { name, email, phone, notes });
    alert("Thank you! Your full detailed report will be emailed to you shortly.");
    form.reset();
  });
});
