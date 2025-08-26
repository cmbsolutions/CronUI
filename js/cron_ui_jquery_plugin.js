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
 *     onChange: (expr, meta) => {},
 *     value: '',
 *   });
 *
 *
 */
(function ($, win) {
    if (!$) return;

    // ---------- i18n ----------
    const FALLBACK_PACK = {
        _meta: {
            monthsShort: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
            daysShort: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] // Mon..Sun
        },
        lbl: {
            schedule: 'Schedule',
            flavor: 'Flavor',
            seconds: 'Seconds',
            minutes: 'Minutes',
            hours: 'Hours',
            dayOfMonth: 'Day of Month',
            dayOfWeek: 'Day of Week',
            months: 'Months',
            year: 'Year',
            every: 'Every',
            specific: 'Specific',
            range: 'Range',
            interval: 'Interval',
            to: 'to',
            start: 'start',
            every_n: 'every',
            workdays: 'Workdays (Mon–Fri)',
            lastDay: 'Last day of month',
            weekdays: 'Weekdays (Mon–Fri)',
            weekends: 'Weekends (Sat–Sun)',
            all: 'All',
            clear: 'Clear',
            expression: 'Expression',
            copy: 'Copy',
            copied: 'Copied',
            everyMinute: 'Every minute',
            hourly: 'Hourly',
            daily: 'Daily',
            weekly: 'Weekly',
            monthly: 'Monthly',
            yearly: 'Yearly',
            custom: 'Custom',
            crontab: 'Crontab (5)',
            ncron: 'NCrontab (6)',
            quartz: 'Quartz (6/7)',
            helpYear: 'Use *, comma lists, ranges (a-b), and step (/n)',
            placeholderYear: '* or 2025,2027-2030/2',
            preview_crontab: 'Crontab format: m h dom mon dow',
            preview_ncron: 'NCrontab format: s m h dom mon dow',
            preview_quartz: 'Quartz format: s m h dom mon dow [year] (use ? in either dom or dow)',

            // humanize fragments
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

    function getPack(locale) {
        const ext = (win.CronUI_i18n && win.CronUI_i18n[locale]) || {};
        return {
            _meta: Object.assign({}, FALLBACK_PACK._meta, ext._meta),
            lbl: Object.assign({}, FALLBACK_PACK.lbl, ext.lbl)
        };
    }

    function L(state, key) {
        const v = getPack(state.locale).lbl[key];
        return v == null ? key : v;
    }

    const pad2 = (n) => (n < 10 ? '0' : '') + n;

    function fmt(str, map) {
        return String(str).replace(/\{(\w+)\}/g, (_, k) => (map[k] != null ? map[k] : '{' + k + '}'));
    }

    // ---------- defaults ----------
    const DEFAULTS = {
        flavor: 'crontab',
        showSeconds: undefined,
        showYear: undefined,
        locale: 'en',
        onChange: null,
        value: ''          // optional initial expression string
    };

    $.fn.cronUI = function (opts) {
        const settings = Object.assign({}, DEFAULTS, opts || {});
        if (settings.showSeconds === undefined) settings.showSeconds = settings.flavor !== 'crontab';
        if (settings.showYear === undefined) settings.showYear = settings.flavor === 'quartz';

        return this.each(function () {
            const $root = $(this).addClass('cu-root').empty();

            const state = {
                flavor: settings.flavor,
                showSeconds: !!settings.showSeconds,
                showYear: !!settings.showYear,
                locale: settings.locale || 'en',
                mode: 'every-minute',
                sec: '*', min: '*', hour: '*', dom: '*', mon: '*', dow: '*', year: '*',
                meta: {notes: [], holdDowQuestion: false, holdDomQuestion: false}
            };

            const DAYS = () => getPack(state.locale)._meta.daysShort.map((k, i) => ({v: [1, 2, 3, 4, 5, 6, 0][i], k}));
            const MONTHS = () => getPack(state.locale)._meta.monthsShort;

            // ---------- templates ----------
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
                const items = Array.from({length: to - from + 1}, (_, i) => from + i).map(v => `<option value="${v}">${pad2(v)}</option>`).join('');
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
              <select multiple size="6" class="cu-multi" data-cu-list="${key}">${items}</select>
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

            // ---------- mount ----------
            $root.append(headerTpl());
            $root.append(timeRowTpl());
            $root.append(monthDayTpl());
            $root.append(monthYearTpl());
            $root.append(footerTpl());
            $root.find('select[data-cu="flavor"]').val(state.flavor);
            $root.find('select[data-cu="mode"]').val(state.mode);

            // ---------- behavior ----------
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

                // ↓ Keep the header select in sync when mode is changed programmatically
                $root.find('select[data-cu="mode"]').val(mode);  // no .trigger('change')!

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
                    case 'yearly':
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
                ['sec', 'min', 'hour'].forEach(k => {
                    if ($root.find(`[data-cu-k="${k}"]`).length) state[k] = buildFieldFromControls(k);
                });
                state.dom = buildFieldFromControls('dom');

                const workdays = $root.find('[data-cu-workdays]').is(':checked');
                const lastday = $root.find('[data-cu-lastday]').is(':checked');

                let domField = state.dom || '*';
                let monField = state.mon || '*';
                let dowField = state.dow || '*';

                if (workdays) dowField = '1-5';
                if (lastday) domField = (state.flavor === 'quartz') ? 'L' : '28-31';

                const parts = [];
                if (state.showSeconds) parts.push(state.sec || '*');
                parts.push(state.min || '*', state.hour || '*', domField, monField, dowField);
                if (state.showYear) parts.push(state.year || '*');

                if (state.flavor === 'quartz') {
                    const offs = state.showSeconds ? 1 : 0;
                    const domIdx = 2 + offs;
                    const dowIdx = 4 + offs;
                    const dom = parts[domIdx], dow = parts[dowIdx];
                    const domOk = (dom === '*' || dom === '?' || dom === 'L');
                    const dowOk = (dow === '*' || dow === '?');
                    if (!domOk && !dowOk) parts[domIdx] = '?';
                } else {
                    const offs = state.showSeconds ? 1 : 0;
                    const domIdx = 2 + offs;
                    const dowIdx = 4 + offs;
                    if (parts[dowIdx] !== '*') parts[domIdx] = '*';
                }
                return parts.join(' ');
            }

            function flavorNote() {
                const p = getPack(state.locale).lbl;
                if (state.flavor === 'crontab') return p.preview_crontab;
                if (state.flavor === 'ncron') return p.preview_ncron;
                return p.preview_quartz;
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
                    if (vals.length) {
                        state.dow = vals.join(',');
                        state.meta.holdDowQuestion = false;
                    } else {
                        state.dow = state.meta.holdDowQuestion ? '?' : '*';
                    }
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

            // Copy
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

            // ---------- parse expression -> reflect into controls ----------
            function parseToken(tok) {
                if (tok == null || tok === '*') return {mode: '*'};
                if (tok === '?') return {mode: 'question'};
                if (tok === 'L') return {mode: 'last'};
                if (/^[^/]+\/\d+$/.test(tok)) {
                    const [start, step] = tok.split('/');
                    return {mode: 'step', start, step};
                }
                if (/^\d+-\d+$/.test(tok)) {
                    const [a, b] = tok.split('-');
                    return {mode: 'range', from: a, to: b};
                }
                if (tok.indexOf(',') >= 0) return {mode: 'specific', list: tok.split(',')};
                return {mode: 'specific', list: [tok]};
            }

            function applyTimeControl(key, tok) {
                const p = parseToken(tok);
                const $f = $root.find(`[data-cu-k="${key}"]`);
                if (!$f.length) return;
                const $mode = $f.find('.cu-mode');
                const $c = $f.find(`[data-cu-controls="${key}"]`);
                $c.find('.cu-ctrl').attr('hidden', true);
                if (p.mode === '*' || p.mode === 'question' || p.mode === 'last') {
                    $mode.val('*');
                    state[key] = '*';
                    return;
                }
                if (p.mode === 'specific') {
                    $mode.val('specific');
                    $c.find('.cu-ctrl-specific').attr('hidden', false);
                    $c.find(`[data-cu-list="${key}"]`).val((p.list || []).map(String));
                    state[key] = (p.list || []).join(',') || '*';
                    return;
                }
                if (p.mode === 'range') {
                    $mode.val('range');
                    $c.find('.cu-ctrl-range').attr('hidden', false);
                    $c.find(`[data-cu-from="${key}"]`).val(p.from);
                    $c.find(`[data-cu-to="${key}"]`).val(p.to);
                    state[key] = `${p.from}-${p.to}`;
                    return;
                }
                if (p.mode === 'step') {
                    $mode.val('step');
                    $c.find('.cu-ctrl-step').attr('hidden', false);
                    $c.find(`[data-cu-start="${key}"]`).val(p.start);
                    $c.find(`[data-cu-step="${key}"]`).val(p.step);
                    state[key] = `${p.start}/${p.step}`;
                    return;
                }
            }

            function applyDom(tok) {
                const p = parseToken(tok);
                const $f = $root.find('[data-cu-k="dom"]');
                const $m = $f.find('.cu-mode');
                const $c = $f.find('[data-cu-controls="dom"]');
                $c.find('.cu-ctrl').attr('hidden', true);
                $root.find('[data-cu-lastday]').prop('checked', false);
                state.meta.holdDomQuestion = false;
                if (p.mode === 'last') {
                    $root.find('[data-cu-lastday]').prop('checked', true);
                    state.dom = 'L';
                    $m.val('*');
                    return;
                }
                if (p.mode === 'question') {
                    state.dom = '?';
                    state.meta.holdDomQuestion = true;
                    $m.val('*');
                    return;
                }
                if (p.mode === '*') {
                    state.dom = '*';
                    $m.val('*');
                    return;
                }
                if (p.mode === 'specific') {
                    $m.val('specific');
                    $c.find('.cu-ctrl-specific').attr('hidden', false);
                    $c.find('[data-cu-list="dom"]').val((p.list || []).map(String));
                    state.dom = (p.list || []).join(',') || '*';
                    return;
                }
                if (p.mode === 'range') {
                    $m.val('range');
                    $c.find('.cu-ctrl-range').attr('hidden', false);
                    $c.find('[data-cu-from="dom"]').val(p.from);
                    $c.find('[data-cu-to="dom"]').val(p.to);
                    state.dom = `${p.from}-${p.to}`;
                    return;
                }
                if (p.mode === 'step') {
                    $m.val('step');
                    $c.find('.cu-ctrl-step').attr('hidden', false);
                    $c.find('[data-cu-start="dom"]').val(p.start);
                    $c.find('[data-cu-step="dom"]').val(p.step);
                    state.dom = `${p.start}/${p.step}`;
                    return;
                }
            }

            function applyMonths(tok) {
                const p = parseToken(tok);
                const $chips = $root.find('[data-cu-chiplist="mon"] input[type="checkbox"]');
                $chips.prop('checked', false);
                const check = (v) => $chips.filter(`[value="${v}"]`).prop('checked', true);
                if (p.mode === '*') {
                    state.mon = '*';
                    return;
                }
                if (p.mode === 'specific') {
                    (p.list || []).forEach(v => check(String(v)));
                    state.mon = (p.list || []).join(',');
                    return;
                }
                if (p.mode === 'range') {
                    const a = Number(p.from), b = Number(p.to);
                    for (let x = a; x <= b; x++) check(String(x));
                    state.mon = `${p.from}-${p.to}`;
                    return;
                }
                if (p.mode === 'step') {
                    const start = Number(p.start), step = Number(p.step);
                    for (let x = start; x <= 12; x += step) check(String(x));
                    state.mon = `${p.start}/${p.step}`;
                    return;
                }
            }

            function applyDOW(tok) {
                const p = parseToken(tok);
                const $chips = $root.find('[data-cu-chiplist="dow"] input[type="checkbox"]');
                $chips.prop('checked', false);
                $root.find('[data-cu-weekdays]').prop('checked', false);
                $root.find('[data-cu-weekends]').prop('checked', false);
                state.meta.holdDowQuestion = false;
                const check = (v) => $chips.filter(`[value="${v}"]`).prop('checked', true);
                if (p.mode === '*') {
                    state.dow = '*';
                    return;
                }
                if (p.mode === 'question') {
                    state.dow = '?';
                    state.meta.holdDowQuestion = true;
                    return;
                }
                if (p.mode === 'specific') {
                    (p.list || []).forEach(v => check(String(v)));
                    state.dow = (p.list || []).join(',');
                    return;
                }
                if (p.mode === 'range') {
                    const a = Number(p.from), b = Number(p.to);
                    for (let x = a; x <= b; x++) check(String(x));
                    state.dow = `${p.from}-${p.to}`;
                    if (p.from === '1' && p.to === '5') $root.find('[data-cu-weekdays]').prop('checked', true);
                    if ((p.from === '6' && p.to === '0') || (p.from === '0' && p.to === '6')) $root.find('[data-cu-weekends]').prop('checked', true);
                    return;
                }
                if (p.mode === 'step') {
                    const start = Number(p.start), step = Number(p.step);
                    for (let x = start; x <= 7; x += step) check(String(x % 7));
                    state.dow = `${p.start}/${p.step}`;
                    return;
                }
            }

            function applyYear(tok) {
                if (!state.showYear) return;
                state.year = tok || '*';
                $root.find('[data-cu-year]').val(state.year === '*' ? '' : state.year);
            }

            // ---------- public API ----------
            const api = {
                getExpression() {
                    return $root.find('.cu-expression').val();
                },
                setFlavor, setMode,
                setLocale(loc) {
                    state.locale = loc || 'en';
                    const expr = $root.find('.cu-expression').val();
                    const mode = state.mode;
                    const flavor = state.flavor;
                    $root.empty();
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
                    api.setFrom(expr);
                },
                setFrom(parts) {
                    // Robust parser: load expression and reflect into controls
                    const s = (Array.isArray(parts) ? parts.join(' ') : (parts || '')).trim();
                    if (!s) return;

                    const t = s.split(/\s+/);

                    // --- Detect flavor by field count ---
                    let flavor = 'crontab';
                    if (t.length === 7) flavor = 'quartz';
                    else if (t.length === 6) flavor = 'ncron';
                    else flavor = 'crontab';

                    setFlavor(flavor); // rebuilds sections based on flavor

                    // Token mapping (by flavor)
                    let i = 0;
                    let sec, min, hour, dom, mon, dow, year;
                    if (state.showSeconds) sec = t[i++];
                    min = t[i++];
                    hour = t[i++];
                    dom = t[i++];
                    mon = t[i++];
                    dow = t[i++];
                    if (state.showYear) year = t[i++];

                    // --- Heuristic: infer a preset (mode) from tokens ---
                    const isStarish = v => (v === '*' || v === '?');
                    const hasYear = state.showYear && year && year !== '*';
                    const onlyMin = !state.showSeconds && min !== '*' && hour === '*' && isStarish(dom) && isStarish(dow) && mon === '*' && !hasYear;
                    const onlyTime = min !== '*' && hour !== '*' && isStarish(dom) && isStarish(dow) && mon === '*' && !hasYear;
                    const weekly = min !== '*' && hour !== '*' && (dow && !isStarish(dow)) && isStarish(dom) && mon === '*';
                    const monthly = min !== '*' && hour !== '*' && (dom && !isStarish(dom)) && (mon !== '*') && isStarish(dow) && !hasYear;
                    const yearly = hasYear || (min !== '*' && hour !== '*' && (dom && !isStarish(dom)) && (mon !== '*') && isStarish(dow));

                    let inferred = 'custom';
                    if (
                        (state.showSeconds ? (sec === '*' || sec === '0') : true) &&
                        min === '*' && hour === '*' && mon === '*' && isStarish(dom) && isStarish(dow) && !hasYear
                    ) inferred = 'every-minute';
                    else if (onlyMin) inferred = 'hourly';
                    else if (onlyTime) inferred = 'daily';
                    else if (weekly) inferred = 'weekly';
                    else if (monthly) inferred = 'monthly';
                    else if (yearly) inferred = 'yearly';
                    else inferred = 'custom';

                    // Set the inferred mode BEFORE applying values (so show/hide is correct)
                    setMode(inferred);

                    // --- Apply tokens into controls/state ---
                    function parseToken(tok) {
                        if (tok == null || tok === '*') return {mode: '*'};
                        if (tok === '?') return {mode: 'question'};
                        if (tok === 'L') return {mode: 'last'};
                        if (/^[^/]+\/\d+$/.test(tok)) {
                            const [start, step] = tok.split('/');
                            return {mode: 'step', start, step};
                        }
                        if (/^\d+-\d+$/.test(tok)) {
                            const [a, b] = tok.split('-');
                            return {mode: 'range', from: a, to: b};
                        }
                        if (tok.indexOf(',') >= 0) return {mode: 'specific', list: tok.split(',')};
                        return {mode: 'specific', list: [tok]};
                    }

                    function applyTime(key, tok) {
                        const p = parseToken(tok);
                        const $f = $root.find(`[data-cu-k="${key}"]`);
                        if (!$f.length) return;
                        const $mode = $f.find('.cu-mode');
                        const $c = $f.find(`[data-cu-controls="${key}"]`);
                        $c.find('.cu-ctrl').attr('hidden', true);
                        if (p.mode === '*' || p.mode === 'question' || p.mode === 'last') {
                            $mode.val('*');
                            state[key] = '*';
                            return;
                        }
                        if (p.mode === 'specific') {
                            $mode.val('specific');
                            $c.find('.cu-ctrl-specific').attr('hidden', false);
                            $c.find(`[data-cu-list="${key}"]`).val((p.list || []).map(String));
                            state[key] = (p.list || []).join(',') || '*';
                            return;
                        }
                        if (p.mode === 'range') {
                            $mode.val('range');
                            $c.find('.cu-ctrl-range').attr('hidden', false);
                            $c.find(`[data-cu-from="${key}"]`).val(p.from);
                            $c.find(`[data-cu-to="${key}"]`).val(p.to);
                            state[key] = `${p.from}-${p.to}`;
                            return;
                        }
                        if (p.mode === 'step') {
                            $mode.val('step');
                            $c.find('.cu-ctrl-step').attr('hidden', false);
                            $c.find(`[data-cu-start="${key}"]`).val(p.start);
                            $c.find(`[data-cu-step="${key}"]`).val(p.step);
                            state[key] = `${p.start}/${p.step}`;
                            return;
                        }
                    }

                    function applyDom(tok) {
                        const p = parseToken(tok);
                        const $f = $root.find('[data-cu-k="dom"]');
                        const $m = $f.find('.cu-mode');
                        const $c = $f.find('[data-cu-controls="dom"]');
                        $c.find('.cu-ctrl').attr('hidden', true);
                        $root.find('[data-cu-lastday]').prop('checked', false);
                        state.meta.holdDomQuestion = false;
                        if (p.mode === 'last') {
                            $root.find('[data-cu-lastday]').prop('checked', true);
                            state.dom = 'L';
                            $m.val('*');
                            return;
                        }
                        if (p.mode === 'question') {
                            state.dom = '?';
                            state.meta.holdDomQuestion = true;
                            $m.val('*');
                            return;
                        }
                        if (p.mode === '*') {
                            state.dom = '*';
                            $m.val('*');
                            return;
                        }
                        if (p.mode === 'specific') {
                            $m.val('specific');
                            $c.find('.cu-ctrl-specific').attr('hidden', false);
                            $c.find('[data-cu-list="dom"]').val((p.list || []).map(String));
                            state.dom = (p.list || []).join(',') || '*';
                            return;
                        }
                        if (p.mode === 'range') {
                            $m.val('range');
                            $c.find('.cu-ctrl-range').attr('hidden', false);
                            $c.find('[data-cu-from="dom"]').val(p.from);
                            $c.find('[data-cu-to="dom"]').val(p.to);
                            state.dom = `${p.from}-${p.to}`;
                            return;
                        }
                        if (p.mode === 'step') {
                            $m.val('step');
                            $c.find('.cu-ctrl-step').attr('hidden', false);
                            $c.find('[data-cu-start="dom"]').val(p.start);
                            $c.find('[data-cu-step="dom"]').val(p.step);
                            state.dom = `${p.start}/${p.step}`;
                            return;
                        }
                    }

                    function applyMonths(tok) {
                        const p = parseToken(tok);
                        const $chips = $root.find('[data-cu-chiplist="mon"] input[type="checkbox"]');
                        $chips.prop('checked', false);
                        const check = (v) => $chips.filter(`[value="${v}"]`).prop('checked', true);
                        if (p.mode === '*') {
                            state.mon = '*';
                            return;
                        }
                        if (p.mode === 'specific') {
                            (p.list || []).forEach(v => check(String(v)));
                            state.mon = (p.list || []).join(',');
                            return;
                        }
                        if (p.mode === 'range') {
                            const a = Number(p.from), b = Number(p.to);
                            for (let x = a; x <= b; x++) check(String(x));
                            state.mon = `${p.from}-${p.to}`;
                            return;
                        }
                        if (p.mode === 'step') {
                            const start = Number(p.start), step = Number(p.step);
                            for (let x = start; x <= 12; x += step) check(String(x));
                            state.mon = `${p.start}/${p.step}`;
                            return;
                        }
                    }

                    function applyDOW(tok) {
                        const p = parseToken(tok);
                        const $chips = $root.find('[data-cu-chiplist="dow"] input[type="checkbox"]');
                        $chips.prop('checked', false);
                        $root.find('[data-cu-weekdays]').prop('checked', false);
                        $root.find('[data-cu-weekends]').prop('checked', false);
                        state.meta.holdDowQuestion = false;
                        const check = (v) => $chips.filter(`[value="${v}"]`).prop('checked', true);
                        if (p.mode === '*') {
                            state.dow = '*';
                            return;
                        }
                        if (p.mode === 'question') {
                            state.dow = '?';
                            state.meta.holdDowQuestion = true;
                            return;
                        }
                        if (p.mode === 'specific') {
                            (p.list || []).forEach(v => check(String(v)));
                            state.dow = (p.list || []).join(',');
                            return;
                        }
                        if (p.mode === 'range') {
                            const a = Number(p.from), b = Number(p.to);
                            for (let x = a; x <= b; x++) check(String(x));
                            state.dow = `${p.from}-${p.to}`;
                            if (p.from === '1' && p.to === '5') $root.find('[data-cu-weekdays]').prop('checked', true);
                            if ((p.from === '6' && p.to === '0') || (p.from === '0' && p.to === '6')) $root.find('[data-cu-weekends]').prop('checked', true);
                            return;
                        }
                        if (p.mode === 'step') {
                            const start = Number(p.start), step = Number(p.step);
                            for (let x = start; x <= 7; x += step) check(String(x % 7));
                            state.dow = `${p.start}/${p.step}`;
                            return;
                        }
                    }

                    function applyYear(tok) {
                        if (!state.showYear) return;
                        state.year = tok || '*';
                        $root.find('[data-cu-year]').val(state.year === '*' ? '' : state.year);
                    }

                    // Apply into UI
                    if (state.showSeconds) applyTime('sec', sec);
                    applyTime('min', min);
                    applyTime('hour', hour);
                    applyDom(dom);
                    applyMonths(mon);
                    applyDOW(dow);
                    applyYear(year);

                    update();
                },
                destroy() {
                    $root.off().empty().removeData('cronUI');
                }
            };
            $root.data('cronUI', api);

            // Seed from initial value if provided
            if (settings.value) {
                api.setFrom(settings.value);
            }
        });
    };
})(jQuery, window);
