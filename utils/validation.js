$(document).ready(function () {
    $("input.decimal").bind("change keyup input", function () {
        var position = this.selectionStart - 1;
        //remove all but number and .
        var fixed = this.value.replace(/[^0-9\.]/g, "");
        if (fixed.charAt(0) === ".")
            //can't start with .
            fixed = fixed.slice(1);
        var pos = fixed.indexOf(".") + 1;
        if (pos >= 0)
            //avoid more than one .
            fixed = fixed.substr(0, pos) + fixed.slice(pos).replace(".", "");
        //cancel sub input string
        if (fixed.indexOf(".") > 0 && fixed.substr(pos).length > 2)
            fixed = fixed.substr(0, pos) + '.' + fixed.substr(pos, 2);
        //set cursor position to end
        if (this.value !== fixed) {
            this.value = fixed;
            this.selectionStart = position + 1;
            this.selectionEnd = position + 1;
        }
    });
});
ShowErrorValidation = function (message) {
    $('.pnl-errors').html('');
    $('.pnl-errors').html(message);
    $('.form-errors').show();
    setTimeout(function () {
        $('.form-errors').fadeOut('slow');
    }, 3000);
}