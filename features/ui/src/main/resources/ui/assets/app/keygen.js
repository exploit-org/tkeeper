import {initFourEyeUI, buildFourEyePolicy, createFourEyeKeyRow, setAlgorithmOptions} from "./fourEye.js";

const PERMS = Object.freeze({
    create: "tkeeper.dkg.create",
    rotate: "tkeeper.dkg.rotate",
    refresh: "tkeeper.dkg.refresh",
});

const MODE_UI = Object.freeze({
    CREATE: {
        action: "Create Identity",
        description: "Creates a new cryptographic identity and its first generation.",
        success: "Identity created successfully.",
    },
    ROTATE: {
        action: "Rotate Identity",
        description: "Replaces the current key material and advances the generation.",
        success: "Identity rotated successfully.",
    },
    REFRESH: {
        action: "Refresh Identity",
        description: "Creates a new generation without changing the key. Threshold ECC replaces the peer shares while preserving the aggregate key; ML-DSA carries the existing shares forward unchanged.",
        success: "Identity refreshed successfully.",
    },
});

export async function init({api, Auth, showAlert, clearAlerts, params = {}, signal}) {
    function requireDomPurify() {
        const dp = (typeof window !== "undefined") ? window.DOMPurify : null;
        if (!dp || typeof dp.sanitize !== "function") {
            throw new Error("DOMPurify is required but not loaded (window.DOMPurify missing).");
        }
        return dp;
    }

    const DP = requireDomPurify();

    function encodeHtml(s) {
        return String(s)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    function escapeHtml(x) {
        const cleaned = DP.sanitize(String(x ?? ""), {ALLOWED_TAGS: [], ALLOWED_ATTR: []});
        return encodeHtml(cleaned);
    }

    const disabled = document.getElementById("tk-keygen-disabled");
    const form = document.getElementById("tk-keygen-form");

    const keyIdEl = document.getElementById("tk-keygen-keyId");
    const algorithmEl = document.getElementById("tk-keygen-algorithm");
    const modeEl = document.getElementById("tk-keygen-mode");
    const modeHint = document.getElementById("tk-keygen-mode-hint");
    const ownerEl = document.getElementById("tk-keygen-assetOwner");
    const authoritiesEl = document.getElementById("tk-keygen-authorities");
    const authorityGuidanceEl = document.getElementById("tk-keygen-authority-guidance");
    const authorityAddEl = document.getElementById("tk-keygen-authority-add");
    const authorityArbitraryEl = document.getElementById("tk-keygen-authority-arbitrary");

    const polEnabled = document.getElementById("tk-keygen-policy-enabled");
    const polBox = document.getElementById("tk-keygen-policy");
    const allowHistEl = document.getElementById("tk-keygen-allowHistorical");

    const applyValEl = document.getElementById("tk-keygen-apply-value");
    const procValEl = document.getElementById("tk-keygen-process-value");

    const submit = document.getElementById("tk-keygen-submit");
    const dockSubmit = document.getElementById("tk-keygen-submit-dock");
    const reset = document.getElementById("tk-keygen-reset");
    const notificationsEl = document.getElementById("tk-keygen-notifications");

    const fourEyeEnabledEl = document.getElementById("tk-keygen-foureye-enabled");
    const fourEyeBodyEl = document.getElementById("tk-keygen-foureye-body");
    const fourEyeKeysEl = document.getElementById("tk-keygen-foureye-keys");
    const fourEyeAddEl = document.getElementById("tk-keygen-foureye-add");
    const fourEyeMEl = document.getElementById("tk-keygen-foureye-m");
    const fourEyeModeEl = document.getElementById("tk-keygen-foureye-mode");
    const fourEyeModeHintEl = document.getElementById("tk-keygen-foureye-mode-hint");

    function showNotification(type, title, message) {
        if (!notificationsEl) return;

        const notif = document.createElement("div");
        notif.className = `tk-notification ${type}`;
        notif.innerHTML = `
      <div class="tk-notification-content">
        <div class="tk-notification-title">${escapeHtml(title)}</div>
        <div class="tk-notification-message">${escapeHtml(message)}</div>
      </div>
      <button class="tk-notification-close" aria-label="Close">×</button>
    `;

        const closeBtn = notif.querySelector(".tk-notification-close");
        const doClose = () => {
            notif.style.animation = "tk-notification-slide-out 0.3s ease-out";
            setTimeout(() => notif.remove(), 300);
        };

        closeBtn?.addEventListener("click", doClose);
        notificationsEl.appendChild(notif);
        setTimeout(doClose, 5000);
    }

    function clearNotifications() {
        if (notificationsEl) notificationsEl.innerHTML = "";
    }

    if (
        !disabled || !form || !keyIdEl || !algorithmEl || !modeEl || !modeHint || !ownerEl ||
        !authoritiesEl || !authorityAddEl || !authorityArbitraryEl || !authorityGuidanceEl ||
        !polEnabled || !polBox || !allowHistEl || !applyValEl || !procValEl || !submit || !dockSubmit || !reset ||
        !fourEyeEnabledEl || !fourEyeBodyEl || !fourEyeKeysEl || !fourEyeAddEl || !fourEyeMEl ||
        !fourEyeModeEl || !fourEyeModeHintEl
    ) {
        console.error("Keygen init: missing required DOM elements.");
        return;
    }

    const capabilities = await api.getCapabilities();
    const algorithms = Array.isArray(capabilities?.algorithms)
        ? capabilities.algorithms.filter((value) => typeof value === "string" && value.length > 0)
        : [];
    if (algorithms.length === 0) throw new Error("No key algorithms are available in this build.");

    setAlgorithmOptions(algorithmEl, algorithms);
    form.addEventListener("submit", (event) => event.preventDefault());
    initFourEyeUI({
        enabledEl: fourEyeEnabledEl,
        bodyEl: fourEyeBodyEl,
        keysContainerEl: fourEyeKeysEl,
        addBtnEl: fourEyeAddEl,
        algorithms,
        modeEl: fourEyeModeEl,
        modeHintEl: fourEyeModeHintEl,
    });

    setArbitraryAuthority();

    authorityArbitraryEl.addEventListener("click", () => setArbitraryAuthority());
    authorityAddEl.addEventListener("click", () => {
        const rows = readAuthorityRows();
        if (rows.length === 1 && rows[0].id.toLowerCase() === "arbitrary") {
            authoritiesEl.innerHTML = "";
        }
        addAuthorityRow("", "");
    });

    (function initClearable() {
        const configs = [
            {wrapperId: "tk-keygen-apply-wrapper", inputEl: applyValEl},
            {wrapperId: "tk-keygen-process-wrapper", inputEl: procValEl},
        ];

        configs.forEach(({wrapperId, inputEl}) => {
            const wrapper = document.getElementById(wrapperId);
            if (!wrapper || !inputEl) return;

            const btn = wrapper.querySelector(".input-clearable-btn");
            const update = () => {
                if (inputEl.value) wrapper.classList.add("has-value");
                else wrapper.classList.remove("has-value");
            };

            btn?.addEventListener("click", (e) => {
                e.preventDefault();
                inputEl.value = "";
                update();
                inputEl.dispatchEvent(new Event("input", {bubbles: true}));
                inputEl.dispatchEvent(new Event("change", {bubbles: true}));
            });

            inputEl.addEventListener("input", update);
            inputEl.addEventListener("change", update);
            update();
        });
    })();

    const availableModes = Object.keys(MODE_UI).filter((mode) => isModeAllowed(mode, Auth));
    for (const option of modeEl.options) {
        const visible = availableModes.includes(String(option.value || "").toUpperCase());
        option.hidden = !visible;
        option.disabled = !visible;
    }

    const defaultMode = availableModes[0] || "CREATE";
    modeEl.value = defaultMode;
    const allowed = availableModes.length > 0;

    if (!allowed) {
        disabled.classList.remove("d-none");
        form.querySelectorAll("input,select,button,textarea").forEach((x) => (x.disabled = true));
        setSubmitDisabled(true);
        reset.disabled = true;
        return;
    }

    const syncPolicyVisibility = () => {
        polBox.classList.toggle("d-none", !polEnabled.checked);
    };

    polEnabled.addEventListener("change", syncPolicyVisibility);
    polEnabled.addEventListener("input", syncPolicyVisibility);
    polEnabled.addEventListener("click", () => setTimeout(syncPolicyVisibility, 0));
    syncPolicyVisibility();

    modeEl.addEventListener("change", updateModeHint);
    updateModeHint();

    dockSubmit.addEventListener("click", () => submit.click());
    setupActionDock(submit, dockSubmit, signal);

    const contextKey = String(params.key || "").trim();
    const contextMode = String(params.mode || "").toUpperCase();
    if (contextKey && ["ROTATE", "REFRESH"].includes(contextMode)) {
        await hydrateLifecycleContext(contextKey, contextMode);
    }

    document.addEventListener("keydown", (event) => {
        if (!(event.ctrlKey || event.metaKey) || event.key !== "Enter") return;
        event.preventDefault();
        if (!submit.disabled) submit.click();
    }, {signal});

    reset.addEventListener("click", () => {
        keyIdEl.value = "";
        keyIdEl.readOnly = false;
        algorithmEl.selectedIndex = 0;
        modeEl.value = defaultMode;

        ownerEl.value = "";
        polEnabled.checked = false;
        polBox.classList.add("d-none");

        allowHistEl.checked = true;
        applyValEl.value = "";
        procValEl.value = "";

        setArbitraryAuthority();

        if (fourEyeEnabledEl) fourEyeEnabledEl.checked = false;
        if (fourEyeBodyEl) fourEyeBodyEl.classList.add("d-none");
        if (fourEyeMEl) fourEyeMEl.value = "2";
        if (fourEyeModeEl) fourEyeModeEl.value = "STRICT";
        if (fourEyeKeysEl) fourEyeKeysEl.innerHTML = "";

        clearNotifications();
        clearAlerts?.();
        setSubmitDisabled(false);
        updateModeHint();

        applyValEl.dispatchEvent(new Event("input", {bubbles: true}));
        procValEl.dispatchEvent(new Event("input", {bubbles: true}));
    });

    submit.addEventListener("click", async () => {
        const mode = String(modeEl.value || "").toUpperCase();

        if (!form.reportValidity()) return;

        if (!isModeAllowed(mode, Auth)) {
            showAlert?.("danger", "Not enough permissions for selected mode.");
            return;
        }

        const keyId = String(keyIdEl.value || "").trim();

        const algorithm = String(algorithmEl.value || "").toUpperCase();
        const assetOwnerRaw = String(ownerEl.value || "").trim();
        let authorities;
        try {
            authorities = buildAuthorities();
        } catch (validationErr) {
            showNotification("danger", "Validation Error", validationErr.message);
            return;
        }

        const body = {
            keyId,
            algorithm,
            authorities,
            mode,
            assetOwner: assetOwnerRaw.length ? assetOwnerRaw : null,
        };

        let fourEye = null;
        try {
            fourEye = buildFourEyePolicy({
                enabledEl:       fourEyeEnabledEl,
                mEl:             fourEyeMEl,
                modeEl:          fourEyeModeEl,
                keysContainerEl: fourEyeKeysEl,
            });
        } catch (validationErr) {
            showNotification("danger", "Validation Error", validationErr.message);
            return;
        }

        if (polEnabled.checked || fourEye) {
            const policy = {};

            if (polEnabled.checked) {
                policy.allowHistoricalProcess = !!allowHistEl.checked;

                const apply = buildNotAfterFromDate(applyValEl.value);
                const process = buildNotAfterFromDate(procValEl.value);

                if (apply) policy.apply = apply;
                if (process) policy.process = process;
            }
            if (fourEye) policy.fourEye = fourEye;

            body.policy = policy;
        }

        setSubmitDisabled(true);

        try {
            const r = await api.dkgGenerate(body);

            clearAlerts?.();

            const warning = r?.warning;
            if (warning) showNotification("warning", "Warning", warning);

            showNotification("success", "Lifecycle operation completed", MODE_UI[mode]?.success || `${mode} was successful.`);
        } catch (e) {
            showNotification("danger", "Error", e?.message || String(e));
        } finally {
            setSubmitDisabled(false);
        }
    });

    function updateModeHint() {
        const m = String(modeEl.value || "").toUpperCase();
        const ok = isModeAllowed(m, Auth);
        const ui = MODE_UI[m] || {action: "Run Operation", description: ""};
        submit.textContent = ui.action;
        dockSubmit.textContent = ui.action;
        modeHint.classList.toggle("text-danger", !ok);
        modeHint.textContent = ok
            ? ui.description
            : `${ui.description} You do not have permission for this mode.`;
    }

    function setSubmitDisabled(value) {
        submit.disabled = value;
        dockSubmit.disabled = value;
    }

    async function hydrateLifecycleContext(keyId, mode) {
        keyIdEl.value = keyId;
        keyIdEl.readOnly = true;
        modeEl.value = mode;
        updateModeHint();
        setSubmitDisabled(true);

        try {
            const page = await api.getInventory({
                logicalId: keyId,
                historical: false,
                lastSeen: null,
                limit: 1,
            });
            const item = (page?.inventory?.items || []).find((candidate) => String(candidate?.logicalId || "") === keyId);
            if (!item) throw new Error("Identity was not found in the signed inventory.");
            if (item.tampered === true) throw new Error("Identity metadata failed its integrity check.");
            if (String(item.status || "").toUpperCase() !== "ACTIVE") {
                throw new Error(`Identity is ${String(item.status || "not active").toLowerCase()}.`);
            }

            const algorithm = String(item.algorithm || "").toUpperCase();
            if (!algorithms.includes(algorithm)) {
                throw new Error(`Algorithm ${algorithm || "unknown"} is not available in this build.`);
            }

            algorithmEl.value = algorithm;
            ownerEl.value = String(item.assetOwner || "");
            hydrateAuthorities(item.authorities);
            hydratePolicy(item.policy);
            clearAlerts?.();
            updateModeHint();
            modeHint.textContent += " Current signed governance metadata was loaded from the identity inventory.";
            setSubmitDisabled(!isModeAllowed(mode, Auth));
        } catch (error) {
            showAlert?.("danger", `Cannot prepare lifecycle operation: ${error?.message || String(error)}`);
            setSubmitDisabled(true);
        }
    }

    function hydrateAuthorities(values) {
        if (!Array.isArray(values) || values.length === 0) {
            throw new Error("Signed inventory does not contain authorities.");
        }

        authoritiesEl.innerHTML = "";
        values.forEach((value) => {
            const id = typeof value === "string" ? value : String(value?.id || "");
            const oci = typeof value === "string" ? "" : String(value?.oci || "");
            if (!id) throw new Error("Signed inventory contains an invalid authority.");
            addAuthorityRow(id, oci);
        });
    }

    function hydratePolicy(policy) {
        const hasAccessPolicy = !!policy && (
            policy.apply != null ||
            policy.process != null ||
            Object.prototype.hasOwnProperty.call(policy, "allowHistoricalProcess")
        );

        polEnabled.checked = hasAccessPolicy;
        allowHistEl.checked = policy?.allowHistoricalProcess !== false;
        applyValEl.value = notAfterToLocal(policy?.apply);
        procValEl.value = notAfterToLocal(policy?.process);
        syncPolicyVisibility();
        applyValEl.dispatchEvent(new Event("input", {bubbles: true}));
        procValEl.dispatchEvent(new Event("input", {bubbles: true}));

        const fourEye = policy?.fourEye || null;
        fourEyeEnabledEl.checked = !!fourEye;
        fourEyeMEl.value = String(fourEye?.m ?? 2);
        fourEyeModeEl.value = String(fourEye?.mode || "STRICT").toUpperCase();
        fourEyeKeysEl.innerHTML = "";

        for (const key of fourEye?.keys || []) {
            const algorithm = String(key?.algorithm || "").toUpperCase();
            if (!algorithms.includes(algorithm)) {
                throw new Error(`Approver algorithm ${algorithm || "unknown"} is not available in this build.`);
            }
            const row = createFourEyeKeyRow(algorithms, (element) => element.remove());
            row.querySelector("select").value = algorithm;
            row.querySelector("input").value = String(key?.publicKey64 || "");
            fourEyeKeysEl.appendChild(row);
        }

        fourEyeEnabledEl.dispatchEvent(new Event("change", {bubbles: true}));
        fourEyeModeEl.dispatchEvent(new Event("change", {bubbles: true}));
    }

    function setArbitraryAuthority() {
        authoritiesEl.innerHTML = "";
        addAuthorityRow("arbitrary", "");
    }

    function addAuthorityRow(id = "", oci = "") {
        const row = document.createElement("div");
        row.className = "tk-authority-row";
        row.innerHTML = `
      <div>
        <label class="form-label">Authority ID</label>
        <input class="form-control tk-authority-id" autocomplete="off" value="${escapeHtml(id)}" placeholder="arbitrary">
      </div>
      <div>
        <label class="form-label">OCI reference</label>
        <input class="form-control tk-authority-oci" autocomplete="off" value="${escapeHtml(oci)}" placeholder="registry.local/authority@sha256:...">
      </div>
      <div class="tk-authority-remove-cell">
        <button type="button" class="btn btn-outline-secondary tk-authority-remove" title="Remove authority" aria-label="Remove authority">
          <svg xmlns="http://www.w3.org/2000/svg" class="icon icon-sm" width="16" height="16" viewBox="0 0 24 24"
               stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
            <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
            <path d="M4 7l16 0"/>
            <path d="M10 11l0 6"/>
            <path d="M14 11l0 6"/>
            <path d="M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2 -2l1 -12"/>
            <path d="M9 7v-3l6 0v3"/>
          </svg>
        </button>
      </div>
    `;

        const idInput = row.querySelector(".tk-authority-id");
        const ociInput = row.querySelector(".tk-authority-oci");
        const removeButton = row.querySelector(".tk-authority-remove");
        const syncArbitrary = () => {
            const arbitrary = String(idInput?.value || "").trim().toLowerCase() === "arbitrary";
            if (idInput) idInput.readOnly = arbitrary;
            if (ociInput) {
                ociInput.disabled = arbitrary;
                if (arbitrary) ociInput.value = "";
            }
            if (removeButton) removeButton.disabled = arbitrary;
            row.classList.toggle("is-arbitrary", arbitrary);
            syncArbitraryGuidance();
        };

        idInput?.addEventListener("input", syncArbitrary);
        idInput?.addEventListener("change", syncArbitrary);
        syncArbitrary();

        removeButton?.addEventListener("click", () => {
            row.remove();
            if (authoritiesEl.querySelectorAll(".tk-authority-row").length === 0) {
                setArbitraryAuthority();
            } else {
                syncArbitraryGuidance();
            }
        });

        authoritiesEl.appendChild(row);
        syncArbitraryGuidance();
    }

    function syncArbitraryGuidance() {
        const arbitrary = readAuthorityRows().some((row) => row.id.toLowerCase() === "arbitrary");
        authorityGuidanceEl.classList.toggle("d-none", !arbitrary);
    }

    function readAuthorityRows() {
        return Array.from(authoritiesEl.querySelectorAll(".tk-authority-row")).map((row) => ({
            id: String(row.querySelector(".tk-authority-id")?.value || "").trim(),
            oci: String(row.querySelector(".tk-authority-oci")?.value || "").trim(),
        }));
    }

    function buildAuthorities() {
        const rows = readAuthorityRows().filter((row) => row.id.length > 0 || row.oci.length > 0);

        if (rows.length === 0) {
            throw new Error("At least one authority is required.");
        }

        const hasArbitrary = rows.some((row) => row.id.toLowerCase() === "arbitrary");
        if (hasArbitrary && rows.length > 1) {
            throw new Error("Arbitrary authority cannot be combined with other authorities.");
        }

        const seen = new Set();
        return rows.map((row) => {
            if (!row.id) throw new Error("Authority ID is required.");

            const normalized = row.id.toLowerCase();
            if (seen.has(normalized)) throw new Error(`Duplicate authority: ${row.id}`);
            seen.add(normalized);

            if (normalized === "arbitrary") return {id: "arbitrary"};
            if (!row.oci) throw new Error(`OCI reference is required for ${row.id}.`);

            return {id: row.id, oci: row.oci};
        });
    }
}

function isModeAllowed(mode, Auth) {
    if (mode === "CREATE") return !!Auth?.hasPermission?.(PERMS.create);
    if (mode === "ROTATE") return !!Auth?.hasPermission?.(PERMS.rotate);
    if (mode === "REFRESH") return !!Auth?.hasPermission?.(PERMS.refresh);
    return false;
}

function buildNotAfterFromDate(dateValue) {
    const v = String(dateValue || "").trim();
    if (!v) return null;

    const d = new Date(v);
    const t = d.getTime();
    if (!t || Number.isNaN(t)) return null;

    const seconds = Math.floor(t / 1000);
    if (seconds <= 0) return null;

    return {unit: "SECONDS", notAfter: seconds};
}

function notAfterToLocal(value) {
    if (!value || value.notAfter == null) return "";
    const unit = String(value.unit || "SECONDS").toUpperCase();
    const milliseconds = unit === "MILLISECONDS"
        ? Number(value.notAfter)
        : Number(value.notAfter) * 1000;
    if (!Number.isFinite(milliseconds) || milliseconds <= 0) return "";

    const date = new Date(milliseconds);
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
    return local.toISOString().slice(0, 16);
}

function setupActionDock(source, dock, signal) {
    if (typeof IntersectionObserver !== "function") return;

    const observer = new IntersectionObserver(([entry]) => {
        const visible = !entry.isIntersecting;
        dock.classList.toggle("is-visible", visible);
        dock.tabIndex = visible ? 0 : -1;
        dock.setAttribute("aria-hidden", String(!visible));
    }, {threshold: 0.25});

    observer.observe(source);
    signal?.addEventListener("abort", () => observer.disconnect(), {once: true});
}
