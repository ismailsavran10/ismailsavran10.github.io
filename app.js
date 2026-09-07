"use strict";
const menuButton = document.querySelector(".menu-toggle");
const navigation = document.querySelector("#navigation");
const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
const motionAllowed = () => !motionPreference.matches && document.documentElement.dataset.motion !== "paused";
function closeMenu() {
  navigation.classList.remove("open");
  menuButton.setAttribute("aria-expanded", "false");
  menuButton.setAttribute("aria-label", "Menüyü aç");
}
menuButton.addEventListener("click", () => {
  const open = menuButton.getAttribute("aria-expanded") !== "true";
  navigation.classList.toggle("open", open);
  menuButton.setAttribute("aria-expanded", String(open));
  menuButton.setAttribute("aria-label", open ? "Menüyü kapat" : "Menüyü aç");
});
navigation.querySelectorAll("a").forEach(link => link.addEventListener("click", closeMenu));
document.addEventListener("keydown", event => {
  if (event.key === "Escape" && menuButton.getAttribute("aria-expanded") === "true") {
    closeMenu();
    menuButton.focus();
  }
});
document.addEventListener("click", event => { if (!event.target.closest(".header")) closeMenu(); });
window.matchMedia("(min-width: 761px)").addEventListener("change", event => { if (event.matches) closeMenu(); });

const filters = [...document.querySelectorAll("[data-filter]")];
const projects = [...document.querySelectorAll("[data-category]")];
filters.forEach(button => button.addEventListener("click", () => {
  const before = new Map(projects.filter(p => !p.hidden).map(p => [p, p.getBoundingClientRect()]));
  filters.forEach(item => {
    item.classList.toggle("active", item === button);
    item.setAttribute("aria-pressed", String(item === button));
  });
  let count = 0;
  projects.forEach(project => {
    project.getAnimations().forEach(animation => animation.cancel());
    const show = button.dataset.filter === "all" || project.dataset.category.split(" ").includes(button.dataset.filter);
    project.hidden = !show;
    if (show) count++;
  });
  if (motionAllowed() && Element.prototype.animate) {
    projects.filter(p => !p.hidden).forEach((project, index) => {
      const old = before.get(project);
      const now = project.getBoundingClientRect();
      project.animate(old ? [
        { transform: "translate(" + (old.left - now.left) + "px," + (old.top - now.top) + "px)", opacity: 0.75 },
        { transform: "translate(0,0)", opacity: 1 }
      ] : [
        { transform: "translateY(22px) scale(.985)", opacity: 0 },
        { transform: "translateY(0) scale(1)", opacity: 1 }
      ], { duration: 520, delay: index * 35, easing: "cubic-bezier(.22,1,.36,1)" });
    });
  }
  document.querySelector("#filter-status").textContent = count + " proje gösteriliyor.";
}));

