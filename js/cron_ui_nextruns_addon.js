// ==============================
// FILE: cron-ui-nextruns-addon.js
// ==============================
/*!
 * CronUI Next Runs Addon
 * Renders the next N occurrence datetimes for the current cron expression beneath the builder.
 * Works with crontab (5), ncrontab (6), and quartz (6/7). Handles ?, L, lists, ranges, steps.
 *
 * Usage (inline builder):
 *   $('#cron').cronUI({ flavor: 'quartz', locale: 'en' });
 *   $('#cron').cronUINextRuns({ count: 10 });
 *
 * Usage (with modal addon):
 *   // After the modal builds the inner cronUI on its .cu-builder host,
 *   // call: $builderHost.cronUINextRuns({ count: 10, locale: settings.locale });
 *
 * Notes:
 * - No hardcoded UI text; uses window.CronUI_i18n[locale].lbl.nextRuns with fallback.
 * - Updates automatically by polling the .cu-expression value. If you add this optional
 *   event in the core (inside update()):
 *        $root.trigger('cronui:change', [expr, Object.assign({}, state)]);
 *   ...then the addon will update instantly without polling.
 */
(function($, win){
    if(!$) return;

    function L(locale, key){
        const pack = (win.CronUI_i18n && win.CronUI_i18n[locale] && win.CronUI_i18n[locale].lbl) || {};
        const FALLBACK = { nextRuns: 'Next 10 occurrences', none: 'No upcoming occurrences' };
        return pack[key] || FALLBACK[key] || key;
    }

    const pad2 = n => (n<10?'0':'')+n;
    function lastDayOfMonth(y, m /*1-12*/){ return new Date(y, m, 0).getDate(); }

    function parseList(token){ return token.split(','); }
    const toInt = v => parseInt(v,10);

    function buildAllowed(token, min, max, field){
        if(token === undefined || token === null) return { any:true };
        token = String(token).trim();
        if(token === '*') return { any:true };
        if(token === '?') return { ignore:true };
        if(field==='dom' && token === 'L') return { last:true };

        const out = new Set();
        const parts = token.indexOf(',')>=0 ? parseList(token) : [token];
        for(const part of parts){
            if(part === '*') { for(let v=min; v<=max; v++) out.add(v); continue; }
            let m;
            if((m = part.match(/^(\d+)-(\d+)(?:\/(\d+))?$/))){
                let a = toInt(m[1]), b = toInt(m[2]); const step = m[3] ? toInt(m[3]) : 1;
                if(field==='dow'){ if(a===7) a=0; if(b===7) b=0; }
                if(a<=b){ for(let v=a; v<=b; v+=step) out.add(v); }
                else { // wrap-around (rare for dow): e.g., 6-0
                    for(let v=a; v<=max; v+=step) out.add(v);
                    for(let v=min; v<=b; v+=step) out.add(v);
                }
                continue;
            }
            if((m = part.match(/^(\*|\d+)\/(\d+)$/))){
                const startRaw = m[1]; const step = toInt(m[2]);
                const start = startRaw === '*' ? (field==='sec'||field==='min'||field==='hour'?0:min) : toInt(startRaw);
                for(let v=start; v<=max; v+=step) out.add(v);
                continue;
            }
            if((m = part.match(/^(\d+)$/))){
                let v = toInt(m[1]); if(field==='dow' && v===7) v=0; out.add(v); continue;
            }
        }
        const arr = Array.from(out).filter(v=>v>=min && v<=max).sort((a,b)=>a-b);
        return { set: arr, any: arr.length === (max-min+1) };
    }

    function has(arr, v){ return arr.indexOf(v) !== -1; }
    function first(arr){ return arr.length? arr[0] : null; }
    function nextGE(arr, v){ for(let i=0;i<arr.length;i++){ if(arr[i] >= v) return arr[i]; } return null; }

    function computeNextRuns(expr, count){
        const t = String(expr||'').trim().split(/\s+/);
        if(t.length < 5) return [];
        let showSeconds=false, showYear=false;
        if(t.length===7){ showSeconds=true; showYear=true; }
        else if(t.length===6){ showSeconds=true; }

        let i=0; let sec='0', min, hour, dom, mon, dow, year='*';
        if(showSeconds) sec = t[i++];
        min=t[i++]; hour=t[i++]; dom=t[i++]; mon=t[i++]; dow=t[i++]; if(showYear) year=t[i++];

        const Asec  = showSeconds ? buildAllowed(sec, 0, 59, 'sec') : { set:[0] };
        const Amin  = buildAllowed(min, 0, 59, 'min');
        const Ahour = buildAllowed(hour, 0, 23, 'hour');
        const Amon  = buildAllowed(mon, 1, 12, 'mon');
        const Adow  = buildAllowed(dow, 0, 6, 'dow');
        const Ayear = showYear ? buildAllowed(year, 1970, 2099, 'year') : { any:true };
        const domTok = dom; // keep raw for L
        const Adom = (domTok==='L') ? {last:true} : buildAllowed(domTok, 1, 31, 'dom');

        const results=[];
        let dt = new Date();
        dt.setMilliseconds(0);
        if(showSeconds){ dt = new Date(dt.getTime()+1000); }
        else { dt.setSeconds(0); dt = new Date(dt.getTime()+60000); }

        let guard = 0, GUARD_MAX = 200000; // prevent infinite loops

        while(results.length < count && guard++ < GUARD_MAX){
            let y = dt.getFullYear();
            // YEAR
            if(!Ayear.any && !Ayear.ignore){
                const arr = Ayear.set || [];
                if(arr.length && !has(arr, y)){
                    const ny = nextGE(arr, y) ?? first(arr);
                    if(ny == null) break;
                    y = ny;
                    dt = new Date(y, 0, 1, 0, 0, showSeconds?0:0, 0);
                }
            }

            // MONTH
            const monArr = Amon.any ? null : (Amon.set||[]);
            let m = dt.getMonth()+1; // 1-12
            if(monArr && !has(monArr, m)){
                const nm = nextGE(monArr, m) ?? first(monArr);
                if(nm == null) break;
                const yearCarry = (nm < m) ? 1 : 0;
                dt = new Date(y + yearCarry, nm-1, 1, 0, 0, showSeconds?0:0, 0);
                if(yearCarry){ y = dt.getFullYear(); }
                m = nm;
            }

            // DAY (DOM/DOW rules)
            let okDay = false;
            while(!okDay && guard++ < GUARD_MAX){
                y = dt.getFullYear(); m = dt.getMonth()+1;
                let d = dt.getDate();
                const dowVal = dt.getDay(); // 0-6

                let domOk = true, dowOk = true;
                if(!(Adom.ignore || domTok==='?')){
                    if(Adom.last){ domOk = (d === lastDayOfMonth(y,m)); }
                    else if(Adom.any){ domOk = true; }
                    else { const domArr = (Adom.set||[]).filter(v=> v<= lastDayOfMonth(y,m)); domOk = has(domArr, d); }
                }
                if(!(Adow.ignore || dow==='?')){
                    if(Adow.any){ dowOk = true; }
                    else { const dowArr = Adow.set||[]; dowOk = has(dowArr, dowVal); }
                }

                okDay = domOk && dowOk;
                if(!okDay){
                    // advance 1 day, reset time
                    dt = new Date(y, m-1, d+1, 0, 0, showSeconds?0:0, 0);
                }
            }
            if(!okDay) break;

            // HOUR
            const hourArr = Ahour.any ? null : (Ahour.set||[]);
            let H = dt.getHours();
            if(hourArr && !has(hourArr, H)){
                const nH = nextGE(hourArr, H) ?? first(hourArr);
                if(nH == null) break;
                if(nH < H){ // next day
                    dt = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate()+1, nH, 0, showSeconds?0:0, 0);
                } else {
                    dt = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate(), nH, 0, showSeconds?0:0, 0);
                }
                continue; // re-evaluate from new datetime
            }

            // MINUTE
            const minArr = Amin.any ? null : (Amin.set||[]);
            let M = dt.getMinutes();
            if(minArr && !has(minArr, M)){
                const nM = nextGE(minArr, M) ?? first(minArr);
                if(nM == null) break;
                if(nM < M){ // next hour
                    dt = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate(), dt.getHours()+1, nM, showSeconds?0:0, 0);
                } else {
                    dt = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate(), dt.getHours(), nM, showSeconds?0:0, 0);
                }
                continue;
            }

            // SECOND (if applicable)
            if(showSeconds){
                const secArr = Asec.any ? null : (Asec.set||[]);
                let S = dt.getSeconds();
                if(secArr && !has(secArr, S)){
                    const nS = nextGE(secArr, S) ?? first(secArr);
                    if(nS == null) break;
                    if(nS < S){ // next minute
                        dt = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate(), dt.getHours(), dt.getMinutes()+1, nS, 0);
                    } else {
                        dt = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate(), dt.getHours(), dt.getMinutes(), nS, 0);
                    }
                    continue;
                }
            }

            // If we made it here, dt matches all constraints
            results.push(new Date(dt));

            // Advance minimally to find the next match
            if(showSeconds){ dt = new Date(dt.getTime() + 1000); }
            else { dt = new Date(dt.getTime() + 60000); }
        }

        return results;
    }

    function fmtDate(d, locale){
        try{
            return new Intl.DateTimeFormat(locale || 'en', { dateStyle: 'medium', timeStyle: 'medium' }).format(d);
        }catch(e){
            // Fallback
            return d.getFullYear()+"-"+pad2(d.getMonth()+1)+"-"+pad2(d.getDate())+" "+pad2(d.getHours())+":"+pad2(d.getMinutes())+":"+pad2(d.getSeconds());
        }
    }

    $.fn.cronUINextRuns = function(options){
        const settings = Object.assign({ count: 10, locale: 'en' }, options||{});

        return this.each(function(){
            const $root = $(this);
            const $expr = $root.find('.cu-expression');
            if(!$expr.length){ console.warn('[cronUINextRuns] No .cu-expression found in this container.'); return; }

            // UI block
            const $blk = $(`
        <div class="cu-nextruns" data-cu-nextruns>
          <div class="cu-row cu-gap"><strong class="cu-nr-title"></strong></div>
          <ol class="cu-nr-list"></ol>
        </div>`);
            $root.find('.cu-footer').after($blk);

            function render(){
                const expr = ($expr.val()||'').trim();
                const runs = computeNextRuns(expr, settings.count);
                $blk.find('.cu-nr-title').text(L(settings.locale, 'nextRuns'));
                const $list = $blk.find('.cu-nr-list');
                $list.empty();
                if(!runs.length){
                    $list.append(`<li>${L(settings.locale,'none')}</li>`);
                    return;
                }
                runs.forEach(d=>{
                    $list.append(`<li>${fmtDate(d, settings.locale)}</li>`);
                });
            }

            // Update via custom event if core emits it; otherwise, poll.
            let lastVal = null; let timer = null;
            function startPoll(){
                if(timer) return; // already polling
                timer = setInterval(()=>{
                    const v = $expr.val();
                    if(v !== lastVal){ lastVal = v; render(); }
                }, 600);
            }

            // Listen for optional event
            $root.on('cronui:change', function(_e, expr){ lastVal = expr; render(); });

            // Initial
            lastVal = $expr.val();
            render();

            // Start polling as a fallback (harmless if event is also used)
            startPoll();

            // Expose a tiny API
            const api = { refresh: render, destroy(){ $blk.remove(); if(timer) clearInterval(timer); } };
            $root.data('cronUINextRuns', api);
        });
    };

})(jQuery, window);
