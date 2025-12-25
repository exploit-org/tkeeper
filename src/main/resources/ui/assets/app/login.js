import { api, ApiError } from "../app/api.js";
import { Auth } from "../app/auth.js";

export async function init({ showAlert, setTitle }) {
  setTitle("Authentication");

  const desc = document.getElementById("tk-auth-desc");
  const tokenBox = document.getElementById("tk-auth-token");
  const oidcBox = document.getElementById("tk-auth-oidc");

  const tokenInput = document.getElementById("tk-token-input");
  const tokenSave = document.getElementById("tk-token-save");
  const hint = document.getElementById("tk-auth-type-hint");

  const oidcLoginBtn = document.getElementById("tk-oidc-login");

  let cfg;
  try {
    await api.initAuth();
    cfg = api.auth.config;
  } catch (e) {
    showAlert("danger", errMsg(e));
    desc.textContent = "Cannot load auth configuration.";
    return;
  }

  if (!cfg?.id) {
    showAlert("danger", "Server did not return ControlPlaneAuthConfig.");
    desc.textContent = "Auth configuration is missing.";
    return;
  }

  if (cfg.id === "TOKEN") {
    tokenBox.classList.remove("d-none");
    oidcBox.classList.add("d-none");
    desc.innerHTML = `Enter token. It will be sent via <code>${escapeHtml(cfg.header || "?")}</code>.`;
    hint.textContent = `Header: ${cfg.header || "?"}`;

    tokenSave.addEventListener("click", async () => {
      const t = String(tokenInput?.value || "").trim();
      if (!t) { showAlert("warning", "Token is empty."); return; }

      api.setToken(t);

      try {
        await Auth.load();
        window.dispatchEvent(new Event("tkeeper:auth-changed"));
        location.hash = "#/welcome";
      } catch (e) {
        api.clearToken();
        showAlert("danger", errMsg(e));
      }
    });

    return;
  }

  if (cfg.id === "OIDC") {
    tokenBox.classList.add("d-none");
    oidcBox.classList.remove("d-none");
    desc.textContent = "Login via OpenID Connect.";

    oidcLoginBtn.addEventListener("click", async () => {
      try {
        await startOidc(cfg);
      } catch (e) {
        showAlert("danger", errMsg(e));
      }
    });

    return;
  }

  showAlert("danger", `Unsupported auth mode: ${cfg.id}`);
  desc.textContent = `Unknown auth mode: ${cfg.id}`;
}

async function startOidc(cfg) {
  const disc = await api.oidc.discover(cfg.discoveryUrl);
  if (!disc?.authorization_endpoint) throw new Error("Discovery missing authorization_endpoint");

  const pkce = await api.oidc.makePkce();
  const state = api.oidc.rndState();

  api.oidc.savePkce({
    verifier: pkce.verifier,
    state,
    cfg: {
      clientId: cfg.clientId,
      audience: cfg.audience || null,
      discoveryUrl: cfg.discoveryUrl,
      callbackUrl: cfg.callbackUrl
    },
    createdAt: Date.now()
  });

  const authorizeUrl = api.oidc.buildAuthorizeUrl({
    authorizationEndpoint: disc.authorization_endpoint,
    clientId: cfg.clientId,
    callbackUrl: cfg.callbackUrl,
    scope: "openid profile email",
    audience: cfg.audience || null,
    state,
    challenge: pkce.challenge,
  });

  window.location.assign(authorizeUrl);
}

function errMsg(e) {
  if (e instanceof ApiError) return e.details || e.message;
  return e?.message || String(e);
}

function escapeHtml(x) {
  return String(x)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}