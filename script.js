"use strict";

// Selecting DOM elements

const imageInput = document.querySelector("#imgUrl");
// console.log(imageInput);

const generateBtn = document.querySelector("#generateBtn");
// console.log(generateBtn);

const resultBlock = document.querySelector("#resultBlock");
// console.log(resultBlock);

const widthInput = document.querySelector("#widthInput");
// console.log(widthInput);

const sizesInput = document.querySelector("#sizesInput");
// console.log(sizesInput);

const modeWidth = document.querySelector("#modeWidth");
// console.log(modeWidth);

const modeSizes = document.querySelector("#modeSizes");
// console.log(modeSizes);

const modeFull = document.querySelector("#modeFull");
// console.log(modeFull);

const deviceBreakpoints = document.querySelector("#deviceBreakpoints");
// console.log(deviceBreakpoints);

const imageBreakpoints = document.querySelector("#imageBreakpoints");
// console.log(imageBreakpoints);

const copyBtn = document.querySelector("#copyBtn");
// console.log(copyBtn);

// Small constants so you do not repeat arrays everywhere

const DEFAULT_DEVICE_BPS = [640, 750, 828, 1080, 1200, 1920, 2048, 3840];
const DEFAULT_IMAGE_BPS = [16, 32, 48, 64, 96, 128, 256, 384];

// Session storage: persists across refreshes but clears when the tab is closed
function saveFormData() {
  const formData = {
    imgUrl: imageInput.value,
    mode: document.querySelector('input[name="mode"]:checked')?.value || null,
    width: widthInput.value,
    sizes: sizesInput.value,
    deviceBreakpoints: deviceBreakpoints.value,
    imageBreakpoints: imageBreakpoints.value,
  };
  sessionStorage.setItem("srcsetGeneratorData", JSON.stringify(formData)); // Session storage can only store strings so we stringify the object
}

// function to restore form data on page load from session storage
function restoreFormData() {
  const saved = sessionStorage.getItem("srcsetGeneratorData");
  if (!saved) return;

  try {
    const formData = JSON.parse(saved);

    // Restore image URL
    if (formData.imgUrl) imageInput.value = formData.imgUrl;

    // Restore mode selection
    if (formData.mode) {
      const modeRadio = document.getElementById(
        `mode${formData.mode.charAt(0).toUpperCase() + formData.mode.slice(1)}`,
      );
      if (modeRadio) {
        modeRadio.checked = true;
        modeRadio.dispatchEvent(new Event("change"));
      }
    }

    // Restore other inputs
    if (formData.width) widthInput.value = formData.width;
    if (formData.sizes) sizesInput.value = formData.sizes;
    if (formData.deviceBreakpoints)
      deviceBreakpoints.value = formData.deviceBreakpoints;
    if (formData.imageBreakpoints)
      imageBreakpoints.value = formData.imageBreakpoints;

    // console.log("✅ Form data restored from sessionStorage");
  } catch (error) {
    // console.error("Error restoring form data:", error);
  }
}

// helper: parse comma separated breakpoints safely
function parseBreakpoints(inputValue, fallbackArray) {
  const raw = (inputValue || "").trim();
  if (!raw) return fallbackArray;

  const parsed = raw
    .split(",")
    .map((v) => Number.parseInt(v.trim(), 10))
    .filter((n) => Number.isFinite(n) && n > 0);

  return parsed.length ? parsed : fallbackArray;
}

// helper: read current mode
function getSelectedMode() {
  if (modeWidth?.checked) return "width";
  if (modeSizes?.checked) return "sizes";
  if (modeFull?.checked) return "full";
  return null;
}

// helper: build params from current form values
function buildParamsFromForm() {
  const imgURL = imageInput?.value?.trim();
  if (!imgURL) return null;

  const mode = getSelectedMode();
  if (!mode) return null;

  const params = {
    src: imgURL,
  };

  if (mode === "width") {
    const w = Number.parseInt(widthInput.value.trim(), 10);
    if (!Number.isFinite(w) || w <= 0) return null;
    params.width = w;
  }

  if (mode === "sizes") {
    const sizes = sizesInput.value.trim();
    if (!sizes) return null;
    params.sizes = sizes;
  }

  if (mode === "full") {
    params.sizes = "100vw";
  }

  params.deviceBreakpoints = parseBreakpoints(
    deviceBreakpoints.value,
    DEFAULT_DEVICE_BPS,
  );
  params.imageBreakpoints = parseBreakpoints(
    imageBreakpoints.value,
    DEFAULT_IMAGE_BPS,
  );

  return { params, mode };
}

