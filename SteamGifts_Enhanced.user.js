// ==UserScript==
// @name         SteamGifts-Quick-Join-Manual-2026---Enhanced
// @namespace    https://steamgifts.com
// @version      3.1.0
// @description  大号按钮放在行外，P 点数白色无边框，已参与按钮可取消，图标大小控制面板
// @author       xie7
// @match        https://www.steamgifts.com/*
// @match        https://steamgifts.com/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  // ==================== 第一部分：SteamGifts Quick Join 功能 ====================

  const SELECTORS = {
    giveawayRow:          '.giveaway__row-inner-wrap',
    giveawayOuterWrap:    '.giveaway__row-outer-wrap',
    giveawayLink:         '.giveaway__heading__name',
    originalButton:       '.giveaway__hide-icon button, button[data-do="entry_insert"], button[data-do="entry_delete"]',
    activeOriginalBtn:    '.giveaway__hide-icon button.is-active, button.is-active[data-do="entry_delete"]',
    pointsNav:            '.nav__points',
    giveawayRows:         '.giveaway__rows',
    paginationNext:       '.pagination__next',
    navHeader:            '.nav__header, header, .nav',
  };

  // 工具函数
  function extractGiveawayId(row) {
    const link = row.querySelector(SELECTORS.giveawayLink);
    if (!link) return null;
    const match = link.href.match(/\/giveaway\/([A-Za-z0-9]+)/);
    return match ? match[1] : null;
  }

  function extractTitle(row) {
    const link = row.querySelector(SELECTORS.giveawayLink);
    return link ? link.textContent.trim() : 'Unknown';
  }

  function extractPointsCost(row) {
    const thinEl = row.querySelector('.giveaway__heading__thin');
    if (!thinEl) return 0;
    const match = thinEl.textContent.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  function getCurrentPoints() {
    const el = document.querySelector(SELECTORS.pointsNav);
    if (!el) return 0;
    const match = el.textContent.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  function getXsrfToken() {
    const input = document.querySelector('input[name="xsrf_token"]');
    return input ? input.value || '' : '';
  }

  // 固定导航栏 + 修改 P 点数样式
  function fixNavigationBar() {
    const navHeader = document.querySelector(SELECTORS.navHeader);
    if (!navHeader) return;

    const style = document.createElement('style');
    style.textContent = `
      /* 固定导航栏 */
      .nav__header, header, .nav {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        z-index: 10000 !important;
        background: linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%) !important;
        box-shadow: 0 4px 20px rgba(0,0,0,0.4) !important;
        padding: 12px 0 !important;
        backdrop-filter: blur(10px) !important;
        border-bottom: 1px solid rgba(255,255,255,0.1) !important;
      }

      /* 页面内容顶部间距 */
      .page__outer-wrap, .page__inner-wrap, main {
        margin-top: 70px !important;
      }

      /* 修改 1: P 点数改为白色，移除椭圆形边框 */
      .nav__points {
        color: #ffffff !important; /* 白色文字 */
        font-weight: bold !important;
        font-size: 18px !important;
        position: relative !important;
        z-index: 10001 !important;
        padding: 0 !important; /* 移除内边距 */
        background: transparent !important; /* 移除背景 */
        border: none !important; /* 移除边框 */
        border-radius: 0 !important; /* 移除圆角 */
        box-shadow: none !important; /* 移除阴影 */
        display: inline !important;
      }

      .nav__points:hover {
        background: transparent !important;
        transform: none !important;
        box-shadow: none !important;
      }

      .nav__points::before {
        content: "" !important; /* 移除图标 */
      }

      /* 导航链接样式 */
      .nav__navigation {
        display: flex !important;
        align-items: center !important;
        gap: 20px !important;
      }

      .nav__navigation a {
        color: #fff !important;
        text-decoration: none !important;
        font-weight: 500 !important;
        padding: 8px 16px !important;
        border-radius: 8px !important;
        transition: all 0.3s ease !important;
        background: rgba(255,255,255,0.05) !important;
        border: 1px solid rgba(255,255,255,0.1) !important;
      }

      .nav__navigation a:hover {
        background: rgba(255,255,255,0.15) !important;
        transform: translateY(-1px) !important;
      }

      /* P 点数动画 */
      @keyframes pointsUpdate {
        0% { transform: scale(1); }
        50% { transform: scale(1.1); }
        100% { transform: scale(1); }
      }

      .points-updated {
        animation: pointsUpdate 0.5s ease !important;
      }
    `;
    document.head.appendChild(style);

    console.log('[SG QuickJoin] 导航栏已固定，P 点数样式已修改');
  }

  // 按钮创建与插入
  function createJoinButton(row, title, cost) {
    const btn = document.createElement('button');
    btn.className = 'sgqj-join-btn';

    const isFaded = row.classList.contains('is-faded');
    const isActive = !!row.querySelector(SELECTORS.activeOriginalBtn);
    const giveawayId = extractGiveawayId(row);

    // 大号按钮样式
    btn.style.cssText = `
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 12px 24px;
      border: none;
      border-radius: 12px;
      font-size: 16px;
      font-weight: 700;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 6px 20px rgba(0,0,0,0.25);
      min-width: 140px;
      height: 50px;
      line-height: 26px;
      position: relative;
      overflow: hidden;
    `;

    if (isFaded || isActive) {
      // 已参与按钮仍然可以点击，用于取消参与
      btn.innerHTML = '✅ 已参与';
      btn.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
      btn.style.color = '#fff';
      btn.style.border = '2px solid rgba(255,255,255,0.3)';
      btn.dataset.sgqjState = 'entered';
      btn.style.boxShadow = '0 6px 25px rgba(102, 126, 234, 0.5)';
      btn.disabled = false;
      btn.style.cursor = 'pointer';
      btn.style.opacity = '1';
    } else {
      btn.innerHTML = `🎲 参与 (P)`;
      btn.style.background = 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)';
      btn.style.color = '#fff';
      btn.style.border = '2px solid rgba(255,255,255,0.3)';
      btn.dataset.sgqjState = 'join';
      btn.style.boxShadow = '0 6px 25px rgba(67, 233, 123, 0.5)';
    }

    // 悬停效果
    btn.addEventListener('mouseenter', function() {
      if (!this.disabled) {
        this.style.transform = 'translateY(-3px) scale(1.05)';
        this.style.boxShadow = '0 10px 30px rgba(0,0,0,0.35)';
      }
    });

    btn.addEventListener('mouseleave', function() {
      if (!this.disabled) {
        this.style.transform = '';
        if (this.dataset.sgqjState === 'entered') {
          this.style.boxShadow = '0 6px 25px rgba(102, 126, 234, 0.5)';
        } else if (this.dataset.sgqjState === 'join') {
          this.style.boxShadow = '0 6px 25px rgba(67, 233, 123, 0.5)';
        }
      }
    });

    // 波纹效果
    btn.addEventListener('click', function(e) {
      if (this.disabled) return;
      const ripple = document.createElement('span');
      const rect = this.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height) * 2;
      const x = e.clientX - rect.left - size / 2;
      const y = e.clientY - rect.top - size / 2;
      ripple.style.cssText = `
        position: absolute;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.6);
        transform: scale(0);
        animation: ripple 0.6s linear;
        width: ${size}px;
        height: ${size}px;
        top: ${y}px;
        left: ${x}px;
      `;
      this.appendChild(ripple);
      setTimeout(() => ripple.remove(), 600);
    });

    btn.dataset.giveawayId = giveawayId;
    btn.dataset.title = title;
    btn.dataset.cost = cost;

    btn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      handleButtonClick(this, row);
    });

    return btn;
  }

  async function handleButtonClick(btn, row) {
    const state = btn.dataset.sgqjState;
    const title = btn.dataset.title;
    const cost = parseInt(btn.dataset.cost) || 0;
    if (btn.disabled) return;
    if (state === 'join') {
      await doJoin(btn, row, title, cost);
    } else if (state === 'entered') {
      await doCancel(btn, row, title, cost);
    }
  }

  async function doJoin(btn, row, title, cost) {
    const currentPoints = getCurrentPoints();
    if (currentPoints < cost) {
      btn.innerHTML = '💸 积分不足';
      btn.style.background = 'linear-gradient(135deg, #ff9a9e 0%, #fad0c4 100%)';
      btn.style.boxShadow = '0 6px 25px rgba(255, 154, 158, 0.5)';
      btn.disabled = true;
      btn.style.animation = 'shake 0.5s ease';
      setTimeout(() => {
        btn.style.animation = '';
        btn.innerHTML = `🎲 参与 (P)`;
        btn.style.background = 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)';
        btn.style.boxShadow = '0 6px 25px rgba(67, 233, 123, 0.5)';
        btn.disabled = false;
      }, 2000);
      return;
    }

    const originalHTML = btn.innerHTML;
    const originalBackground = btn.style.background;
    btn.innerHTML = '⏳ 参与中...';
    btn.disabled = true;
    btn.style.background = 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)';
    btn.style.boxShadow = '0 6px 25px rgba(79, 172, 254, 0.5)';

    const originalBtn = row.querySelector('button[data-do="entry_insert"], .giveaway__hide-icon button:not(.is-active)');

    if (originalBtn) {
      originalBtn.click();
      await new Promise(r => setTimeout(r, 800));

      const isNowActive = row.querySelector(SELECTORS.activeOriginalBtn);
      if (isNowActive) {
        btn.innerHTML = '✅ 已参与';
        btn.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
        btn.style.boxShadow = '0 6px 25px rgba(102, 126, 234, 0.5)';
        btn.disabled = false;
        btn.dataset.sgqjState = 'entered';
        setTimeout(() => {
          updatePointsAfterAction(cost, 'subtract');
        }, 300);
      } else {
        await new Promise(r => setTimeout(r, 500));
        const isActiveNow = row.querySelector(SELECTORS.activeOriginalBtn);
        if (isActiveNow) {
          btn.innerHTML = '✅ 已参与';
          btn.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
          btn.style.boxShadow = '0 6px 25px rgba(102, 126, 234, 0.5)';
          btn.disabled = false;
          btn.dataset.sgqjState = 'entered';
          setTimeout(() => {
            updatePointsAfterAction(cost, 'subtract');
          }, 300);
        } else {
          btn.innerHTML = '❌ 失败';
          btn.style.background = 'linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%)';
          btn.style.boxShadow = '0 6px 25px rgba(255, 107, 107, 0.5)';
          setTimeout(() => {
            btn.innerHTML = originalHTML;
            btn.style.background = originalBackground;
            btn.style.boxShadow = '0 6px 25px rgba(67, 233, 123, 0.5)';
            btn.disabled = false;
          }, 2000);
        }
      }
    } else {
      const success = await joinViaAPI(extractGiveawayId(row));
      if (success) {
        btn.innerHTML = '✅ 已参与';
        btn.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
        btn.style.boxShadow = '0 6px 25px rgba(102, 126, 234, 0.5)';
        btn.disabled = false;
        btn.dataset.sgqjState = 'entered';
        setTimeout(() => {
          updatePointsAfterAction(cost, 'subtract');
        }, 300);
      } else {
        btn.innerHTML = '❌ 失败';
        btn.style.background = 'linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%)';
        btn.style.boxShadow = '0 6px 25px rgba(255, 107, 107, 0.5)';
        setTimeout(() => {
          btn.innerHTML = originalHTML;
          btn.style.background = originalBackground;
          btn.style.boxShadow = '0 6px 25px rgba(67, 233, 123, 0.5)';
          btn.disabled = false;
        }, 2000);
      }
    }
  }

  async function doCancel(btn, row, title, cost) {
    const originalHTML = btn.innerHTML;
    const originalBackground = btn.style.background;
    btn.innerHTML = '⏳ 取消中...';
    btn.disabled = true;
    btn.style.background = 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)';
    btn.style.boxShadow = '0 6px 25px rgba(79, 172, 254, 0.5)';

    const originalBtn = row.querySelector('button[data-do="entry_delete"], .giveaway__hide-icon button.is-active');

    if (originalBtn) {
      originalBtn.click();
      await new Promise(r => setTimeout(r, 800));

      const isStillActive = row.querySelector(SELECTORS.activeOriginalBtn);
      if (!isStillActive) {
        btn.innerHTML = `🎲 参与 (P)`;
        btn.style.background = 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)';
        btn.style.boxShadow = '0 6px 25px rgba(67, 233, 123, 0.5)';
        btn.disabled = false;
        btn.dataset.sgqjState = 'join';
        setTimeout(() => {
          updatePointsAfterAction(cost, 'add');
        }, 300);
      } else {
        const success = await cancelViaAPI(extractGiveawayId(row));
        if (success) {
          btn.innerHTML = `🎲 参与 (P)`;
          btn.style.background = 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)';
          btn.style.boxShadow = '0 6px 25px rgba(67, 233, 123, 0.5)';
          btn.disabled = false;
          btn.dataset.sgqjState = 'join';
          setTimeout(() => {
            updatePointsAfterAction(cost, 'add');
          }, 300);
        } else {
          btn.innerHTML = '❌ 失败';
          btn.style.background = 'linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%)';
          btn.style.boxShadow = '0 6px 25px rgba(255, 107, 107, 0.5)';
          setTimeout(() => {
            btn.innerHTML = originalHTML;
            btn.style.background = originalBackground;
            btn.style.boxShadow = '0 6px 25px rgba(102, 126, 234, 0.5)';
            btn.disabled = false;
          }, 2000);
        }
      }
    } else {
      const success = await cancelViaAPI(extractGiveawayId(row));
      if (success) {
        btn.innerHTML = `🎲 参与 (P)`;
        btn.style.background = 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)';
        btn.style.boxShadow = '0 6px 25px rgba(67, 233, 123, 0.5)';
        btn.disabled = false;
        btn.dataset.sgqjState = 'join';
        setTimeout(() => {
          updatePointsAfterAction(cost, 'add');
        }, 300);
      } else {
        btn.innerHTML = '❌ 失败';
        btn.style.background = 'linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%)';
        btn.style.boxShadow = '0 6px 25px rgba(255, 107, 107, 0.5)';
        setTimeout(() => {
          btn.innerHTML = originalHTML;
          btn.style.background = originalBackground;
          btn.style.boxShadow = '0 6px 25px rgba(102, 126, 234, 0.5)';
          btn.disabled = false;
        }, 2000);
      }
    }
  }

  function updatePointsAfterAction(cost, action) {
    const pointsEl = document.querySelector(SELECTORS.pointsNav);
    if (!pointsEl) return;

    const currentText = pointsEl.textContent;
    const match = currentText.match(/(\d+)/);
    if (!match) return;

    let currentPoints = parseInt(match[1]);

    if (action === 'subtract') {
      currentPoints = Math.max(0, currentPoints - cost);
    } else if (action === 'add') {
      currentPoints += cost;
    }

    const newText = currentText.replace(/\d+/, currentPoints);
    pointsEl.innerHTML = newText;

    pointsEl.classList.add('points-updated');
    setTimeout(() => {
      pointsEl.classList.remove('points-updated');
    }, 500);

    console.log(`[SG QuickJoin] P 点数已更新：${currentPoints}`);
  }

  async function joinViaAPI(giveawayId) {
    try {
      const xsrfToken = getXsrfToken();
      const formData = new URLSearchParams();
      formData.append('xsrf_token', xsrfToken);
      formData.append('do', 'entry_insert');
      formData.append('code', giveawayId);

      const response = await fetch('/ajax.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: formData.toString(),
        credentials: 'include',
      });

      const data = await response.json();
      return data.type === 'success' || data.success === true;
    } catch (err) {
      console.error('API 参与失败:', err);
      return false;
    }
  }

  async function cancelViaAPI(giveawayId) {
    try {
      const xsrfToken = getXsrfToken();
      const formData = new URLSearchParams();
      formData.append('xsrf_token', xsrfToken);
      formData.append('do', 'entry_delete');
      formData.append('code', giveawayId);

      const response = await fetch('/ajax.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: formData.toString(),
        credentials: 'include',
      });

      const data = await response.json();
      return data.type === 'success' || data.success === true;
    } catch (err) {
      console.error('API 取消失败:', err);
      return false;
    }
  }

  function addJoinButtonToRow(row) {
    if (row.dataset.sgqjProcessed === 'true') return;
    row.dataset.sgqjProcessed = 'true';

    const title = extractTitle(row);
    const cost = extractPointsCost(row);

    const container = document.createElement('div');
    container.className = 'sgqj-btn-container';
    container.style.cssText = `
      position: absolute;
      right: -180px;
      top: 50%;
      transform: translateY(-50%);
      z-index: 100;
      display: flex;
      align-items: center;
      gap: 8px;
    `;

    const btn = createJoinButton(row, title, cost);
    container.appendChild(btn);

    const outerWrap = row.closest(SELECTORS.giveawayOuterWrap);
    if (outerWrap) {
      outerWrap.style.position = 'relative';
      outerWrap.appendChild(container);

      const rowContainer = outerWrap.closest('.giveaway__rows, .giveaway__row-outer-container');
      if (rowContainer) {
        rowContainer.style.position = 'relative';
        rowContainer.style.marginRight = '200px';
      }
    } else {
      row.style.position = 'relative';
      row.style.marginRight = '200px';
      row.appendChild(container);
    }
  }

  // 页面扫描
  function scanPage() {
    const rows = document.querySelectorAll(SELECTORS.giveawayRow);
    let count = 0;

    rows.forEach(row => {
      if (!row.dataset.sgqjProcessed) {
        if (row.offsetParent !== null) {
          addJoinButtonToRow(row);
          count++;
        }
      }
    });

    if (count > 0) {
      console.log(`[SG QuickJoin] 添加 ${count} 个大号按钮`);
    }
  }

  // DOM 监听
  function startObserver() {
    const observer = new MutationObserver((mutations) => {
      let hasNewRows = false;

      for (const mut of mutations) {
        if (mut.addedNodes.length > 0) {
          for (const node of mut.addedNodes) {
            if (node.nodeType === 1) {
              if (node.matches && node.matches(SELECTORS.giveawayRow)) {
                hasNewRows = true;
                break;
              }
              if (node.querySelector && node.querySelector(SELECTORS.giveawayRow)) {
                hasNewRows = true;
                break;
              }
            }
          }
        }
      }

      if (hasNewRows) {
        setTimeout(scanPage, 200);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  // ==================== 第二部分：SteamGifts 图标大小控制功能 ====================

  // 配置
  const CONFIG = {
    multipliers: {
      large: 2.5,
      medium: 2.0,
      small: 1.5
    },
    defaultMultiplier: 2.0,
    panelPosition: {
      bottom: '100px',
      left: '20px'
    },
    panelStyle: {
      background: 'rgba(30, 30, 46, 0.95)',
      border: '1px solid #00adb5',
      borderRadius: '8px',
      padding: '12px 15px',
      fontFamily: "'Segoe UI', Arial, sans-serif",
      fontSize: '13px',
      color: '#e0e0e0',
      minWidth: '200px',
      boxShadow: '0 4px 15px rgba(0, 0, 0, 0.4)',
      backdropFilter: 'blur(5px)',
      zIndex: '9999'
    },
    buttonStyles: {
      large: { bg: '#ff6b6b', border: '#ff6b6b', color: '#ff6b6b' },
      medium: { bg: '#00adb5', border: '#00adb5', color: '#00adb5' },
      small: { bg: '#4ecdc4', border: '#4ecdc4', color: '#4ecdc4' }
    }
  };

  // 当前状态
  let currentMultiplier = CONFIG.defaultMultiplier;
  let processedIcons = 0;

  // 保存原始尺寸
  function saveOriginalSizes(icons) {
    icons.forEach(icon => {
      if (!icon.dataset.originalSizeSet) {
        if (icon.tagName === 'IMG') {
          const originalWidth = icon.naturalWidth || icon.width || icon.offsetWidth || 16;
          const originalHeight = icon.naturalHeight || icon.height || icon.offsetHeight || 16;
          icon.dataset.originalWidth = originalWidth;
          icon.dataset.originalHeight = originalHeight;
        } else if (icon.tagName === 'SVG') {
          const originalWidth = icon.getAttribute('width') || icon.style.width || '1em';
          const originalHeight = icon.getAttribute('height') || icon.style.height || '1em';
          icon.dataset.originalWidth = originalWidth;
          icon.dataset.originalHeight = originalHeight;
        } else if (icon.classList.contains('fa')) {
          const originalSize = window.getComputedStyle(icon).fontSize;
          icon.dataset.originalFontSize = originalSize;
        }
        icon.dataset.originalSizeSet = 'true';
      }
    });
  }

  // 查找所有图标
  function findAllIcons() {
    const iconSelectors = [
      '.fa-trophy', '.fa-level-up', '.fa-star', '.level-icon',
      '.fa-comment', '.fa-comments', '.fa-comment-alt',
      '.fa-users', '.fa-user-plus', '.fa-sign-in',
      '.fa-eye', '.fa-clock', '.fa-hourglass',
      '.giveaway__icon', '.icon', '.fa', '.fas', '.far', '.fab'
    ];

    let allIcons = [];
    iconSelectors.forEach(selector => {
      const icons = document.querySelectorAll(selector);
      icons.forEach(icon => {
        if (!allIcons.includes(icon)) {
          allIcons.push(icon);
        }
      });
    });

    // 查找容器内的图标
    const giveawayContainers = document.querySelectorAll('.giveaway__row, .giveaway__heading, [class*="giveaway"]');
    giveawayContainers.forEach(container => {
      const containerIcons = container.querySelectorAll('i, span[class*="icon"], img, svg');
      containerIcons.forEach(icon => {
        if (!allIcons.includes(icon)) {
          allIcons.push(icon);
        }
      });
    });

    return [...new Set(allIcons)];
  }

  // 应用放大倍数
  function applyMultiplier(multiplier) {
    currentMultiplier = multiplier;
    const allIcons = findAllIcons();

    // 保存原始尺寸
    saveOriginalSizes(allIcons);

    // 应用放大效果
    allIcons.forEach(icon => {
      if (!icon.classList.contains('sg-enhanced')) {
        icon.classList.add('sg-enhanced');
      }

      if (icon.tagName === 'IMG' && icon.dataset.originalWidth) {
        const originalWidth = parseFloat(icon.dataset.originalWidth);
        const originalHeight = parseFloat(icon.dataset.originalHeight);
        icon.style.width = (originalWidth * multiplier) + 'px';
        icon.style.height = (originalHeight * multiplier) + 'px';
        icon.style.margin = '0 3px';
        icon.style.verticalAlign = 'middle';
      } else if (icon.tagName === 'SVG' && icon.dataset.originalWidth) {
        const originalSize = icon.dataset.originalWidth;
        if (originalSize.includes('em')) {
          const sizeValue = parseFloat(originalSize);
          icon.style.width = (sizeValue * multiplier) + 'em';
          icon.style.height = (sizeValue * multiplier) + 'em';
        } else {
          icon.style.width = multiplier + 'em';
          icon.style.height = multiplier + 'em';
        }
        icon.style.verticalAlign = 'middle';
        icon.style.margin = '0 3px';
      } else if (icon.classList.contains('fa') && icon.dataset.originalFontSize) {
        const originalSize = parseFloat(icon.dataset.originalFontSize) || 14;
        icon.style.fontSize = (originalSize * multiplier) + 'px';
        icon.style.margin = '0 3px';
        icon.style.verticalAlign = 'middle';
      } else {
        icon.style.transform = `scale(${multiplier})`;
        icon.style.transformOrigin = 'center center';
        icon.style.display = 'inline-block';
        icon.style.margin = '0 3px';
      }

      // 添加平滑过渡
      icon.style.transition = 'all 0.2s ease';

      // 添加悬停效果
      if (!icon._hoverHandlersAdded) {
        icon.addEventListener('mouseenter', function() {
          this.style.opacity = '0.8';
          this.style.cursor = 'pointer';
        });

        icon.addEventListener('mouseleave', function() {
          this.style.opacity = '1';
        });

        icon._hoverHandlersAdded = true;
      }
    });

    processedIcons = allIcons.length;
    updatePanelDisplay();

    return allIcons.length;
  }

  // 创建控制面板
  function createControlPanel() {
    // 移除可能存在的旧面板
    const oldPanel = document.getElementById('sg-control-panel');
    if (oldPanel) oldPanel.remove();

    const panel = document.createElement('div');
    panel.id = 'sg-control-panel';

    // 应用样式
    Object.assign(panel.style, {
      position: 'fixed',
      bottom: CONFIG.panelPosition.bottom,
      left: CONFIG.panelPosition.left,
      ...CONFIG.panelStyle
    });

    panel.innerHTML = `
      <div style="margin-bottom: 10px; font-weight: 600; color: #00adb5; font-size: 14px; display: flex; align-items: center; gap: 8px;">
        <span>🎮 图标控制</span>
        <span id="sg-icon-count" style="font-size: 11px; background: rgba(0, 173, 181, 0.2); padding: 2px 6px; border-radius: 10px;">0</span>
      </div>
      <div style="margin-bottom: 8px; font-size: 12px; color: #aaa;">点击倍率直接更改:</div>
      <div style="display: flex; gap: 6px; margin-bottom: 12px;">
        <button id="sg-btn-large" style="flex: 1; padding: 8px 0; background: #1a1a2e; border: 2px solid ${CONFIG.buttonStyles.large.color}; color: ${CONFIG.buttonStyles.large.color}; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: bold; transition: all 0.2s;">大(2.5x)</button>
        <button id="sg-btn-medium" style="flex: 1; padding: 8px 0; background: #1a1a2e; border: 2px solid ${CONFIG.buttonStyles.medium.color}; color: ${CONFIG.buttonStyles.medium.color}; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: bold; transition: all 0.2s;">中(2x)</button>
        <button id="sg-btn-small" style="flex: 1; padding: 8px 0; background: #1a1a2e; border: 2px solid ${CONFIG.buttonStyles.small.color}; color: ${CONFIG.buttonStyles.small.color}; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: bold; transition: all 0.2s;">小(1.5x)</button>
      </div>
      <div style="font-size: 11px; color: #888; text-align: center; border-top: 1px solid rgba(255, 255, 255, 0.1); padding-top: 8px;">
        当前: <span id="sg-current-multiplier" style="color: #00adb5; font-weight: bold;">2.0x</span>
      </div>
    `;

    document.body.appendChild(panel);

    // 按钮事件
    document.getElementById('sg-btn-large').addEventListener('click', () => {
      applyMultiplier(CONFIG.multipliers.large);
      updateButtonStates(CONFIG.multipliers.large);
    });

    document.getElementById('sg-btn-medium').addEventListener('click', () => {
      applyMultiplier(CONFIG.multipliers.medium);
      updateButtonStates(CONFIG.multipliers.medium);
    });

    document.getElementById('sg-btn-small').addEventListener('click', () => {
      applyMultiplier(CONFIG.multipliers.small);
      updateButtonStates(CONFIG.multipliers.small);
    });

    // 更新按钮状态
    function updateButtonStates(multiplier) {
      const largeBtn = document.getElementById('sg-btn-large');
      const mediumBtn = document.getElementById('sg-btn-medium');
      const smallBtn = document.getElementById('sg-btn-small');
      const currentDisplay = document.getElementById('sg-current-multiplier');

      // 重置所有按钮
      largeBtn.style.background = '#1a1a2e';
      largeBtn.style.border = `2px solid ${CONFIG.buttonStyles.large.color}`;
      largeBtn.style.color = CONFIG.buttonStyles.large.color;

      mediumBtn.style.background = '#1a1a2e';
      mediumBtn.style.border = `2px solid ${CONFIG.buttonStyles.medium.color}`;
      mediumBtn.style.color = CONFIG.buttonStyles.medium.color;

      smallBtn.style.background = '#1a1a2e';
      smallBtn.style.border = `2px solid ${CONFIG.buttonStyles.small.color}`;
      smallBtn.style.color = CONFIG.buttonStyles.small.color;

      // 高亮当前选中的按钮
      if (multiplier === CONFIG.multipliers.large) {
        largeBtn.style.background = CONFIG.buttonStyles.large.bg;
        largeBtn.style.color = 'white';
        currentDisplay.textContent = '2.5x';
      } else if (multiplier === CONFIG.multipliers.medium) {
        mediumBtn.style.background = CONFIG.buttonStyles.medium.bg;
        mediumBtn.style.color = 'white';
        currentDisplay.textContent = '2.0x';
      } else if (multiplier === CONFIG.multipliers.small) {
        smallBtn.style.background = CONFIG.buttonStyles.small.bg;
        smallBtn.style.color = 'white';
        currentDisplay.textContent = '1.5x';
      }
    }

    // 初始状态
    updateButtonStates(CONFIG.defaultMultiplier);
  }

  // 更新面板显示
  function updatePanelDisplay() {
    const countElement = document.getElementById('sg-icon-count');
    if (countElement) {
      countElement.textContent = processedIcons;
    }
  }

  // ==================== 初始化 ====================

  function init() {
    if (!location.hostname.includes('steamgifts.com')) return;

    console.log('[SteamGifts 增强版] v3.1 初始化...');

    // 添加全局样式
    const style = document.createElement('style');
    style.textContent = `
      .nav__header, header, .nav {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        z-index: 10000 !important;
      }

      .page__outer-wrap, .page__inner-wrap, main {
        margin-top: 70px !important;
      }

      .sgqj-btn-container {
        position: absolute;
        right: -180px;
        top: 50%;
        transform: translateY(-50%);
        z-index: 100;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .sgqj-join-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 12px 24px;
        border: none;
        border-radius: 12px;
        font-size: 16px;
        font-weight: 700;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        cursor: pointer;
        white-space: nowrap;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: 0 6px 20px rgba(0,0,0,0.25);
        min-width: 140px;
        height: 50px;
        line-height: 26px;
        position: relative;
        overflow: hidden;
      }

      .sgqj-join-btn:hover:not(:disabled) {
        transform: translateY(-3px) scale(1.05);
        box-shadow: 0 10px 30px rgba(0,0,0,0.35);
      }

      .sgqj-join-btn:disabled {
        cursor: default;
        opacity: 0.8;
      }

      @keyframes ripple {
        to {
          transform: scale(4);
          opacity: 0;
        }
      }

      @keyframes shake {
        0%, 100% { transform: translateX(0); }
        10%, 30%, 50%, 70%, 90% { transform: translateX(-3px); }
        20%, 40%, 60%, 80% { transform: translateX(3px); }
      }

      .giveaway__row-outer-wrap {
        position: relative !important;
      }

      .giveaway__rows, .giveaway__row-outer-container {
        position: relative !important;
        margin-right: 200px !important;
      }

      /* 图标控制面板样式 */
      #sg-control-panel {
        position: fixed !important;
        bottom: 100px !important;
        left: 20px !important;
        z-index: 9999 !important;
      }
    `;
    document.head.appendChild(style);

    // 初始化 Quick Join 功能
    fixNavigationBar();

    setTimeout(() => {
      scanPage();
      console.log('[SG QuickJoin] 初始化完成');
    }, 2000);

    startObserver();

    // 初始化图标控制功能
    function setupIconControl() {
      // 创建控制面板
      createControlPanel();

      // 初始应用默认倍数
      applyMultiplier(CONFIG.defaultMultiplier);

      console.log(`[SteamGifts图标控制] 初始处理了 ${processedIcons} 个图标`);

      // 监听页面变化
      const observer = new MutationObserver(function(mutations) {
        let hasNewContent = false;
        mutations.forEach(function(mutation) {
          if (mutation.addedNodes.length > 0) {
            hasNewContent = true;
          }
        });

        if (hasNewContent) {
          clearTimeout(window.sgUpdateTimer);
          window.sgUpdateTimer = setTimeout(() => {
            applyMultiplier(currentMultiplier);
          }, 500);
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true
      });

      // 添加键盘快捷键
      document.addEventListener('keydown', function(e) {
        // Ctrl+1 = 小(1.5x), Ctrl+2 = 中(2x), Ctrl+3 = 大(2.5x)
        if (e.ctrlKey && !e.altKey && !e.shiftKey) {
          if (e.key === '1') {
            applyMultiplier(CONFIG.multipliers.small);
            updateButtonStates(CONFIG.multipliers.small);
            e.preventDefault();
          } else if (e.key === '2') {
            applyMultiplier(CONFIG.multipliers.medium);
            updateButtonStates(CONFIG.multipliers.medium);
            e.preventDefault();
          } else if (e.key === '3') {
            applyMultiplier(CONFIG.multipliers.large);
            updateButtonStates(CONFIG.multipliers.large);
            e.preventDefault();
          }
        }
      });

      console.log('[SteamGifts图标控制] 控制面板已创建在左下角（向上移动4行）');
      console.log('[SteamGifts图标控制] 快捷键: Ctrl+1(小), Ctrl+2(中), Ctrl+3(大)');
    }

    // 更新按钮状态函数
    function updateButtonStates(multiplier) {
      const largeBtn = document.getElementById('sg-btn-large');
      const mediumBtn = document.getElementById('sg-btn-medium');
      const smallBtn = document.getElementById('sg-btn-small');
      const currentDisplay = document.getElementById('sg-current-multiplier');

      if (!largeBtn || !mediumBtn || !smallBtn || !currentDisplay) return;

      // 重置所有按钮
      largeBtn.style.background = '#1a1a2e';
      largeBtn.style.border = `2px solid ${CONFIG.buttonStyles.large.color}`;
      largeBtn.style.color = CONFIG.buttonStyles.large.color;

      mediumBtn.style.background = '#1a1a2e';
      mediumBtn.style.border = `2px solid ${CONFIG.buttonStyles.medium.color}`;
      mediumBtn.style.color = CONFIG.buttonStyles.medium.color;

      smallBtn.style.background = '#1a1a2e';
      smallBtn.style.border = `2px solid ${CONFIG.buttonStyles.small.color}`;
      smallBtn.style.color = CONFIG.buttonStyles.small.color;

      // 高亮当前选中的按钮
      if (multiplier === CONFIG.multipliers.large) {
        largeBtn.style.background = CONFIG.buttonStyles.large.bg;
        largeBtn.style.color = 'white';
        currentDisplay.textContent = '2.5x';
      } else if (multiplier === CONFIG.multipliers.medium) {
        mediumBtn.style.background = CONFIG.buttonStyles.medium.bg;
        mediumBtn.style.color = 'white';
        currentDisplay.textContent = '2.0x';
      } else if (multiplier === CONFIG.multipliers.small) {
        smallBtn.style.background = CONFIG.buttonStyles.small.bg;
        smallBtn.style.color = 'white';
        currentDisplay.textContent = '1.5x';
      }
    }

    // 延迟初始化图标控制功能
    setTimeout(setupIconControl, 3000);

    // URL 变化监听
    let lastUrl = location.href;
    setInterval(() => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        setTimeout(() => {
          document.querySelectorAll(SELECTORS.giveawayRow).forEach(row => {
            delete row.dataset.sgqjProcessed;
          });
          scanPage();
        }, 1500);
      }
    }, 1000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
