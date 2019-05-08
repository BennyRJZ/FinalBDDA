const fs = require('fs');
const readline = require('readline');

const rl = readline.createInterface({
    input: fs.createReadStream('./yelp_academic_dataset_business.json'),
    crlfDelay: Infinity
});

fd = fs.openSync('./yelp_academic_dataset_business_formatted.json', 'w');

rl.on('line', (line) => {
    var obj = JSON.parse(line);
    obj.location = {
        "type": "Point",
        "coordinates": [obj.longitude, obj.latitude]
    }
    fs.write(fd, `${JSON.stringify(obj)}\n`, (err) => { if (err) console.log(err) });
});