(function initFBaseStorageAccess(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.FBaseStorageAccess = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createFBaseStorageAccess() {
  function initializeTrustedStorageAccess(storageArea, options = {}) {
    const onDiagnostic = typeof options.onDiagnostic === "function" ? options.onDiagnostic : () => {};
    const setAccessLevel = storageArea?.setAccessLevel;

    if (typeof setAccessLevel !== "function") {
      const result = {
        secured: false,
        code: "storage_access_level_api_unavailable"
      };
      onDiagnostic(result);
      return Promise.resolve(result);
    }

    try {
      return Promise.resolve(setAccessLevel.call(storageArea, { accessLevel: "TRUSTED_CONTEXTS" }))
        .then(() => ({ secured: true, code: "storage_access_level_secured" }))
        .catch((error) => {
          const result = {
            secured: false,
            code: "storage_access_level_rejected",
            errorName: String(error?.name || "Error")
          };
          onDiagnostic(result);
          return result;
        });
    } catch (error) {
      const result = {
        secured: false,
        code: "storage_access_level_threw",
        errorName: String(error?.name || "Error")
      };
      onDiagnostic(result);
      return Promise.resolve(result);
    }
  }

  return { initializeTrustedStorageAccess };
});
