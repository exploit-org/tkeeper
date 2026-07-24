import {buildFourEyePolicy, initFourEyeUI, setAlgorithmOptions} from "./fourEye.js";

export async function init({api, Auth, showAlert, setTitle, clearAlerts, signal}) {
    setTitle?.("Import Identity");

    if (!Auth?.subject) {
        showAlert("warning", "Unauthenticated.");
        return;
    }

    if (!Auth.hasPermission("tkeeper.storage.write")) {
        showAlert("danger", "Access denied.");
        return;
    }

    const el = ids([
        "tk-import-form",
        "tk-import-keyId",
        "tk-import-algorithm",
        "tk-import-assetOwner",
        "tk-import-value64",
        "tk-import-authorities",
        "tk-import-authority-guidance",
        "tk-import-authority-add",
        "tk-import-authority-arbitrary",
        "tk-import-submit",
        "tk-import-submit-dock",
        "tk-import-clear",
        "tk-import-status",
        "tk-import-policy-enabled",
        "tk-import-policy",
        "tk-import-apply-notAfter",
        "tk-import-process-notAfter",
        "tk-import-allow-historical",
        "tk-import-foureye-enabled",
        "tk-import-foureye-body",
        "tk-import-foureye-keys",
        "tk-import-foureye-m",
        "tk-import-foureye-mode",
        "tk-import-foureye-mode-hint",
        "tk-import-foureye-add",
    ]);
    const form = el["tk-import-form"];
    const submit = el["tk-import-submit"];
    const dockSubmit = el["tk-import-submit-dock"];

    (function initClearable() {
        const pairs = [
            {wrapperId: "tk-import-apply-wrapper", inputId: "tk-import-apply-notAfter"},
            {wrapperId: "tk-import-process-wrapper", inputId: "tk-import-process-notAfter"},
        ];
        pairs.forEach(({wrapperId, inputId}) => {
            const wrapper = document.getElementById(wrapperId);
            const inputEl = document.getElementById(inputId);
            if (!wrapper || !inputEl) return;
            const btn = wrapper.querySelector(".input-clearable-btn");
            const update = () => {
                if (inputEl.value) wrapper.classList.add("has-value");
                else wrapper.classList.remove("has-value");
            };
            if (btn) {
                btn.addEventListener("click", (e) => {
                    e.preventDefault();
                    inputEl.value = "";
                    update();
                    inputEl.dispatchEvent(new Event("input", {bubbles: true}));
                    inputEl.dispatchEvent(new Event("change", {bubbles: true}));
                });
            }
            inputEl.addEventListener("input", update);
            inputEl.addEventListener("change", update);
            update();
        });
    })();

    const fourEyeEnabledEl = el["tk-import-foureye-enabled"];
    const fourEyeBodyEl = el["tk-import-foureye-body"];
    const fourEyeKeysEl = el["tk-import-foureye-keys"];
    const fourEyeAddEl = el["tk-import-foureye-add"];
    const fourEyeMEl = el["tk-import-foureye-m"];
    const fourEyeModeEl = el["tk-import-foureye-mode"];
    const fourEyeModeHintEl = el["tk-import-foureye-mode-hint"];

    const capabilities = await api.getCapabilities();
    const algorithms = Array.isArray(capabilities?.algorithms)
        ? capabilities.algorithms.filter((value) => typeof value === "string" && value.length > 0)
        : [];
    if (algorithms.length === 0) throw new Error("No key algorithms are available in this build.");

    setAlgorithmOptions(el["tk-import-algorithm"], algorithms);
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

    dockSubmit.addEventListener("click", () => submit.click());
    setupActionDock(submit, dockSubmit, signal);

    document.addEventListener("keydown", (event) => {
        if (!(event.ctrlKey || event.metaKey) || event.key !== "Enter") return;
        event.preventDefault();
        if (!submit.disabled) submit.click();
    }, {signal});

    el["tk-import-authority-arbitrary"].addEventListener("click", () => setArbitraryAuthority());
    el["tk-import-authority-add"].addEventListener("click", () => {
        const rows = readAuthorityRows();
        if (rows.length === 1 && rows[0].id.toLowerCase() === "arbitrary") {
            el["tk-import-authorities"].innerHTML = "";
        }
        addAuthorityRow("", "");
    });

    el["tk-import-policy-enabled"].addEventListener("change", () => {
        el["tk-import-policy"].classList.toggle("d-none", !el["tk-import-policy-enabled"].checked);
    });

    el["tk-import-clear"].addEventListener("click", () => {
        el["tk-import-keyId"].value = "";
        el["tk-import-algorithm"].selectedIndex = 0;
        el["tk-import-value64"].value = "";
        el["tk-import-policy-enabled"].checked = false;
        el["tk-import-policy"].classList.add("d-none");
        el["tk-import-apply-notAfter"].value = "";
        el["tk-import-process-notAfter"].value = "";
        el["tk-import-allow-historical"].checked = true;
        el["tk-import-status"].textContent = "";
        el["tk-import-assetOwner"].value = "";
        setArbitraryAuthority();
        if (fourEyeEnabledEl) fourEyeEnabledEl.checked = false;
        if (fourEyeBodyEl) fourEyeBodyEl.classList.add("d-none");
        if (fourEyeMEl) fourEyeMEl.value = "2";
        if (fourEyeModeEl) fourEyeModeEl.value = "STRICT";
        if (fourEyeKeysEl) fourEyeKeysEl.innerHTML = "";
        clearAlerts?.();
    });

    submit.addEventListener("click", async () => {
        if (!form.reportValidity()) return;

        const keyId = (el["tk-import-keyId"].value || "").trim();
        const algorithm = el["tk-import-algorithm"].value;
        const value64 = (el["tk-import-value64"].value || "").trim();
        const assetOwner = (el["tk-import-assetOwner"].value || "").trim();
        let authorities;

        try {
            authorities = buildAuthorities();
        } catch (validationErr) {
            showAlert("warning", validationErr.message);
            return;
        }

        let policy;
        try {
            policy = buildPolicy(el);
        } catch (validationErr) {
            showAlert("warning", validationErr.message);
            return;
        }

        const payload = {
            keyId,
            algorithm,
            authorities,
            value64,
            assetOwner: assetOwner || null,
            ...(policy ? {policy} : {}),
        };

        lock(true, el);
        try {
            const res = await api.storeKey(payload);
            clearAlerts();
            if (res?.warning) showAlert("warning", String(res.warning));
            el["tk-import-status"].textContent = "Imported.";
            showAlert("success", "Identity imported.");
        } catch (e) {
            showAlert("danger", e?.message || String(e));
        } finally {
            lock(false, el);
        }
    });

    function setArbitraryAuthority() {
        el["tk-import-authorities"].innerHTML = "";
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
            if (el["tk-import-authorities"].querySelectorAll(".tk-authority-row").length === 0) {
                setArbitraryAuthority();
            } else {
                syncArbitraryGuidance();
            }
        });

        el["tk-import-authorities"].appendChild(row);
        syncArbitraryGuidance();
    }

    function syncArbitraryGuidance() {
        const arbitrary = readAuthorityRows().some((row) => row.id.toLowerCase() === "arbitrary");
        el["tk-import-authority-guidance"].classList.toggle("d-none", !arbitrary);
    }

    function readAuthorityRows() {
        return Array.from(el["tk-import-authorities"].querySelectorAll(".tk-authority-row")).map((row) => ({
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

    function buildPolicy(el) {
        const fourEye = buildFourEyePolicy({
            enabledEl: el["tk-import-foureye-enabled"],
            mEl: el["tk-import-foureye-m"],
            modeEl: el["tk-import-foureye-mode"],
            keysContainerEl: document.getElementById("tk-import-foureye-keys"),
        });

        if (!el["tk-import-policy-enabled"].checked && !fourEye) return null;

        const policy = {};

        if (el["tk-import-policy-enabled"].checked) {
            const apply = buildNotAfterFromDate(el["tk-import-apply-notAfter"].value);
            const process = buildNotAfterFromDate(el["tk-import-process-notAfter"].value);

            if (apply) policy.apply = apply;
            if (process) policy.process = process;
            policy.allowHistoricalProcess = !!el["tk-import-allow-historical"].checked;
        }

        if (fourEye) policy.fourEye = fourEye;

        return policy;
    }

    function buildNotAfterFromDate(dateValue) {
        const v = String(dateValue || "").trim();
        if (!v) return null;
        const d = new Date(v);
        if (!d.getTime() || isNaN(d.getTime())) return null;
        const seconds = Math.floor(d.getTime() / 1000);
        if (seconds <= 0) return null;
        return {unit: "SECONDS", notAfter: seconds};
    }

    function lock(v, el) {
        for (const k of Object.keys(el)) {
            if (el[k] && typeof el[k].disabled === "boolean") el[k].disabled = v;
        }
        document.querySelectorAll("#tk-import-authorities input, #tk-import-authorities button")
            .forEach((node) => {
                if (typeof node.disabled === "boolean") node.disabled = v;
            });
    }

    function ids(list) {
        const out = {};
        for (const id of list) {
            const node = document.getElementById(id);
            if (!node) throw new Error(`Missing element #${id}`);
            out[id] = node;
        }
        return out;
    }
}

function escapeHtml(x) {
    return String(x ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
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