// helper: render markup and preview (shared by Generate click and page load regenerate)
function renderFromParams(params, mode, { saveMarkup = false } = {}) {
  // Guard if ImageKit is not available yet
  if (!window.ImageKit || !ImageKit.getResponsiveImageAttributes) return;

  const responsiveImageTags = ImageKit.getResponsiveImageAttributes(params);

  let markup = "<img\n";
  markup += `src="${responsiveImageTags.src}"\n`;
  markup += `srcset="${responsiveImageTags.srcSet}"\n`;

  if (responsiveImageTags.width) {
    markup += `width="${responsiveImageTags.width}"\n`;
  }
  if (responsiveImageTags.sizes) {
    markup += `sizes="${responsiveImageTags.sizes}"\n`;
  }

  markup += 'alt="Responsive image"\n';
  markup += "/>";

  resultBlock.textContent = markup;
  if (copyBtn) copyBtn.disabled = false;

  if (saveMarkup) {
    sessionStorage.setItem("srcsetGeneratorMarkup", markup);
  }

  const imagePreview = document.querySelector("#imagePreview");
  if (!imagePreview) return;

  imagePreview.innerHTML = "";
  imagePreview.classList.add("loading");

  const imgElement = document.createElement("img");
  imgElement.src = responsiveImageTags.src;
  imgElement.srcset = responsiveImageTags.srcSet;

  if (responsiveImageTags.sizes) imgElement.sizes = responsiveImageTags.sizes;
  if (mode === "width" && responsiveImageTags.width)
    imgElement.width = responsiveImageTags.width;

  imgElement.alt = "Image Preview";
  imgElement.loading = "lazy";
  imgElement.decoding = "async";

  imgElement.onload = () => imagePreview.classList.remove("loading");
  imgElement.onerror = () => imagePreview.classList.remove("loading");

  imagePreview.appendChild(imgElement);
}

/* Regenerate preview and markup from current inputs on load */
function regeneratePreviewFromInputs() {
  const built = buildParamsFromForm();
  if (!built) return;

  try {
    renderFromParams(built.params, built.mode, { saveMarkup: true });
  } catch (e) {
    // console.error("Regenerate error:", e);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  restoreFormData();

  const lastMarkup = sessionStorage.getItem("srcsetGeneratorMarkup");
  if (lastMarkup) resultBlock.textContent = lastMarkup;

  regeneratePreviewFromInputs();
});

// Event listener for Generate button
if (generateBtn) {
  generateBtn.addEventListener("click", () => {
    const imgURL = imageInput.value.trim();

    if (!imgURL) {
      resultBlock.textContent = "Please enter a valid image URL.";
      return;
    }

    const mode = getSelectedMode();
    if (!mode) {
      resultBlock.textContent =
        "⚠️ Please select a mode (Single width, Sizes, or Full width)";
      return;
    }

    // Keep your existing validation messages but remove duplicated parsing
    const built = buildParamsFromForm();

    if (!built) {
      if (mode === "width") {
        resultBlock.textContent = "⚠️ Please enter a valid width";
      } else if (mode === "sizes") {
        resultBlock.textContent = "⚠️ Please enter a sizes attribute";
      }
      return;
    }

    try {
      renderFromParams(built.params, built.mode, { saveMarkup: true });
      saveFormData();
    } catch (error) {
      resultBlock.textContent = `❌ Error: ${error.message}`;
      // console.error("Generation error:", error);
    }
  });
}

// Event listener for Clear button
const clearBtn = document.querySelector("#clearBtn");

if (clearBtn) {
  clearBtn.addEventListener("click", () => {
    imageInput.value = "";
    widthInput.value = "";
    sizesInput.value = "";
    deviceBreakpoints.value = "";
    imageBreakpoints.value = "";

    modeWidth.checked = false;
    modeSizes.checked = false;
    modeFull.checked = false;

    resultBlock.textContent = "";
    if (copyBtn) {
      copyBtn.disabled = true;
      copyBtn.textContent = "Copy";
    }

    const imagePreview = document.querySelector("#imagePreview");
    if (imagePreview) {
      imagePreview.innerHTML = "";
      imagePreview.classList.remove("loading", "error");
    }

    sessionStorage.removeItem("srcsetGeneratorData");
    sessionStorage.removeItem("srcsetGeneratorMarkup");

    // console.log("All fields cleared and form reset");
    imageInput.focus();
  });
}

// Copy generated markup to clipboard
if (copyBtn && resultBlock) {
  copyBtn.addEventListener("click", async () => {
    // console.log("copy button clicked");
    const markup = resultBlock.textContent.trim();
    if (!markup) return;

    try {
      await navigator.clipboard.writeText(markup);

      const originalText = copyBtn.textContent;
      copyBtn.textContent = "Copied ✓";

      setTimeout(() => {
        copyBtn.textContent = originalText;
      }, 1500);
    } catch (err) {
      // console.error("Failed to copy markup:", err);
    }
  });
}
