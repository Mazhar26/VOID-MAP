// ─── Pin Location Modal ───────────────────────────────────────────────────────
// Modal asking user if they want to save their measured location.
// Options: Keep Private or Share with Community.
// Auto-saves to database via API.

import { api } from '../api.js';

/**
 * Show the Save/Share location modal overlay.
 * @param {object} locationData - { lat, lon, address, noiseLevel }
 * @param {Function} onSave - callback after successful save
 * @param {Function} onCancel - callback on cancellation
 */
export function showPinModal(locationData, onSave, onCancel) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  overlay.innerHTML = `
    <div class="modal-content">
      <div class="modal-title">📌 Save Location</div>
      <p class="modal-desc">Store this location to your dashboard, or share it publicly so others can find quiet spots.</p>

      <div class="modal-fields">
        <label>
          Pin Type
          <select id="pinVisibility" class="input-field" style="background:#0a0d1a;">
            <option value="private">🔒 Keep it private (My Pins only)</option>
            <option value="public">🤝 Share with community (Gold stars on map)</option>
          </select>
        </label>
        
        <label>
          Add a note (optional)
          <textarea id="pinNote" class="input-field" rows="2" placeholder="e.g. Peaceful park, silent corner near the fountain." style="resize:none; background:#0a0d1a;"></textarea>
        </label>
      </div>

      <div class="modal-actions">
        <button id="modalCancelBtn" class="btn-secondary">Cancel</button>
        <button id="modalSaveBtn" class="btn-primary" style="width: auto;">Save Pin</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const saveBtn = overlay.querySelector('#modalSaveBtn');
  const cancelBtn = overlay.querySelector('#modalCancelBtn');

  cancelBtn.addEventListener('click', () => {
    overlay.remove();
    onCancel?.();
  });

  saveBtn.addEventListener('click', async () => {
    const isPublic = overlay.querySelector('#pinVisibility').value === 'public';
    const note = overlay.querySelector('#pinNote').value.trim();

    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving…';

    try {
      await api.saveLocation({
        latitude: locationData.lat,
        longitude: locationData.lon,
        address: locationData.address,
        noise_level: locationData.noiseLevel,
        is_public: isPublic,
        note: note || null
      });

      overlay.remove();
      onSave?.();
    } catch (err) {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save Pin';
      alert(`Error saving pin: ${err.message}`);
    }
  });
}
