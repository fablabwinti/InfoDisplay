/***********************************************
* CSS3 Analog Clock- by JavaScript Kit (www.javascriptkit.com)
* Visit JavaScript Kit at http://www.javascriptkit.com/ for this script and 100s more
***********************************************/
window.requestAnimationFrame = window.requestAnimationFrame
                               || window.mozRequestAnimationFrame
                               || window.webkitRequestAnimationFrame
                               || window.msRequestAnimationFrame
                               //|| function(f){setTimeout(f, 1000 / 60);}

function updateclock() {
    var curdate = new Date();
    var hour_as_degree = (curdate.getHours() + curdate.getMinutes() / 60 ) / 12 * 360;
    var minute_as_degree = curdate.getMinutes() / 60 * 360;
    var second_as_degree = (curdate.getSeconds() + curdate.getMilliseconds() / 1000 ) /60 * 360;
    $('.hand.hour').css('transform','rotate(' + hour_as_degree + 'deg)');
    $('.hand.minute').css('transform','rotate(' + minute_as_degree + 'deg)');
    $('.hand.second').css('transform','rotate(' + second_as_degree + 'deg)');
    if (curdate.getHours() == 0 && curdate.getMinutes() == 0 && curdate.getSeconds() == 0){
        var day = curdate.getDay();
        var month = curdate.getMonth();
        var year = curdate.getFullYear();
        $('.date').css('content', day + '.' + month + '.' + year);
    }
    requestAnimationFrame(updateclock);
}

requestAnimationFrame(updateclock);
