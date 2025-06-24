// public/index.js — Controls lightbox, fetch, and summary render

document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('urlInputModal');
  const urlInput = document.getElementById('urlInput');
  const submitBtn = document.getElementById('submitBtn');
  const loadingMessage = document.getElementById('loadingMessage');
  const resultContainer = document.getElementById('resultContainer');
  const contactForm = document.getElementById('contactForm');

  let currentURL = '';

  submitBtn.addEventListener('click', handleAnalyze);
  urlInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAnalyze();
    }
  });

  function handleAnalyze() {
    const url = urlInput.value.trim();
    try {
      new URL(url); // Validates
    } catch {
      return alert('Please enter a valid URL (including https://)');
    }

    currentURL = url;
    modal.classList.add('hidden');
    loadingMessage.textContent = 'SnipeRank is analyzing. It may take up to a minute.';

    fetch(`/api/friendly?url=${encodeURIComponent(url)}`)
      .then(async res => {
        if (!res.ok) throw new Error(await res.text());
        return res.json();
      })
      .then(data => renderReport(data))
      .catch(err => {
        console.error('Error fetching analysis:', err);
        loadingMessage.textContent = 'Something went wrong. Please try again.';
      });
  }

  function renderReport(data) {
    loadingMessage.classList.add('hidden');
    resultContainer.classList.remove('hidden');

    document.getElementById('resultUrl').textContent = `Analyzed URL: ${data.url || currentURL}`;
    document.getElementById('scoreValue').textContent = data.score ?? 'N/A';

    const superpowersList = document.getElementById('superpowersList');
    superpowersList.innerHTML = '';
    (data.superpowers || []).forEach(item => {
      const li = document.createElement('li');
      li.textContent = `✅ ${item}`;
      superpowersList.appendChild(li);
    });

    const opportunitiesList = document.getElementById('opportunitiesList');
    opportunitiesList.innerHTML = '';
    (data.opportunities || []).forEach(item => {
      const li = document.createElement('li');
      li.textContent = `🚨 ${item}`;
      opportunitiesList.appendChild(li);
    });

    const aiInsightsList = document.getElementById('aiInsightsList');
    aiInsightsList.innerHTML = '';
   (data.engine_insights || data.insights || []).forEach(item => {
      const li = document.createElement('li');
      li.textContent = item;
      aiInsightsList.appendChild(li);
    });

    contactForm.classList.remove('hidden');
  }

  // Handle form submit
  document.getElementById('summaryForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('summaryName').value;
    const email = document.getElementById('summaryEmail').value;
    window.location.href = `/full-report?url=${encodeURIComponent(currentURL)}&name=${encodeURIComponent(name)}&email=${encodeURIComponent(email)}`;
  });
});