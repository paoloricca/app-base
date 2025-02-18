
$('#confirm-delete').on('show.bs.modal', function(e) {
	//$(this).find('.btn-ok').attr('href', $(e.relatedTarget).data('callback') + '();');

	//alert($(e.relatedTarget).data('callback'));
	$(this).find('.btn-ok').click(function () {
		window['DeleteGruppoOperativo'](15);
	});
	//$(e.relatedTarget).data('callback')
				//param1: $(e.relatedTarget).data('args'), 
				//param2: $(e.relatedTarget).data('callback')
			
		
			
});