/* ============================================
   Public Currency Manager (MYR base)
   ============================================ */

(function () {
    const DEFAULT_CURRENCY = 'MYR';
    const STORAGE_KEY_RATES = 'alm_currency_rates_cache_v2';
    const STORAGE_KEY_SELECTED = 'alm_currency_selected_currency_v1';
    const RATES_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours
    const RATE_APIS = [
        {
            url: 'https://open.er-api.com/v6/latest/MYR',
            parse: (payload) => payload && payload.rates
        },
        {
            url: 'https://api.frankfurter.app/latest?from=MYR',
            parse: (payload) => payload && payload.rates
        },
        {
            url: 'https://api.exchangerate-api.com/v4/latest/MYR',
            parse: (payload) => payload && payload.rates
        }
    ];

    const supportedCurrencies = ['MYR', 'USD', 'EUR', 'GBP', 'SAR', 'AED', 'BDT', 'PKR', 'NGN'];
    const ratesState = {
        rates: { MYR: 1 },
        ready: false
    };
    let currentCurrency = DEFAULT_CURRENCY;

    function getSelectedCurrency() {
        return currentCurrency;
    }

    function readSelectedCurrency() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY_SELECTED);
            if (!saved) return DEFAULT_CURRENCY;
            return supportedCurrencies.includes(saved) ? saved : DEFAULT_CURRENCY;
        } catch (error) {
            console.warn('Currency selection cache read failed:', error);
            return DEFAULT_CURRENCY;
        }
    }

    function persistSelectedCurrency(code) {
        try {
            localStorage.setItem(STORAGE_KEY_SELECTED, code);
        } catch (error) {
            console.warn('Currency selection cache write failed:', error);
        }
    }

    function setSelectedCurrency(code) {
        currentCurrency = supportedCurrencies.includes(code) ? code : DEFAULT_CURRENCY;
        persistSelectedCurrency(currentCurrency);
    }

    function normalizeCurrencyCode(code) {
        const normalized = String(code || DEFAULT_CURRENCY).toUpperCase().trim();
        return supportedCurrencies.includes(normalized) ? normalized : DEFAULT_CURRENCY;
    }

    function readCachedRates() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY_RATES);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            if (!parsed || typeof parsed !== 'object') return null;
            if (!parsed.rates || typeof parsed.rates !== 'object') return null;
            if (!parsed.timestamp || Date.now() - parsed.timestamp > RATES_TTL_MS) return null;
            return parsed.rates;
        } catch (error) {
            console.warn('Currency cache read failed:', error);
            return null;
        }
    }

    function cacheRates(rates) {
        try {
            localStorage.setItem(STORAGE_KEY_RATES, JSON.stringify({
                timestamp: Date.now(),
                rates
            }));
        } catch (error) {
            console.warn('Currency cache write failed:', error);
        }
    }

    function pickSupportedRates(sourceRates) {
        const normalized = { MYR: 1 };
        if (!sourceRates || typeof sourceRates !== 'object') return normalized;

        supportedCurrencies.forEach((code) => {
            if (code === 'MYR') return;
            const raw = sourceRates[code];
            const value = Number(raw);
            if (Number.isFinite(value) && value > 0) {
                normalized[code] = value;
            }
        });

        return normalized;
    }

    function mergeRates(...rateSets) {
        const merged = { MYR: 1 };
        rateSets.forEach((rates) => {
            if (!rates || typeof rates !== 'object') return;
            Object.keys(rates).forEach((code) => {
                const normalizedCode = normalizeCurrencyCode(code);
                const value = Number(rates[code]);
                if (normalizedCode === 'MYR') return;
                if (Number.isFinite(value) && value > 0) {
                    merged[normalizedCode] = value;
                }
            });
        });
        return merged;
    }

    function getCoverageCount(rates) {
        let count = 0;
        supportedCurrencies.forEach((code) => {
            if (code === 'MYR') return;
            if (Number.isFinite(Number(rates && rates[code])) && Number(rates[code]) > 0) count += 1;
        });
        return count;
    }

    async function fetchJsonWithTimeout(url, timeoutMs = 7000) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        try {
            const response = await fetch(url, {
                cache: 'no-store',
                signal: controller.signal
            });
            if (!response.ok) throw new Error(`Rate API request failed: ${response.status}`);
            return await response.json();
        } finally {
            clearTimeout(timer);
        }
    }

    async function fetchLiveRates() {
        let bestRates = null;
        let bestCoverage = 0;

        for (const provider of RATE_APIS) {
            try {
                const payload = await fetchJsonWithTimeout(provider.url);
                const providerRates = pickSupportedRates(provider.parse(payload));
                const merged = mergeRates(ratesState.rates, providerRates);
                const coverage = getCoverageCount(merged);

                if (coverage > bestCoverage) {
                    bestRates = merged;
                    bestCoverage = coverage;
                }

                if (coverage >= supportedCurrencies.length - 1) {
                    ratesState.rates = merged;
                    ratesState.ready = true;
                    cacheRates(merged);
                    renderMoneyNodes();
                    emitCurrencyChange();
                    return true;
                }
            } catch (error) {
                console.warn('Live currency fetch failed:', provider.url, error);
            }
        }

        if (bestRates && bestCoverage > 0) {
            ratesState.rates = bestRates;
            ratesState.ready = true;
            cacheRates(bestRates);
            renderMoneyNodes();
            emitCurrencyChange();
            return true;
        }

        return false;
    }

    async function ensureRates() {
        const cached = readCachedRates();
        if (cached) {
            ratesState.rates = { MYR: 1, ...cached };
            ratesState.ready = true;
            const coverage = getCoverageCount(ratesState.rates);
            if (coverage < supportedCurrencies.length - 1) {
                await fetchLiveRates();
            } else {
                // Refresh in background for better freshness.
                fetchLiveRates();
            }
            return;
        }

        const fetched = await fetchLiveRates();
        if (!fetched) {
            ratesState.rates = { MYR: 1 };
            ratesState.ready = true;
        }
    }

    function convertFromMYR(amount, currencyCode) {
        const code = normalizeCurrencyCode(currencyCode || getSelectedCurrency());
        const numericAmount = Number(amount) || 0;
        const rate = ratesState.rates[code] || 1;
        return numericAmount * rate;
    }

    function convert(amount, fromCurrencyCode, toCurrencyCode) {
        const numericAmount = Number(amount) || 0;
        const fromCode = normalizeCurrencyCode(fromCurrencyCode || DEFAULT_CURRENCY);
        const toCode = normalizeCurrencyCode(toCurrencyCode || getSelectedCurrency());

        if (fromCode === toCode) return numericAmount;

        const fromRate = fromCode === 'MYR' ? 1 : Number(ratesState.rates[fromCode]);
        const toRate = toCode === 'MYR' ? 1 : Number(ratesState.rates[toCode]);

        if ((fromCode !== 'MYR' && (!Number.isFinite(fromRate) || fromRate <= 0))
            || (toCode !== 'MYR' && (!Number.isFinite(toRate) || toRate <= 0))) {
            return numericAmount;
        }

        const amountInMYR = fromCode === 'MYR' ? numericAmount : (numericAmount / fromRate);
        return toCode === 'MYR' ? amountInMYR : (amountInMYR * toRate);
    }

    function formatAmount(amount, currencyCode, fractionDigits) {
        const code = normalizeCurrencyCode(currencyCode || getSelectedCurrency());
        const value = Number(amount) || 0;
        const formatOptions = {
            style: 'currency',
            currency: code
        };
        if (typeof fractionDigits === 'number') {
            formatOptions.minimumFractionDigits = fractionDigits;
            formatOptions.maximumFractionDigits = fractionDigits;
        }
        try {
            return new Intl.NumberFormat('en-US', formatOptions).format(value);
        } catch (error) {
            return `${code} ${value.toLocaleString('en-US')}`;
        }
    }

    function formatFromMYR(amount, currencyCode, fractionDigits) {
        return formatAmount(convertFromMYR(amount, currencyCode), currencyCode, fractionDigits);
    }

    function formatFrom(amount, fromCurrencyCode, toCurrencyCode, fractionDigits) {
        const targetCode = normalizeCurrencyCode(toCurrencyCode || getSelectedCurrency());
        return formatAmount(convert(amount, fromCurrencyCode, targetCode), targetCode, fractionDigits);
    }

    function emitCurrencyChange() {
        window.dispatchEvent(new CustomEvent('currencychange', {
            detail: {
                currency: getSelectedCurrency()
            }
        }));
    }

    function renderMoneyNodes(root) {
        const container = root || document;
        const nodes = container.querySelectorAll('[data-money-myr]');
        const selectedCurrency = getSelectedCurrency();

        nodes.forEach((node) => {
            const myrValue = Number(node.getAttribute('data-money-myr')) || 0;
            const decimalsAttr = node.getAttribute('data-money-decimals');
            const decimals = decimalsAttr === null ? undefined : Number(decimalsAttr);
            const suffix = node.getAttribute('data-money-suffix') || '';
            const prefix = node.getAttribute('data-money-prefix') || '';
            node.textContent = `${prefix}${formatFromMYR(myrValue, selectedCurrency, decimals)}${suffix}`;
        });
    }

    function injectCurrencySwitcher() {
        if (document.getElementById('currencySelect')) return;
        const navbarContainer = document.querySelector('.navbar .container');
        if (!navbarContainer) return;

        let actions = navbarContainer.querySelector('.nav-actions');
        const themeToggle = navbarContainer.querySelector('.theme-toggle');
        const navCta = navbarContainer.querySelector('.nav-cta');
        const navToggle = navbarContainer.querySelector('.nav-toggle');

        if (!actions) {
            actions = document.createElement('div');
            actions.className = 'nav-actions';

            if (themeToggle) actions.appendChild(themeToggle);
            if (navCta) actions.appendChild(navCta);

            if (navToggle) {
                navbarContainer.insertBefore(actions, navToggle);
            } else {
                navbarContainer.appendChild(actions);
            }
        }

        const anchorElement = actions.querySelector('.theme-toggle')
            || actions.querySelector('.nav-cta')
            || actions.firstChild;
        if (!anchorElement) return;

        const wrapper = document.createElement('div');
        wrapper.className = 'currency-switcher';

        const icon = document.createElement('span');
        icon.className = 'currency-icon';
        icon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M14.8 9.2c0-1.1-1.3-2-2.8-2s-2.8.9-2.8 2 1.3 2 2.8 2 2.8.9 2.8 2-1.3 2-2.8 2-2.8-.9-2.8-2"/><path d="M12 6v12"/></svg>';

        const select = document.createElement('select');
        select.id = 'currencySelect';
        select.className = 'currency-select';
        select.setAttribute('aria-label', 'Select currency');

        supportedCurrencies.forEach((code) => {
            const option = document.createElement('option');
            option.value = code;
            option.textContent = code;
            select.appendChild(option);
        });

        select.value = getSelectedCurrency();
        select.addEventListener('change', () => {
            setSelectedCurrency(select.value);
            renderMoneyNodes();
            emitCurrencyChange();
        });

        wrapper.appendChild(icon);
        wrapper.appendChild(select);
        actions.insertBefore(wrapper, anchorElement);
    }

    async function initCurrencyManager() {
        currentCurrency = readSelectedCurrency();
        await ensureRates();
        injectCurrencySwitcher();
        renderMoneyNodes();
        emitCurrencyChange();
    }

    window.currencyManager = {
        getSelectedCurrency,
        setSelectedCurrency,
        convertFromMYR,
        convert,
        formatAmount,
        formatFromMYR,
        formatFrom,
        renderMoneyNodes,
        isReady: () => ratesState.ready
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initCurrencyManager);
    } else {
        initCurrencyManager();
    }
})();
