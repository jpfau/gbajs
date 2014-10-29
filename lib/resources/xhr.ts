function loadRom(url:string, callback:{(data:any):void}) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url);
    xhr.responseType = 'arraybuffer';

    xhr.onload = () => {
        callback(xhr.response)
    };
    xhr.send();
}
