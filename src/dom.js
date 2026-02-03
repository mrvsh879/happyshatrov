export const $ = (id) => document.getElementById(id);

const toastEl = $("toast");
export function toast(msg, ms=1400){
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  setTimeout(()=>toastEl.classList.remove("show"), ms);
}
