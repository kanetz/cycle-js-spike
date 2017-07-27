String.prototype.toSelector = function() {
    return (this.startsWith('.') ? '' : '.').concat(this);
};

String.prototype.as = function(uiSelector) {
    return this.toSelector().concat(uiSelector);
};
