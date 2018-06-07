setInterval(function reloadPage() {
    var curdate = new Date();
    if (curdate.getMinutes() <= 15){
        location.reload(true);
    }
}, 1000 * 60 * 15); // every 15 minutes
