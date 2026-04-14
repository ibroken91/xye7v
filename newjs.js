//change color to B/W
$(document).ready(function() {
    var savedToggle = localStorage.getItem('toggle-button') === 'true';
    applyBwState(savedToggle);

    $(".toggle-checkbox").on("change", function(){
        var checked = $(this).prop("checked") === true;
        applyBwState(checked);
    });
});

function colorModePreview(isChecked) {
    if(isChecked === true){
        $('body').addClass('body-bw');
        localStorage.setItem('toggle-button', 'true');
        
        
    }
    else{
       
        $('body').removeClass('body-bw');
        localStorage.removeItem('toggle-button');
       
    }

}

function applyBwState(isChecked) {
    $(".toggle-checkbox").prop("checked", !!isChecked);
    colorModePreview(!!isChecked);
}