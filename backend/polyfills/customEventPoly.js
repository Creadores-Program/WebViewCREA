(function () {
    if (typeof window.CustomEvent === "function") return false;
  
    function CustomEvent(event, params) {
      params = params || { bubbles: false, cancelable: false, detail: undefined };
      var evt = document.createEvent('CustomEvent');
      evt.initCustomEvent(event, params.bubbles, params.cancelable, params.detail);
      return evt;
    }
  
    CustomEvent.prototype = window.Event.prototype;
  
    window.CustomEvent = CustomEvent;
})();
if (!String.prototype.endsWith) {
  String.prototype.endsWith = function(searchString, position) {
    var len = this.length;
    var pos = position === undefined ? len : Number(position);
    if (isNaN(pos)) {
      pos = 0;
    }
    var endPosition = Math.min(Math.max(Math.floor(pos), 0), len);
    var searchStr = String(searchString);
    var searchLength = searchStr.length;
    var start = endPosition - searchLength;
    if (start < 0) {
      return false;
    }
    return subjectString.slice(start, endPosition) === searchStr;
  };
}