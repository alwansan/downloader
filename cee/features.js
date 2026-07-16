/* =============================================================
   FEATURES ADD-ON (features.js)
   -----------------------------------------------------------
   ملف جديد بالكامل. لا يقوم بتعديل أو استبدال أي دالة أو متغيّر
   من script.js الأصلي. يعمل فقط "فوق" الواجهة الموجودة عن طريق:
     - إضافة عناصر HTML جديدة داخل الأقسام الموجودة أصلاً
     - الاستماع لأحداث النقر بمرحلة الـ capture (لا يوقف
       ولا يغيّر عمل المستمعين الأصليين إطلاقاً)
     - استخدام MutationObserver لمراقبة التغييرات في الواجهة
       والتفاعل معها دون التدخل في طريقة عملها

   الميزات المضافة:
   1) صفحة المواسم والحلقات (4c):
      - بحث عن رقم حلقة واحد عبر كل المواسم
      - بحث عن نطاق حلقات (من - إلى) عبر كل المواسم
      - تذكّر آخر بحث لكل مسلسل عند الرجوع للخلف والعودة إليه
   2) صفحة الجودة (5c):
      - عرض رقم/اسم الحلقة الحالية أعلى الصفحة
      - زرّي "السابق" و"التالي" للتنقل بين الحلقات
      - زر "بدء التحميل" يأخذ آخر رابط تم نسخه ويفتحه
        مباشرة في تطبيق 1DM+
   ============================================================= */
