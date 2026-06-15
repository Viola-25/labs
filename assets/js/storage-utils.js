(function () {
    "use strict";

    function getJson(key, fallback) {
        try {
            const raw = localStorage.getItem(key);
            if (!raw) return fallback;
            return JSON.parse(raw);
        } catch (error) {
            return fallback;
        }
    }

    function setJson(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            return false;
        }
    }

    function getArray(key) {
        const value = getJson(key, []);
        return Array.isArray(value) ? value : [];
    }

    function setArray(key, value) {
        return setJson(key, Array.isArray(value) ? value : []);
    }

    window.StorageUtils = {
        getJson,
        setJson,
        getArray,
        setArray
    };
})();
