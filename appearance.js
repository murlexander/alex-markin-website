/* Seeded appearance composer for the homepage and coffee catalogue.
   Runs before CSS paints, so every edition arrives fully composed. */
(function () {
  var root = document.documentElement;
  /* Each CRT phosphor family anchors a hue; every edition jitters it and draws
     independent saturation/lightness per token role so no two editions of the
     same family render identically. coolBias lifts text-role lightness for
     hues whose WCAG luminance-per-lightness runs low (blue/violet/rose/magenta). */
  var crtPhosphorFamilies = [
    { name: "green", hue: 118, hueJitter: 13, satMul: 1.15, coolBias: false },
    { name: "amber", hue: 34, hueJitter: 13, satMul: 1.15, coolBias: false },
    { name: "blue", hue: 207, hueJitter: 13, satMul: 1.15, coolBias: true },
    { name: "violet", hue: 274, hueJitter: 13, satMul: 1.15, coolBias: true },
    { name: "rose", hue: 343, hueJitter: 13, satMul: 1.15, coolBias: true },
    { name: "cyan", hue: 165, hueJitter: 12, satMul: 1.15, coolBias: false },
    { name: "mono", hue: 210, hueJitter: 14, satMul: 0.3, coolBias: true },
    { name: "magenta", hue: 322, hueJitter: 13, satMul: 1.6, coolBias: true },
    { name: "acid-lime", hue: 80, hueJitter: 12, satMul: 1.45, coolBias: false }
  ];
  var crtRoleBands = {
    bg: { sat: [35, 70], light: [1, 2.5], coolLight: [1, 2.5] },
    ink: { sat: [38, 80], light: [78, 85], coolLight: [85, 90] },
    bright: { sat: [72, 100], light: [90, 94], coolLight: [90, 94] },
    muted: { sat: [20, 40], light: [58, 64], coolLight: [66, 70] },
    faint: { sat: [12, 36], light: [45, 49], coolLight: [56, 60] },
    foot: { sat: [12, 36], light: [42, 46], coolLight: [53, 57] },
    accent: { sat: [32, 78], light: [60, 74], coolLight: [74, 82] },
    hair: { sat: [20, 44], light: [18, 24], coolLight: [18, 24] },
    rule: { sat: [20, 48], light: [11, 16], coolLight: [11, 16] },
    border: { sat: [22, 48], light: [16, 22], coolLight: [16, 22] },
    chip: { sat: [26, 68], light: [3, 7], coolLight: [3, 7] }
  };
  var looks = ["simple", "paper", "blobs", "eno", "70mm", "crt", "terminal"];
  var lookLabels = { simple: "smpl", paper: "paper", blobs: "blob", eno: "eno", "70mm": "70mm", crt: "crt", terminal: ">..." };
  var lookAliases = {
    simple: "simple", smpl: "simple", paper: "paper", blobs: "blobs", blob: "blobs",
    eno: "eno", "70mm": "70mm", film: "70mm", crt: "crt", terminal: "terminal", ">...": "terminal"
  };
  var appearanceAttributes = [
    "data-look", "data-edition-seed", "data-rule-style", "data-utility-treatment", "data-paper-heading", "data-paper-texture", "data-blob-layout",
    "data-blob-count", "data-blob-mobile-extra", "data-eno-composition", "data-eno-contrast",
    "data-film-tone", "data-film-streaks", "data-film-stains", "data-film-scratches", "data-crt-signal", "data-terminal-prompt"
  ];
  var appliedProperties = [];
  var currentEdition;
  var editionStorageKey = "alex-markin:appearance";
  var editionResources = [];
  var imageProperties = ["--grain-url", "--paper-texture-url", "--film-dust-url", "--film-perf-hole-url", "--crt-cursor-url"];
  var pageInactive = false;

  // Own generated SVGs explicitly through shuffles and history caching;
  // object URLs give their image/filter resources a revocable lifetime.
  // The SVG bytes and raster resolution are unchanged, with no async paint step.
  function imageValue(name, value) {
    if (imageProperties.indexOf(name) === -1 || !window.Blob ||
        !window.URL || !window.URL.createObjectURL || !window.URL.revokeObjectURL) return value;
    var match = /^url\("data:image\/svg\+xml,(.*)"\)$/.exec(value);
    if (!match) return value;
    try {
      var url = window.URL.createObjectURL(new window.Blob([decodeURIComponent(match[1])], { type: "image/svg+xml" }));
      editionResources.push(url);
      return 'url("' + url + '")';
    } catch (error) {
      return value; // Restricted URL/storage implementations keep the original image.
    }
  }

  function releaseImages() {
    editionResources.forEach(function (url) { window.URL.revokeObjectURL(url); });
    editionResources = [];
  }

  function hashSeed(value) {
    var h = 2166136261;
    var text = String(value);
    for (var i = 0; i < text.length; i++) {
      h ^= text.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function randomFrom(seed) {
    var state = hashSeed(seed);
    return function () {
      state += 0x6D2B79F5;
      var n = state;
      n = Math.imul(n ^ (n >>> 15), n | 1);
      n ^= n + Math.imul(n ^ (n >>> 7), n | 61);
      return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
    };
  }

  function makeSeed() {
    if (window.crypto && window.crypto.getRandomValues) {
      var values = new Uint32Array(2);
      window.crypto.getRandomValues(values);
      return values[0].toString(36) + values[1].toString(36);
    }
    return Date.now().toString(36) + Math.floor(Math.random() * 0xffffffff).toString(36);
  }

  function pick(random, values) {
    return values[Math.floor(random() * values.length)];
  }

  function range(random, min, max, decimals) {
    var value = min + random() * (max - min);
    return Number(value.toFixed(decimals || 0));
  }

  /* Typography used to consume seeded draws independently in each look.
     Keep those positions stable so shared historical seeds retain every
     non-type choice after the scale became responsive and deterministic. */
  function advanceSeed(random, count) {
    while (count > 0) {
      random();
      count -= 1;
    }
  }

  function canvasWidth(random) {
    return range(random, 950, 1180, 0) + "px";
  }

  function hslToRgb(h, s, l) {
    var hue = ((h % 360) + 360) % 360;
    var sat = Math.min(Math.max(s, 0), 100) / 100;
    var light = Math.min(Math.max(l, 0), 100) / 100;
    var c = (1 - Math.abs(2 * light - 1)) * sat;
    var x = c * (1 - Math.abs((hue / 60) % 2 - 1));
    var m = light - c / 2;
    var r, g, b;
    if (hue < 60) { r = c; g = x; b = 0; }
    else if (hue < 120) { r = x; g = c; b = 0; }
    else if (hue < 180) { r = 0; g = c; b = x; }
    else if (hue < 240) { r = 0; g = x; b = c; }
    else if (hue < 300) { r = x; g = 0; b = c; }
    else { r = c; g = 0; b = x; }
    return [
      Math.round((r + m) * 255),
      Math.round((g + m) * 255),
      Math.round((b + m) * 255)
    ];
  }

  function hslToHex(h, s, l) {
    var rgb = hslToRgb(h, s, l);
    return "#" + rgb.map(function (channel) {
      return Math.min(Math.max(channel, 0), 255).toString(16).padStart(2, "0");
    }).join("");
  }

  function inverseHex(hex) {
    var value = String(hex || "").replace("#", "");
    if (!/^[0-9a-f]{6}$/i.test(value)) return "#7d8f5c";
    var red = 255 - parseInt(value.slice(0, 2), 16);
    var green = 255 - parseInt(value.slice(2, 4), 16);
    var blue = 255 - parseInt(value.slice(4, 6), 16);
    return "#" + [red, green, blue].map(function (channel) {
      return channel.toString(16).padStart(2, "0");
    }).join("");
  }

  function mixHex(hexA, hexB, weightA) {
    var a = String(hexA || "").replace("#", "");
    var b = String(hexB || "").replace("#", "");
    var w = Math.min(100, Math.max(0, weightA)) / 100;
    var channels = [0, 2, 4].map(function (i) {
      var av = parseInt(a.slice(i, i + 2), 16);
      var bv = parseInt(b.slice(i, i + 2), 16);
      return Math.round(av * w + bv * (1 - w));
    });
    return "#" + channels.map(function (c) { return c.toString(16).padStart(2, "0"); }).join("");
  }

  function hexToHsl(hex) {
    var value = String(hex || "").replace("#", "");
    var r = parseInt(value.slice(0, 2), 16) / 255;
    var g = parseInt(value.slice(2, 4), 16) / 255;
    var b = parseInt(value.slice(4, 6), 16) / 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var h = 0, s = 0, l = (max + min) / 2;
    if (max !== min) {
      var d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
    }
    return [h, s * 100, l * 100];
  }

  /* Light leaks are never quite the palette's own swatch twice: each one
     jitters hue away from its base color and lifts saturation/lightness, so
     the leak family reads as genuinely varied and a little more luminous
     than the restrained ink/accent palette around it. */
  function filmLeakColor(random, hex) {
    var hsl = hexToHsl(hex);
    var hue = hsl[0] + range(random, -22, 22, 0);
    var sat = Math.min(96, hsl[1] + range(random, 6, 22, 0));
    var light = Math.min(88, hsl[2] + range(random, 8, 20, 0));
    return hslToHex(hue, sat, light);
  }

  /* 70mm perforation geometry, derived from one seeded pitch instead of three
     independent randoms, so hole/pitch and width/height ratios always match a
     real perforation standard. Rendered as a colored SVG tile (not a
     repeating-gradient) so corners can be genuinely rounded. */
  function perfHoleVars(random, edgeColor) {
    var pitch = range(random, 38, 52, 0);
    var holeWidth = Math.round(pitch * 0.59 * 10) / 10;
    var holeHeight = Math.round(holeWidth * 0.71 * 10) / 10;
    var radius = Math.round(holeWidth * 0.18 * 10) / 10;
    var bandHeight = Math.ceil(holeHeight * range(random, 2.8, 3.1, 2));
    var rasterScale = 4;
    var holeX = Math.round((pitch - holeWidth) / 2 * 10) / 10;
    var holeY = Math.round((bandHeight - holeHeight) / 2 * 10) / 10;
    // One flat aperture: keep all four corners intact, with no raised top lip.
    var fill = mixHex(mixHex(edgeColor, "#d1cbc0", 65), "#000000", range(random, 30, 38, 0));
    var svg = "<svg xmlns='http://www.w3.org/2000/svg' width='" + (pitch * rasterScale) + "' height='" + (bandHeight * rasterScale) +
      "' viewBox='0 0 " + pitch + " " + bandHeight + "'>" +
      "<rect x='" + holeX + "' y='" + holeY + "' width='" + holeWidth + "' height='" + holeHeight + "' rx='" + radius + "' fill='" + fill + "'/>" +
      "</svg>";
    return {
      "--film-perf-pitch": pitch + "px",
      "--film-perf-hole-width": holeWidth + "px",
      "--film-perf-hole-height": holeHeight + "px",
      "--film-perf-radius": radius + "px",
      "--film-perf-height": bandHeight + "px",
      "--film-perf-hole-url": 'url("data:image/svg+xml,' + encodeURIComponent(svg) + '")'
    };
  }

  /* Sparse surface dust: a handful of small dark specks with a few bright
     ones mixed in (light finding its way through a scratched fleck), tiled
     large enough that the repeat isn't obvious across a normal frame. */
  function dustVars(random) {
    var tile = range(random, 220, 380, 0);
    var rasterScale = 3;
    var count = range(random, 7, 18, 0);
    var shapes = "";
    for (var i = 0; i < count; i++) {
      var bright = random() < 0.28;
      var x = range(random, 0, tile, 1);
      var y = range(random, 0, tile, 1);
      var r = range(random, 0.4, bright ? 1.1 : 1.8, 2);
      var op = range(random, bright ? 0.35 : 0.3, bright ? 0.7 : 0.72, 2);
      shapes += "<circle cx='" + x + "' cy='" + y + "' r='" + r + "' fill='" + (bright ? "#fff" : "#000") + "' opacity='" + op + "'/>";
    }
    var svg = "<svg xmlns='http://www.w3.org/2000/svg' width='" + (tile * rasterScale) + "' height='" + (tile * rasterScale) +
      "' viewBox='0 0 " + tile + " " + tile + "'>" + shapes + "</svg>";
    return {
      "--film-dust-url": 'url("data:image/svg+xml,' + encodeURIComponent(svg) + '")',
      "--film-dust-size": tile + "px",
      "--film-dust-opacity": range(random, 0.3, 0.6, 2)
    };
  }

  function normalizeLook(value) {
    return lookAliases[value] || null;
  }

  /* The current tab owns one visual edition across the homepage and coffee.
     Query parameters remain explicit overrides; session storage covers direct
     navigation, reloads, and history traversal without persisting forever. */
  function readStoredEdition() {
    try {
      var stored = JSON.parse(window.sessionStorage.getItem(editionStorageKey));
      var look = stored && normalizeLook(stored.look);
      var seed = stored && typeof stored.seed === "string" ? stored.seed : "";
      return look && seed && seed.length <= 256 ? { look: look, seed: seed } : null;
    } catch (error) {
      return null;
    }
  }

  function storeEdition(edition) {
    try {
      window.sessionStorage.setItem(editionStorageKey, JSON.stringify({
        look: edition.look,
        seed: edition.seed
      }));
    } catch (error) {
      /* Storage may be unavailable; query-linked navigation still works. */
    }
  }

  function blobColor(random, hue) {
    var variedHue = Math.round((hue + range(random, -20, 20, 0) + 360) % 360);
    var saturation = range(random, 34, 62, 0);
    var lightness = range(random, 28, 49, 0);
    return "hsl(" + variedHue + " " + saturation + "% " + lightness + "%)";
  }

  function grainVars(random, bounds) {
    var tile = range(random, bounds.tile[0], bounds.tile[1], 0);
    var rasterScale = 4;
    var rasterTile = tile * rasterScale;
    var frequency = range(random, bounds.frequency[0], bounds.frequency[1], 3);
    var octaves = range(random, bounds.octaves[0], bounds.octaves[1], 0);
    var noiseSeed = range(random, 1, 9999, 0);
    var svg = "<svg xmlns='http://www.w3.org/2000/svg' width='" + rasterTile + "' height='" + rasterTile +
      "' viewBox='0 0 " + tile + " " + tile + "' preserveAspectRatio='none'>" +
      "<filter id='n' x='0' y='0' width='" + tile + "' height='" + tile +
      "' filterUnits='userSpaceOnUse' filterRes='" + rasterTile + " " + rasterTile +
      "' color-interpolation-filters='sRGB'><feTurbulence type='fractalNoise' " +
      "baseFrequency='" + frequency + "' numOctaves='" + octaves +
      "' seed='" + noiseSeed + "' stitchTiles='stitch' result='noise'/><feColorMatrix in='noise' type='saturate' values='0'/></filter>" +
      "<rect width='" + tile + "' height='" + tile + "' filter='url(#n)'/></svg>";
    var vars = {
      "--grain-url": 'url("data:image/svg+xml,' + encodeURIComponent(svg) + '")',
      "--grain-size": tile + "px",
      "--grain-raster-scale": rasterScale,
      "--grain-frequency": frequency,
      "--grain-octaves": octaves,
      "--grain-seed": noiseSeed,
      "--grain-contrast": range(random, bounds.contrast[0], bounds.contrast[1], 2),
      "--grain-brightness": range(random, bounds.brightness[0], bounds.brightness[1], 2),
      "--grain-rate": range(random, bounds.rate[0], bounds.rate[1], 0) + "ms"
    };
    vars["--grain-opacity"] = range(random, bounds.opacity[0], bounds.opacity[1], 3);
    return vars;
  }

  /* Louppe's crisp grain is the shared centre point. Individual appearances
     can nudge physical scale and strength without falling back into cloudy,
     low-contrast noise. */
  function grainBounds(overrides) {
    var bounds = {
      tile: [512, 560],
      frequency: [0.6, 0.72],
      octaves: [4, 5],
      contrast: [2.2, 2.6],
      brightness: [0.68, 0.78],
      rate: [720, 960]
    };
    Object.keys(overrides || {}).forEach(function (key) {
      bounds[key] = overrides[key];
    });
    return bounds;
  }

  function paperTextureVars(random) {
    var type = pick(random, ["laid", "vellum", "watercolour"]);
    var tile = type === "watercolour"
      ? range(random, 820, 1080, 0)
      : range(random, 720, 960, 0);
    var rasterScale = 2;
    var rasterTile = tile * rasterScale;
    var primarySeed = range(random, 1, 9999, 0);
    var secondarySeed = range(random, 1, 9999, 0);
    var filterNodes;
    var opacity;
    var contrast;
    var brightness;
    var blend;
    var textureExponent;

    if (type === "laid") {
      var fibreX = range(random, 0.008, 0.014, 3);
      var fibreY = range(random, 0.07, 0.12, 3);
      var pulpFrequency = range(random, 0.018, 0.035, 3);
      filterNodes = "<feTurbulence type='fractalNoise' baseFrequency='" + fibreX + " " + fibreY +
        "' numOctaves='3' seed='" + primarySeed + "' stitchTiles='stitch' result='primary'/>" +
        "<feTurbulence type='fractalNoise' baseFrequency='" + pulpFrequency + "' numOctaves='2' seed='" + secondarySeed +
        "' stitchTiles='stitch' result='secondary'/><feBlend in='primary' in2='secondary' mode='multiply' result='paper'/>";
      opacity = range(random, 0.1, 0.145, 3);
      contrast = range(random, 1.04, 1.14, 2);
      brightness = range(random, 0.98, 1.03, 2);
      blend = "multiply";
      textureExponent = range(random, 0.42, 0.48, 2);
    } else if (type === "vellum") {
      var vellumFrequency = range(random, 0.018, 0.035, 3);
      var vellumFleck = range(random, 0.08, 0.14, 3);
      filterNodes = "<feTurbulence type='fractalNoise' baseFrequency='" + vellumFrequency +
        "' numOctaves='3' seed='" + primarySeed + "' stitchTiles='stitch' result='primary'/>" +
        "<feTurbulence type='fractalNoise' baseFrequency='" + vellumFleck + "' numOctaves='1' seed='" + secondarySeed +
        "' stitchTiles='stitch' result='secondary'/><feBlend in='primary' in2='secondary' mode='soft-light' result='paper'/>";
      opacity = range(random, 0.16, 0.22, 3);
      contrast = range(random, 1.1, 1.2, 2);
      brightness = range(random, 0.99, 1.04, 2);
      blend = "multiply";
      textureExponent = range(random, 0.52, 0.6, 2);
    } else {
      var toothFrequency = range(random, 0.012, 0.026, 3);
      var fineFrequency = range(random, 0.06, 0.11, 3);
      var surfaceScale = range(random, 2, 3.6, 2);
      var azimuth = range(random, 25, 155, 0);
      var elevation = range(random, 48, 64, 0);
      filterNodes = "<feTurbulence type='fractalNoise' baseFrequency='" + toothFrequency +
        "' numOctaves='4' seed='" + primarySeed + "' stitchTiles='stitch' result='primary'/>" +
        "<feTurbulence type='fractalNoise' baseFrequency='" + fineFrequency + "' numOctaves='2' seed='" + secondarySeed +
        "' stitchTiles='stitch' result='secondary'/><feBlend in='primary' in2='secondary' mode='multiply' result='tooth'/>" +
        "<feDiffuseLighting in='tooth' surfaceScale='" + surfaceScale + "' diffuseConstant='0.86' lighting-color='white' result='paper'>" +
        "<feDistantLight azimuth='" + azimuth + "' elevation='" + elevation + "'/></feDiffuseLighting>";
      opacity = range(random, 0.16, 0.23, 3);
      contrast = range(random, 1.08, 1.18, 2);
      brightness = range(random, 0.99, 1.04, 2);
      blend = "multiply";
      textureExponent = range(random, 0.56, 0.64, 2);
    }

    var svg = "<svg xmlns='http://www.w3.org/2000/svg' width='" + rasterTile + "' height='" + rasterTile +
      "' viewBox='0 0 " + tile + " " + tile + "' preserveAspectRatio='none'>" +
      "<filter id='p' x='0' y='0' width='" + tile + "' height='" + tile +
      "' filterUnits='userSpaceOnUse' filterRes='" + rasterTile + " " + rasterTile +
      "' color-interpolation-filters='sRGB'>" + filterNodes +
      "<feColorMatrix in='paper' type='saturate' values='0' result='mono'/>" +
      "<feComponentTransfer in='mono'><feFuncR type='gamma' amplitude='0.92' exponent='" + textureExponent + "' offset='0.08'/>" +
      "<feFuncG type='gamma' amplitude='0.92' exponent='" + textureExponent + "' offset='0.08'/>" +
      "<feFuncB type='gamma' amplitude='0.92' exponent='" + textureExponent + "' offset='0.08'/></feComponentTransfer></filter>" +
      "<rect width='" + tile + "' height='" + tile + "' filter='url(#p)'/></svg>";
    return { type: type, vars: {
      "--paper-texture-url": 'url("data:image/svg+xml,' + encodeURIComponent(svg) + '")',
      "--paper-texture-size": tile + "px",
      "--paper-texture-opacity": opacity,
      "--paper-texture-contrast": contrast,
      "--paper-texture-brightness": brightness,
      "--paper-texture-blend": blend
    } };
  }

  function imageVars(random, bounds) {
    return {
      "--image-contrast": range(random, bounds.contrast[0], bounds.contrast[1], 2),
      "--image-brightness": range(random, bounds.brightness[0], bounds.brightness[1], 2),
      "--image-opacity": range(random, bounds.opacity[0], bounds.opacity[1], 2)
    };
  }

  /* Rules are one piece of an edition's voice, never an arbitrary decoration
     on individual rows. The selected grammar is shared by leaders, the top
     control divider, and the footer; its two compact utilities echo it. */
  function applyRuleGrammar(edition, random, variants) {
    var grammar = pick(random, variants);
    edition.attrs["data-rule-style"] = grammar.rule;
    edition.attrs["data-utility-treatment"] = grammar.utility;
    edition.vars["--edition-divider-opacity"] = range(random, 82, 100, 0) + "%";
    edition.vars["--edition-leader-opacity"] = range(random, 76, 100, 0) + "%";
  }

  function enoColor(random, hue, contrast, satRange) {
    var adjustedHue = Math.round((hue + range(random, -8, 8, 0) + 360) % 360);
    var saturation = range(random, satRange.min, satRange.max, 0);
    var lightness = range(random, contrast === "light" ? 64 : 18, contrast === "light" ? 80 : 30, 0);
    return "hsl(" + adjustedHue + " " + saturation + "% " + lightness + "%)";
  }

  function enoColors(random, hues, contrast, phases, satRange) {
    return hues.map(function (hue, i) {
      return enoColor(random, hue + (phases ? phases[i] : 0), contrast, satRange);
    });
  }

  function enoGradient(colors, geometry) {
    var ringStart = Math.min(geometry.coreR + geometry.featherCore, geometry.haloR - 2);
    var bgStart = Math.min(geometry.haloR + geometry.featherHalo, 100);
    return "radial-gradient(circle at " + geometry.x + "% " + geometry.y + "%, " +
      colors[0] + " 0%, " + colors[0] + " " + geometry.coreR + "%, " +
      colors[1] + " " + ringStart + "%, " + colors[1] + " " + geometry.haloR + "%, " +
      colors[3] + " " + bgStart + "%, " + colors[3] + " 100%)";
  }

  function compose(seed, forcedLook) {
    var random = randomFrom(seed);
    var look = normalizeLook(forcedLook) || pick(random, looks);
    var edition = { look: look, seed: seed, attrs: {}, vars: {}, blobSpeeds: [], blobMotions: [] };

    if (look === "simple") {
      var simplePalettes = [
        { bg: "#000000", ink: "#ccc6b9", bright: "#eae5da", muted: "#847e70", faint: "#7c7568", foot: "#7c7568", accent: "#7d8f5c", hair: "#35322a", rule: "#24221d", border: "#2a2822", chip: "#131311" },
        { bg: "#000000", ink: "#c8ced2", bright: "#eef1f2", muted: "#879096", faint: "#6f7880", foot: "#6f7880", accent: "#7894a5", hair: "#323b40", rule: "#22282c", border: "#293035", chip: "#121619" },
        { bg: "#000000", ink: "#d0c5bb", bright: "#f0e7df", muted: "#908076", faint: "#7e746e", foot: "#7e746e", accent: "#ad755e", hair: "#40332e", rule: "#2b2320", border: "#342a26", chip: "#181310" },
        { bg: "#000000", ink: "#cbc5d0", bright: "#eee9f1", muted: "#89808f", faint: "#82758a", foot: "#82758a", accent: "#927fa7", hair: "#38313e", rule: "#27222b", border: "#302a35", chip: "#151217" },
        { bg: "#000000", ink: "#cec8b8", bright: "#f0ebdd", muted: "#8c8573", faint: "#807760", foot: "#807760", accent: "#a18d57", hair: "#3d3829", rule: "#29261d", border: "#322e23", chip: "#17150f" }
      ];
      var simple = pick(random, simplePalettes);
      edition.vars = paletteVars(simple);
      advanceSeed(random, 2);
      edition.vars["--page-max"] = canvasWidth(random);
      edition.vars["--col-min"] = pick(random, ["360px", "380px"]);
      edition.vars["--gap-col"] = pick(random, ["48px", "56px"]);
      edition.vars["--gap-row"] = pick(random, ["40px", "44px", "48px"]);
    }

    if (look === "paper") {
      var paperPalettes = [
        { bg: "#f1eadc", ink: "#2a241e", bright: "#17130f", muted: "#665d52", faint: "#74685a", foot: "#74685a", accent: "#584a3c", hair: "#b8aa98", rule: "#c9bcaa", border: "#b8aa98", chip: "#e6dccb" },
        { bg: "#e9dfcc", ink: "#29231d", bright: "#17120e", muted: "#685d4f", faint: "#6f604f", foot: "#6f604f", accent: "#674b3b", hair: "#b4a38b", rule: "#c5b59e", border: "#b4a38b", chip: "#ddd1bc" },
        { bg: "#f5f0e6", ink: "#25231f", bright: "#11110f", muted: "#625f58", faint: "#6d6961", foot: "#6d6961", accent: "#4f5b4c", hair: "#c0bbb0", rule: "#d2cdc2", border: "#bdb8ae", chip: "#ebe6dc" }
      ];
      edition.vars = paletteVars(pick(random, paperPalettes));
      advanceSeed(random, 3); // Former size and line-height choices.
      edition.vars["--page-max"] = canvasWidth(random);
      edition.vars["--col-min"] = pick(random, ["360px", "380px"]);
      edition.vars["--gap-col"] = pick(random, ["44px", "52px"]);
      Object.assign(edition.vars, grainVars(random, grainBounds({
        tile: [512, 576], frequency: [0.5, 0.62], opacity: [0.1, 0.17]
      })));
      var paperTexture = paperTextureVars(random);
      Object.assign(edition.vars, paperTexture.vars);
      edition.attrs["data-paper-texture"] = paperTexture.type;
      advanceSeed(random, 1); // Former heading treatment; typography is now fixed.
      Object.assign(edition.vars, imageVars(random, {
        contrast: [1.1, 1.28], brightness: [0.98, 1.08], opacity: [0.86, 0.95]
      }));
    }

    if (look === "blobs") {
      var blobPalettes = [
        { bg: "#060807", ink: "#d8d4d5", bright: "#f4eff5", muted: "#aaa2a8", faint: "#817981", foot: "#817981", accents: ["#ae91ff", "#8fcdbb", "#d7967f"], hair: "#443b47", rule: "#29242b", border: "#37313a", chip: "#111012", blobHues: [166, 14, 274, 206, 330] },
        { bg: "#07070a", ink: "#d7d5dc", bright: "#f1eff8", muted: "#a6a2ae", faint: "#817c8b", foot: "#817c8b", accents: ["#8ca8ff", "#d98bbd", "#d2ae68"], hair: "#3e3a4b", rule: "#27242f", border: "#34303e", chip: "#111017", blobHues: [218, 318, 42, 178, 270] },
        { bg: "#070807", ink: "#d8d6d1", bright: "#f3f1e9", muted: "#aaa69d", faint: "#817d74", foot: "#817d74", accents: ["#b1a1ff", "#a8c58a", "#cf8077", "#92a6df"], hair: "#423d3a", rule: "#292725", border: "#383431", chip: "#12110f", blobHues: [102, 5, 234, 45, 300] }
      ];
      var blob = pick(random, blobPalettes);
      blob.accent = pick(random, blob.accents);
      edition.vars = paletteVars(blob);
      edition.vars["--blob-link-bloom-near"] = range(random, 56, 78, 0) + "%";
      edition.vars["--blob-link-bloom-far"] = range(random, 24, 42, 0) + "%";
      edition.vars["--blob-link-bloom-radius"] = range(random, 7, 12, 0) + "px";
      advanceSeed(random, 1); // Former font pairing.
      for (var b = 0; b < 7; b++) {
        edition.vars["--blob-" + (b + 1) + "-color"] = blobColor(random, blob.blobHues[b % blob.blobHues.length]);
        edition.vars["--blob-" + (b + 1) + "-size"] = range(random, 34, 72, 0) + "vw";
        edition.vars["--blob-" + (b + 1) + "-opacity"] = range(random, 0.7, 1, 2);
        edition.vars["--blob-" + (b + 1) + "-strength"] = range(random, 0.28, 0.42, 2);
        edition.vars["--blob-" + (b + 1) + "-blur"] = range(random, 24, 58, 0) + "px";
        edition.blobSpeeds.push(range(random, 0.45, 0.85, 2));
        var driftDuration = range(random, 18, 42, 0);
        edition.blobMotions.push({
          duration: driftDuration,
          delay: -range(random, 0, driftDuration, 0),
          fromX: range(random, -12, 12, 0),
          fromY: range(random, -10, 10, 0),
          fromScale: range(random, 0.92, 1.08, 2),
          toX: range(random, -14, 14, 0),
          toY: range(random, -12, 12, 0),
          toScale: range(random, 0.94, 1.16, 2)
        });
      }
      advanceSeed(random, 2);
      edition.vars["--page-max"] = canvasWidth(random);
      edition.vars["--col-min"] = pick(random, ["360px", "390px"]);
      edition.vars["--gap-col"] = pick(random, ["48px", "56px"]);
      Object.assign(edition.vars, grainVars(random, grainBounds({
        frequency: [0.62, 0.74], opacity: [0.08, 0.14]
      })));
      edition.attrs["data-blob-layout"] = pick(random, ["diagonal", "orbit", "horizon", "scatter"]);
      edition.attrs["data-blob-count"] = pick(random, ["3", "4", "4", "5"]);
      edition.attrs["data-blob-mobile-extra"] = pick(random, ["1", "2"]);
      Object.assign(edition.vars, imageVars(random, {
        contrast: [0.96, 1.12], brightness: [0.94, 1.08], opacity: [0.88, 0.96]
      }));
    }

    if (look === "eno") {
      var enoFamilies = [
        [348, 337, 174, 184],
        [2, 27, 44, 52],
        [186, 72, 150, 160],
        [220, 270, 318, 48],
        [195, 222, 292, 330],
        [188, 238, 350, 165]
      ];
      var enoHues = pick(random, enoFamilies);
      var enoContrast = pick(random, ["light", "light", "light", "dark"]);
      var enoGeometry = {
        x: range(random, 42, 58, 0),
        y: range(random, 38, 62, 0),
        coreR: range(random, 14, 24, 0),
        haloR: range(random, 46, 66, 0),
        featherCore: range(random, 6, 14, 0),
        featherHalo: range(random, 8, 18, 0)
      };
      var enoSaturationCap = range(random, 40, 70, 0);
      var enoSaturation = { min: Math.max(20, enoSaturationCap - 20), max: enoSaturationCap };
      var enoPhaseB = enoHues.map(function () { return range(random, -24, 24, 0); });
      var enoPhaseC = enoHues.map(function () { return range(random, -24, 24, 0); });
      var enoA = enoColors(random, enoHues, enoContrast, null, enoSaturation);
      var enoB = enoColors(random, enoHues, enoContrast, enoPhaseB, enoSaturation);
      var enoC = enoColors(random, enoHues, enoContrast, enoPhaseC, enoSaturation);
      var enoPalette = enoContrast === "light"
        ? { bg: enoA[3], ink: "#191522", bright: "#09070d", muted: "#403748", faint: "#53475d", foot: "#53475d", accent: "hsl(" + enoHues[1] + " 55% 28%)", hair: "rgb(25 20 34 / 0.34)", rule: "rgb(25 20 34 / 0.28)", border: "rgb(25 20 34 / 0.38)", chip: "rgb(255 255 255 / 0.18)" }
        : { bg: enoA[3], ink: "#ece9f1", bright: "#ffffff", muted: "#d5cfdb", faint: "#bdb4c5", foot: "#bdb4c5", accent: "hsl(" + enoHues[1] + " 74% 80%)", hair: "rgb(255 255 255 / 0.30)", rule: "rgb(255 255 255 / 0.24)", border: "rgb(255 255 255 / 0.36)", chip: "rgb(0 0 0 / 0.16)" };
      edition.vars = paletteVars(enoPalette);
      advanceSeed(random, 4); // Former type size, weight, and line-height choices.
      edition.vars["--page-max"] = canvasWidth(random);
      edition.vars["--col-min"] = pick(random, ["360px", "380px"]);
      edition.vars["--gap-col"] = pick(random, ["48px", "56px", "64px"]);
      edition.vars["--eno-gradient-a"] = enoGradient(enoA, enoGeometry);
      edition.vars["--eno-gradient-b"] = enoGradient(enoB, enoGeometry);
      edition.vars["--eno-gradient-c"] = enoGradient(enoC, enoGeometry);
      var enoCycle = range(random, 180, 480, 0);
      edition.vars["--eno-cycle"] = enoCycle + "s";
      edition.vars["--eno-phase"] = -range(random, 0, enoCycle, 0) + "s";
      edition.vars["--eno-softness"] = range(random, 6, 18, 0) + "px";
      edition.vars["--eno-saturation"] = range(random, 0.88, 1, 2);
      edition.vars["--eno-diffusion"] = range(random, 0.05, 0.12, 2);
      var enoHueCycle = range(random, 120, 300, 0);
      edition.vars["--eno-hue-cycle"] = enoHueCycle + "s";
      edition.vars["--eno-hue-phase"] = -range(random, 0, enoHueCycle, 0) + "s";
      Object.assign(edition.vars, grainVars(random, grainBounds({
        frequency: [0.65, 0.76], opacity: [0.035, 0.06], rate: [780, 1080]
      })));
      edition.attrs["data-eno-composition"] = "circles";
      edition.attrs["data-eno-contrast"] = enoContrast;
      Object.assign(edition.vars, imageVars(random, {
        contrast: [0.88, 1.06], brightness: [1.02, 1.16], opacity: [0.86, 0.95]
      }));
    }

    if (look === "70mm") {
      var filmPalettes = [
        { tone: "tungsten", bg: "#000000", base: "#100f12", ink: "#d8d2c6", bright: "#fff9ea", muted: "#aaa093", faint: "#81786e", foot: "#81786e", accent: "#ead6ac", hair: "#403a35", rule: "#292623", border: "#3b3530", chip: "#141210", halation: "#ff493d", edge: "#d8bd90", lights: ["#9f382e", "#365d72", "#bf7641"] },
        { tone: "warm", bg: "#000000", base: "#130d09", ink: "#ddd2bd", bright: "#fff4d9", muted: "#aa987f", faint: "#84725c", foot: "#84725c", accent: "#e0bd7a", hair: "#463827", rule: "#2f251a", border: "#413222", chip: "#17110b", halation: "#f43d32", edge: "#d7b57a", lights: ["#b9522d", "#d3944b", "#684260"] },
        { tone: "silver", bg: "#000000", base: "#101010", ink: "#d5d5d1", bright: "#fffefa", muted: "#a09e98", faint: "#797770", foot: "#797770", accent: "#d8d1c2", hair: "#3d3c39", rule: "#272624", border: "#373633", chip: "#131312", halation: "#ef4037", edge: "#d1cbc0", lights: ["#8a302b", "#66645e", "#876b4f"] }
      ];
      var film = pick(random, filmPalettes);
      advanceSeed(random, 3); // Former serif, mono, and type preset choices.
      edition.vars = paletteVars(film);
      advanceSeed(random, 2);
      edition.vars["--page-max"] = canvasWidth(random);
      edition.vars["--col-min"] = pick(random, ["370px", "390px"]);
      edition.vars["--gap-col"] = pick(random, ["48px", "56px", "64px"]);
      edition.vars["--gap-row"] = pick(random, ["42px", "46px", "50px"]);
      edition.vars["--film-halation"] = film.halation;
      edition.vars["--film-bloom-radius"] = range(random, 3, 7, 1) + "px";
      edition.vars["--film-halation-radius"] = range(random, 8, 15, 0) + "px";
      edition.vars["--film-halation-strength"] = range(random, 48, 72, 0) + "%";
      edition.vars["--film-vignette"] = range(random, 0.18, 0.34, 2);
      edition.vars["--film-base"] = film.base;
      edition.vars["--film-stock"] = "#000000";
      edition.vars["--film-perf-stock"] = "#000000";
      edition.vars["--film-perf-edge"] = film.edge;
      edition.vars["--film-gate-fall"] = range(random, 96, 160, 0) + "px";
      edition.vars["--film-gate-fall-x"] = range(random, 40, 88, 0) + "px";
      edition.vars["--film-header-rebate"] = range(random, 8, 18, 0) + "px";
      Object.assign(edition.vars, perfHoleVars(random, film.edge));
      edition.vars["--film-perf-halo-blur"] = range(random, 5, 9, 1) + "px";
      edition.vars["--film-perf-halo-opacity"] = range(random, 0.1, 0.24, 2);
      edition.vars["--film-perf-bleed-opacity"] = range(random, 0.05, 0.09, 3);
      edition.vars["--film-perf-bleed-blur"] = range(random, 10, 18, 0) + "px";
      var filmLightEdges = ["top", "bottom", pick(random, ["top", "bottom"])];
      for (var f = 0; f < 3; f++) {
        var filmLightOffset = range(random, -10, 22, 0) + "vh";
        edition.vars["--film-light-" + (f + 1) + "-color"] = filmLeakColor(random, film.lights[f]);
        edition.vars["--film-light-" + (f + 1) + "-size"] = range(random, 34, 68, 0) + "vw";
        edition.vars["--film-light-" + (f + 1) + "-ratio"] = range(random, 1.6, 3.2, 2);
        edition.vars["--film-light-" + (f + 1) + "-x"] = range(random, 4, 88, 0) + "%";
        edition.vars["--film-light-" + (f + 1) + "-blur"] = range(random, 44, 92, 0) + "px";
        edition.vars["--film-light-" + (f + 1) + "-opacity"] = range(random, 0.12, 0.24, 2);
        edition.vars["--film-light-" + (f + 1) + "-top"] = filmLightEdges[f] === "top" ? filmLightOffset : "auto";
        edition.vars["--film-light-" + (f + 1) + "-bottom"] = filmLightEdges[f] === "bottom" ? filmLightOffset : "auto";
      }
      var filmEdgeStocks = ["kodak 5219", "kodak vision3", "kodak 2383", "fuji 8552"];
      var filmFrameNumber = String(range(random, 1, 96, 0)).padStart(2, "0");
      var filmExpNumber = String(range(random, 12, 47, 0)).padStart(2, "0");
      edition.vars["--film-edge-header"] = '"' + filmFrameNumber + pick(random, ["a", "b", "k"]) + '"';
      edition.vars["--film-edge-footer"] = '"' + pick(random, filmEdgeStocks) + " · 70mm · ex " + filmExpNumber + '"';
      edition.vars["--film-edge-print-opacity"] = range(random, 0.5, 0.75, 2);

      /* Weirdly-behaving old exposed film: independent, mostly-absent damage
         systems layered under (streaks, stains) and over (scratches, dust)
         the content. Each edition rolls how many of each it shows; unused
         slots still draw values (harmless) so the random sequence stays
         simple, and CSS hides whatever the seed didn't choose to show. */
      var filmStreakCount = pick(random, [0, 1, 1, 1, 2]);
      for (var st = 0; st < 2; st++) {
        var streakEdge = pick(random, ["top", "bottom"]);
        var streakOffset = range(random, -14, 18, 0) + "vh";
        edition.vars["--film-streak-" + (st + 1) + "-color"] = filmLeakColor(random, pick(random, film.lights));
        edition.vars["--film-streak-" + (st + 1) + "-length"] = range(random, 70, 150, 0) + "vw";
        edition.vars["--film-streak-" + (st + 1) + "-thickness"] = range(random, 40, 140, 0) + "px";
        edition.vars["--film-streak-" + (st + 1) + "-angle"] = (pick(random, [1, -1]) * range(random, 10, 46, 0)) + "deg";
        edition.vars["--film-streak-" + (st + 1) + "-x"] = range(random, 10, 90, 0) + "%";
        edition.vars["--film-streak-" + (st + 1) + "-blur"] = range(random, 18, 36, 0) + "px";
        edition.vars["--film-streak-" + (st + 1) + "-opacity"] = range(random, 0.08, 0.22, 2);
        edition.vars["--film-streak-" + (st + 1) + "-top"] = streakEdge === "top" ? streakOffset : "auto";
        edition.vars["--film-streak-" + (st + 1) + "-bottom"] = streakEdge === "bottom" ? streakOffset : "auto";
      }
      edition.attrs["data-film-streaks"] = String(filmStreakCount);

      var filmStainCount = pick(random, [0, 0, 1, 1, 2]);
      for (var sn = 0; sn < 2; sn++) {
        var stainEdge = pick(random, ["top", "bottom"]);
        var stainOffset = range(random, -8, 26, 0) + "vh";
        edition.vars["--film-stain-" + (sn + 1) + "-color"] = mixHex(pick(random, film.lights), film.base, range(random, 30, 55, 0));
        edition.vars["--film-stain-" + (sn + 1) + "-size"] = range(random, 26, 54, 0) + "vw";
        edition.vars["--film-stain-" + (sn + 1) + "-ratio"] = range(random, 0.6, 1.8, 2);
        edition.vars["--film-stain-" + (sn + 1) + "-x"] = range(random, 6, 94, 0) + "%";
        edition.vars["--film-stain-" + (sn + 1) + "-angle"] = range(random, -28, 28, 0) + "deg";
        edition.vars["--film-stain-" + (sn + 1) + "-focal-x"] = range(random, 25, 75, 0) + "%";
        edition.vars["--film-stain-" + (sn + 1) + "-focal-y"] = range(random, 25, 75, 0) + "%";
        edition.vars["--film-stain-" + (sn + 1) + "-blur"] = range(random, 32, 58, 0) + "px";
        edition.vars["--film-stain-" + (sn + 1) + "-opacity"] = range(random, 0.1, 0.22, 2);
        edition.vars["--film-stain-" + (sn + 1) + "-top"] = stainEdge === "top" ? stainOffset : "auto";
        edition.vars["--film-stain-" + (sn + 1) + "-bottom"] = stainEdge === "bottom" ? stainOffset : "auto";
      }
      edition.attrs["data-film-stains"] = String(filmStainCount);

      var filmScratchCount = pick(random, [0, 1, 1, 2, 2, 3]);
      for (var sc = 0; sc < 3; sc++) {
        edition.vars["--film-scratch-" + (sc + 1) + "-x"] = range(random, 4, 96, 0) + "%";
        edition.vars["--film-scratch-" + (sc + 1) + "-width"] = range(random, 1, 2, 1) + "px";
        edition.vars["--film-scratch-" + (sc + 1) + "-angle"] = range(random, -2.5, 2.5, 1) + "deg";
        edition.vars["--film-scratch-" + (sc + 1) + "-opacity"] = range(random, 0.05, 0.16, 2);
        edition.vars["--film-scratch-" + (sc + 1) + "-top"] = range(random, 0, 26, 0) + "%";
        edition.vars["--film-scratch-" + (sc + 1) + "-bottom"] = range(random, 0, 26, 0) + "%";
      }
      edition.attrs["data-film-scratches"] = String(filmScratchCount);

      Object.assign(edition.vars, dustVars(random));
      Object.assign(edition.vars, grainVars(random, grainBounds({
        tile: [512, 580], frequency: [0.46, 0.78], opacity: [0.1, 0.16], rate: [680, 940]
      })));
      edition.attrs["data-film-tone"] = film.tone;
      Object.assign(edition.vars, imageVars(random, {
        contrast: [1.08, 1.28], brightness: [0.94, 1.06], opacity: [0.9, 0.98]
      }));
    }

    if (look === "crt") {
      var crtFamily = pick(random, crtPhosphorFamilies);
      var crtPalette = crtPhosphorPalette(random, crtFamily);
      var crtConvergence = pick(random, [
        { redX: -1, redY: 0, blueX: 1, blueY: 0 },
        { redX: -1, redY: 0, blueX: 0, blueY: -1 },
        { redX: 0, redY: 1, blueX: 1, blueY: 0 },
        { redX: -1, redY: 1, blueX: 1, blueY: -1 },
        { redX: -2, redY: 0, blueX: 1, blueY: 0 },
        { redX: -1, redY: 0, blueX: 2, blueY: -1 },
        { redX: 1, redY: 0, blueX: -1, blueY: 0 },
        { redX: 0, redY: -1, blueX: 0, blueY: 1 },
        { redX: 1, redY: 1, blueX: -1, blueY: -1 },
        { redX: 2, redY: -1, blueX: -1, blueY: 0 }
      ]);
      edition.vars = paletteVars(crtPalette);
      edition.vars["--crt-selection"] = inverseHex(crtPalette.accent);
      edition.vars["--crt-fringe-red"] = hslToRgb(2 + range(random, -8, 12, 0), range(random, 88, 100, 0), range(random, 58, 70, 0)).join(" ");
      edition.vars["--crt-fringe-blue"] = hslToRgb(223 + range(random, -12, 12, 0), range(random, 88, 100, 0), range(random, 58, 70, 0)).join(" ");
      edition.vars["--crt-grille-red"] = hslToHex(0 + range(random, -8, 8, 0), range(random, 90, 100, 0), range(random, 60, 70, 0));
      edition.vars["--crt-grille-green"] = hslToHex(120 + range(random, -10, 10, 0), range(random, 90, 100, 0), range(random, 58, 70, 0));
      edition.vars["--crt-grille-blue"] = hslToHex(240 + range(random, -10, 10, 0), range(random, 90, 100, 0), range(random, 60, 72, 0));
      /* One CSS pixel on a standard display (or one device pixel on a dense
         display) is the indivisible phosphor cell. A minority of editions
         double it for a cheaper, coarser low-res monitor, echoing how a
         minority of editions already extend convergence to two cells. */
      var crtCellScale = pick(random, [1, 1, 1, 1, 2]);
      var crtCellPx = crtCellScale / Math.min(Math.max(window.devicePixelRatio || 1, 1), 2);
      edition.vars["--crt-cell"] = crtCellPx.toFixed(3) + "px";
      /* The pointer is built from square cells like the rest of the signal,
         but stays sized in whole CSS pixels (crtCellScale alone, no DPR
         division): --crt-cell's sub-CSS-pixel size is right for a repeating
         scanline texture but would shrink an interactive pointer to an
         illegible 8px on most retina displays. shape-rendering: crispEdges
         already keeps its edges crisp at whatever the real screen density is. */
      edition.vars["--crt-cursor-url"] = crtCursorUrl(crtPalette.bright, crtCellScale);
      edition.vars["--crt-cursor-hotspot"] = crtCellScale + " " + crtCellScale;
      /* The CRT is a physical-pixel treatment, so its source geometry stays on
         whole CSS pixels before the one-device-pixel grille is applied. */
      edition.vars["--appearance-line-height"] = 1.25;
      edition.vars["--page-max"] = canvasWidth(random);
      edition.vars["--col-min"] = pick(random, ["390px", "410px"]);
      edition.vars["--gap-col"] = pick(random, ["44px", "52px"]);
      edition.vars["--crt-depth"] = range(random, 38, 54, 0);
      edition.vars["--crt-grille"] = range(random, 0.24, 0.34, 2);
      edition.vars["--crt-halo-red"] = range(random, 33, 43, 0) + "%";
      edition.vars["--crt-halo-blue"] = range(random, 29, 39, 0) + "%";
      edition.vars["--crt-halo-strength"] = range(random, 42, 56, 0) + "%";
      edition.vars["--crt-halo-radius"] = range(random, 1.8, 2.7, 1);
      edition.vars["--crt-image-halo"] = range(random, 26, 38, 0) + "%";
      edition.vars["--crt-red-x"] = crtConvergence.redX;
      edition.vars["--crt-red-y"] = crtConvergence.redY;
      edition.vars["--crt-blue-x"] = crtConvergence.blueX;
      edition.vars["--crt-blue-y"] = crtConvergence.blueY;
      edition.vars["--crt-triad-phase"] = pick(random, [0, 1, 2]);
      edition.vars["--crt-vignette"] = range(random, 0.38, 0.62, 2);
      edition.vars["--crt-roll-period"] = range(random, 6.5, 12.5, 1) + "s";
      edition.vars["--crt-roll-height"] = range(random, 20, 32, 0) + "vh";
      edition.vars["--crt-glare-angle"] = range(random, 95, 145, 0) + "deg";
      edition.vars["--crt-glare-center"] = range(random, 42, 58, 0) + "%";
      edition.vars["--crt-tube-x"] = range(random, 115, 135, 0) + "%";
      edition.vars["--crt-tube-y"] = range(random, 95, 115, 0) + "%";
      Object.assign(edition.vars, grainVars(random, grainBounds({
        frequency: [0.62, 0.76], opacity: [0.034, 0.052], rate: [620, 900]
      })));
      Object.assign(edition.vars, imageVars(random, {
        contrast: [1.1, 1.28], brightness: [0.98, 1.08], opacity: [0.98, 1]
      }));
    }

    if (look === "terminal") {
      var terminalPalettes = [
        { bg: "#0a0b0a", ink: "#d5d8d3", bright: "#f0f3ed", muted: "#92978f", faint: "#757b73", foot: "#757b73", accent: "#9fc59b", hair: "#343934", rule: "#252925", border: "#303530", chip: "#111411" },
        { bg: "#080c10", ink: "#d2d9df", bright: "#edf3f7", muted: "#8e9aa3", faint: "#707e89", foot: "#707e89", accent: "#8bb6d1", hair: "#303b43", rule: "#212a31", border: "#2c363e", chip: "#0e1418" },
        { bg: "#0b0a06", ink: "#ddd7c8", bright: "#f5efdf", muted: "#9e9581", faint: "#837860", foot: "#837860", accent: "#d0ae69", hair: "#403927", rule: "#2c281b", border: "#393321", chip: "#15130c" }
      ];
      edition.vars = paletteVars(pick(random, terminalPalettes));
      // The old preset array eagerly drew two weights, then chose a preset,
      // two sizes, and a line height. Preserve all six positions.
      advanceSeed(random, 6);
      edition.vars["--page-max"] = canvasWidth(random);
      edition.vars["--col-min"] = pick(random, ["390px", "410px"]);
      edition.vars["--gap-col"] = pick(random, ["44px", "52px"]);
      Object.assign(edition.vars, grainVars(random, grainBounds({
        frequency: [0.58, 0.72], opacity: [0.03, 0.055]
      })));
      edition.attrs["data-terminal-prompt"] = pick(random, ["tilde", "dot", "chevron"]);
      Object.assign(edition.vars, imageVars(random, {
        contrast: [1.08, 1.24], brightness: [0.92, 1.04], opacity: [0.9, 0.97]
      }));
    }

    /* Compose the rule system after each medium has made its other choices.
       This preserves the established seed sequence for its palette, type,
       image, and atmosphere while adding one coherent editorial layer. */
    if (look === "simple") {
      applyRuleGrammar(edition, random, [
        { rule: "dotted", utility: "outline" },
        { rule: "solid", utility: "outline" },
        { rule: "dashed", utility: "dashed" }
      ]);
    }

    if (look === "paper") {
      applyRuleGrammar(edition, random, [
        { rule: "solid", utility: "hairline" },
        { rule: "dotted", utility: "hairline" },
        { rule: "dashed", utility: "dashed" }
      ]);
    }

    if (look === "blobs") {
      applyRuleGrammar(edition, random, [
        { rule: "solid", utility: "outline" },
        { rule: "dotted", utility: "outline" }
      ]);
    }

    if (look === "eno") {
      applyRuleGrammar(edition, random, [
        { rule: "solid", utility: "quiet" },
        { rule: "dotted", utility: "quiet" }
      ]);
    }

    if (look === "70mm") {
      /* Film has its own stock, gate, and perforation grammar. Its ordinary
         page rules stay suppressed rather than being made generically dashed. */
      edition.attrs["data-rule-style"] = "film";
      edition.attrs["data-utility-treatment"] = "film";
      edition.vars["--edition-divider-opacity"] = "100%";
      edition.vars["--edition-leader-opacity"] = "100%";
    }

    if (look === "crt") {
      applyRuleGrammar(edition, random, [{ rule: "solid", utility: "signal" }]);
      edition.attrs["data-crt-signal"] = pick(random, ["scan", "scan", "block"]);
    }

    if (look === "terminal") {
      applyRuleGrammar(edition, random, [
        { rule: "solid", utility: "terminal-solid" },
        { rule: "dotted", utility: "terminal-dotted" },
        { rule: "dashed", utility: "terminal-dashed" }
      ]);
    }

    return edition;
  }

  function crtCursorUrl(fillHex, cellPx) {
    var size = (16 * cellPx).toFixed(3);
    var svg = "<svg xmlns='http://www.w3.org/2000/svg' width='" + size + "' height='" + size + "' viewBox='0 0 16 16' shape-rendering='crispEdges'>" +
      "<path fill='#000' d='M1 0h3v2h2v2h2v2h2v2H6v2H4v2H2V8H1z'/>" +
      "<path fill='" + fillHex + "' d='M2 1h1v2h2v2h2v2h2v1H5v2H3V7H2z'/></svg>";
    return 'url("data:image/svg+xml,' + encodeURIComponent(svg) + '")';
  }

  function crtPhosphorPalette(random, family) {
    var hue = Math.round((family.hue + range(random, -family.hueJitter, family.hueJitter, 0) + 360) % 360);
    var palette = {};
    Object.keys(crtRoleBands).forEach(function (role) {
      var band = crtRoleBands[role];
      var lightBand = family.coolBias ? band.coolLight : band.light;
      var sat = Math.min(100, Math.max(4, range(random, band.sat[0], band.sat[1], 0) * family.satMul));
      var light = range(random, lightBand[0], lightBand[1], 1);
      palette[role] = hslToHex(hue, sat, light);
    });
    return palette;
  }

  function paletteVars(palette) {
    return {
      "--bg": palette.bg,
      "--ink": palette.ink,
      "--ink-bright": palette.bright,
      "--ink-hover": palette.bright,
      "--muted": palette.muted,
      "--faint": palette.faint,
      "--footnote": palette.foot,
      "--accent": palette.accent,
      "--hairline": palette.hair,
      "--rule": palette.rule,
      "--border": palette.border,
      "--chip-bg": palette.chip
    };
  }

  function apply(edition) {
    for (var i = 0; i < appearanceAttributes.length; i++) {
      root.removeAttribute(appearanceAttributes[i]);
    }
    for (var p = 0; p < appliedProperties.length; p++) {
      root.style.removeProperty(appliedProperties[p]);
    }
    releaseImages();
    appliedProperties = [];

    root.setAttribute("data-look", edition.look);
    root.setAttribute("data-edition-seed", edition.seed);
    Object.keys(edition.attrs).forEach(function (name) {
      root.setAttribute(name, edition.attrs[name]);
    });
    Object.keys(edition.vars).forEach(function (name) {
      root.style.setProperty(name, imageValue(name, edition.vars[name]));
      appliedProperties.push(name);
    });
    currentEdition = edition;
    storeEdition(edition);
    updateControls();
    updateBlobMotion();
    updateParallax();
  }

  function updateControls() {
    var control = document.querySelector("[data-appearance-control]");
    if (!control || !currentEdition) return;
    control.querySelectorAll("[data-choose-look]").forEach(function (button) {
      if (button.dataset.chooseLook === "random") {
        button.removeAttribute("aria-pressed");
      } else {
        button.setAttribute("aria-pressed", button.dataset.chooseLook === currentEdition.look ? "true" : "false");
      }
    });
    var status = control.querySelector("[data-appearance-status]");
    if (status) status.textContent = lookLabels[currentEdition.look] + " · " + currentEdition.seed.slice(0, 7);
    var label = control.querySelector("[data-appearance-label]");
    if (label) label.textContent = currentEdition.look === "blobs" ? "blob" : currentEdition.look;
    scheduleControlLayout();
  }

  var controlLayoutFrame;
  function scheduleControlLayout() {
    if (pageInactive || controlLayoutFrame) return;
    controlLayoutFrame = window.requestAnimationFrame(updateControlLayout);
  }

  function setChooserOpen(control, open, restoreFocus) {
    control.toggleAttribute("data-expanded", open);
    var toggle = control.querySelector("[data-appearance-toggle]");
    toggle.setAttribute("aria-expanded", String(open));
    if (restoreFocus) toggle.focus({ preventScroll: true });
    updateDocumentLayerSize();
  }

  function updateControlLayout() {
    controlLayoutFrame = null;
    var control = document.querySelector("[data-appearance-control]");
    if (!control) return;
    var compact = window.matchMedia("(max-width: 640px)").matches;
    var wasCompact = control.hasAttribute("data-compact");
    control.toggleAttribute("data-compact", compact);
    if (wasCompact && !compact) {
      var hadToggleFocus = document.activeElement === control.querySelector("[data-appearance-toggle]");
      setChooserOpen(control, false, false);
      if (hadToggleFocus) control.querySelector('[aria-pressed="true"]').focus({ preventScroll: true });
    }
  }

  function clearPinnedUrl() {
    if (!window.history || !window.history.replaceState) return;
    var url = new URL(window.location.href);
    url.searchParams.delete("look");
    url.searchParams.delete("seed");
    window.history.replaceState({}, "", url.pathname + (url.search ? url.search : "") + url.hash);
  }

  var parallaxFrame;
  var documentLayerFrame;
  var documentLayerObserver;

  function updateDocumentLayerSize() {
    if (pageInactive || documentLayerFrame) return;
    documentLayerFrame = window.requestAnimationFrame(function () {
      documentLayerFrame = null;
      if (!document.body) return;
      var page = document.querySelector(".page");
      var pageBottom = page ? page.offsetTop + page.offsetHeight : 0;
      // Absolute artwork must never measure itself through scrollHeight: an
      // old, taller paper layer would prevent the document from shrinking.
      var height = Math.ceil(Math.max(
        window.innerHeight,
        document.body.offsetHeight,
        pageBottom
      )) + "px";
      if (root.style.getPropertyValue("--appearance-document-height") !== height) {
        root.style.setProperty("--appearance-document-height", height);
      }
    });
  }

  function updateBlobMotion() {
    var blobs = document.querySelectorAll("[data-parallax-blob]");
    blobs.forEach(function (blob, index) {
      var motion = currentEdition && currentEdition.blobMotions[index];
      if (!motion) return;
      blob.style.setProperty("--blob-drift-speed", motion.duration + "s");
      blob.style.setProperty("--blob-drift-delay", motion.delay + "s");
      blob.style.setProperty("--blob-from-x", motion.fromX + "%");
      blob.style.setProperty("--blob-from-y", motion.fromY + "%");
      blob.style.setProperty("--blob-from-scale", motion.fromScale);
      blob.style.setProperty("--blob-to-x", motion.toX + "%");
      blob.style.setProperty("--blob-to-y", motion.toY + "%");
      blob.style.setProperty("--blob-to-scale", motion.toScale);
    });
  }

  function updateParallax() {
    if (pageInactive || parallaxFrame || !currentEdition || currentEdition.look !== "blobs") return;
    parallaxFrame = window.requestAnimationFrame(function () {
      parallaxFrame = null;
      var blobs = document.querySelectorAll("[data-parallax-blob]");
      var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      blobs.forEach(function (blob, index) {
        var speed = currentEdition && currentEdition.blobSpeeds[index];
        var offsetY = currentEdition && currentEdition.look === "blobs" && !reduceMotion && speed
          ? window.scrollY * (1 - speed)
          : 0;
        blob.style.setProperty("--blob-parallax-y", offsetY.toFixed(1) + "px");
      });
    });
  }

  var params = new URLSearchParams(window.location.search);
  var requestedLook = params.get("look");
  var requestedSeed = params.get("seed");
  var storedEdition = !requestedLook && !requestedSeed ? readStoredEdition() : null;
  var initialLook = requestedLook || (storedEdition && storedEdition.look);
  var initialSeed = requestedSeed || (storedEdition && storedEdition.seed) || makeSeed();
  apply(compose(initialSeed, initialLook));

  document.addEventListener("DOMContentLoaded", function () {
    var control = document.querySelector("[data-appearance-control]");
    if (control) {
      control.addEventListener("click", function (event) {
        if (event.target.closest("[data-appearance-toggle]")) {
          setChooserOpen(control, !control.hasAttribute("data-expanded"), false);
          return;
        }
        var button = event.target.closest("[data-choose-look]");
        if (!button) return;
        clearPinnedUrl();
        var choice = button.dataset.chooseLook;
        var seed = makeSeed();
        apply(compose(seed, choice === "random" ? null : choice));
        if (choice !== "random" && control.hasAttribute("data-compact")) {
          setChooserOpen(control, false, true);
        }
      });
      control.addEventListener("keydown", function (event) {
        if (event.key === "Escape" && control.hasAttribute("data-expanded")) {
          event.preventDefault();
          setChooserOpen(control, false, true);
        }
      });
    }
    updateControls();
    updateBlobMotion();
    updateParallax();
    updateDocumentLayerSize();
    updateControlLayout();
    window.addEventListener("scroll", updateParallax, { passive: true });
    window.addEventListener("resize", function () {
      updateParallax();
      updateDocumentLayerSize();
      scheduleControlLayout();
    });
    window.addEventListener("load", updateDocumentLayerSize);
    if (window.ResizeObserver) {
      documentLayerObserver = new ResizeObserver(updateDocumentLayerSize);
      documentLayerObserver.observe(document.body);
    }
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(updateDocumentLayerSize);
    }
    syncVisibility();
  });

  function syncVisibility() {
    root.toggleAttribute("data-appearance-paused", document.hidden || pageInactive);
  }

  document.addEventListener("visibilitychange", syncVisibility);
  window.addEventListener("pagehide", function () {
    pageInactive = true;
    [controlLayoutFrame, documentLayerFrame, parallaxFrame].forEach(function (frame) {
      if (frame) window.cancelAnimationFrame(frame);
    });
    controlLayoutFrame = documentLayerFrame = parallaxFrame = null;
    if (documentLayerObserver) documentLayerObserver.disconnect();
    root.setAttribute("data-appearance-suspended", "");
    imageProperties.forEach(function (name) {
      if (currentEdition.vars[name]) root.style.setProperty(name, "none");
    });
    releaseImages();
    syncVisibility();
  });

  /* A page restored from the back-forward cache may hold the edition it had
     before the visitor changed the other page. Unpinned history entries catch
     up to the tab's current edition; explicit look/seed URLs stay authoritative. */
  window.addEventListener("pageshow", function (event) {
    if (!event.persisted || !pageInactive) return;
    pageInactive = false;
    imageProperties.forEach(function (name) {
      if (currentEdition.vars[name]) root.style.setProperty(name, imageValue(name, currentEdition.vars[name]));
    });
    root.removeAttribute("data-appearance-suspended");
    if (documentLayerObserver) documentLayerObserver.observe(document.body);
    syncVisibility();
    updateDocumentLayerSize();
    updateParallax();
    scheduleControlLayout();
    var restoredParams = new URLSearchParams(window.location.search);
    var restoredLook = restoredParams.get("look");
    var restoredSeed = restoredParams.get("seed");
    var restoredEdition = !restoredLook && !restoredSeed ? readStoredEdition() : null;
    var nextLook = restoredLook || (restoredEdition && restoredEdition.look);
    var nextSeed = restoredSeed || (restoredEdition && restoredEdition.seed);
    if (!nextLook || !nextSeed) return;
    if (!currentEdition || currentEdition.look !== normalizeLook(nextLook) || currentEdition.seed !== nextSeed) {
      apply(compose(nextSeed, nextLook));
      updateDocumentLayerSize();
    }
  });
})();
