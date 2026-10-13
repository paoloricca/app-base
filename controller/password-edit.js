$(function () {
    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"], [data-bs-toggle="dropdown"][data-bs-title]');
    const tooltipList = [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));
    const popoverTriggerList = document.querySelectorAll('[data-bs-toggle="popover"]')
    const popoverList = [...popoverTriggerList].map(popoverTriggerEl => new bootstrap.Popover(popoverTriggerEl));
})
$(document).ready(function () {
    $('[data-bs-toggle="tooltip"], [data-bs-toggle="dropdown"][data-bs-title]').tooltip();
    $('#select-container ul li').click(function () {
        $(this).prependTo($(this).parent());
        document.location.href = '/password-' + $(this).data('target') + '/' + $(this).attr('class');
    });
    var el = $('.' + $('#LanguageContext').val());
    $('.' + $('#LanguageContext').val()).prependTo($(el).parent());
});