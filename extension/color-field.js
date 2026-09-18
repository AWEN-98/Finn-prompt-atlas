(function initFBaseColorField(globalScope) {
  "use strict";

  const ROLE_LABELS = Object.freeze({
    zh: Object.freeze({ primary: "主色", secondary: "辅色", accent: "点缀色", shadow: "暗部色", highlight: "高光色", support: "辅助色" }),
    en: Object.freeze({ primary: "Primary", secondary: "Secondary", accent: "Accent", shadow: "Shadow", highlight: "Highlight", support: "Supporting" }),
    ja: Object.freeze({ primary: "主色", secondary: "副色", accent: "アクセント色", shadow: "暗部色", highlight: "ハイライト色", support: "補助色" }),
    ko: Object.freeze({ primary: "주조색", secondary: "보조색", accent: "강조색", shadow: "암부색", highlight: "하이라이트색", support: "지원색" }),
    es: Object.freeze({ primary: "Color principal", secondary: "Color secundario", accent: "Acento", shadow: "Sombra", highlight: "Luz", support: "Color de apoyo" })
  });

  function buildLightColorFieldPixels(data, width, height, options = {}) {
    const safeWidth = Math.max(1, Math.round(Number(width) || 1));
    const safeHeight = Math.max(1, Math.round(Number(height) || 1));
    const pixelCount = safeWidth * safeHeight;
    if (!data || data.length < pixelCount * 4) throw new Error("Color field pixel buffer is incomplete.");

    const lightness = new Float32Array(pixelCount);
    const chromaA = new Float32Array(pixelCount);
    const chromaB = new Float32Array(pixelCount);
    for (let pixel = 0; pixel < pixelCount; pixel += 1) {
      const index = pixel * 4;
      const lab = rgbToOklab(data[index], data[index + 1], data[index + 2]);
      lightness[pixel] = lab.L;
      chromaA[pixel] = lab.a;
      chromaB[pixel] = lab.b;
    }

    const longSide = Math.max(safeWidth, safeHeight);
    // Keep mid-scale color blocks (env vs subject) while still erasing faces/edges.
    // Base is a broad layout field; local chroma is mixed more aggressively so
    // warm-dominant subjects do not stain cooler surrounding regions into mud.
    const baseRadius = Math.max(1, Math.round(Number(options.baseRadius) || Math.max(5, longSide / 15)));
    const localRadius = Math.max(1, Math.round(Number(options.localRadius) || Math.max(3, longSide / 36)));
    const basePasses = Math.max(1, Math.round(Number(options.basePasses ?? options.passes) || 2));
    const localPasses = Math.max(1, Math.round(Number(options.localPasses) || 2));
    const localLightnessWeight = clamp01(options.localLightnessWeight ?? 0.20);
    const localChromaWeight = clamp01(options.localChromaWeight ?? 0.42);

    // Never pull pixels back from the source directly. Both layers are blurred:
    // the base carries broad spatial color and luminance, while the lighter local
    // layer restores regional separation without reviving faces, poses, or edges.
    // Lightness uses a slightly stronger base so facial contours disappear first;
    // chroma keeps more local weight so hue regions stay separable for the model.
    const chromaBaseRadius = Math.max(1, Math.round(baseRadius * 0.82));
    const baseL = boxBlurFloatField(lightness, safeWidth, safeHeight, baseRadius, basePasses);
    const baseA = boxBlurFloatField(chromaA, safeWidth, safeHeight, chromaBaseRadius, basePasses);
    const baseB = boxBlurFloatField(chromaB, safeWidth, safeHeight, chromaBaseRadius, basePasses);
    const localL = boxBlurFloatField(lightness, safeWidth, safeHeight, localRadius, localPasses);
    const localA = boxBlurFloatField(chromaA, safeWidth, safeHeight, localRadius, localPasses);
    const localB = boxBlurFloatField(chromaB, safeWidth, safeHeight, localRadius, localPasses);

    const fieldL = mixFloatFields(baseL, localL, localLightnessWeight);
    const fieldA = mixFloatFields(baseA, localA, localChromaWeight);
    const fieldB = mixFloatFields(baseB, localB, localChromaWeight);
    // Restore variance of the already-blurred field only — never source pixels —
    // and soft-clamp to source percentiles so contrast gain cannot invent hues.
    const outputL = restoreBlurredFieldContrast(fieldL, lightness, 0.78, 1.45);
    const outputA = restoreBlurredFieldContrast(fieldA, chromaA, 0.82, 1.25);
    const outputB = restoreBlurredFieldContrast(fieldB, chromaB, 0.82, 1.25);

    for (let pixel = 0; pixel < pixelCount; pixel += 1) {
      const index = pixel * 4;
      const rgb = oklabToRgb(outputL[pixel], outputA[pixel], outputB[pixel]);
      data[index] = rgb[0];
      data[index + 1] = rgb[1];
      data[index + 2] = rgb[2];
      data[index + 3] = 255;
    }
    return data;
  }

  function mixFloatFields(left, right, weight) {
    const output = new Float32Array(left.length);
    const safeWeight = clamp01(weight);
    for (let index = 0; index < output.length; index += 1) {
      output[index] = left[index] + (right[index] - left[index]) * safeWeight;
    }
    return output;
  }

  function restoreBlurredFieldContrast(field, source, targetSourceRatio, maxGain) {
    const fieldStats = calculateFloatFieldStats(field);
    const sourceStats = calculateFloatFieldStats(source);
    const targetDeviation = sourceStats.deviation * Math.max(0, Number(targetSourceRatio) || 0);
    const gain = fieldStats.deviation > 1e-7
      ? Math.max(1, Math.min(Math.max(1, Number(maxGain) || 1), targetDeviation / fieldStats.deviation))
      : 1;
    const sourceLow = floatFieldPercentile(source, 0.02);
    const sourceHigh = floatFieldPercentile(source, 0.98);
    const pad = Math.max(0.01, (sourceHigh - sourceLow) * 0.04);
    const output = new Float32Array(field.length);
    for (let index = 0; index < field.length; index += 1) {
      const restored = sourceStats.mean + (field[index] - fieldStats.mean) * gain;
      output[index] = Math.max(sourceLow - pad, Math.min(sourceHigh + pad, restored));
    }
    return output;
  }

  function calculateFloatFieldStats(field) {
    if (!field.length) return { mean: 0, deviation: 0 };
    let sum = 0;
    for (let index = 0; index < field.length; index += 1) sum += field[index];
    const mean = sum / field.length;
    let variance = 0;
    for (let index = 0; index < field.length; index += 1) variance += (field[index] - mean) ** 2;
    return { mean, deviation: Math.sqrt(variance / field.length) };
  }

  function floatFieldPercentile(field, percentile) {
    if (!field.length) return 0;
    // Subsample large fields so contrast restoration stays cheap on 384+ inputs.
    const maxSamples = 8192;
    const stride = Math.max(1, Math.ceil(field.length / maxSamples));
    const values = [];
    for (let index = 0; index < field.length; index += stride) values.push(field[index]);
    values.sort((left, right) => left - right);
    const rank = Math.max(0, Math.min(values.length - 1, Math.round((values.length - 1) * clamp01(percentile))));
    return values[rank];
  }

  function extractDeterministicPalettePixels(data, width, height, options = {}) {
    const safeWidth = Math.max(1, Math.round(Number(width) || 1));
    const safeHeight = Math.max(1, Math.round(Number(height) || 1));
    const pixelCount = safeWidth * safeHeight;
    if (!data || data.length < pixelCount * 4) return [];

    const maxSamples = Math.max(512, Math.round(Number(options.maxSamples) || 12_000));
    const stride = Math.max(1, Math.ceil(Math.sqrt(pixelCount / maxSamples)));
    const samples = [];
    for (let y = 0; y < safeHeight; y += stride) {
      for (let x = 0; x < safeWidth; x += stride) {
        const index = (y * safeWidth + x) * 4;
        if (data[index + 3] < 128) continue;
        const r = data[index];
        const g = data[index + 1];
        const b = data[index + 2];
        samples.push({ red: r, green: g, blue: b, ...rgbToOklab(r, g, b) });
      }
    }
    if (!samples.length) return [];

    const requestedClusters = Math.max(2, Math.min(8, Math.round(Number(options.clusterCount) || 8), samples.length));
    let clusters = runDeterministicKMeans(samples, requestedClusters, 14);
    clusters = clusters.filter((cluster) => {
      const ratio = cluster.count / samples.length;
      return ratio >= 0.003 || (Math.hypot(cluster.a, cluster.b) >= 0.08 && ratio >= 0.001);
    });
    const accentCluster = buildAccentCluster(samples, clusters);
    if (accentCluster) clusters.push(accentCluster);
    clusters = mergeNearbyClusters(clusters, 0.032);
    clusters = reassignClusters(samples, clusters);
    clusters = mergeNearbyClusters(clusters, 0.026);
    clusters = selectPaletteClusters(reassignClusters(samples, clusters), 6);
    clusters = reassignClusters(samples, clusters)
      .filter((cluster) => cluster.count > 0)
      .sort((left, right) => right.count - left.count || left.L - right.L)
      .slice(0, 6);

    const labels = ROLE_LABELS[normalizeLanguage(options.language)] || ROLE_LABELS.en;
    const output = clusters.map((cluster, index) => {
      const representative = findRepresentativeSample(samples, cluster);
      return {
        hex: rgbToHex(representative.red, representative.green, representative.blue),
        role: choosePaletteRole(cluster, index, clusters.length, labels),
        ratio: Math.round((cluster.count / samples.length) * 1000) / 10
      };
    });
    normalizeRoundedRatios(output);
    return output;
  }

  function runDeterministicKMeans(samples, clusterCount, iterations) {
    const average = samples.reduce((sum, sample) => ({
      L: sum.L + sample.L,
      a: sum.a + sample.a,
      b: sum.b + sample.b
    }), { L: 0, a: 0, b: 0 });
    average.L /= samples.length;
    average.a /= samples.length;
    average.b /= samples.length;

    const centroids = [closestSample(samples, average)];
    while (centroids.length < clusterCount) {
      let bestSample = samples[0];
      let bestDistance = -1;
      samples.forEach((sample) => {
        const distance = Math.min(...centroids.map((centroid) => colorDistanceSquared(sample, centroid)));
        if (distance > bestDistance) {
          bestDistance = distance;
          bestSample = sample;
        }
      });
      centroids.push({ L: bestSample.L, a: bestSample.a, b: bestSample.b });
    }

    let clusters = centroids.map((centroid) => ({ ...centroid, count: 0 }));
    for (let iteration = 0; iteration < iterations; iteration += 1) {
      const sums = clusters.map(() => ({ L: 0, a: 0, b: 0, count: 0 }));
      samples.forEach((sample) => {
        const clusterIndex = closestClusterIndex(sample, clusters);
        const sum = sums[clusterIndex];
        sum.L += sample.L;
        sum.a += sample.a;
        sum.b += sample.b;
        sum.count += 1;
      });
      clusters = clusters.map((cluster, index) => {
        const sum = sums[index];
        if (!sum.count) return cluster;
        return { L: sum.L / sum.count, a: sum.a / sum.count, b: sum.b / sum.count, count: sum.count };
      });
    }
    return reassignClusters(samples, clusters);
  }

  function reassignClusters(samples, clusters) {
    if (!clusters.length) return [];
    const sums = clusters.map(() => ({ L: 0, a: 0, b: 0, count: 0 }));
    samples.forEach((sample) => {
      const index = closestClusterIndex(sample, clusters);
      const sum = sums[index];
      sum.L += sample.L;
      sum.a += sample.a;
      sum.b += sample.b;
      sum.count += 1;
    });
    return clusters.map((cluster, index) => {
      const sum = sums[index];
      if (!sum.count) return { ...cluster, count: 0 };
      return { L: sum.L / sum.count, a: sum.a / sum.count, b: sum.b / sum.count, count: sum.count };
    });
  }

  function mergeNearbyClusters(input, threshold) {
    const clusters = input.map((cluster) => ({ ...cluster })).sort((left, right) => right.count - left.count);
    const output = [];
    clusters.forEach((cluster) => {
      const match = output.find((candidate) => Math.sqrt(colorDistanceSquared(cluster, candidate)) < threshold);
      if (!match) {
        output.push(cluster);
        return;
      }
      const count = match.count + cluster.count;
      match.L = (match.L * match.count + cluster.L * cluster.count) / count;
      match.a = (match.a * match.count + cluster.a * cluster.count) / count;
      match.b = (match.b * match.count + cluster.b * cluster.count) / count;
      match.count = count;
    });
    return output;
  }

  function buildAccentCluster(samples, clusters) {
    const candidates = [...samples].sort((left, right) => {
      return Math.hypot(right.a, right.b) - Math.hypot(left.a, left.b);
    });
    const seed = candidates.find((sample) => {
      return clusters.every((cluster) => Math.sqrt(colorDistanceSquared(sample, cluster)) >= 0.04);
    });
    if (!seed) return null;
    const members = samples.filter((sample) => Math.sqrt(colorDistanceSquared(sample, seed)) < 0.045);
    if (members.length < Math.max(4, Math.round(samples.length * 0.001))) return null;
    const sum = members.reduce((output, sample) => ({
      L: output.L + sample.L,
      a: output.a + sample.a,
      b: output.b + sample.b
    }), { L: 0, a: 0, b: 0 });
    return {
      L: sum.L / members.length,
      a: sum.a / members.length,
      b: sum.b / members.length,
      count: members.length
    };
  }

  function selectPaletteClusters(input, maxClusters) {
    const clusters = input.filter((cluster) => cluster.count > 0).sort((left, right) => right.count - left.count);
    if (clusters.length <= maxClusters) return clusters;
    const selected = clusters.slice(0, Math.min(4, maxClusters));
    const accent = clusters.reduce((best, cluster) => {
      return Math.hypot(cluster.a, cluster.b) > Math.hypot(best.a, best.b) ? cluster : best;
    }, clusters[0]);
    if (selected.length < maxClusters && !selected.includes(accent)) selected.push(accent);
    const remaining = clusters.filter((cluster) => !selected.includes(cluster));
    while (selected.length < maxClusters && remaining.length) {
      let bestIndex = 0;
      let bestScore = -1;
      remaining.forEach((cluster, index) => {
        const chroma = Math.hypot(cluster.a, cluster.b);
        const separation = Math.sqrt(Math.min(...selected.map((item) => colorDistanceSquared(cluster, item))));
        const coverage = Math.sqrt(cluster.count / clusters[0].count);
        const score = chroma * 1.25 + separation * 0.9 + coverage * 0.08;
        if (score > bestScore) {
          bestScore = score;
          bestIndex = index;
        }
      });
      selected.push(remaining.splice(bestIndex, 1)[0]);
    }
    return selected;
  }

  function closestClusterIndex(sample, clusters) {
    let bestIndex = 0;
    let bestDistance = Number.POSITIVE_INFINITY;
    clusters.forEach((cluster, index) => {
      const distance = colorDistanceSquared(sample, cluster);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = index;
      }
    });
    return bestIndex;
  }

  function closestSample(samples, target) {
    let best = samples[0];
    let bestDistance = Number.POSITIVE_INFINITY;
    samples.forEach((sample) => {
      const distance = colorDistanceSquared(sample, target);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = sample;
      }
    });
    return { L: best.L, a: best.a, b: best.b };
  }

  function findRepresentativeSample(samples, target) {
    let best = samples[0];
    let bestDistance = Number.POSITIVE_INFINITY;
    samples.forEach((sample) => {
      const distance = colorDistanceSquared(sample, target);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = sample;
      }
    });
    return best;
  }

  function choosePaletteRole(cluster, index, total, labels) {
    const chroma = Math.hypot(cluster.a, cluster.b);
    const ratio = cluster.count;
    if (index === 0) return labels.primary;
    if (index === 1) return labels.secondary;
    if (cluster.L < 0.3) return labels.shadow;
    if (cluster.L > 0.87) return labels.highlight;
    if (chroma > 0.095 && (index >= Math.max(2, total - 2) || ratio < 0.1)) return labels.accent;
    return labels.support;
  }

  function normalizeRoundedRatios(items) {
    if (!items.length) return;
    const total = items.reduce((sum, item) => sum + item.ratio, 0);
    const adjustment = Math.round((100 - total) * 10) / 10;
    items[0].ratio = Math.max(0, Math.round((items[0].ratio + adjustment) * 10) / 10);
  }

  function colorDistanceSquared(left, right) {
    return (left.L - right.L) ** 2 + (left.a - right.a) ** 2 + (left.b - right.b) ** 2;
  }

  function boxBlurFloatField(source, width, height, radius, passes = 1) {
    const blurRadius = Math.max(0, Math.round(Number(radius) || 0));
    if (blurRadius < 1) return new Float32Array(source);
    let current = new Float32Array(source);
    const passCount = Math.max(1, Math.round(Number(passes) || 1));
    for (let pass = 0; pass < passCount; pass += 1) {
      current = boxBlurVertical(boxBlurHorizontal(current, width, height, blurRadius), width, height, blurRadius);
    }
    return current;
  }

  function boxBlurHorizontal(source, width, height, radius) {
    const output = new Float32Array(source.length);
    const prefix = new Float32Array(width + 1);
    for (let y = 0; y < height; y += 1) {
      const rowOffset = y * width;
      prefix[0] = 0;
      for (let x = 0; x < width; x += 1) prefix[x + 1] = prefix[x] + source[rowOffset + x];
      for (let x = 0; x < width; x += 1) {
        const start = Math.max(0, x - radius);
        const end = Math.min(width - 1, x + radius);
        output[rowOffset + x] = (prefix[end + 1] - prefix[start]) / (end - start + 1);
      }
    }
    return output;
  }

  function boxBlurVertical(source, width, height, radius) {
    const output = new Float32Array(source.length);
    const prefix = new Float32Array(height + 1);
    for (let x = 0; x < width; x += 1) {
      prefix[0] = 0;
      for (let y = 0; y < height; y += 1) prefix[y + 1] = prefix[y] + source[y * width + x];
      for (let y = 0; y < height; y += 1) {
        const start = Math.max(0, y - radius);
        const end = Math.min(height - 1, y + radius);
        output[y * width + x] = (prefix[end + 1] - prefix[start]) / (end - start + 1);
      }
    }
    return output;
  }

  function rgbToOklab(r, g, b) {
    const lr = srgbToLinear(r / 255);
    const lg = srgbToLinear(g / 255);
    const lb = srgbToLinear(b / 255);
    const l = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb;
    const m = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb;
    const s = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb;
    const lRoot = Math.cbrt(l);
    const mRoot = Math.cbrt(m);
    const sRoot = Math.cbrt(s);
    return {
      L: 0.2104542553 * lRoot + 0.793617785 * mRoot - 0.0040720468 * sRoot,
      a: 1.9779984951 * lRoot - 2.428592205 * mRoot + 0.4505937099 * sRoot,
      b: 0.0259040371 * lRoot + 0.7827717662 * mRoot - 0.808675766 * sRoot
    };
  }

  function oklabToRgb(L, a, b) {
    const lRoot = L + 0.3963377774 * a + 0.2158037573 * b;
    const mRoot = L - 0.1055613458 * a - 0.0638541728 * b;
    const sRoot = L - 0.0894841775 * a - 1.291485548 * b;
    const l = lRoot ** 3;
    const m = mRoot ** 3;
    const s = sRoot ** 3;
    return [
      clampByte(linearToSrgb(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s) * 255),
      clampByte(linearToSrgb(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s) * 255),
      clampByte(linearToSrgb(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s) * 255)
    ];
  }

  function srgbToLinear(value) {
    const clamped = clamp01(value);
    return clamped <= 0.04045 ? clamped / 12.92 : ((clamped + 0.055) / 1.055) ** 2.4;
  }

  function linearToSrgb(value) {
    const clamped = clamp01(value);
    return clamped <= 0.0031308 ? 12.92 * clamped : 1.055 * (clamped ** (1 / 2.4)) - 0.055;
  }

  function normalizeLanguage(value) {
    const normalized = String(value || "").toLowerCase();
    if (normalized.startsWith("zh") || normalized.startsWith("cn")) return "zh";
    if (normalized.startsWith("ja")) return "ja";
    if (normalized.startsWith("ko")) return "ko";
    if (normalized.startsWith("es")) return "es";
    return "en";
  }

  function rgbToHex(r, g, b) {
    return `#${[r, g, b].map((value) => clampByte(value).toString(16).padStart(2, "0")).join("").toUpperCase()}`;
  }

  function clamp01(value) {
    return Math.max(0, Math.min(1, Number(value) || 0));
  }

  function clampByte(value) {
    return Math.max(0, Math.min(255, Math.round(Number(value) || 0)));
  }

  function mix(left, right, weight) {
    return left + (right - left) * clamp01(weight);
  }

  globalScope.FBaseColorField = Object.freeze({
    buildLightColorFieldPixels,
    extractDeterministicPalettePixels,
    rgbToOklab
  });
})(globalThis);
