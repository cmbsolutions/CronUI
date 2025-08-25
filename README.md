# CronUI — jQuery Cron Expression Builder

A single-div, stylable UI to compose **Crontab (5)**, **NCrontab (6)**, and **Quartz (6/7)** cron expressions.  
Includes a compact **modal addon** that keeps your page clean by showing only an expression input inline and opening the full builder on demand.

---

## Table of Contents

- [Features](#features)
- [Live Demo](#live-demo)
- [Live Concepts](#live-concepts)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Compact + Modal Addon](#compact--modal-addon)
- [Include Order](#include-order)
- [API](#api)
  - [Core Plugin `$.fn.cronUI`](#core-plugin-fncronui)
  - [Compact Addon `$.fn.cronUICompact`](#compact-addon-fncronuicompact)
- [Internationalization (i18n)](#internationalization-i18n)
  - [Language Pack Format](#language-pack-format)
  - [Adding a New Language](#adding-a-new-language)
  - [Runtime Locale Switching](#runtime-locale-switching)
- [Styling](#styling)
- [Behavior & Rules](#behavior--rules)
  - [Cron Flavors](#cron-flavors)
  - [Quartz DOM/DOW Rule](#quartz-domdow-rule)
- [Accessibility](#accessibility)
- [Troubleshooting](#troubleshooting)
- [Versioning & Compatibility](#versioning--compatibility)
- [License](#license)

---

## Features

- ✅ **Single-div UI**: `$('#myDiv').cronUI({...})` renders a complete builder.
- ✅ **Cron flavors**:  
  - **Crontab (5)**: `m h dom mon dow`  
  - **NCrontab (6)**: `s m h dom mon dow`  
  - **Quartz (6/7)**: `s m h dom mon dow [year]`
- ✅ **Dynamic fieldsets**: schedule shortcuts hide/show relevant controls.
- ✅ **Time units**: Each of seconds, minutes, hours supports **Every / Specific / Range / Interval**.
- ✅ **Day/Month controls**: chips for weekdays and months; presets for workdays/weekends; “last day of month”.
- ✅ **Stylable**: clean `.cu-*` classnames for easy theming.
- ✅ **Clipboard**: one-click **Copy** of the expression.
- ✅ **i18n**: English fallback built-in; add language packs (e.g., **Dutch**) as separate files.
- ✅ **Compact Modal Addon**: show one input inline; open full builder in a modal.

---

## Live Demo

Click [here](https://cmbsolutions.github.io/CronUI/demo.html) for a live demo of the latest published version

---

## Live Concepts

- **Schedule presets**: Every minute / Hourly / Daily / Weekly / Monthly / Yearly / Custom
- **Humanized preview** (localized): a small, readable description of the current expression.
- **Mutual exclusivity** (Quartz): correct handling of `?` in **DOM**/**DOW**.

---

## Installation

**Requirements**
- jQuery **3.6+** (tested with 3.7)
- No other dependencies

**Files**
- `cron_ui_jquery_plugin.js` (core plugin)
- `cron_ui_i18n.en.js` (optional English pack override)
- `cron_ui_i18n.nl.js` (Dutch pack)
- `cron_ui_modal_addon.js` (optional compact modal addon)
- `cron_ui_jquery_plugin.css` (CSS for the core and the addon—feel free to rename/move into your bundle)

**Folder structure (example)**

```
/public
  /js
    cron_ui_jquery-plugin.js
    cron_ui_i18n.en.js
    cron_ui_i18n.nl.js
    cron_ui_modal_addon.js
  /css
    cron_ui_jquery_plugin.css
```

---

## Quick Start

```html
<div id="cron"></div>

<link rel="stylesheet" href="/css/cron_ui_jquery_plugin.css">

<script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>

<!-- Core plugin -->
<script src="/js/cron_ui_jquery_plugin.js"></script>

<!-- Language packs (optional English override + Dutch) -->
<script src="/js/cron_ui_i18n.en.js"></script> <!-- optional -->
<script src="/js/cron_ui_i18n.nl.js"></script> <!-- for Dutch -->

<script>
  // Initialize with Quartz + Dutch UI
  $('#cron').cronUI({
    flavor: 'quartz',   // 'crontab' | 'ncron' | 'quartz'
    locale: 'nl',       // 'en' (default) or any loaded pack code
    onChange: (expr, meta) => {
      console.log('Expression:', expr);
      console.log('State:', meta);
    }
  });

  // Access API
  const api = $('#cron').data('cronUI');
  console.log('Current expr:', api.getExpression());
  // api.setFlavor('crontab');
  // api.setMode('weekly');
  // api.setFrom('0 15 10 ? * 2,4,6 *'); // load existing expression
</script>
```

---

## Compact + Modal Addon

Keep your page clean: display only the expression input and open the full builder in a modal when needed.

```html
<div id="cron-compact"></div>

<link rel="stylesheet" href="/css/cron_ui_jquery_plugin.css"><!-- optional: move CSS to your bundle -->

<script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>

<!-- Core plugin + packs -->
<script src="/js/cron_ui_jquery_plugin.js"></script>
<script src="/js/cron_ui_i18n.en.js"></script> <!-- optional -->
<script src="/js/cron_ui_i18n.nl.js"></script>

<!-- Modal addon -->
<script src="/js/cron_ui_modal_addon.js"></script>

<script>
  $('#cron-compact').cronUICompact({
    flavor: 'quartz',
    locale: 'nl',        // 'en' or 'nl'
    openOn: 'button',    // 'button' | 'focus' | 'both'
    button: true,        // show trailing “Edit” button
    value: '',           // optional initial expression
    onChange: (expr) => console.log('Changed:', expr)
  });

  // API
  const compact = $('#cron-compact').data('cronUICompact');
  // compact.open(); compact.close();
  // compact.setExpression('0 0 9 * * 1-5'); // weekdays at 09:00
  // compact.setLocale('en');
</script>
```

---

## Include Order

1. jQuery  
2. `cron_ui_jquery_plugin.js` (core)  
3. Language pack(s) — e.g., `cron_ui_i18n.en.js`, `cron_ui_i18n.nl.js`  
4. (Optional) `cron_ui_modal_addon.js` for compact modal

> If the addon loads before the core plugin, it will warn and skip building until opened; correct order recommended.

---

## API

### Core Plugin `$.fn.cronUI`

**Initialization options**
- `flavor` (`'crontab' | 'ncron' | 'quartz'`) — default `'crontab'`
- `locale` (`'en'` by default)
- `showSeconds` (boolean) — auto by flavor
- `showYear` (boolean) — auto by flavor
- `onChange(expr, meta)` — callback on updates

**Public methods**

```js
const api = $('#cron').data('cronUI');

api.getExpression();            // => string
api.setFrom(exprOrParts);       // string or string[]; auto-detects flavor by field count
api.setFlavor('quartz');        // switch flavor, rebuilds time/year sections appropriately
api.setMode('weekly');          // 'every-minute' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'
api.setLocale('nl');            // rebuilds UI texts, preserves expression
api.destroy();                  // unmount
```

---

### Compact Addon `$.fn.cronUICompact`

**Initialization options**
- `flavor`, `locale` — passed to core on first open
- `openOn` — `'button' | 'focus' | 'both'` (default `'button'`)
- `button` — `true|false` (default `true`)
- `value` — initial expression
- `onChange(expr)` — fires when builder changes expression

**Public methods**

```js
const compact = $('#cron-compact').data('cronUICompact');

compact.open();                 // open modal
compact.close();                // close modal
compact.getExpression();        // current inline input value
compact.setExpression(expr);    // set inline + builder (if created)
compact.setLocale('en');        // updates addon UI + forwards to builder
```

---

## Internationalization (i18n)

- The plugin ships with an **English fallback** (no file required).
- To add languages, include a pack JS file **after** the plugin:
  - `window.CronUI_i18n.xx = { _meta: {...}, lbl: {...} }`
- Set `locale: 'xx'` at init or use `api.setLocale('xx')`.

### Language Pack Format

```js
/* cron-ui-i18n.xx.js */
window.CronUI_i18n = window.CronUI_i18n || {};
window.CronUI_i18n.xx = {
  _meta: {
    monthsShort: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'], // 12
    daysShort:   ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'] // 7 (Mon..Sun)
  },
  lbl: {
    // Builder labels
    schedule: '...', flavor: '...',
    seconds: '...', minutes: '...', hours: '...',
    dayOfMonth: '...', dayOfWeek: '...', months: '...', year: '...',
    every: '...', specific: '...', range: '...', interval: '...',
    to: '...', start: '...', every_n: '...',
    workdays: '...', lastDay: '...',
    weekdays: '...', weekends: '...',
    all: '...', clear: '...',
    expression: '...', copy: '...', copied: '...',

    // Presets
    everyMinute: '...', hourly: '...', daily: '...', weekly: '...',
    monthly: '...', yearly: '...', custom: '...',

    // Flavor names
    crontab: '...', ncron: '...', quartz: '...',

    // Year helpers
    helpYear: '...',                     // help text under year field
    placeholderYear: '...',

    // Footer format note (important!)
    preview_crontab: '...',
    preview_ncron:   '...',
    preview_quartz:  '...',

    // Humanized preview fragments
    h_atSecond: '...',            // uses {sec}
    h_everyMinute: '...',
    h_everyHourAtMin: '...',      // {min}
    h_atTime: '...',              // {HH} {mm}
    h_onDayOfMonth: '...',        // {dom}
    h_inMonths: '...',            // {mon}
    h_onDOW: '...',               // {dow}
    h_inYear: '...'               // {year}
  }
};
```

### Adding a New Language

1. Copy the sample above to `cron_ui_i18n.de.js` (or your code).  
2. Translate all `lbl` values.  
3. Include the file after the plugin:
   ```html
   <script src="/js/cron_ui_i18n.de.js"></script>
   ```
4. Initialize with `locale: 'de'` or call `api.setLocale('de')`.

### Runtime Locale Switching

```js
const api = $('#cron').data('cronUI');
api.setLocale('nl'); // updates texts, keeps current expression intact
```

---

## Styling

Everything is **unstyled by default** except for minimal structural CSS. Target `.cu-*` classes:

- Containers: `.cu-root`, `.cu-section`, `.cu-row`, `.cu-gap`, `.cu-wrap`
- Fields: `.cu-field`, `.cu-label`, `.cu-select`, `.cu-input`, `.cu-multi`
- Chips: `.cu-chiplist`, `.cu-chip`
- Buttons: `.cu-btn`
- Footer: `.cu-footer`, `.cu-expression`
- Modal addon: `.cu-compact-host`, `.cu-compact`, `.cu-overlay`, `.cu-dialog`, `.cu-modal-*`

> You can safely override borders, radii, spacing, fonts, etc.

Minimal CSS to hide modals when `[hidden]` is applied (if you use the addon):

```css
.cu-overlay[hidden]{ display: none !important; }
```

---

## Behavior & Rules

### Cron Flavors

- **Crontab (5)**: **no seconds, no year** → `m h dom mon dow`
- **NCrontab (6)**: **with seconds** → `s m h dom mon dow`
- **Quartz (6/7)**: **with seconds and optional year** → `s m h dom mon dow [year]`

### Quartz DOM/DOW Rule

Quartz requires either **Day-of-Month** or **Day-of-Week** to be `?` when the other is specified (except some special tokens like `L`). The builder enforces this by automatically setting `?` where appropriate.

---

## Accessibility

- Modal uses `role="dialog"` and `aria-modal="true"`.  
- Title is bound via `aria-labelledby`.  
- Focus is moved into the dialog on open; **Esc** closes (cancel).  
- Backdrop click closes (cancel).  
- Buttons are standard `<button>` elements.

---

## Troubleshooting

**Modal opens empty**  
→ Ensure `cron_ui_jquery_plugin.js` (core) is included **before** `cron_ui_modal_addon.js`.

**Modal won’t close**  
→ Ensure your CSS doesn’t override the `[hidden]` attribute. Include:
```css
.cu-overlay[hidden]{ display: none !important; }
```

**Language not applied**  
→ Confirm the language pack is loaded **after** the core plugin and you initialize with `locale: 'xx'` (or call `setLocale('xx')`).

**DOM/DOW interaction seems odd**  
→ Remember the Quartz rule: when DOW is set, DOM becomes `?` (and vice versa). For Crontab/NCrontab, if DOW is set (not `*`), DOM becomes `*`.

---

## Versioning & Compatibility

- Tested on jQuery 3.7.x.
- Works in modern evergreen browsers. IE is not supported.

---

## License

Apache 2.0. Use freely in commercial and open-source projects. Contributions (new languages, UX tweaks) welcome.
