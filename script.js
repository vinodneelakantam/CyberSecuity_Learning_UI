// Compatibility entrypoint for older page versions that load script.js.
// It forwards execution to the current module-based bootstrap.
(async () => {
  try {
    await import("./js/main.js");
  } catch (err) {
    console.error("Failed to load app bootstrap module ./js/main.js", err);
  }
})();
