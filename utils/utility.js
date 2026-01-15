
$('#confirm-delete').on('show.bs.modal', function (e) {
	$(this).find('.btn-ok-delete').click({
		param1: $(e.relatedTarget).data('callback'),
		param2: $(e.relatedTarget).data('args')
	}, ConfirmCallback)
	function ConfirmCallback(args) {
		window[args.data.param1](args.data.param2);
	}
});
$('#confirm-delete').on('hide.bs.modal', function (e) {
	$(this).find('.btn-ok-delete').off("click");
});

ShowError = function (message) {
	$('.pnl-errors').html('');
	$('.pnl-errors').text(message);
	$('#system-message').modal('show');
	//setTimeout(function () {
 //       $('#system-message').modal('hide');
	//}, 6000);
}
ShowError = function (message, sender) {
	$('.pnl-sender').html('').text(sender);
	$('.pnl-errors').html('').text(message);
	$('#system-message').modal('show');
}
QueryStringToJSON = function (str) {
    var pairs = str.split('&');
    var result = {};
    pairs.forEach(function (pair) {
        pair = pair.split('=');
        var name = pair[0]
        var value = pair[1]
        if (name.length)
            if (result[name] !== undefined) {
                if (!result[name].push) {
                    result[name] = [result[name]];
                }
                result[name].push(value || '');
            } else {
                result[name] = value || '';
            }
    });
    return (result);
}

$.fn.inputFilter = function (callback, errMsg) {
    return this.on("input keydown keyup mousedown mouseup select contextmenu drop focusout", function (e) {
        if (callback(this.value)) {
            // Accepted value
            if (["keydown", "mousedown", "focusout"].indexOf(e.type) >= 0) {
                $(this).removeClass("input-error");
                this.setCustomValidity("");
            }
            this.oldValue = this.value;
            this.oldSelectionStart = this.selectionStart;
            this.oldSelectionEnd = this.selectionEnd;
        } else if (this.hasOwnProperty("oldValue")) {
            // Rejected value - restore the previous one
            $(this).addClass("input-error");
            this.setCustomValidity('');
            this.reportValidity();
            this.value = this.oldValue;
            this.setSelectionRange(this.oldSelectionStart, this.oldSelectionEnd);
        } else {
            // Rejected value - nothing to restore
            this.value = "";
        }
    });
};
$(document).ready(function () {
    $('.show-hide-password, .show-hide-password-login').click(function () {
        var input = $(this).parent('div').children('input')[0];
        var icon = $(this);
        if (input.type == "password") {
            input.type = "text";
            icon.removeClass('bi-eye-slash-fill').addClass('bi-eye-fill');
        } else {
            input.type = "password";
            icon.removeClass('bi-eye-fill').addClass('bi-eye-slash-fill');
        }
    });
})


