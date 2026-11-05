/* Shape's Blog · Noteworthy enhancements v2.0
 * 文章目录、代码复制、图片灯箱、自动/手动明暗模式
 * 不使用第三方 JS 库；所有功能仅在可用的页面上渐进增强。
 */
(function () {
  'use strict';

  function ready(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn, { once: true });
    } else {
      fn();
    }
  }

  function initTheme() {
    var root = document.documentElement;
    var key = 'shape-blog-theme';
    var modes = ['system', 'light', 'dark'];
    var labels = { system: '自动', light: '浅色', dark: '深色' };
    var current = 'system';

    try {
      var saved = window.localStorage.getItem(key);
      if (modes.indexOf(saved) !== -1) current = saved;
    } catch (e) { /* 隐私模式下 localStorage 可能不可用 */ }

    function apply(mode) {
      current = mode;
      if (mode === 'system') root.removeAttribute('data-shape-theme');
      else root.setAttribute('data-shape-theme', mode);
      if (button) {
        button.textContent = '◐ ' + labels[mode];
        button.setAttribute('aria-label', '当前外观：' + labels[mode] + '，点击切换外观模式');
        button.title = '外观：' + labels[mode] + '（点击切换）';
      }
    }

    var nav = document.querySelector('nav .nav-menu');
    var button = null;
    if (nav) {
      button = document.createElement('button');
      button.type = 'button';
      button.className = 'shape-theme-switch';
      button.addEventListener('click', function () {
        var next = modes[(modes.indexOf(current) + 1) % modes.length];
        apply(next);
        try { window.localStorage.setItem(key, next); } catch (e) { /* ignore */ }
      });
      nav.appendChild(button);
    }
    apply(current);
  }

  function findArticle() {
    var container = document.querySelector('#content');
    if (!container || !container.querySelector('.post-title')) return null;
    // Noteworthy single.html：标题后直接包含一个正文 div。
    var title = container.querySelector('.post-title');
    var el = title.nextElementSibling;
    var best = null;
    var bestScore = 0;
    while (el) {
      // 某些 Noteworthy 分支在正文之前还有一个 div 形式的文章元信息。
      // 选取包含最多实际文章元素的 div，避免把元信息当正文。
      if (el.tagName === 'DIV' && !el.classList.contains('page-footer')) {
        var markers = el.querySelectorAll('h2,h3,h4,p,pre,img,blockquote,table,ul,ol').length;
        var chars = el.textContent.trim().length;
        var score = markers * 12 + Math.min(chars, 2000) / 25;
        if ((markers || chars > 150) && score > bestScore) {
          best = el;
          bestScore = score;
        }
      }
      el = el.nextElementSibling;
    }
    return best;
  }

  function initToc(article) {
    var headings = Array.prototype.slice.call(article.querySelectorAll('h2, h3'));
    if (headings.length < 2) return;

    var toc = document.createElement('details');
    toc.className = 'shape-toc';
    toc.setAttribute('aria-label', '文章目录');
    var mq = window.matchMedia && window.matchMedia('(min-width: 1580px)');
    toc.open = !!(mq && mq.matches);

    var summary = document.createElement('summary');
    summary.appendChild(document.createTextNode('本页目录'));
    var counter = document.createElement('span');
    counter.className = 'shape-toc-count';
    counter.textContent = '（' + headings.length + ' 节）';
    summary.appendChild(counter);
    toc.appendChild(summary);

    var nav = document.createElement('nav');
    nav.setAttribute('aria-label', '章节导航');
    var list = document.createElement('ol');
    var links = [];
    headings.forEach(function (h, idx) {
      if (!h.id) h.id = 'shape-section-' + (idx + 1);
      var item = document.createElement('li');
      if (h.tagName.toLowerCase() === 'h3') item.className = 'shape-toc-h3';
      var a = document.createElement('a');
      a.href = '#' + encodeURIComponent(h.id);
      a.textContent = h.textContent.trim() || ('章节 ' + (idx + 1));
      a.addEventListener('click', function () {
        if (!mq || !mq.matches) toc.open = false;
      });
      item.appendChild(a);
      list.appendChild(item);
      links.push(a);
    });
    nav.appendChild(list);
    toc.appendChild(nav);
    article.parentNode.insertBefore(toc, article);

    function activateLink() {
      var selected = 0;
      for (var i = 0; i < headings.length; i++) {
        if (headings[i].getBoundingClientRect().top <= 135) selected = i;
        else break;
      }
      links.forEach(function (a, i) {
        a.classList.toggle('is-active', i === selected);
        if (i === selected) a.setAttribute('aria-current', 'location');
        else a.removeAttribute('aria-current');
      });
    }
    var pending = false;
    window.addEventListener('scroll', function () {
      if (pending) return;
      pending = true;
      window.requestAnimationFrame(function () { pending = false; activateLink(); });
    }, { passive: true });
    activateLink();
  }

  function fallbackCopy(text) {
    var el = document.createElement('textarea');
    el.value = text;
    el.setAttribute('readonly', '');
    el.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0';
    document.body.appendChild(el);
    el.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    el.remove();
    if (!ok) throw new Error('copy failed');
  }

  function initCodeCopy(article) {
    var blocks = article.querySelectorAll('pre');
    Array.prototype.forEach.call(blocks, function (pre) {
      // Hugo 行号表格：略过纯行号栏，避免复制两次。
      if (pre.closest('.lntd') && pre.closest('.lntd').previousElementSibling === null &&
          pre.closest('.lntd').nextElementSibling) return;
      if (pre.closest('.shape-code-wrap')) return;
      var code = pre.querySelector('code') || pre;
      if (!code.textContent.trim()) return;

      var wrapper = document.createElement('div');
      wrapper.className = 'shape-code-wrap';
      pre.parentNode.insertBefore(wrapper, pre);
      wrapper.appendChild(pre);
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'shape-copy-btn';
      btn.textContent = '复制代码';
      btn.setAttribute('aria-label', '复制代码块内容');
      wrapper.appendChild(btn);
      var resetTimer;

      btn.addEventListener('click', function () {
        var content = code.textContent.replace(/\n+$/, '\n');
        var action;
        if (navigator.clipboard && navigator.clipboard.writeText) {
          action = navigator.clipboard.writeText(content).catch(function () { fallbackCopy(content); });
        } else {
          action = Promise.resolve().then(function () { fallbackCopy(content); });
        }
        action.then(function () {
          btn.textContent = '✓ 已复制';
        }).catch(function () {
          btn.textContent = '复制失败';
        }).finally(function () {
          window.clearTimeout(resetTimer);
          resetTimer = window.setTimeout(function () { btn.textContent = '复制代码'; }, 1800);
        });
      });
    });
  }

  function initLightbox(article) {
    if (typeof HTMLDialogElement === 'undefined') return;
    var images = Array.prototype.slice.call(article.querySelectorAll('img')).filter(function (img) {
      if (img.classList.contains('emojify') || img.classList.contains('no-lightbox')) return false;
      if (img.closest('.katex, .shape-code-wrap')) return false;
      var link = img.closest('a[href]');
      // 保留指向独立网页的图片链接，不拦截原本的跳转。
      if (link && !/\.(png|jpe?g|gif|webp|svg|avif)(\?.*)?$/i.test(link.getAttribute('href'))) return false;
      return true;
    });
    if (!images.length) return;

    var dialog = document.createElement('dialog');
    dialog.className = 'shape-lightbox';
    dialog.setAttribute('aria-label', '查看文章图片');
    dialog.innerHTML = '<button class="shape-lightbox-close" type="button" aria-label="关闭图片">×</button>' +
      '<button class="shape-lightbox-prev" type="button" aria-label="上一张图片">‹</button>' +
      '<div class="shape-lightbox-stage"><img alt=""><div class="shape-lightbox-caption"></div>' +
      '<a class="shape-lightbox-link" target="_blank" rel="noopener noreferrer">查看原图 ↗</a></div>' +
      '<button class="shape-lightbox-next" type="button" aria-label="下一张图片">›</button>';
    document.body.appendChild(dialog);

    var largeImg = dialog.querySelector('.shape-lightbox-stage img');
    var caption = dialog.querySelector('.shape-lightbox-caption');
    var sourceLink = dialog.querySelector('.shape-lightbox-link');
    var prev = dialog.querySelector('.shape-lightbox-prev');
    var next = dialog.querySelector('.shape-lightbox-next');
    var index = 0;
    var lastFocus = null;

    function render() {
      var image = images[index];
      var src = image.currentSrc || image.src;
      largeImg.src = src;
      largeImg.alt = image.alt || '文章截图';
      sourceLink.href = src;
      caption.textContent = (image.alt || '文章图片') + ' · ' + (index + 1) + ' / ' + images.length;
      prev.hidden = images.length < 2;
      next.hidden = images.length < 2;
    }
    function openImage(i) {
      index = i;
      lastFocus = document.activeElement;
      render();
      if (!dialog.open) dialog.showModal();
      document.documentElement.classList.add('shape-no-scroll');
      dialog.querySelector('.shape-lightbox-close').focus();
    }
    function closeImage() { if (dialog.open) dialog.close(); }
    function step(delta) { index = (index + delta + images.length) % images.length; render(); }

    images.forEach(function (img, i) {
      img.dataset.shapeLightbox = 'true';
      img.setAttribute('tabindex', '0');
      img.setAttribute('role', 'button');
      img.setAttribute('aria-label', '放大查看图片：' + (img.alt || (i + 1)));
      img.addEventListener('click', function (evt) {
        var anchor = img.closest('a');
        if (anchor) evt.preventDefault();
        openImage(i);
      });
      img.addEventListener('keydown', function (evt) {
        if (evt.key === 'Enter' || evt.key === ' ') { evt.preventDefault(); openImage(i); }
      });
    });
    prev.addEventListener('click', function () { step(-1); });
    next.addEventListener('click', function () { step(1); });
    dialog.querySelector('.shape-lightbox-close').addEventListener('click', closeImage);
    dialog.addEventListener('click', function (evt) { if (evt.target === dialog) closeImage(); });
    dialog.addEventListener('close', function () {
      document.documentElement.classList.remove('shape-no-scroll');
      largeImg.removeAttribute('src');
      if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
    });
    dialog.addEventListener('keydown', function (evt) {
      if (evt.key === 'ArrowRight') { evt.preventDefault(); step(1); }
      if (evt.key === 'ArrowLeft') { evt.preventDefault(); step(-1); }
    });
  }

  ready(function () {
    initTheme();
    var article = findArticle();
    if (!article) return;
    initToc(article);
    initCodeCopy(article);
    initLightbox(article);
  });
})();
