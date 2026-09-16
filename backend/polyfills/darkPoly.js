export default `(function() {
    const originalMatchMedia = window.matchMedia;
    window.matchMedia = function(query) {
        if (query.includes('prefers-color-scheme')) {
            return {
                matches: query.includes('dark'),
                media: query,
                onchange: null,
                addListener: function() {},
                removeListener: function() {},
                addEventListener: function() {},
                removeEventListener: function() {},
                dispatchEvent: function() { return false; }
            };
        }
        return originalMatchMedia(query);
    };
})();`;
