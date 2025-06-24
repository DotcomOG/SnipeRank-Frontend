// public/full-report.js — Loads full analysis from /api/full

document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const url = params.get('url');
  const name = params.get('name');
  const email = params.get('email');

  const reportContent = document.getElementById('reportContent');
  const loadingMessage = document.getElementById('loadingMessage');
  const nameInput = document.getElementById('followupName');
  const emailInput = document.getElementById('followupEmail');

  if (nameInput) nameInput.value = name || '';
  if (emailInput) emailInput.value = email || '';

  if (!url) {
    loadingMessage.textContent = 'Error: No URL provided.';
    return;
  }

  fetch(`/api/full?url=${encodeURIComponent(url)}`)
    .then(res => res.json())
    .then(data => {
      loadingMessage.classList.add('hidden');
      reportContent.classList.remove('hidden');

      document.getElementById('fullResultUrl').textContent = `Analyzed URL: ${data.url || url}`;
      document.getElementById('fullScore').textContent = `Overall Score: ${data.score ?? 'N/A'}/100`;

      const superpowers = document.getElementById('fullSuperpowers');
      const opportunities = document.getElementById('fullOpportunities');
      const insights = document.getElementById('fullInsights');

      superpowers.innerHTML = '';
      (data.superpowers || []).forEach(item => {
        const li = document.createElement('li');
        li.textContent = `✅ ${item}`;
        superpowers.appendChild(li);
      });

      opportunities.innerHTML = '';
      (data.opportunities || []).forEach(item => {
        const li = document.createElement('li');
        li.textContent = `🚨 ${item}`;
        opportunities.appendChild(li);
      });

      insights.innerHTML = '';
      (data.insights || []).forEach(item => {
        const li = document.createElement('li');
        li.textContent = item;
        insights.appendChild(li);
      });
    })
    .catch(err => {
      console.error('Error fetching full report:', err);
      loadingMessage.textContent = 'Failed to load full report.';
    });
});