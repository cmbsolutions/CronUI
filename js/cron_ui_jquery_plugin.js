/*!
   Copyright 2025 CMBSolutions

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.


 * CronUI jQuery Plugin (with i18n)
 * - Single-div, stylable UI for Crontab (5), NCrontab (6), Quartz (6/7)
 * - Dynamic fields, workdays/weekends presets, month/day chips
 * - i18n: English fallback built-in; external packs (e.g., nl) can override via window.CronUI_i18n
 *
 * Usage:
 *   $("#myDiv").cronUI({
 *     flavor: "quartz",   // 'crontab' | 'ncron' | 'quartz'
 *     locale: "en",       // default 'en'; set 'nl' after loading cron-ui-i18n.nl.js
 *     onChange: (expr, meta) => {}
 *   });
 *
 *
 */
(function ($, win) {
    if (!$) return;

    // --------------------------
    // i18n fallback (English)
    // --------------------------
    const FALLBACK_PACK = {
        _meta: {
            monthsShort: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
            // Order must be Mon..Sun; values map later to 1..6,0
            daysShort: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
        },
        lbl: {
            schedule: 'Schedule', flavor: 'Flavor',
            seconds: 'Seconds', minutes: 'Minutes', hours: 'Hours',
            dayOfMonth: 'Day of Month', dayOfWeek: 'Day of Week', months: 'Months', year: 'Year',
            every: 'Every', specific: 'Specific', range: 'Range', interval: 'Interval',
            to: 'to', start: 'start', every_n: 'every',
            workdays: 'Workdays (Mon–Fri)', lastDay: 'Last day of month',
            weekdays: 'Weekdays (Mon–Fri)', weekends: 'Weekends (Sat–Sun)',
            all: 'All', clear: 'Clear',
            expression: 'Expression', copy: 'Copy', copied: 'Copied',
            everyMinute: 'Every minute', hourly: 'Hourly', daily: 'Daily',
            weekly: 'Weekly', monthly: 'Monthly', yearly: 'Yearly', custom: 'Custom',
            crontab: 'Crontab (5)', ncron: 'NCrontab (6)', quartz: 'Quartz (6/7)',
            helpYear: 'Use *, comma lists, ranges (a-b), and step (/n)',
            placeholderYear: '* or 2025,2027-2030/2',
            preview_crontab: 'Crontab format: m h dom mon dow',
            preview_ncron: 'NCrontab format: s m h dom mon dow',
            preview_quartz: 'Quartz format: s m h dom mon dow [year] (use ? in either dom or dow)',

            // Humanize (lightweight preview)
            h_atSecond: 'at second {sec}',
            h_everyMinute: 'every minute',
            h_everyHourAtMin: 'every hour at :{min}',
            h_atTime: 'at {HH}:{mm}',
            h_onDayOfMonth: 'on day {dom} of the month',
            h_inMonths: 'in months {mon}',
            h_onDOW: 'on DOW {dow}',
            h_inYear: 'in {year}',
        }
    };

    // Get language pack (fallback -> external override)
    function getPack(locale) {
        const g = (win.CronUI_i18n && win.CronUI_i18n[locale]) || {};
        return {
            _meta: Object.assign({}, FALLBACK_PACK._meta, g._meta),
            lbl: Object.assign({}, FALLBACK_PACK.lbl, g.lbl)
        };
    }

    function L(state, key) {
        const txt = getPack(state.locale).lbl[key];
        return (txt == null ? key : txt);
    }

    const pad2 = (n) => (n < 10 ? '0' : '') + n;

    function fmt(str, map) {
        return String(str).replace(/\{(\w+)\}/g, (_, k) => (map[k] != null ? map[k] : '{' + k + '}'));
    }

    // --------------------------
    // Defaults
    // --------------------------
    const DEFAULTS = {
        flavor: 'crontab',       // 'crontab' | 'ncron' | 'quartz'
        showSeconds: undefined,  // auto by flavor
        showYear: undefined,     // auto by flavor
        locale: 'en',
        onChange: null,
    };

    $.fn.cronUI = function (opts) {
        const settings = Object.assign({}, DEFAULTS, opts || {});
        if (settings.showSeconds === undefined) settings.showSeconds = settings.flavor !== 'crontab';
        if (settings.showYear === undefined) settings.showYear = settings.flavor === 'quartz';

        return this.each(function () {
            const $root = $(this).addClass('cu-root').empty();

            // --------------------------
            // State
            // --------------------------
            const state = {
                flavor: settings.flavor,
                showSeconds: !!settings.showSeconds,
                showYear: !!settings.showYear,
                locale: settings.locale || 'en',
                mode: 'every-minute',
                sec: '*', min: '*', hour: '*', dom: '*', mon: '*', dow: '*', year: '*',
                meta: {notes: []}
            };

            // Meta from pack (computed functions)
            const DAYS = () => getPack(state.locale)._meta.daysShort.map((k, i) => ({v: [1, 2, 3, 4, 5, 6, 0][i], k}));
            const MONTHS = () => getPack(state.locale)._meta.monthsShort;

            // --------------------------
            // Templates
            // --------------------------
            const headerTpl = () => `
        <div class="cu-header">
          <div class="cu-row cu-gap">
            <div class="cu-field">
              <label class="cu-label">${L(state, 'schedule')}</label>
              <select class="cu-select" data-cu="mode">
                <option value="every-minute">${L(state, 'everyMinute')}</option>
                <option value="hourly">${L(state, 'hourly')}</option>
                <option value="daily">${L(state, 'daily')}</option>
                <option value="weekly">${L(state, 'weekly')}</option>
                <option value="monthly">${L(state, 'monthly')}</option>
                <option value="yearly">${L(state, 'yearly')}</option>
                <option value="custom">${L(state, 'custom')}</option>
              </select>
            </div>
            <div class="cu-spacer"></div>
            <div class="cu-flavor">
              <label class="cu-label">${L(state, 'flavor')}</label>
              <select class="cu-select" data-cu="flavor">
                <option value="crontab">${L(state, 'crontab')}</option>
                <option value="ncron">${L(state, 'ncron')}</option>
                <option value="quartz">${L(state, 'quartz')}</option>
              </select>
            </div>
          </div>
        </div>`;

            const timeRowTpl = () => `
        <div class="cu-section cu-time" data-section="time">
          <div class="cu-row cu-gap">
            ${state.showSeconds ? timeUnit(L(state, 'seconds'), 'sec', 0, 59) : ''}
            ${timeUnit(L(state, 'minutes'), 'min', 0, 59)}
            ${timeUnit(L(state, 'hours'), 'hour', 0, 23)}
          </div>
        </div>`;

            function timeUnit(label, key, from, to) {
                const items = Array.from({length: to - from + 1}, (_, i) => from + i)
                    .map(v => `<option value="${v}">${pad2(v)}</option>`).join('');
                return `
        <div class="cu-field cu-timeunit" data-cu-k="${key}">
          <label class="cu-label">${label}</label>
          <select class="cu-select cu-mode" data-cu-mode="${key}">
            <option value="*">${L(state, 'every')}</option>
            <option value="specific">${L(state, 'specific')}</option>
            <option value="range">${L(state, 'range')}</option>
            <option value="step">${L(state, 'interval')}</option>
          </select>
          <div class="cu-controls" data-cu-controls="${key}">
            <div class="cu-ctrl cu-ctrl-specific" hidden>
              <select multiple size="6" class="cu-multi" data-cu-list="${key}">
                ${items}
              </select>
            </div>
            <div class="cu-ctrl cu-ctrl-range" hidden>
              <div class="cu-row cu-gap">
                <select class="cu-select" data-cu-from="${key}">${items}</select>
                <span class="cu-sep">${L(state, 'to')}</span>
                <select class="cu-select" data-cu-to="${key}">${items}</select>
              </div>
            </div>
            <div class="cu-ctrl cu-ctrl-step" hidden>
              <div class="cu-row cu-gap">
                <label class="cu-inline">${L(state, 'start')}</label>
                <select class="cu-select" data-cu-start="${key}">${items}</select>
                <label class="cu-inline">${L(state, 'every_n')}</label>
                <select class="cu-select" data-cu-step="${key}">
                  ${Array.from({length: to - from}, (_, i) => i + 1).map(v => `<option value="${v}">${v}</option>`).join('')}
                </select>
              </div>
            </div>
          </div>
        </div>`;
            }

            const monthDayTpl = () => `
        <div class="cu-section cu-monthday" data-section="monthday">
          <div class="cu-row cu-gap">
            <div class="cu-field" data-cu-k="dom">
              <label class="cu-label">${L(state, 'dayOfMonth')}</label>
              <select class="cu-select cu-mode" data-cu-mode="dom">
                <option value="*">${L(state, 'every')}</option>
                <option value="specific">${L(state, 'specific')}</option>
                <option value="range">${L(state, 'range')}</option>
                <option value="step">${L(state, 'interval')}</option>
              </select>
              <div class="cu-controls" data-cu-controls="dom">
                <div class="cu-ctrl cu-ctrl-specific" hidden>
                  <select multiple size="8" class="cu-multi" data-cu-list="dom">
                    ${Array.from({length: 31}, (_, i) => i + 1).map(v => `<option value="${v}">${v}</option>`).join('')}
                  </select>
                </div>
                <div class="cu-ctrl cu-ctrl-range" hidden>
                  <div class="cu-row cu-gap">
                    <select class="cu-select" data-cu-from="dom">${Array.from({length: 31}, (_, i) => i + 1).map(v => `<option value="${v}">${v}</option>`).join('')}</select>
                    <span class="cu-sep">${L(state, 'to')}</span>
                    <select class="cu-select" data-cu-to="dom">${Array.from({length: 31}, (_, i) => i + 1).map(v => `<option value="${v}">${v}</option>`).join('')}</select>
                  </div>
                </div>
                <div class="cu-ctrl cu-ctrl-step" hidden>
                  <div class="cu-row cu-gap">
                    <label class="cu-inline">${L(state, 'start')}</label>
                    <select class="cu-select" data-cu-start="dom">${Array.from({length: 31}, (_, i) => i + 1).map(v => `<option value="${v}">${v}</option>`).join('')}</select>
                    <label class="cu-inline">${L(state, 'every_n')}</label>
                    <select class="cu-select" data-cu-step="dom">${Array.from({length: 31}, (_, i) => i + 1).map(v => `<option value="${v}">${v}</option>`).join('')}</select>
                  </div>
                </div>
                <div class="cu-ctrl cu-ctrl-presets">
                  <div class="cu-row cu-gap cu-wrap">
                    <label class="cu-check"><input type="checkbox" data-cu-workdays> ${L(state, 'workdays')}</label>
                    <label class="cu-check"><input type="checkbox" data-cu-lastday> ${L(state, 'lastDay')}</label>
                  </div>
                </div>
              </div>
            </div>

            <div class="cu-field" data-cu-k="dow">
              <label class="cu-label">${L(state, 'dayOfWeek')}</label>
              <div class="cu-row cu-gap cu-wrap">
                <label class="cu-check"><input type="checkbox" data-cu-weekdays> ${L(state, 'weekdays')}</label>
                <label class="cu-check"><input type="checkbox" data-cu-weekends> ${L(state, 'weekends')}</label>
              </div>
              <div class="cu-row cu-chiplist" data-cu-chiplist="dow">
                ${DAYS().map(d => `<label class="cu-chip"><input type="checkbox" value="${d.v}"><span>${d.k}</span></label>`).join('')}
              </div>
            </div>
          </div>
        </div>`;

            const monthYearTpl = () => `
        <div class="cu-section cu-monthyear" data-section="monthyear">
          <div class="cu-row cu-gap">
            <div class="cu-field" data-cu-k="mon">
              <label class="cu-label">${L(state, 'months')}</label>
              <div class="cu-row cu-chiplist" data-cu-chiplist="mon">
                ${MONTHS().map((m, i) => `<label class="cu-chip"><input type="checkbox" value="${i + 1}"><span>${m}</span></label>`).join('')}
              </div>
              <div class="cu-row cu-gap cu-wrap">
                <button type="button" class="cu-btn" data-cu-selectall="mon">${L(state, 'all')}</button>
                <button type="button" class="cu-btn" data-cu-clear="mon">${L(state, 'clear')}</button>
              </div>
            </div>
            ${state.showYear ? `
            <div class="cu-field" data-cu-k="year">
              <label class="cu-label">${L(state, 'year')}</label>
              <input type="text" class="cu-input" placeholder="${L(state, 'placeholderYear')}" data-cu-year>
              <small class="cu-help">${L(state, 'helpYear')}</small>
            </div>` : ''}
          </div>
        </div>`;

            const footerTpl = () => `
        <div class="cu-footer">
          <div class="cu-row cu-gap cu-wrap">
            <div class="cu-result">
              <label class="cu-label">${L(state, 'expression')}</label>
              <input class="cu-input cu-expression" type="text" readonly>
            </div>
            <div class="cu-copywrap">
              <button type="button" class="cu-btn" data-cu-copy>${L(state, 'copy')}</button>
            </div>
          </div>
          <div class="cu-row cu-gap cu-preview">
            <code class="cu-preview-line" data-cu-preview></code>
            <small class="cu-help" data-cu-flavor-note></small>
          </div>
        </div>`;

            // Mount UI
            $root.append(headerTpl());
            $root.append(timeRowTpl());
            $root.append(monthDayTpl());
            $root.append(monthYearTpl());
            $root.append(footerTpl());
            $root.find('select[data-cu="flavor"]').val(state.flavor);
            $root.find('select[data-cu="mode"]').val(state.mode);

            // --------------------------
            // Behavior
            // --------------------------
            function toggleTimeControls(visible) {
                ['sec', 'min', 'hour'].forEach(k => {
                    const el = $root.find(`[data-cu-k="${k}"]`);
                    if (!el.length) return;
                    if (visible[k]) el.show(); else el.hide();
                });
            }

            function setEvery(key, val) {
                state[key] = val;
                const $f = $root.find(`[data-cu-k="${key}"]`);
                $f.find('.cu-mode').val('*');
                $f.find('.cu-ctrl').attr('hidden', true);
            }

            function setToEvery() {
                ['sec', 'min', 'hour', 'dom', 'mon', 'dow'].forEach(k => setEvery(k, '*'));
                if (state.showYear) state.year = '*';
            }

            function setMode(mode) {
                state.mode = mode;
                const $monthday = $root.find('[data-section="monthday"]');
                const $monthyear = $root.find('[data-section="monthyear"]');

                switch (mode) {
                    case 'every-minute':
                        toggleTimeControls({sec: true, min: true, hour: true});
                        $monthday.hide();
                        $monthyear.hide();
                        setToEvery();
                        break;
                    case 'hourly':
                        toggleTimeControls({sec: state.showSeconds, min: true, hour: true});
                        $monthday.hide();
                        $monthyear.hide();
                        setEvery('dom', '*');
                        setEvery('mon', '*');
                        setEvery('dow', '*');
                        if (state.showYear) state.year = '*';
                        break;
                    case 'daily':
                        toggleTimeControls({sec: state.showSeconds, min: true, hour: true});
                        $monthday.show();
                        $root.find('[data-cu-k="dom"]').show();
                        $root.find('[data-cu-k="dow"]').hide();
                        $monthyear.hide();
                        setEvery('mon', '*');
                        if (state.showYear) state.year = '*';
                        break;
                    case 'weekly':
                        toggleTimeControls({sec: state.showSeconds, min: true, hour: true});
                        $monthday.show();
                        $root.find('[data-cu-k="dom"]').hide();
                        $root.find('[data-cu-k="dow"]').show();
                        $monthyear.hide();
                        setEvery('mon', '*');
                        if (state.showYear) state.year = '*';
                        break;
                    case 'monthly':
                        toggleTimeControls({sec: state.showSeconds, min: true, hour: true});
                        $monthday.show();
                        $root.find('[data-cu-k="dom"]').show();
                        $root.find('[data-cu-k="dow"]').hide();
                        $monthyear.show();
                        break;
                    case 'yearly':
                        toggleTimeControls({sec: state.showSeconds, min: true, hour: true});
                        $monthday.show();
                        $root.find('[data-cu-k="dom"]').show();
                        $root.find('[data-cu-k="dow"]').hide();
                        $monthyear.show();
                        break;
                    case 'custom':
                        toggleTimeControls({sec: state.showSeconds, min: true, hour: true});
                        $monthday.show();
                        $root.find('[data-cu-k="dom"]').show();
                        $root.find('[data-cu-k="dow"]').show();
                        $monthyear.show();
                        break;
                }
                update();
            }

            function setFlavor(flavor) {
                state.flavor = flavor;
                state.showSeconds = (flavor !== 'crontab');
                state.showYear = (flavor === 'quartz');
                // rebuild sections that depend on showSeconds/showYear
                $root.find('[data-section="time"]').remove();
                $root.find('[data-section="monthyear"]').remove();
                $root.find('.cu-footer').before(timeRowTpl());
                $root.find('.cu-footer').before(monthYearTpl());
                attachTimeHandlers();
                attachMonthYearHandlers();
                setMode(state.mode);
                update();
            }

            function handleModeChange(key, mode) {
                const $controls = $root.find(`[data-cu-controls="${key}"]`);
                $controls.find('.cu-ctrl').attr('hidden', true);
                if (mode === '*') {
                    state[key] = '*';
                } else if (mode === 'specific') {
                    $controls.find('.cu-ctrl-specific').attr('hidden', false);
                    const vals = $controls.find(`[data-cu-list="${key}"]`).val() || [];
                    state[key] = vals.length ? vals.join(',') : '*';
                } else if (mode === 'range') {
                    $controls.find('.cu-ctrl-range').attr('hidden', false);
                    const a = $controls.find(`[data-cu-from="${key}"]`).val();
                    const b = $controls.find(`[data-cu-to="${key}"]`).val();
                    state[key] = `${a}-${b}`;
                } else if (mode === 'step') {
                    $controls.find('.cu-ctrl-step').attr('hidden', false);
                    const s = $controls.find(`[data-cu-start="${key}"]`).val();
                    const n = $controls.find(`[data-cu-step="${key}"]`).val();
                    state[key] = `${s}/${n}`;
                }
                update();
            }

            function buildFieldFromControls(key) {
                const mode = $root.find(`[data-cu-mode="${key}"]`).val();
                if (mode === '*') return '*';
                const $c = $root.find(`[data-cu-controls="${key}"]`);
                if (mode === 'specific') {
                    const vals = $c.find(`[data-cu-list="${key}"]`).val() || [];
                    return vals.length ? vals.join(',') : '*';
                }
                if (mode === 'range') {
                    const a = $c.find(`[data-cu-from="${key}"]`).val();
                    const b = $c.find(`[data-cu-to="${key}"]`).val();
                    return `${a}-${b}`;
                }
                if (mode === 'step') {
                    const s = $c.find(`[data-cu-start="${key}"]`).val();
                    const n = $c.find(`[data-cu-step="${key}"]`).val();
                    return `${s}/${n}`;
                }
                return '*';
            }

            function buildExpression() {
                // sync time fields
                ['sec', 'min', 'hour'].forEach(k => {
                    if ($root.find(`[data-cu-k="${k}"]`).length) state[k] = buildFieldFromControls(k);
                });
                state.dom = buildFieldFromControls('dom');

                // presets
                const workdays = $root.find('[data-cu-workdays]').is(':checked');
                const lastday = $root.find('[data-cu-lastday]').is(':checked');

                const flavor = state.flavor;
                let domField = state.dom || '*';
                let monField = state.mon || '*';
                let dowField = state.dow || '*';

                if (workdays) dowField = '1-5';
                if (lastday) domField = (flavor === 'quartz') ? 'L' : '28-31';

                const parts = [];
                if (state.showSeconds) parts.push(state.sec || '*');
                parts.push(state.min || '*');
                parts.push(state.hour || '*');
                parts.push(domField);
                parts.push(monField);
                parts.push(dowField);
                if (state.showYear) parts.push(state.year || '*');

                // Mutual exclusivity for Quartz: if DOW set, DOM must be '?', and vice versa (unless DOM is 'L')
                if (flavor === 'quartz') {
                    const offs = state.showSeconds ? 1 : 0;
                    const domIdx = 2 + offs; // s m h [dom] mon dow [year]
                    const dowIdx = 4 + offs;
                    const dom = parts[domIdx];
                    const dow = parts[dowIdx];
                    const domSpecial = (dom === '*' || dom === '?' || dom === 'L');
                    if (dow !== '*' && dow !== '?' && !domSpecial) parts[domIdx] = '?';
                    if (dom !== '*' && dom !== '?' && dom !== 'L' && dow !== '*') parts[domIdx] = '?';
                } else {
                    // In crontab/ncron: if DOW is set (not '*'), set DOM to '*'
                    const offs = state.showSeconds ? 1 : 0;
                    const domIdx = 2 + offs;
                    const dowIdx = 4 + offs;
                    if (parts[dowIdx] !== '*') parts[domIdx] = '*';
                }

                return parts.join(' ');
            }

            function flavorNote() {
                if (state.flavor === 'crontab') return L(state, 'preview_crontab');
                if (state.flavor === 'ncron') return L(state, 'preview_ncron');
                return L(state, 'preview_quartz');
            }

            function humanize(expr) {
                const p = expr.trim().split(/\s+/);
                let offs = 0;
                let sec = '0';
                if (state.showSeconds) {
                    sec = p[0];
                    offs = 1;
                }
                const min = p[0 + offs], hour = p[1 + offs], dom = p[2 + offs], mon = p[3 + offs], dow = p[4 + offs];
                const year = state.showYear ? (p[5 + offs] || '*') : null;
                const out = [];
                if (state.showSeconds && sec !== '*') out.push(fmt(L(state, 'h_atSecond'), {sec}));
                if (min === '*' && hour === '*') out.push(L(state, 'h_everyMinute'));
                else if (hour === '*') out.push(fmt(L(state, 'h_everyHourAtMin'), {min}));
                else out.push(fmt(L(state, 'h_atTime'), {HH: pad2(hour), mm: pad2(min)}));
                if (dom !== '*' && dom !== '?') out.push(fmt(L(state, 'h_onDayOfMonth'), {dom}));
                if (mon !== '*') out.push(fmt(L(state, 'h_inMonths'), {mon}));
                if (dow !== '*' && dow !== '?') out.push(fmt(L(state, 'h_onDOW'), {dow}));
                if (year && year !== '*') out.push(fmt(L(state, 'h_inYear'), {year}));
                return out.join(', ');
            }

            function update() {
                const expr = buildExpression();
                $root.find('.cu-expression').val(expr);
                $root.find('[data-cu-preview]').text(humanize(expr));
                $root.find('[data-cu-flavor-note]').text(flavorNote());
                if (typeof settings.onChange === 'function') settings.onChange(expr, Object.assign({}, state));
            }

            function attachTimeHandlers() {
                $root.find('.cu-timeunit .cu-mode').off('change').on('change', function () {
                    const key = $(this).data('cu-mode');
                    handleModeChange(key, $(this).val());
                });
                $root.find('.cu-timeunit [data-cu-list], .cu-timeunit [data-cu-from], .cu-timeunit [data-cu-to], .cu-timeunit [data-cu-start], .cu-timeunit [data-cu-step]')
                    .off('input change').on('input change', update);
            }

            function attachMonthDayHandlers() {
                $root.find('[data-cu-k="dom"] .cu-mode').off('change').on('change', function () {
                    handleModeChange('dom', $(this).val());
                });
                $root.find('[data-cu-k="dom"] [data-cu-list], [data-cu-k="dom"] [data-cu-from], [data-cu-k="dom"] [data-cu-to], [data-cu-k="dom"] [data-cu-start], [data-cu-k="dom"] [data-cu-step]')
                    .off('input change').on('input change', update);
                $root.find('[data-cu-workdays]').off('change').on('change', update);
                $root.find('[data-cu-lastday]').off('change').on('change', update);

                const $dowChips = $root.find('[data-cu-chiplist="dow"] input[type="checkbox"]');
                $dowChips.off('change').on('change', function () {
                    const vals = $dowChips.filter(':checked').map((_, el) => $(el).val()).get();
                    state.dow = vals.length ? vals.join(',') : '*';
                    update();
                });
                $root.find('[data-cu-weekdays]').off('change').on('change', function () {
                    const checked = $(this).is(':checked');
                    DAYS().filter(d => d.v >= 1 && d.v <= 5).forEach(d => {
                        $dowChips.filter(`[value="${d.v}"]`).prop('checked', checked);
                    });
                    $root.find('[data-cu-weekends]').prop('checked', false);
                    $dowChips.trigger('change');
                });
                $root.find('[data-cu-weekends]').off('change').on('change', function () {
                    const checked = $(this).is(':checked');
                    [6, 0].forEach(v => $dowChips.filter(`[value="${v}"]`).prop('checked', checked));
                    $root.find('[data-cu-weekdays]').prop('checked', false);
                    $dowChips.trigger('change');
                });
            }

            function attachMonthYearHandlers() {
                const $monChips = $root.find('[data-cu-chiplist="mon"] input[type="checkbox"]');
                $monChips.off('change').on('change', function () {
                    const vals = $monChips.filter(':checked').map((_, el) => $(el).val()).get();
                    state.mon = vals.length ? vals.join(',') : '*';
                    update();
                });
                $root.find('[data-cu-selectall="mon"]').off('click').on('click', function () {
                    $monChips.prop('checked', true).first().trigger('change');
                });
                $root.find('[data-cu-clear="mon"]').off('click').on('click', function () {
                    $monChips.prop('checked', false).first().trigger('change');
                });

                $root.find('[data-cu-year]').off('input').on('input', function () {
                    const v = $(this).val().trim();
                    state.year = v || '*';
                    update();
                });
            }

            // Copy button
            $root.on('click', '[data-cu-copy]', async function () {
                const v = $root.find('.cu-expression').val();
                try {
                    await navigator.clipboard.writeText(v);
                    $(this).text(L(state, 'copied')).attr('disabled', true);
                    setTimeout(() => $(this).text(L(state, 'copy')).attr('disabled', false), 1200);
                } catch (e) {
                }
            });

            // Header
            $root.on('change', 'select[data-cu="mode"]', function () {
                setMode($(this).val());
            });
            $root.on('change', 'select[data-cu="flavor"]', function () {
                setFlavor($(this).val());
            });

            // Init
            attachTimeHandlers();
            attachMonthDayHandlers();
            attachMonthYearHandlers();
            setMode(state.mode);
            update();

            // Public API
            const api = {
                getExpression() {
                    return $root.find('.cu-expression').val();
                },
                setFlavor, setMode,
                setLocale(loc) {
                    state.locale = loc || 'en';
                    // Rebuild UI to update texts
                    const expr = $root.find('.cu-expression').val();
                    const mode = state.mode;
                    const flavor = state.flavor;
                    $root.empty();
                    // Recreate from scratch
                    $root.append(headerTpl());
                    $root.append(timeRowTpl());
                    $root.append(monthDayTpl());
                    $root.append(monthYearTpl());
                    $root.append(footerTpl());
                    $root.find('select[data-cu="flavor"]').val(flavor);
                    $root.find('select[data-cu="mode"]').val(mode);
                    attachTimeHandlers();
                    attachMonthDayHandlers();
                    attachMonthYearHandlers();
                    // Restore expression parts
                    api.setFrom(expr);
                },
                setFrom(parts) {
                    const s = (Array.isArray(parts) ? parts.join(' ') : (parts || '')).trim();
                    if (!s) return;
                    const p = s.split(/\s+/);
                    if (p.length === 5) {
                        setFlavor('crontab');
                        state.sec = '0';
                        state.year = '*';
                    } else if (p.length === 6) {
                        setFlavor('ncron');
                        state.year = '*';
                    } else if (p.length === 7) {
                        setFlavor('quartz');
                    }
                    let i = 0;
                    if (state.showSeconds) {
                        state.sec = p[i++];
                    }
                    state.min = p[i++];
                    state.hour = p[i++];
                    state.dom = p[i++];
                    state.mon = p[i++];
                    state.dow = p[i++];
                    if (state.showYear) state.year = p[i++];
                    update();
                },
                destroy() {
                    $root.off().empty().removeData('cronUI');
                }
            };
            $root.data('cronUI', api);
        });
    };

})(jQuery, window);
