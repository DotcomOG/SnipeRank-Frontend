// 📅 Updated: June 30, 2025 at 2:22 PM ET

// scripts/analyze.js

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("contact-form");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const phone = document.getElementById("phone").value.trim();
    const notes = document.getElementById("notes").value.trim();

    // Simple validation
    if (!name || !email || !phone) {
      alert("Please complete all required fields.");
      return;
    }

    // For now, log the submission (can be upgraded to POST to backend)
    console.log("Form submitted:", { name, email, phone, notes });

    alert("Thank you! Your full detailed report will be emailed to you shortly.");

    // Optionally clear the form
    form.reset();
  });
});