(function () {
  'use strict';

  /* ------------------------- أدوات مساعدة عامة ------------------------- */
  function q(sel, root) { return (root || document).querySelector(sel); }
  function qa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function extractNumber(text) {
    var m = String(text || '').match(/\d+/);
    return m ? parseInt(m[0], 10) : null;
  }

  function currentShowKey() {
    var t = q('#details-title');
    var title = t && t.textContent ? t.textContent.trim() : '';
    return title || 'default-show';
  }

  function getFilterState(key) {
    try {
      var raw = sessionStorage.getItem('cinemana_ep_filter_' + key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function setFilterState(key, state) {
    try { sessionStorage.setItem('cinemana_ep_filter_' + key, JSON.stringify(state)); }
    catch (e) { /* تجاهل أي خطأ تخزين */ }
  }

  /* =====================================================================
     الجزء الأول: صندوق البحث عن الحلقات داخل صفحة المواسم (4c)
     ===================================================================== */

  function buildSearchUI() {
    var seasonsList = q('#seasons-list');
    if (!seasonsList) return;
    if (q('#ep-search-box', seasonsList)) return; // موجود مسبقاً

    var box = document.createElement('div');
    box.id = 'ep-search-box';
    box.className = 'ep-search-box';
    box.innerHTML =
      '<div class="ep-search-row">' +
      '  <span class="material-icons ep-search-icon">tag</span>' +
      '  <input type="number" inputmode="numeric" id="ep-search-single" class="ep-search-input" placeholder="ابحث برقم حلقة معينة...">' +
      '  <button type="button" id="ep-search-clear" class="ep-search-clear-btn" title="مسح البحث">' +
      '    <span class="material-icons">close</span>' +
      '  </button>' +
      '</div>' +
      '<div class="ep-search-range-row">' +
      '  <span class="ep-range-label">من</span>' +
      '  <input type="number" inputmode="numeric" id="ep-search-from" class="ep-search-input ep-range-input" placeholder="مثال: 124">' +
      '  <span class="ep-range-label">إلى</span>' +
      '  <input type="number" inputmode="numeric" id="ep-search-to" class="ep-search-input ep-range-input" placeholder="مثال: 145">' +
      '  <button type="button" id="ep-search-range-btn" class="ep-range-btn">عرض النطاق</button>' +
      '</div>' +
      '<div id="ep-search-status" class="ep-search-status"></div>';

    var titleEl = q('.seasons-title', seasonsList) || q('h3', seasonsList);
    if (titleEl && titleEl.nextSibling) {
      seasonsList.insertBefore(box, titleEl.nextSibling);
    } else if (titleEl) {
      titleEl.parentNode.insertBefore(box, titleEl.nextSibling);
    } else {
      seasonsList.insertBefore(box, seasonsList.firstChild);
    }

    q('#ep-search-single', box).addEventListener('input', onSingleInput);
    q('#ep-search-range-btn', box).addEventListener('click', onRangeApply);
    q('#ep-search-from', box).addEventListener('keydown', function (e) { if (e.key === 'Enter') onRangeApply(); });
    q('#ep-search-to', box).addEventListener('keydown', function (e) { if (e.key === 'Enter') onRangeApply(); });
    q('#ep-search-clear', box).addEventListener('click', clearFilter);
  }

  function onSingleInput() {
    var input = q('#ep-search-single');
    var val = input ? input.value.trim() : '';
    if (val === '') {
      applyFilter(null);
      setFilterState(currentShowKey(), { mode: null });
      return;
    }
    var n = parseInt(val, 10);
    if (isNaN(n)) return;
    applyFilter({ mode: 'single', value: n });
    setFilterState(currentShowKey(), { mode: 'single', value: n });
  }

  function onRangeApply() {
    var fromInput = q('#ep-search-from');
    var toInput = q('#ep-search-to');
    var fromV = parseInt(fromInput ? fromInput.value : '', 10);
    var toV = parseInt(toInput ? toInput.value : '', 10);
    if (isNaN(fromV) || isNaN(toV)) return;
    var lo = Math.min(fromV, toV), hi = Math.max(fromV, toV);
    applyFilter({ mode: 'range', from: lo, to: hi });
    setFilterState(currentShowKey(), { mode: 'range', from: lo, to: hi });
  }

  function clearFilter() {
    var s = q('#ep-search-single'); if (s) s.value = '';
    var f = q('#ep-search-from'); if (f) f.value = '';
    var t = q('#ep-search-to'); if (t) t.value = '';
    applyFilter(null);
    setFilterState(currentShowKey(), { mode: null });
  }

  // العناصر التي أجبرناها على الفتح (expanded) بسبب البحث فقط، حتى نعيدها كما كانت عند مسح البحث
  var forcedExpanded = [];

  function applyFilter(filter) {
    var seasons = qa('.season-item');
    var matchedSeasonsCount = 0;

    // أولاً: أعد أي عناصر أجبرناها سابقاً على الفتح إلى حالتها الطبيعية
    forcedExpanded.forEach(function (el) { el.classList.remove('expanded'); });
    forcedExpanded = [];

    seasons.forEach(function (season) {
      var episodeListEl = q('.episode-list', season);
      var seasonTitleEl = q('.season-title', season);
      var episodes = qa('.episode-item', season);
      var seasonHasMatch = false;

      episodes.forEach(function (ep) {
        var numEl = q('.episode-num', ep);
        var num = extractNumber(numEl ? numEl.textContent : '');
        var match = true;
        if (filter) {
          if (filter.mode === 'single') match = (num === filter.value);
          else if (filter.mode === 'range') match = (num !== null && num >= filter.from && num <= filter.to);
        }
        ep.style.display = match ? '' : 'none';
        if (match) seasonHasMatch = true;
      });

      if (filter) {
        season.style.display = seasonHasMatch ? '' : 'none';
        if (seasonHasMatch) {
          if (seasonTitleEl && !seasonTitleEl.classList.contains('expanded')) {
            seasonTitleEl.classList.add('expanded');
            forcedExpanded.push(seasonTitleEl);
          }
          if (episodeListEl && !episodeListEl.classList.contains('expanded')) {
            episodeListEl.classList.add('expanded');
            forcedExpanded.push(episodeListEl);
          }
          matchedSeasonsCount++;
        }
      } else {
        season.style.display = '';
      }
    });

    updateStatus(filter, matchedSeasonsCount);
  }

  function updateStatus(filter, matchedSeasonsCount) {
    var el = q('#ep-search-status');
    if (!el) return;
    if (!filter) { el.textContent = ''; return; }
    if (filter.mode === 'single') {
      el.textContent = matchedSeasonsCount
        ? 'تم العثور على الحلقة ' + filter.value + ' في ' + matchedSeasonsCount + ' موسم'
        : 'لا توجد حلقة بهذا الرقم';
    } else if (filter.mode === 'range') {
      el.textContent = matchedSeasonsCount
        ? 'عرض الحلقات من ' + filter.from + ' إلى ' + filter.to
        : 'لا توجد حلقات ضمن هذا النطاق';
    }
  }

  function restoreFilterUI() {
    var state = getFilterState(currentShowKey());
    if (!state || !state.mode) { applyFilter(null); return; }
    if (state.mode === 'single') {
      var s = q('#ep-search-single'); if (s) s.value = state.value;
      applyFilter({ mode: 'single', value: state.value });
    } else if (state.mode === 'range') {
      var f = q('#ep-search-from'), t = q('#ep-search-to');
      if (f) f.value = state.from;
      if (t) t.value = state.to;
      applyFilter({ mode: 'range', from: state.from, to: state.to });
    }
  }

  /* =====================================================================
     الجزء الثاني: قائمة مسطّحة بكل الحلقات (لتُستخدم في السابق/التالي)
     ===================================================================== */
  var flatEpisodes = [];
  function rebuildFlatEpisodes() { flatEpisodes = qa('.episode-item'); }

  function readEpisodeMeta(epItem) {
    var numEl = q('.episode-num', epItem);
    var titleEl = q('.episode-title', epItem);
    return {
      num: numEl ? numEl.textContent.trim() : '',
      title: titleEl ? titleEl.textContent.trim() : ''
    };
  }

  var currentEpisodeIndex = -1;
  var currentEpisodeMeta = null;

  // نستمع بمرحلة الالتقاط (capture) فقط لقراءة بيانات الحلقة المضغوطة،
  // دون التدخل في أي مستمع أصلي (لا نستخدم stopPropagation أبداً)
  document.addEventListener('click', function (e) {
    var epItem = e.target && e.target.closest ? e.target.closest('.episode-item') : null;
    if (epItem) {
      rebuildFlatEpisodes();
      currentEpisodeIndex = flatEpisodes.indexOf(epItem);
      currentEpisodeMeta = readEpisodeMeta(epItem);
      try { sessionStorage.setItem('cinemana_current_ep', JSON.stringify(currentEpisodeMeta)); } catch (err) {}
    }
  }, true);

  /* =====================================================================
     الجزء الثالث: شريط أعلى صفحة الجودة (5c)
     رقم الحلقة + السابق/التالي + بدء التحميل
     ===================================================================== */

  function buildQualityHeader() {
    var section = q('#quality-options-section');
    if (!section) return;
    if (q('#ep-nav-bar', section)) { updateQualityHeaderText(); return; }

    var bar = document.createElement('div');
    bar.id = 'ep-nav-bar';
    bar.className = 'ep-nav-bar';
    bar.innerHTML =
      '<div class="ep-nav-info">' +
      '  <span class="material-icons">ondemand_video</span>' +
      '  <span id="ep-nav-title" class="ep-nav-title"></span>' +
      '</div>' +
      '<div class="ep-nav-controls">' +
      '  <button type="button" id="ep-prev-btn" class="ep-nav-btn"><span class="material-icons">chevron_right</span> السابق</button>' +
      '  <button type="button" id="ep-next-btn" class="ep-nav-btn">التالي <span class="material-icons">chevron_left</span></button>' +
      '</div>' +
      '<button type="button" id="ep-start-download-btn" class="ep-start-download-btn">' +
      '  <span class="material-icons">download_for_offline</span> بدء التحميل' +
      '</button>' +
      '<div id="ep-download-status" class="ep-download-status"></div>';

    var backBtn = q('.back-btn', section) || q('button[onclick="handleGlobalBackButtonClick()"]', section);
    if (backBtn && backBtn.parentNode) {
      backBtn.parentNode.insertBefore(bar, backBtn.nextSibling);
    } else {
      section.insertBefore(bar, section.firstChild);
    }

    q('#ep-prev-btn', bar).addEventListener('click', function () { goRelative(-1); });
    q('#ep-next-btn', bar).addEventListener('click', function () { goRelative(1); });
    q('#ep-start-download-btn', bar).addEventListener('click', startDownload);

    updateQualityHeaderText();
  }

  function updateQualityHeaderText() {
    var titleEl = q('#ep-nav-title');
    if (!titleEl) return;

    var meta = currentEpisodeMeta;
    if (!meta) {
      try { meta = JSON.parse(sessionStorage.getItem('cinemana_current_ep')); } catch (e) { meta = null; }
    }
    if (meta) {
      titleEl.textContent = meta.num
        ? ('الحلقة ' + meta.num + (meta.title ? ' - ' + meta.title : ''))
        : (meta.title || '');
    }

    rebuildFlatEpisodes();
    if (currentEpisodeIndex < 0 && flatEpisodes.length && meta) {
      currentEpisodeIndex = flatEpisodes.findIndex(function (ep) {
        var m = readEpisodeMeta(ep);
        return m.num === meta.num && m.title === meta.title;
      });
    }

    var prevBtn = q('#ep-prev-btn');
    var nextBtn = q('#ep-next-btn');
    if (prevBtn) prevBtn.disabled = currentEpisodeIndex <= 0;
    if (nextBtn) nextBtn.disabled = currentEpisodeIndex < 0 || currentEpisodeIndex >= flatEpisodes.length - 1;
  }

  function goRelative(delta) {
    rebuildFlatEpisodes();
    if (currentEpisodeIndex < 0 || !flatEpisodes.length) return;
    var target = currentEpisodeIndex + delta;
    if (target < 0 || target >= flatEpisodes.length) return;
    var targetEl = flatEpisodes[target];
    if (targetEl) {
      // نستدعي click() الحقيقي على عنصر الحلقة نفسه حتى يعمل كل الكود الأصلي
      // (تحميل روابط الجودة...) تماماً كما لو أن المستخدم ضغط عليه يدوياً
      targetEl.click();
    }
  }

  /* =====================================================================
     الجزء الرابع: التقاط آخر رابط تم نسخه (نسخ الرابط) دون المساس
     بطريقة عمل الزر الأصلي - نراقب فقط
     ===================================================================== */

  var lastCopiedLink = null;

  function looksLikeUrl(s) {
    return typeof s === 'string' && /^https?:\/\//i.test(s.trim());
  }

  function captureLink(text) {
    if (looksLikeUrl(text)) {
      lastCopiedLink = text.trim();
      try { sessionStorage.setItem('cinemana_last_link', lastCopiedLink); } catch (e) {}
      var status = q('#ep-download-status');
      if (status) status.textContent = 'تم رصد رابط جديد ✓ يمكنك الآن الضغط على بدء التحميل';
    }
  }

  // 1) نغلّف navigator.clipboard.writeText (الطريقة الحديثة للنسخ) دون كسرها
  if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    var originalWriteText = navigator.clipboard.writeText.bind(navigator.clipboard);
    navigator.clipboard.writeText = function (text) {
      captureLink(text);
      return originalWriteText(text);
    };
  }

  // 2) نستمع لحدث copy الطبيعي (يغطي execCommand('copy') وأي نسخ عبر تحديد نص)
  document.addEventListener('copy', function () {
    setTimeout(function () {
      try {
        var sel = window.getSelection ? window.getSelection().toString() : '';
        if (sel) captureLink(sel);
      } catch (e) {}
    }, 0);
  }, true);

  // 3) كحل احتياطي إضافي: بعد الضغط على أي زر داخل قائمة الجودة، نحاول قراءة الحافظة
  //    (يعمل فقط إذا سمح المتصفح/الواجهة بصلاحية القراءة - إن لم يعمل فلا ضرر)
  document.addEventListener('click', function (e) {
    var btn = e.target && e.target.closest ? e.target.closest('.quality-btn') : null;
    if (btn) {
      setTimeout(function () {
        if (navigator.clipboard && typeof navigator.clipboard.readText === 'function') {
          navigator.clipboard.readText().then(captureLink).catch(function () { /* صلاحية غير متاحة - تجاهل */ });
        }
      }, 150);
    }
  }, true);

  /* -------- زر "بدء التحميل": يفتح آخر رابط تم نسخه مباشرة في 1DM+ -------- */
  function startDownload() {
    var link = lastCopiedLink;
    if (!link) {
      try { link = sessionStorage.getItem('cinemana_last_link'); } catch (e) {}
    }
    var status = q('#ep-download-status');
    if (!link) {
      if (status) status.textContent = 'اضغط أولاً على "نسخ الرابط" أمام الجودة المطلوبة، ثم اضغط بدء التحميل';
      return;
    }
    try {
      var withoutScheme = link.replace(/^https?:\/\//i, '');
      var scheme = /^https:/i.test(link) ? 'https' : 'http';
      var intentUrl = 'intent://' + withoutScheme +
        '#Intent;scheme=' + scheme +
        ';package=idm.internet.download.manager.plus;end';
      if (status) status.textContent = 'جارِ فتح 1DM+ ...';
      window.location.href = intentUrl;
    } catch (e) {
      if (status) status.textContent = 'تعذر فتح 1DM+، تأكد من أن التطبيق مثبت على جهازك';
    }
  }

  /* =====================================================================
     الجزء الخامس: المراقبة العامة لربط كل شيء بدون تعديل script.js
     ===================================================================== */

  function onDetailsVisible() {
    buildSearchUI();
    // تأخير بسيط لضمان استقرار عنوان المسلسل قبل استرجاع البحث المحفوظ
    setTimeout(restoreFilterUI, 30);
  }

  function onQualityVisible() {
    buildQualityHeader();
  }

  function handleVisibleSections() {
    var detailsSection = q('#details-section');
    if (detailsSection && !detailsSection.classList.contains('hidden')) onDetailsVisible();

    var qualitySection = q('#quality-options-section');
    if (qualitySection && !qualitySection.classList.contains('hidden')) onQualityVisible();
  }

  /* ملاحظة مهمة حول تصميم المراقبة (لتفادي أي حلقة تكرار لا نهائية):
     - نراقب فقط تغيّر class على قسمي "التفاصيل" و"الجودة" أنفسهما (وليس كل
       العناصر الفرعية)، لأن تبديل/فتح المواسم والحلقات يغيّر أيضاً class
       على عناصر داخلية، ولا علاقة له بظهور القسم نفسه.
     - نراقب تغيّر أبناء seasons-list/quality-list فقط (childList) لمعرفة
       متى يتم عرض بيانات مسلسل/حلقة جديدة، دون مراقبة أي تغييرات class. */

  ['details-section', 'quality-options-section'].forEach(function (id) {
    var el = document.getElementById(id);
    if (!el) return;
    var obs = new MutationObserver(function (mutations) {
      mutations.forEach(function (m) {
        if (m.type !== 'attributes' || m.attributeName !== 'class') return;
        if (el.classList.contains('hidden')) return;
        if (id === 'details-section') onDetailsVisible();
        else onQualityVisible();
      });
    });
    obs.observe(el, { attributes: true, attributeFilter: ['class'] });
  });

  function watchListContainer(containerId, onChange) {
    var container = document.getElementById(containerId);
    if (!container) return;
    var obs = new MutationObserver(function () { onChange(); });
    obs.observe(container, { childList: true });
  }

  // عند تحميل بيانات مسلسل/موسم جديد داخل seasons-list: أعد بناء صندوق
  // البحث (إن لم يكن موجوداً) واسترجع آخر بحث محفوظ لهذا المسلسل تحديداً
  watchListContainer('seasons-list', function () {
    buildSearchUI();
    setTimeout(restoreFilterUI, 30);
  });

  // عند تحميل جودات حلقة جديدة داخل quality-list: حدّث نص الحلقة الحالية
  // وحالة زرّي السابق/التالي فقط (بدون إعادة إنشاء الشريط)
  watchListContainer('quality-list', function () {
    updateQualityHeaderText();
  });

  document.addEventListener('DOMContentLoaded', handleVisibleSections);
  // في حال كانت script.js قد رسمت المحتوى قبل أن يُحمَّل هذا الملف
  handleVisibleSections();
})();
