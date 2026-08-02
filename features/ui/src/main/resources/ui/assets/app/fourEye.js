export function setAlgorithmOptions(selectEl, algorithms) {
    selectEl.replaceChildren(...algorithms.map((algorithm) => {
        const option = document.createElement("option");
        option.value = algorithm;
        option.textContent = algorithm;
        return option;
    }));
}

export function createFourEyeKeyRow(algorithms, onRemove) {
    const wrapper = document.createElement("div");
    wrapper.className = "tk-approver-row";
    wrapper.dataset.fourEyeKey = "1";

    const algorithmSelect = document.createElement("select");
    algorithmSelect.className = "form-select form-select-sm tk-approver-algorithm";
    setAlgorithmOptions(algorithmSelect, algorithms);

    const keyInput = document.createElement("input");
    keyInput.type = "text";
    keyInput.className = "form-control form-control-sm font-monospace";
    keyInput.placeholder = "Base64-encoded public key…";
    keyInput.autocomplete = "off";
    keyInput.spellcheck = false;

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "btn btn-sm btn-ghost-danger tk-approver-remove";
    removeBtn.setAttribute("aria-label", "Remove key");
    removeBtn.textContent = "×";
    removeBtn.addEventListener("click", () => onRemove(wrapper));

    wrapper.append(algorithmSelect, keyInput, removeBtn);

    wrapper._getAlgorithm = () => algorithmSelect.value;
    wrapper._getKey   = () => keyInput.value.trim();

    return wrapper;
}

export function initFourEyeUI({ enabledEl, bodyEl, keysContainerEl, addBtnEl, algorithms, modeEl, modeHintEl }) {
    const syncModeHint = () => {
        if (!modeEl || !modeHintEl) return;
        modeHintEl.textContent = modeEl.value === "LENIENT"
            ? "Four-eye approval is required for rotate, refresh, and destroy. Signing and decryption remain direct."
            : "Approvals are required for every operation protected by this policy.";
    };
    const syncVisibility = () => {
        bodyEl.classList.toggle("d-none", !enabledEl.checked);
        syncModeHint();
    };

    enabledEl.addEventListener("change", syncVisibility);
    modeEl?.addEventListener("change", syncModeHint);
    syncVisibility();

    addBtnEl.addEventListener("click", () => {
        const row = createFourEyeKeyRow(algorithms, (el) => el.remove());
        keysContainerEl.appendChild(row);
    });
}

export function buildFourEyePolicy({ enabledEl, mEl, modeEl, keysContainerEl }) {
    if (!enabledEl.checked) return null;

    const mRaw = mEl.value.trim();
    if (!mRaw) throw new Error("Four-Eye: Min Approvers (M) is required.");

    const m = parseInt(mRaw, 10);
    if (!Number.isInteger(m) || m < 2) {
        throw new Error("Four-Eye: M must be an integer ≥ 2.");
    }
    if (m > 99) {
        throw new Error("Four-Eye: M is unreasonably large (max 99).");
    }

    const rows = Array.from(
        keysContainerEl.querySelectorAll("[data-four-eye-key]")
    );

    if (rows.length === 0) {
        throw new Error("Four-Eye: add at least one approver key.");
    }
    if (m > rows.length) {
        throw new Error(`Four-Eye: M (${m}) cannot exceed N (${rows.length} keys).`);
    }

    const keys = [];
    const seen = new Set();

    for (let i = 0; i < rows.length; i++) {
        const algorithm  = rows[i]._getAlgorithm();
        const publicKey64 = rows[i]._getKey();
        const label      = `Approver key ${i + 1}`;

        if (!publicKey64) {
            throw new Error(`${label}: public key is required.`);
        }
        if (!isValidBase64(publicKey64)) {
            throw new Error(`${label}: invalid base64 encoding.`);
        }

        const dedup = `${algorithm}::${publicKey64}`;
        if (seen.has(dedup)) {
            throw new Error(`${label}: duplicate key detected.`);
        }
        seen.add(dedup);

        keys.push({ algorithm, publicKey64 });
    }

    return { m, n: rows.length, keys, mode: String(modeEl?.value || "STRICT").toUpperCase() };
}

function isValidBase64(s) {
    if (!s || s.length === 0) return false;
    if (s.length % 4 === 1) return false;
    return /^[A-Za-z0-9+/\-_]+=*$/.test(s);
}