const details = [
  {
    title: "Uçuş gecikme tahmini",
    intro: "Operasyonel uçuş ve meteoroloji verileriyle tahmin; modelden web uygulamasına uzanan bir makine öğrenmesi çalışması.",
    problem: "Uçuş gecikmelerini yalnızca tek bir değişkenle açıklamak güç. Çalışma, operasyon ve hava durumu özelliklerini birlikte kullanarak varış gecikmesini tahmin etmeyi ele alıyor.",
    approach: "XGBoost, Random Forest, LightGBM, CatBoost ve LSTM modelleri; TimeSeriesSplit, RandomizedSearchCV ve R² / MAE / RMSE ile değerlendirme. SHAP ile model yorumlama ve Flask web arayüzü.",
    tags: ["Python", "XGBoost", "LightGBM", "SHAP", "Flask"],
    repo: "Flight-Delay-Prediction-with-Machine-Learning"
  },
  {
    title: "Açıklanabilir phishing tespiti",
    intro: "E-posta güvenliğinde transformer modellerini LLM destekli açıklamalarla birleştiren bir sınıflandırma sistemi.",
    problem: "Bir mesajın phishing olduğunu işaretlemek kadar, bu kararın gerekçesini anlaşılır biçimde sunmak da önemli. Bu proje güvenli / phishing ayrımını ve phishing kategorilerini ele alıyor.",
    approach: "XLM-RoBERTa ile iki aşamalı sınıflandırma, URL özellikleri ve Gradio arayüzü. İsteğe bağlı Mistral entegrasyonuyla insan tarafından okunabilir güvenlik açıklamaları.",
    tags: ["XLM-RoBERTa", "NLP", "Mistral", "Gradio", "Explainable AI"],
    repo: "Explainable-LLM-Enhanced-Phishing-Detection-Using-Transformer-Based-Models"
  },
  {
    title: "Uçuş gecikmelerinde zaman serisi tahmini",
    intro: "Uçuş gecikmeleri için derin öğrenme mimarilerini karşılaştıran çok değişkenli zaman serisi tahmini.",
    problem: "Geçmiş operasyonlar ile meteorolojik değişkenlerin zaman içindeki ilişkileri, gecikme tahminini karmaşıklaştırıyor. Amaç, bu ilişkileri öğrenen farklı mimarileri karşılaştırmak.",
    approach: "Transformer, TCN, N-BEATS, TFT, TimeLLM ve TimesFM mimarileri; gecikmeli ve takvim tabanlı özellikler; zamana duyarlı doğrulama.",
    tags: ["Deep Learning", "Transformer", "TCN", "N-BEATS", "Time Series"],
    repo: "Deep-Learning-Based-Flight-Delay-Forecasting-with-Advanced-Time-Series-Models"
  },
  {
    title: "Türkçe şarkı sözlerinde duygu analizi",
    intro: "Türkçe metinlerin duygusal içeriğini anlamak için BERT ve transfer öğrenmesi.",
    problem: "Şarkı sözleri, dilin bağlamsal ve duygusal yönlerini bir araya getiriyor. Proje, Türkçe şarkı sözlerini birden fazla duygu sınıfında değerlendirmeyi amaçlıyor.",
    approach: "Web scraping ile veri toplama, zero-shot etiketleme, sınıf dengesizliği işlemleri ve fine-tuned BERT. Tahminler için Flask tabanlı REST API.",
    tags: ["BERT", "Transfer Learning", "Python", "Flask", "NLP"],
    repo: "Turkish-Song-Lyrics-Sentiment-Analysis-with-Deep-Learning"
  },
  {
    title: "Akıllı güvenlik duvarı",
    intro: "Ağ trafiği sınıflandırmasında makine öğrenmesi tabanlı bir yaklaşım.",
    problem: "Zararlı ağ trafiğini ayırt etmek, güvenlik sistemlerinin temel ihtiyaçlarından biri. Bu çalışma, ağ trafiğinde kötü amaçlı davranışların tespitine odaklanıyor.",
    approach: "Makine öğrenmesi kullanarak zararlı ağ trafiğini tespit etme ve sınıflandırma. Çalışmanın veri ve model ayrıntıları GitHub deposundaki notebook üzerinden incelenebilir.",
    tags: ["Machine Learning", "Network Security", "Jupyter Notebook"],
    repo: "ML-Based-Intelligent-Firewall-System"
  }
];
const dialog = document.querySelector("#project-dialog");
const dialogArt = document.querySelector("#dialog-art");
let dialogTrigger;
let sourceArt;
let activeTransition;
let fallbackAnimation;
let transitionSequence = 0;

