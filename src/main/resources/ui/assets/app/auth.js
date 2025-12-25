import { api } from "./api.js";

export const Permission = Object.freeze({
  KEY_GET_PUBLICKEY: "tkeeper.key.%s.public",
  KEY_SIGN: "tkeeper.key.%s.sign",
  KEY_VERIFY: "tkeeper.key.%s.verify",
  KEY_ENCRYPT: "tkeeper.key.%s.encrypt",
  KEY_DECRYPT: "tkeeper.key.%s.decrypt",
  KEY_DESTROY: "tkeeper.key.%s.destroy",

  SYSTEM_UNSEAL: "tkeeper.system.unseal",
  SYSTEM_SEAL: "tkeeper.system.seal",
  SYSTEM_INIT: "tkeeper.system.init",
  SYSTEM_STATUS: "tkeeper.system.status",

  STORE_WRITE: "tkeeper.storage.write",
  GENERATE_KEY: "tkeeper.dkg.%s",

  INTEGRITY_ROTATE: "tkeeper.integrity.rotate",
  AUDIT_LOG_VERIFY: "tkeeper.audit.log.verify",
  COMPLIANCE_INVENTORY: "tkeeper.compliance.inventory",
  CONSISTENCY_FIX: "tkeeper.consistency.fix",

  integrityRotate() { return Permission.INTEGRITY_ROTATE; },
  systemUnseal() { return Permission.SYSTEM_UNSEAL; },
  systemSeal() { return Permission.SYSTEM_SEAL; },
  systemInit() { return Permission.SYSTEM_INIT; },
  systemStatus() { return Permission.SYSTEM_STATUS; },
  storageWrite() { return Permission.STORE_WRITE; },
  auditLogVerify() { return Permission.AUDIT_LOG_VERIFY; },
  inventory() { return Permission.COMPLIANCE_INVENTORY; },
  consistencyFix() { return Permission.CONSISTENCY_FIX; },

  keyGetPublicKey(key) { return fmt(Permission.KEY_GET_PUBLICKEY, key); },
  keySign(key) { return fmt(Permission.KEY_SIGN, key); },
  keyVerify(key) { return fmt(Permission.KEY_VERIFY, key); },
  keyEncrypt(key) { return fmt(Permission.KEY_ENCRYPT, key); },
  keyDecrypt(key) { return fmt(Permission.KEY_DECRYPT, key); },
  keyDestroy(key) { return fmt(Permission.KEY_DESTROY, key); },

  generateKey(mode) { return fmt(Permission.GENERATE_KEY, String(mode).toLowerCase()); },
});

function fmt(template, value) {
  return template.replace("%s", String(value));
}

export class PermissionSet {
  constructor(perms = []) {
    this._set = new Set(perms);
    this._cache = new Map();
    this._cacheMax = 256;
  }

  hasExact(permission) {
    return this._set.has(permission);
  }

  has(pattern) {
    if (!pattern || typeof pattern !== "string") return false;
    if (this._set.has(pattern)) return true;
    if (this._cache.has(pattern)) return this._cache.get(pattern);
    const result = this._matchAny(pattern);
    this._remember(pattern, result);
    return result;
  }

  anyOf(patterns) {
    for (const p of patterns) if (this.has(p)) return true;
    return false;
  }

  allOf(patterns) {
    for (const p of patterns) if (!this.has(p)) return false;
    return true;
  }

  _remember(key, value) {
    this._cache.set(key, value);
    if (this._cache.size > this._cacheMax) {
      const first = this._cache.keys().next().value;
      this._cache.delete(first);
    }
  }

  _matchAny(pattern) {
      const pSeg = splitPerm(pattern);
      if (pSeg.length === 0) return false;
      const startsWithWildcard = (pSeg[0] === "*");

      for (const perm of this._set) {
        const sSeg = splitPerm(perm);
        if (sSeg.length === 0) continue;

        if (startsWithWildcard && sSeg.length === 1) continue;
        if (pSeg.length !== sSeg.length) continue;

        let ok = true;
        for (let i = 0; i < pSeg.length; i++) {
          const ps = pSeg[i];
          const ss = sSeg[i];

          if (ps === "*" || ss === "*") continue;

          if (ps !== ss) { ok = false; break; }
        }
        if (ok) return true;
      }
      return false;
  }
}

function splitPerm(s) {
  return String(s).split(".").filter(Boolean);
}

export const Auth = {
  subject: null,
  permissions: new PermissionSet([]),
  loaded: false,

  async load() {
    const data = await api.getMe();
    this.subject = data?.subject ?? null;
    this.permissions = new PermissionSet(Array.isArray(data?.permissions) ? data.permissions : []);
    this.loaded = true;
    return this;
  },

  reset() {
    this.subject = null;
    this.permissions = new PermissionSet([]);
    this.loaded = false;
  },

  hasPermission(pattern) {
    return this.permissions.has(pattern);
  },

  requirePerm(pattern, message = "Access denied") {
    if (!this.hasPermission(pattern)) {
      const err = new Error(message);
      err.code = "ACCESS_DENIED";
      err.permission = pattern;
      throw err;
    }
  },

  requireAny(patterns, message = "Access denied") {
    if (!this.permissions.anyOf(patterns)) {
      const err = new Error(message);
      err.code = "ACCESS_DENIED";
      err.permissions = patterns;
      throw err;
    }
  },
};

export function keyPerms(key) {
  return Object.freeze({
    public: Permission.keyGetPublicKey(key),
    sign: Permission.keySign(key),
    verify: Permission.keyVerify(key),
    encrypt: Permission.keyEncrypt(key),
    decrypt: Permission.keyDecrypt(key),
    destroy: Permission.keyDestroy(key),
  });
}