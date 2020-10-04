const service = require ("os-service");
const https = require('https');
const { writeFileSync, readFileSync, existsSync } = require("fs");
const base_uri = 'https://ydns.io/api/v1';
const ipApi = base_uri + '/ip'; 
const updateApi = base_uri + '/update/'

if (process.argv[2] == "--add") {
    service.add ("ddns-updater", {programArgs: ['--run']}, function(error){ 
       if (error)
          console.trace(error);
    });
} else if (process.argv[2] == "--remove") {
    service.remove ("auto-dns", function(error){ 
       if (error)
          console.trace(error);
    });
} else if (process.argv[2] == "--run") {
    service.run (function () {
        service.stop (0);
    });

    //create a timestamp. execute the program. Every 60 mins, execute the program again.
    console.log('starting program...');
    checkWanAddress(ipApi, './WanAddress.txt')
    let timeId = setInterval(checkWanAddress, 60 * 60000);
    console.log('Running progam in 1hr intervals. id: ', timeId)
} else {
    // Show usage...
}


//update DNS server with new WAN address
function updateWan(updateUri, wanAddr, host = 'homesterdam.ydns.eu') {
    let message = '';
    let upReq = updateUri + `?host=${host}&ip=${wanAddr}`
    https.get(upReq, (apiRes) => {
        apiRes.on('data', (stream) =>  message += stream);
        apiRes.on('end', () => {
            console.log(message);
        })
    })
}
//write a locally cached file containing IP address.
function cacheIptoFile(url, path = './wanAddress.txt') {
    console.log('Writing new file...')
    https.get(url, (response) => {
        let data = '';
        response.on('data', (chunk) => data += chunk);
        response.on('end', () => { 
            console.log(`Ip is: ${data}`); 
            writeFileSync(path, data);
        })
    })
}
//Check if WAN address matches locally cached file.
function checkWanAddress(url = ipApi, path = './wanAddress.txt') {
    if (!existsSync(path)) {
        cacheIptoFile(url, path, false);
        return null;
    }
    let local = readFileSync(path).toString();
    let wan = new String();
    https.get(url, (response) => {
        if(response.statusCode == 200) {
            response.on('data', (chunk) => wan += chunk);
            response.on('end', () => { 
                console.log('API call successful');
                if (wan == local) {
                    console.log(`IP is: ${local}`)
                    console.log('WAN Ip has not changed');
                } else {
                console.log(`Your new Ip is: ${wan}. \nWriting to file...`);
                updateWan(updateApi, wan);
                writeFileSync(path, wan);
                }
            })
        } else console.log(response.statusCode, response.statusMessage);
    })
}