function clearSharedNames() {
  sourceArt?.style.removeProperty("view-transition-name");
  dialogArt.style.removeProperty("view-transition-name");
  delete document.documentElement.dataset.projectTransition;
}
function runProjectTransition(update, opening) {
  const sequence = ++transitionSequence;
  if (document.startViewTransition && motionAllowed()) {
    document.documentElement.dataset.projectTransition = opening ? "opening" : "closing";
    const transition = document.startViewTransition(update);
    activeTransition = transition;
    // Unsupported snapshot cases still run the DOM update and leave a functional dialog.
    transition.ready.catch(() => {});
    transition.finished.catch(() => {}).finally(() => {
      if (sequence === transitionSequence) {
        clearSharedNames();
        activeTransition = null;
      }
    });
    return transition;
  }
  update();
  clearSharedNames();
  if (opening && motionAllowed()) {
    fallbackAnimation = dialog.animate([
      { opacity: 0, transform: "translateY(32px) scale(.96)" },
      { opacity: 1, transform: "translateY(0) scale(1)" }
    ], { duration: 520, easing: "cubic-bezier(.16,1,.3,1)" });
    [...dialog.querySelector(".dialog-content").children].forEach((child, index) => {
      child.animate([
        { opacity: 0, transform: "translateY(18px)" },
        { opacity: 1, transform: "translateY(0)" }
      ], { duration: 480, delay: 80 + index * 45, fill: "backwards", easing: "cubic-bezier(.16,1,.3,1)" });
    });
  }
  return null;
}
function openProject(button) {
  if (dialog.open || activeTransition) return;
  const detail = details[Number(button.dataset.project)];
  if (!detail) return;
  dialogTrigger = button;
  const card = button.closest(".project-card");
  sourceArt = card.querySelector(".project-art, .firewall-symbol");
  const preview = sourceArt.cloneNode(true);
  preview.classList.remove("tilt-surface");
  preview.removeAttribute("style");
  preview.querySelectorAll("[id]").forEach(el => el.removeAttribute("id"));
  dialogArt.replaceChildren(preview);
  document.querySelector("#dialog-title").textContent = detail.title;
  document.querySelector("#dialog-intro").textContent = detail.intro;
  document.querySelector("#dialog-problem").textContent = detail.problem;
  document.querySelector("#dialog-approach").textContent = detail.approach;
  document.querySelector("#dialog-tags").replaceChildren(...detail.tags.map(text => {
    const span = document.createElement("span");
    span.textContent = text;
    return span;
  }));
  document.querySelector("#dialog-source").href = "https://github.com/ismailsavran10/" + detail.repo;
  sourceArt.style.viewTransitionName = "project-media";
  runProjectTransition(() => {
    sourceArt.style.removeProperty("view-transition-name");
    dialogArt.style.viewTransitionName = "project-media";
    dialog.showModal();
    document.body.classList.add("dialog-open");
    dialog.scrollTop = 0;
  }, true);
}
document.querySelectorAll("[data-project]").forEach(button => button.addEventListener("click", () => openProject(button)));
projects.forEach(card => card.addEventListener("click", event => {
  if (event.target.closest("button, a") || window.getSelection()?.toString()) return;
  const button = card.querySelector("[data-project]");
  if (button) openProject(button);
}));
async function closeProject() {
  if (activeTransition) {
    const previous = activeTransition;
    previous.skipTransition();
    await previous.finished.catch(() => {});
  }
  if (!dialog.open) return;
  fallbackAnimation?.cancel();
  if (!document.startViewTransition && motionAllowed()) {
    fallbackAnimation = dialog.animate([
      { opacity: 1, transform: "translateY(0) scale(1)" },
      { opacity: 0, transform: "translateY(18px) scale(.98)" }
    ], { duration: 220, easing: "ease-in" });
    await fallbackAnimation.finished.catch(() => {});
    dialog.close();
    return;
  }
  dialogArt.style.viewTransitionName = "project-media";
  runProjectTransition(() => {
    dialogArt.style.removeProperty("view-transition-name");
    sourceArt.style.viewTransitionName = "project-media";
    dialog.close();
  }, false);
}
document.querySelector(".dialog-close").addEventListener("click", closeProject);
dialog.addEventListener("cancel", event => {
  event.preventDefault();
  closeProject();
});
dialog.addEventListener("click", event => {
  if (event.target !== dialog) return;
  const rect = dialog.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeProject();
});
dialog.addEventListener("close", () => {
  document.body.classList.remove("dialog-open");
  dialogTrigger?.focus({ preventScroll: true });
});
document.addEventListener("portfolio:motion", event => {
  if (!event.detail.running) {
    activeTransition?.skipTransition();
    fallbackAnimation?.cancel();
  }
});

const copyButton = document.querySelector("#copy-email");
const copyStatus = document.querySelector("#copy-status");
let copyTimer;
copyButton.addEventListener("click", async () => {
  clearTimeout(copyTimer);
  try {
    if (!navigator.clipboard) throw new Error("Clipboard unavailable");
    await navigator.clipboard.writeText("savranismail339@gmail.com");
    copyStatus.textContent = "E-posta adresi kopyalandı.";
  } catch {
    copyStatus.textContent = "Kopyalanamadı; e-posta bağlantısını kullanabilirsin.";
  }
  copyTimer = setTimeout(() => { copyStatus.textContent = ""; }, 5000);
});
document.querySelector("#year").textContent = String(new Date().getFullYear());
let scrollQueued = false;
const pageHeader = document.querySelector(".header");
const sectionLinks = [...navigation.querySelectorAll('a[href^="#"]')].map(link => ({link,section:document.querySelector(link.hash)}));
function updateScroll() {
  const max = document.documentElement.scrollHeight - innerHeight;
  document.documentElement.style.setProperty("--scroll-progress", max > 0 ? String(scrollY / max) : "0");
  pageHeader.classList.toggle("scrolled", scrollY > 30);
  let current = null;
  for (const {link,section} of sectionLinks) {
    if (section && section.getBoundingClientRect().top <= innerHeight * .38) current = link;
  }
  sectionLinks.forEach(({link}) => {
    if (link === current) link.setAttribute("aria-current", "location");
    else link.removeAttribute("aria-current");
  });
  scrollQueued = false;
}
function queueScroll() {
  if (!scrollQueued) { scrollQueued = true; requestAnimationFrame(updateScroll); }
}
window.addEventListener("scroll", queueScroll, { passive: true });
window.addEventListener("resize", queueScroll, { passive: true });
updateScroll();

