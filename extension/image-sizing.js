(function initFBaseImageSizing(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.FBaseImageSizing = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createFBaseImageSizing() {
  const SUPPORTED_ASPECT_RATIOS = Object.freeze([
    "1:1", "2:3", "3:2", "3:4", "4:3", "9:16", "16:9", "4:5", "21:9", "9:21", "3:1", "1:3"
  ]);

  /* GCD 化简后若某项仍大于该值，说明宽高近似互质（如 1229:2048），
     此时改用最简分数逼近，避免把原始像素尺寸直接当作画幅比例展示 */
  const MAX_SIMPLE_RATIO_TERM = 40;

  const IMAGE_SIZE_PROFILES = deepFreeze({
    "1k": { sizes: {
      "1:1": "1024x1024", "2:3": "1024x1536", "3:2": "1536x1024",
      "3:4": "1008x1344", "4:3": "1344x1008", "9:16": "864x1536",
      "16:9": "1536x864", "4:5": "1024x1280", "21:9": "1536x1024", "9:21": "1024x1536", "3:1": "1536x512", "1:3": "512x1536"
    } },
    "2k": { sizes: {
      "1:1": "2048x2048", "2:3": "1440x2160", "3:2": "2160x1440",
      "3:4": "1440x1920", "4:3": "1920x1440", "9:16": "1440x2560",
      "16:9": "2560x1440", "4:5": "1536x1920", "21:9": "2160x1440", "9:21": "1440x2160", "3:1": "3072x1024", "1:3": "1024x3072"
    } },
    "4k": { sizes: {
      "1:1": "2048x2048", "2:3": "2048x3072", "3:2": "3072x2048",
      "3:4": "2304x3072", "4:3": "3072x2304", "9:16": "2160x3840",
      "16:9": "3840x2160", "4:5": "2048x2560", "21:9": "3072x2048", "9:21": "2048x3072", "3:1": "3072x1024", "1:3": "1024x3072"
    } }
  });

  function normalizeImageGenerationSize(value, resolution = "1k") {
    const tier = normalizeImageResolutionTier(resolution);
    const profile = IMAGE_SIZE_PROFILES[tier];
    const ratio = resolveSupportedAspectRatio(value);
    return profile.sizes[ratio] || profile.sizes["1:1"];
  }

  function normalizeImageResolutionTier(value) {
    const normalized = String(value || "").trim().toLowerCase();
    return Object.prototype.hasOwnProperty.call(IMAGE_SIZE_PROFILES, normalized) ? normalized : "1k";
  }

  function normalizeAllowedImageGenerationSize(value, resolution, allowedTiers = ["1k"]) {
    const requestedTier = normalizeImageResolutionTier(resolution);
    const allowed = Array.isArray(allowedTiers) ? allowedTiers.map(normalizeImageResolutionTier) : ["1k"];
    const tier = allowed.includes(requestedTier) ? requestedTier : "1k";
    return normalizeImageGenerationSize(value, tier);
  }

  function resolveSupportedAspectRatio(value) {
    const normalized = String(value || "").trim().toLowerCase().replace("：", ":");
    if (SUPPORTED_ASPECT_RATIOS.includes(normalized)) return normalized;
    const dimensions = parseAspectDimensions(normalized);
    if (!dimensions) return "1:1";
    const { width, height } = dimensions;
    if (!width || !height) return "1:1";
    const sourceRatio = width / height;
    return SUPPORTED_ASPECT_RATIOS
      .map((ratio) => {
        const [ratioWidth, ratioHeight] = ratio.split(":").map(Number);
        return { ratio, distance: Math.abs(Math.log(sourceRatio / (ratioWidth / ratioHeight))) };
      })
      .sort((a, b) => a.distance - b.distance)[0]?.ratio || "1:1";
  }

  function resolveMeasuredAspectRatio(value) {
    const dimensions = parseAspectDimensions(value);
    if (!dimensions) return "1:1";
    const { width, height } = dimensions;
    const sourceRatio = width / height;
    const nearest = SUPPORTED_ASPECT_RATIOS
      .map((ratio) => {
        const [ratioWidth, ratioHeight] = ratio.split(":").map(Number);
        return { ratio, distance: Math.abs(Math.log(sourceRatio / (ratioWidth / ratioHeight))) };
      })
      .sort((a, b) => a.distance - b.distance)[0];
    if (nearest && nearest.distance <= 0.012) return nearest.ratio;
    const divisor = greatestCommonDivisor(width, height);
    const simpleWidth = Math.round(width / divisor);
    const simpleHeight = Math.round(height / divisor);
    if (simpleWidth <= MAX_SIMPLE_RATIO_TERM && simpleHeight <= MAX_SIMPLE_RATIO_TERM) {
      return `${simpleWidth}:${simpleHeight}`;
    }
    return approximateSimpleRatio(width / height);
  }

  /* 在限定项数内找最接近的简单整数比（如 1229:2048 → 3:5） */
  function approximateSimpleRatio(sourceRatio, maxTerm = MAX_SIMPLE_RATIO_TERM) {
    let best = { num: 1, den: 1, error: Math.abs(sourceRatio - 1) };
    for (let den = 1; den <= maxTerm; den += 1) {
      const num = Math.round(sourceRatio * den);
      if (num < 1 || num > maxTerm) continue;
      const error = Math.abs(sourceRatio - num / den);
      if (error < best.error) best = { num, den, error };
    }
    return `${best.num}:${best.den}`;
  }

  function parseAspectDimensions(value) {
    const normalized = String(value || "").trim().toLowerCase().replace("：", ":");
    const match = normalized.match(/^(\d{1,5})\s*(?:x|:)\s*(\d{1,5})$/);
    if (!match) return null;
    const width = Number(match[1]);
    const height = Number(match[2]);
    return width > 0 && height > 0 ? { width, height } : null;
  }

  function greatestCommonDivisor(left, right) {
    let a = Math.round(Math.abs(left));
    let b = Math.round(Math.abs(right));
    while (b) [a, b] = [b, a % b];
    return a || 1;
  }

  function deepFreeze(value) {
    Object.values(value).forEach((item) => {
      if (item && typeof item === "object" && !Object.isFrozen(item)) deepFreeze(item);
    });
    return Object.freeze(value);
  }

  return {
    IMAGE_SIZE_PROFILES,
    SUPPORTED_ASPECT_RATIOS,
    normalizeAllowedImageGenerationSize,
    normalizeImageGenerationSize,
    normalizeImageResolutionTier,
    resolveMeasuredAspectRatio,
    resolveSupportedAspectRatio
  };
});
