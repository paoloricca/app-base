$(function () {
    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    const tooltipList = [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));
    const popoverTriggerList = document.querySelectorAll('[data-bs-toggle="popover"]')
    const popoverList = [...popoverTriggerList].map(popoverTriggerEl => new bootstrap.Popover(popoverTriggerEl));
})
$(document).ready(function () {
    $('#select-container ul li').click(function () {
        $(this).prependTo($(this).parent());
        document.location.href = '/password-recovery/' + $(this).attr('class');
    });
    var el = $('.' + $('#LanguageContext').val());
    $('.' + $('#LanguageContext').val()).prependTo($(el).parent());
});