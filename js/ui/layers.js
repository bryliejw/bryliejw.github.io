// Labels & lines popover: keyword labels Auto / All / Off, lines All / Projects / On hover.
export function bindLayers(views) {
  for (const [name, key] of [["labels", "labels"], ["lines", "lines"]]) {
    for (const input of document.querySelectorAll(`input[name="${name}"]`)) {
      input.checked = input.value === views.state[key];
      input.addEventListener("change", () => input.checked && views.set(key, input.value));
    }
  }
}
